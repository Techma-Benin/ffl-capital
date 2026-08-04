import {
  LeadCategoryResolution,
  LeadEventType,
  LeadStatus,
  ResaleMode,
  ResaleStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import {
  getIntegrationsMode,
  getIntegrityRealtimeVendor,
  getIntegrityStorefrontVendor,
} from "@/lib/settings/app-settings";
import {
  INTEGRITY_REALTIME_VENDOR_KEY,
  INTEGRITY_STOREFRONT_VENDOR_KEY,
} from "@/lib/settings/resale-vendor-keys";
import { integrityRealtimeSkipReason } from "@/lib/constants/us-states";
import {
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
} from "./build-payload";
import { logIntegrityAction, urlHost } from "./log";
import { integrityPing } from "./ping";
import { checkRequiredIntegrityFields } from "./required-fields";

export interface IntegrityPostResult {
  posted: boolean;
  postingId?: string;
  reason?: string;
}

function toFormBody(data: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params.append(key, value);
  }
  return params.toString();
}

async function rejectPosting(
  postingId: string,
  leadId: string,
  reason: string,
  vendorKey: string,
  mode: ResaleMode,
  extras?: {
    requestPayload?: Record<string, string | undefined>;
    response?: unknown;
  },
): Promise<void> {
  await prisma.resalePosting.update({
    where: { id: postingId },
    data: { status: ResaleStatus.rejected },
  });
  await emitLeadEvent(leadId, LeadEventType.integrity_rejected, {
    postingId,
    reason,
    vendor: vendorKey,
    mode,
    outcome: "rejected",
    ...(extras?.requestPayload ? { requestPayload: extras.requestPayload } : {}),
    ...(extras?.response !== undefined ? { response: extras.response } : {}),
  });
  logIntegrityAction("post_rejected", {
    leadId,
    postingId,
    vendor: vendorKey,
    mode,
    reason,
    outcome: "rejected",
  });
}

async function skipIntegrityPost(
  leadId: string,
  reason: string,
  fields: {
    vendor: string;
    mode: ResaleMode;
    enabled?: boolean;
    integrationsMode?: string;
  },
): Promise<IntegrityPostResult> {
  await emitLeadEvent(leadId, LeadEventType.integrity_skipped, {
    reason,
    vendor: fields.vendor,
    mode: fields.mode,
    enabled: fields.enabled,
    integrationsMode: fields.integrationsMode,
    outcome: "skipped",
  });
  logIntegrityAction("post_skipped", {
    leadId,
    vendor: fields.vendor,
    mode: fields.mode,
    enabled: fields.enabled,
    reason,
    outcome: "skipped",
  });
  return { posted: false, reason };
}

async function rejectPostingMissingFields(
  postingId: string,
  leadId: string,
  missing: string[],
  vendorKey: string,
  mode: ResaleMode,
  requestPayload?: Record<string, string | undefined>,
): Promise<string> {
  const reason = `Missing required field(s) for Integrity: ${missing.join(", ")}`;
  await prisma.resalePosting.update({
    where: { id: postingId },
    data: { status: ResaleStatus.rejected },
  });
  await emitLeadEvent(leadId, LeadEventType.integrity_missing_fields, {
    postingId,
    missingFields: missing,
    reason,
    vendor: vendorKey,
    mode,
    outcome: "rejected",
    ...(requestPayload ? { requestPayload } : {}),
  });
  logIntegrityAction("post_missing_fields", {
    leadId,
    postingId,
    vendor: vendorKey,
    mode,
    missingFields: missing,
    reason,
    outcome: "rejected",
  });
  return reason;
}

type IntegritySubmitResult =
  | { ok: true; externalLeadId?: string; response?: unknown }
  | { ok: false; reason: string; response?: unknown };

