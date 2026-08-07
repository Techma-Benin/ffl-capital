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
import {
  applyIntegrityAutoPostTestFlag,
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
  encodeIntegrityFormBody,
  type IntegrityLabelSources,
  type IntegrityResaleMode,
} from "./build-payload";
import {
  classifyIntegrityFailure,
  formatIntegrityBlockReason,
  type IntegrityFailureClass,
} from "./classify";
import { logIntegrityAction, urlHost } from "./log";
import { realtimeIulCampaignPing } from "./azure-ping";
import { isNoCampaignAvailableReason } from "./no-campaign";

export interface IntegrityPostResult {
  posted: boolean;
  postingId?: string;
  reason?: string;
  failureClass?: IntegrityFailureClass;
}

async function markIntegrityBlocked(
  leadId: string,
  reason: string,
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      integrityBlockedAt: new Date(),
      integrityBlockedReason: formatIntegrityBlockReason(reason),
    },
  });
}

async function restoreLeadForRouting(leadId: string): Promise<void> {
  await prisma.lead.updateMany({
    where: {
      id: leadId,
      status: LeadStatus.integrity_posted,
      available: true,
    },
    data: {
      status: LeadStatus.unmatched,
      nextRoutingAttemptAt: new Date(),
    },
  });
}

async function noCampaignPosting(
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
  await restoreLeadForRouting(leadId);
  await emitLeadEvent(leadId, LeadEventType.integrity_no_campaign, {
    postingId,
    reason,
    vendor: vendorKey,
    mode,
    outcome: "no_campaign_available",
    failureClass: "retryable_no_campaign",
    ...(extras?.requestPayload ? { requestPayload: extras.requestPayload } : {}),
    ...(extras?.response !== undefined ? { response: extras.response } : {}),
  });
  logIntegrityAction("post_no_campaign", {
    leadId,
    postingId,
    vendor: vendorKey,
    mode,
    reason,
    outcome: "no_campaign_available",
  });
}

async function failIntegrityPosting(
  postingId: string,
  leadId: string,
  reason: string,
  vendorKey: string,
  mode: ResaleMode,
  extras?: {
    requestPayload?: Record<string, string | undefined>;
    response?: unknown;
    httpStatus?: number;
    isNetworkError?: boolean;
    outcome?: string;
  },
): Promise<IntegrityFailureClass> {
  const failureClass = classifyIntegrityFailure({
    outcome: extras?.outcome ?? "failure",
    reason,
    httpStatus: extras?.httpStatus,
    isNetworkError: extras?.isNetworkError,
  });

  if (failureClass === "retryable_no_campaign") {
    await noCampaignPosting(postingId, leadId, reason, vendorKey, mode, extras);
    return failureClass;
  }

  if (failureClass === "operational_failure") {
    await prisma.resalePosting.update({
      where: { id: postingId },
      data: { status: ResaleStatus.rejected },
    });
    await restoreLeadForRouting(leadId);
    await emitLeadEvent(leadId, LeadEventType.integrity_error, {
      postingId,
      reason,
      vendor: vendorKey,
      mode,
      outcome: "operational_failure",
      failureClass,
      ...(extras?.requestPayload ? { requestPayload: extras.requestPayload } : {}),
      ...(extras?.response !== undefined ? { response: extras.response } : {}),
    });
    logIntegrityAction("post_operational_failure", {
      leadId,
      postingId,
      vendor: vendorKey,
      mode,
      reason,
      outcome: "operational_failure",
    });
    return failureClass;
  }

  await rejectPosting(postingId, leadId, reason, vendorKey, mode, extras);
  await markIntegrityBlocked(leadId, reason);
  await restoreLeadForRouting(leadId);
  return failureClass;
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
    failureClass: "terminal_business_rejection",
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
  return { posted: false, reason, failureClass: "operational_failure" };
}

type IntegritySubmitResult =
  | { ok: true; externalLeadId?: string; response?: unknown }
  | {
      ok: false;
      reason: string;
      response?: unknown;
      httpStatus?: number;
      isNetworkError?: boolean;
    };

/** Exported for unit tests (mock fetch). */
export async function submitToIntegrity(
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
      body: encodeIntegrityFormBody(payload),
    });
  } catch (err) {
    const reason = `Network error: ${String(err)}`;
    logIntegrityAction("post_response", { ...logFields, outcome: "error", reason });
    return { ok: false, reason, isNetworkError: true };
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
    return { ok: false, reason, response, httpStatus: res.status };
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
    const outcome = isNoCampaignAvailableReason(reason)
      ? "no_campaign_available"
      : "rejected";
    logIntegrityAction("post_response", { ...logFields, outcome, reason });
    return { ok: false, reason, response: data };
  }

  logIntegrityAction("post_response", {
    ...logFields,
    outcome: "success",
    externalLeadId: data.lead?.id,
  });
  return { ok: true, externalLeadId: data.lead?.id, response: data };
}

