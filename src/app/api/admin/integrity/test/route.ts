import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
  encodeIntegrityFormBody,
  prepareManualIntegrityFields,
  resolveIntegrityLabelForMode,
  type IntegrityLabelSources,
} from "@/lib/integrity/build-payload";
import { logIntegrityAction } from "@/lib/integrity/log";
import { realtimeIulCampaignPing } from "@/lib/integrity/azure-ping";
import { redactSecrets } from "@/lib/integrity/redact-secrets";
import { checkRequiredIntegrityFields } from "@/lib/integrity/required-fields";
import {
  getIntegrationsMode,
  getIntegrityRealtimeVendor,
  getIntegrityStorefrontVendor,
} from "@/lib/settings/app-settings";
import {
  INTEGRITY_REALTIME_VENDOR_KEY,
  INTEGRITY_STOREFRONT_VENDOR_KEY,
} from "@/lib/settings/resale-vendor-keys";

/** Always force is_test on connection-test posts (independent of integrations mode). */
function prepareManualTestFields(
  manualPayload: Record<string, string>,
): Record<string, string> {
  return {
    ...prepareManualIntegrityFields(manualPayload),
    is_test: "yes",
  };
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const body = (await request.json()) as {
    flow?: string;
    leadId?: string;
    categoryType?: string;
    manualPayload?: Record<string, string>;
  };
  const { flow, leadId, categoryType, manualPayload } = body;

  if (flow !== "realtime" && flow !== "storefront") {
    return NextResponse.json(
      { error: 'flow must be "realtime" or "storefront"' },
      { status: 400 },
    );
  }

  const vendor =
    flow === "realtime"
      ? await getIntegrityRealtimeVendor()
      : await getIntegrityStorefrontVendor();
  const vendorKey =
    flow === "realtime" ? INTEGRITY_REALTIME_VENDOR_KEY : INTEGRITY_STOREFRONT_VENDOR_KEY;

  if (!vendor) {
    return NextResponse.json(
      { error: `Integrity ${flow} vendor is not configured` },
      { status: 503 },
    );
  }

  if (!vendor.enabled) {
    return NextResponse.json(
      { error: `Integrity ${flow} vendor is disabled` },
      { status: 403 },
    );
  }

  const integrationsMode = await getIntegrationsMode();
  const submitUrl = vendor.postUrl;

  if (!submitUrl) {
    return NextResponse.json(
      {
        error: `${flow === "realtime" ? "INTEGRITY_REALTIME_SUBMIT_URL" : "INTEGRITY_STOREFRONT_SUBMIT_URL"} is not configured`,
      },
      { status: 503 },
    );
  }

  let testFields: Record<string, string>;
  let leadSummary: object | null = null;
  let requiredFieldsCheck: { ok: boolean; missing: string[] } | null = null;

  if (manualPayload) {
    testFields = prepareManualTestFields(manualPayload);
  } else if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const category = await prisma.leadCategory.findUnique({
      where: { type: lead.leadType ?? "" },
      select: { integrityLabel: true, integrityLabelStorefront: true },
    });
    const labelSources: IntegrityLabelSources = {
      realtime: category?.integrityLabel ?? null,
      storefront: category?.integrityLabelStorefront ?? null,
    };
    const rawPayload =
      flow === "realtime"
        ? buildIntegrityLeadPayload(lead, labelSources.realtime)
        : buildIntegrityStorefrontPayload(lead, labelSources.realtime, labelSources);
    testFields = { ...rawPayload, is_test: "yes" } as Record<string, string>;
    requiredFieldsCheck = checkRequiredIntegrityFields(lead, flow);
    leadSummary = {
      id: lead.id,
      name: `${lead.firstName} ${lead.lastName}`,
      leadType: lead.leadType,
      state: lead.state,
      hasTrustedform: !!lead.trustedformCertUrl,
      hasDob: !!lead.dob,
      hasBeneficiary: !!lead.beneficiary,
      hasBeneficiaryType: !!lead.beneficiaryType,
      hasHistoryOfCancer: !!lead.historyOfCancer,
      hasMortgageLoanAmount: !!lead.mortgageLoanAmount,
      missingRequiredFields: requiredFieldsCheck.missing,
      resolvedLeadTypeThom: resolveIntegrityLabelForMode(flow, labelSources),
    };
  } else {
    const category =
      categoryType
        ? await prisma.leadCategory.findUnique({
            where: { type: categoryType },
            select: { integrityLabel: true, integrityLabelStorefront: true },
          })
        : await prisma.leadCategory.findFirst({
            where: { type: "traditional_iul" },
            select: { integrityLabel: true, integrityLabelStorefront: true },
          });

    const labelSources: IntegrityLabelSources = {
      realtime: category?.integrityLabel ?? null,
      storefront: category?.integrityLabelStorefront ?? null,
    };
    const leadTypeThom = resolveIntegrityLabelForMode(flow, labelSources) ?? "";

    testFields = {
      first_name: "Mike",
      last_name: "Jones",
      email: "bill.ahognonvi+test@techma.ca",
      phone_1: "5127891111",
      state: "Texas",
      dob: "6/2/1980",
      dob_mmddyyyy_thom: "06/02/1980",
      lead_type_thom: leadTypeThom,
      has_iul_thom: "yes",
      primary_goal_thom: "Stability",
      vendor_lead_id_thom: "test-001",
      address_1: "",
      trustedform_cert_url:
        "https://cert.trustedform.com/a1028cbb41b876744fa752eec276bec0e4c48b33",
      is_test: "yes",
    };
  }

  const encodedBody = encodeIntegrityFormBody(testFields);

  let pingPreview: Record<string, unknown> | undefined;
  if (flow === "realtime" && leadId) {
    const ping = await realtimeIulCampaignPing(leadId);
    pingPreview = redactSecrets({
      eligible: true,
      accepted: ping.accepted,
      campaignAccepted: ping.campaignAccepted,
      message: ping.message,
      externalRequestSent: false,
    });
  }

  let rawResponse: unknown;
  let httpStatus: number;

  try {
    const res = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: encodedBody,
    });
    httpStatus = res.status;
    rawResponse = await res.json();
    logIntegrityAction("test_response", {
      flow,
      vendor: vendorKey,
      enabled: vendor.enabled,
      integrationsMode,
      httpStatus,
      outcome:
        typeof rawResponse === "object" &&
        rawResponse !== null &&
        (rawResponse as { outcome?: string }).outcome === "success"
          ? "success"
          : "error",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach LeadConduit", detail: String(err) },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      flow,
      submitUrl,
      httpStatus,
      lead: leadSummary,
      payload: testFields,
      encodedBody,
      encodedFields: Object.fromEntries(new URLSearchParams(encodedBody).entries()),
      pingPreview,
      response: rawResponse,
      requiredFieldsCheck,
      integrationsMode,
    },
    { status: 200 },
  );
}