async function submitToIntegrity(
  url: string,
  payload: Record<string, string | undefined>,
  logFields: Record<string, unknown>,
): Promise<IntegritySubmitResult> {
  logIntegrityAction("post_attempt", {
    ...logFields,
    urlHost: urlHost(url),
    outcome: "attempt",
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: toFormBody(payload),
    });
  } catch (err) {
    const reason = `Network error: ${String(err)}`;
    logIntegrityAction("post_response", { ...logFields, outcome: "error", reason });
    return { ok: false, reason };
  }

  if (!res.ok) {
    const reason = `HTTP ${res.status}`;
    let response: unknown = { httpStatus: res.status };
    try {
      const text = await res.text();
      try {
        response = { httpStatus: res.status, body: JSON.parse(text) };
      } catch {
        response = { httpStatus: res.status, body: text };
      }
    } catch {
      /* keep status-only */
    }
    logIntegrityAction("post_response", { ...logFields, outcome: "error", reason, httpStatus: res.status });
    return { ok: false, reason, response };
  }

  let data: { outcome?: string; lead?: { id?: string }; reason?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    const reason = "Non-JSON response from LeadConduit";
    logIntegrityAction("post_response", { ...logFields, outcome: "error", reason });
    return { ok: false, reason };
  }

  if (data.outcome === "failure" || data.outcome === "error") {
    const reason = data.reason ?? `Rejected: ${data.outcome}`;
    logIntegrityAction("post_response", { ...logFields, outcome: "rejected", reason });
    return { ok: false, reason, response: data };
  }

  logIntegrityAction("post_response", {
    ...logFields,
    outcome: "success",
    externalLeadId: data.lead?.id,
  });
  return { ok: true, externalLeadId: data.lead?.id, response: data };
}