function toIntegrityMode(mode: ResaleMode): IntegrityResaleMode {
  return mode === ResaleMode.storefront ? "storefront" : "realtime";
}

export async function integrityPostLead(
  leadId: string,
  options?: { mode?: ResaleMode },
): Promise<IntegrityPostResult> {
  const resaleMode = options?.mode ?? ResaleMode.realtime;
  const integrityMode = toIntegrityMode(resaleMode);
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
    select: { integrityLabel: true, integrityLabelStorefront: true },
  });
  const labelSources: IntegrityLabelSources = {
    realtime: category?.integrityLabel ?? null,
    storefront: category?.integrityLabelStorefront ?? null,
  };
  const integrationsMode = await getIntegrationsMode();
  const isTestPost = integrationsMode === "mock";

  const submitUrl = vendor.postUrl;
  if (!submitUrl) {
    return skipIntegrityPost(
      leadId,
      `${resaleMode === ResaleMode.realtime ? "INTEGRITY_REALTIME_SUBMIT_URL" : "INTEGRITY_STOREFRONT_SUBMIT_URL"} not configured`,
      { vendor: vendorKey, mode: resaleMode, enabled: vendor.enabled, integrationsMode },
    );
  }

  const logFields = {
    leadId,
    vendor: vendorKey,
    mode: resaleMode,
    enabled: vendor.enabled,
    integrationsMode,
    isTest: isTestPost,
    lead_type_thom:
      resaleMode === ResaleMode.storefront
        ? buildIntegrityStorefrontPayload(lead, labelSources.realtime, labelSources)
            .lead_type_thom
        : buildIntegrityLeadPayload(lead, labelSources.realtime, { mode: integrityMode })
            .lead_type_thom,
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

  const rawPayload =
    resaleMode === ResaleMode.storefront
      ? {
          ...buildIntegrityStorefrontPayload(lead, labelSources.realtime, labelSources),
          reference: posting.id,
        }
      : {
          ...buildIntegrityLeadPayload(lead, labelSources.realtime, { mode: integrityMode }),
          reference: posting.id,
        };
  const builtPayload = applyIntegrityAutoPostTestFlag(rawPayload, integrationsMode);

  if (resaleMode === ResaleMode.realtime) {
    const ping = await realtimeIulCampaignPing(leadId, ResaleMode.realtime);
    if (!ping.accepted) {
      const failureClass = await failIntegrityPosting(
        posting.id,
        leadId,
        ping.message ?? "Realtime IUL campaign ping declined",
        vendorKey,
        resaleMode,
        {
          requestPayload: builtPayload,
          response: {
            pingAccepted: false,
            campaignAccepted: ping.campaignAccepted,
            message: ping.message,
          },
          outcome: "failure",
        },
      );
      return {
        posted: false,
        reason: ping.message ?? "Realtime IUL campaign ping declined",
        failureClass,
      };
    }
  }

  const result = await submitToIntegrity(submitUrl, builtPayload, logFields);

  if (!result.ok) {
    const failureClass = await failIntegrityPosting(
      posting.id,
      leadId,
      result.reason,
      vendorKey,
      resaleMode,
      {
        requestPayload: builtPayload,
        response: result.response,
        httpStatus: result.httpStatus,
        isNetworkError: result.isNetworkError,
        outcome: "failure",
      },
    );
    return { posted: false, reason: result.reason, failureClass };
  }

  const resolvedExternalRef = result.externalLeadId;
  if (resolvedExternalRef) {
    await prisma.resalePosting.update({
      where: { id: posting.id },
      data: { externalRef: resolvedExternalRef },
    });
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
    isTest: isTestPost,
    integrationsMode,
    requestPayload: builtPayload,
    response: result.response ?? { externalLeadId: resolvedExternalRef },
  });

  logIntegrityAction("post_complete", {
    ...logFields,
    postingId: posting.id,
    outcome: isTestPost ? "posted_test" : "posted",
  });

  return { posted: true, postingId: posting.id };
}

export async function integrityPostStorefrontLead(
  leadId: string,
): Promise<IntegrityPostResult> {
  return integrityPostLead(leadId, { mode: ResaleMode.storefront });
}
