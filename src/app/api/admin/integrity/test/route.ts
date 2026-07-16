import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
} from "@/lib/integrity/build-payload";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const body = (await request.json()) as {
    flow?: string;
    leadId?: string;
    manualPayload?: Record<string, string>;
  };
  const { flow, leadId, manualPayload } = body;

  if (flow !== "realtime" && flow !== "storefront") {
    return NextResponse.json(
      { error: 'flow must be "realtime" or "storefront"' },
      { status: 400 },
    );
  }

  const submitUrl =
    flow === "realtime"
      ? process.env.INTEGRITY_REALTIME_SUBMIT_URL
      : process.env.INTEGRITY_STOREFRONT_SUBMIT_URL;

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

  if (manualPayload) {
    // Use admin-supplied fields directly
    const filtered = Object.fromEntries(
      Object.entries(manualPayload).filter(([, v]) => v && v.trim() !== ""),
    ) as Record<string, string>;
    testFields = { ...filtered, is_test: "yes" };
  } else if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const category = await prisma.leadCategory.findUnique({
      where: { type: lead.leadType ?? "" },
      select: { integrityLabel: true },
    });
    const rawPayload =
      flow === "realtime"
        ? buildIntegrityLeadPayload(lead, category?.integrityLabel)
        : buildIntegrityStorefrontPayload(lead, category?.integrityLabel);
    testFields = { ...rawPayload, is_test: "yes" } as Record<string, string>;
    leadSummary = {
      id: lead.id,
      name: `${lead.firstName} ${lead.lastName}`,
      leadType: lead.leadType,
      state: lead.state,
      hasTrustedform: !!lead.trustedformCertUrl,
      hasDob: !!lead.dob,
    };
  } else {
    // Hardcoded test payload (mirrors LeadConduit docs example)
    testFields = {
      first_name: "Mike",
      last_name: "Jones",
      email: "bill.ahognonvi+test@techma.ca",
      phone_1: "5127891111",
      state: "TX",
      dob_mmddyyyy_thom: "06/02/1980",
      lead_type_thom: "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
      has_iul_thom: "yes",
      primary_goal_thom: "Stability",
      vendor_lead_id_thom: "test-001",
      trustedform_cert_url:
        "https://cert.trustedform.com/a1028cbb41b876744fa752eec276bec0e4c48b33",
      is_test: "yes",
    };
  }

  const params = new URLSearchParams(testFields);

  let rawResponse: unknown;
  let httpStatus: number;

  try {
    const res = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: params.toString(),
    });
    httpStatus = res.status;
    rawResponse = await res.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach LeadConduit", detail: String(err) },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { flow, submitUrl, httpStatus, lead: leadSummary, payload: testFields, response: rawResponse },
    { status: 200 },
  );
}

/**
 * GET /api/admin/integrity/test
 * Returns recent leads (for picker) and lead categories (for label lookup).
 */
export async function GET() {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const [leads, categories] = await Promise.all([
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
        trustedformCertUrl: true,
        externalId: true,
        haveIul: true,
        primaryGoal: true,
        receivedAt: true,
      },
    }),
    prisma.leadCategory.findMany({
      select: { type: true, integrityLabel: true },
    }),
  ]);

  return NextResponse.json({ leads, categories });
}