export async function integrityPostLead(
  leadId: string,
  options?: { mode?: ResaleMode },
): Promise<IntegrityPostResult> {
  const resaleMode = options?.mode ?? ResaleMode.realtime;
  const vendorKey =
    resaleMode === ResaleMode.storefront
      ? INTEGRITY_STOREFRONT_VENDOR_KEY
      : INTEGRITY_REALTIME_VENDOR_KEY;
  const vendor =
    resaleMode === ResaleMode.storefront
      ? await getIntegrityStorefrontVendor()
      : await getIntegrityRealtimeVendor();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { posted: false, reason: "Lead not found" };
  if (
    lead.status !== LeadStatus.unmatched ||
    !lead.available ||
    lead.categoryResolution !== LeadCategoryResolution.matched ||
    !lead.leadType
  ) {
    return { posted: false, reason: "Lead not eligible for Integrity post" };
  }

  const existing = await prisma.resalePosting.findFirst({
    where: { leadId, mode: resaleMode },
  });
  if (existing && existing.status !== ResaleStatus.rejected) {
    return { posted: false, reason: "Already posted to Integrity" };
  }

  if (!vendor) {
    return skipIntegrityPost(leadId, `Integrity ${resaleMode} vendor not configured`, {
      vendor: vendorKey,
      mode: resaleMode,
      enabled: false,
    });
  }

  if (!vendor.enabled) {
    return skipIntegrityPost(leadId, `Integrity ${resaleMode} vendor disabled`, {
      vendor: vendorKey,
      mode: resaleMode,
      enabled: false,
    });
  }

  const category = await prisma.leadCategory.findUnique({
    where: { type: lead.leadType },
    select: { integrityLabel: true },
  });
  const integrityLabel = category?.integrityLabel ?? null;
  const integrationsMode = await getIntegrationsMode();

  if (integrationsMode === "mock") {
    const payload =
      resaleMode === ResaleMode.storefront
        ? buildIntegrityStorefrontPayload(lead, integrityLabel)
        : buildIntegrityLeadPayload(lead, integrityLabel);
    logIntegrityAction("post_mock", {
      leadId,
      vendor: vendorKey,
      mode: resaleMode,
      enabled: vendor.enabled,
      integrationsMode,
      lead_type_thom: payload.lead_type_thom,
      urlHost: urlHost(vendor.postUrl),
      outcome: "mock",
    });
    return skipIntegrityPost(leadId, "Integrity post skipped (mock mode)", {
      vendor: vendorKey,
      mode: resaleMode,
      enabled: vendor.enabled,
      integrationsMode,
    });
  }

  const submitUrl = vendor.postUrl;
  if (!submitUrl) {
    return skipIntegrityPost(
      leadId,
      `${resaleMode === ResaleMode.realtime ? "INTEGRITY_REALTIME_SUBMIT_URL" : "INTEGRITY_STOREFRONT_SUBMIT_URL"} not configured`,
      { vendor: vendorKey, mode: resaleMode, enabled: vendor.enabled },
    );
  }

  if (resaleMode === ResaleMode.realtime) {
    const stateSkipReason = integrityRealtimeSkipReason(lead.state);
    if (stateSkipReason) {
      return skipIntegrityPost(leadId, stateSkipReason, {
        vendor: vendorKey,
        mode: resaleMode,
        enabled: vendor.enabled,
      });
    }
  }

  const logFields = {
    leadId,
    vendor: vendorKey,
    mode: resaleMode,
    enabled: vendor.enabled,
    lead_type_thom:
      resaleMode === ResaleMode.storefront
        ? buildIntegrityStorefrontPayload(lead, integrityLabel).lead_type_thom
        : buildIntegrityLeadPayload(lead, integrityLabel).lead_type_thom,
  };

  const posting = existing
    ? await prisma.resalePosting.update({
        where: { id: existing.id },
        data: { status: ResaleStatus.pending, externalRef: null, postedAt: new Date() },
      })
    : await prisma.resalePosting.create({
        data: {
          leadId,
          mode: resaleMode,
          status: ResaleStatus.pending,
          postedAt: new Date(),
        },
      });

  // Verify the fields Integrity requires for this lead's product are present
  // before ever attempting a post, so a missing field is diagnosable on the
  // lead/posting instead of only surfacing later as a vendor-side rejection.
  const builtPayload =
    resaleMode === ResaleMode.storefront
      ? {
          ...buildIntegrityStorefrontPayload(lead, integrityLabel),
          reference: posting.id,
        }
      : {
          ...buildIntegrityLeadPayload(lead, integrityLabel),
          reference: posting.id,
        };

  const requiredFieldsCheck = checkRequiredIntegrityFields(lead);
  if (!requiredFieldsCheck.ok) {
    const reason = await rejectPostingMissingFields(
      posting.id,
      leadId,
      requiredFieldsCheck.missing,
      vendorKey,
      resaleMode,
      builtPayload,
    );
    return { posted: false, reason };
  }

  let submitResponse: unknown;
  let resolvedExternalRef: string | undefined;

  if (resaleMode === ResaleMode.storefront) {
    let ping: Awaited<ReturnType<typeof integrityPing>>;
    try {
      ping = await integrityPing(leadId, ResaleMode.storefront);
    } catch (err) {
      const reason = `Ping threw unexpectedly: ${String(err)}`;
      await rejectPosting(posting.id, leadId, reason, vendorKey, resaleMode, {
        requestPayload: builtPayload,
      });
      return { posted: false, reason };
    }
    if (!ping.accepted) {
      await rejectPosting(
        posting.id,
        leadId,
        ping.message ?? "Integrity ping rejected",
        vendorKey,
        resaleMode,
        {
          requestPayload: builtPayload,
          response: { pingAccepted: false, message: ping.message, externalRef: ping.externalRef },
        },
      );
      return { posted: false, reason: ping.message ?? "Integrity ping rejected" };
    }

    const result = await submitToIntegrity(submitUrl, builtPayload, logFields);

    if (!result.ok) {
      await rejectPosting(posting.id, leadId, result.reason, vendorKey, resaleMode, {
        requestPayload: builtPayload,
        response: result.response,
      });
      return { posted: false, reason: result.reason };
    }

    submitResponse = result.response;
    resolvedExternalRef = result.externalLeadId ?? ping.externalRef;
    if (resolvedExternalRef) {
      await prisma.resalePosting.update({
        where: { id: posting.id },
        data: { externalRef: resolvedExternalRef },
      });
    }
  } else {
    const result = await submitToIntegrity(submitUrl, builtPayload, logFields);

    if (!result.ok) {
      await rejectPosting(posting.id, leadId, result.reason, vendorKey, resaleMode, {
        requestPayload: builtPayload,
        response: result.response,
      });
      return { posted: false, reason: result.reason };
    }

    submitResponse = result.response;
    resolvedExternalRef = result.externalLeadId;
    if (resolvedExternalRef) {
      await prisma.resalePosting.update({
        where: { id: posting.id },
        data: { externalRef: resolvedExternalRef },
      });
    }
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: LeadStatus.integrity_posted },
  });

  await emitLeadEvent(leadId, LeadEventType.integrity_posted, {
    postingId: posting.id,
    mode: resaleMode,
    vendor: vendorKey,
    outcome: "posted",
    requestPayload: builtPayload,
    response: submitResponse ?? { externalLeadId: resolvedExternalRef },
  });

  logIntegrityAction("post_complete", {
    ...logFields,
    postingId: posting.id,
    outcome: "posted",
  });

  return { posted: true, postingId: posting.id };
}

export async function integrityPostStorefrontLead(
  leadId: string,
): Promise<IntegrityPostResult> {
  return integrityPostLead(leadId, { mode: ResaleMode.storefront });
}