/**
 * GET /api/admin/integrity/test
 * Returns recent leads (for picker), categories, and vendor status.
 */
export async function GET() {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const [leadRows, categories, realtimeVendor, storefrontVendor] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { receivedAt: "desc" },
      take: 30,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        leadType: true,
        state: true,
        dob: true,
        address: true,
        city: true,
        zip: true,
        trustedformCertUrl: true,
        leadidToken: true,
        externalId: true,
        haveIul: true,
        primaryGoal: true,
        beneficiary: true,
        beneficiaryType: true,
        historyOfCancer: true,
        mortgageLoanAmount: true,
        receivedAt: true,
      },
    }),
    prisma.leadCategory.findMany({
      select: {
        type: true,
        label: true,
        integrityLabel: true,
        integrityLabelStorefront: true,
      },
    }),
    getIntegrityRealtimeVendor(),
    getIntegrityStorefrontVendor(),
  ]);

  // Surface required-field gaps per lead so admins can spot them in the
  // picker without needing to run the test first.
  const leads = leadRows.map((lead) => ({
    ...lead,
    missingRequiredFields: checkRequiredIntegrityFields(lead).missing,
  }));

  return NextResponse.json({
    leads,
    categories,
    vendors: {
      realtime: {
        key: INTEGRITY_REALTIME_VENDOR_KEY,
        enabled: realtimeVendor?.enabled ?? false,
        hasUrl: !!realtimeVendor?.postUrl,
      },
      storefront: {
        key: INTEGRITY_STOREFRONT_VENDOR_KEY,
        enabled: storefrontVendor?.enabled ?? false,
        hasUrl: !!storefrontVendor?.postUrl,
      },
    },
  });
}
