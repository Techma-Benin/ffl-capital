import { LeadEventType, LeadStatus, ResaleMode, ResaleStatus } from "@prisma/client";
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
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
} from "./build-payload";
import { logIntegrityAction, urlHost } from "./log";
import { integrityPing } from "./ping";

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

async function submitToIntegrity(
  url: string,
  payload: Record<string, string | undefined>,
  logFields: Record<string, unknown>,
): Promise<{ ok: true; externalLeadId?: string } | { ok: false; reason: string }> {
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
    logIntegrityAction("post_response", { ...logFields, outcome: "error", reason, httpStatus: res.status });
    return { ok: false, reason };
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
    return { ok: false, reason };
  }

  logIntegrityAction("post_response", {
    ...logFields,
    outcome: "success",
    externalLeadId: data.lead?.id,
  });
  return { ok: true, externalLeadId: data.lead?.id };
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
  if (lead.status !== LeadStatus.unmatched || !lead.available) {
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

  if (resaleMode === ResaleMode.storefront) {
    let ping: Awaited<ReturnType<typeof integrityPing>>;
    try {
      ping = await integrityPing(leadId, ResaleMode.storefront);
    } catch (err) {
      const reason = `Ping threw unexpectedly: ${String(err)}`;
      await rejectPosting(posting.id, leadId, reason, vendorKey, resaleMode);
      return { posted: false, reason };
    }
    if (!ping.accepted) {
      await rejectPosting(
        posting.id,
        leadId,
        ping.message ?? "Integrity ping rejected",
        vendorKey,
        resaleMode,
      );
      return { posted: false, reason: ping.message ?? "Integrity ping rejected" };
    }

    const result = await submitToIntegrity(
      submitUrl,
      {
        ...buildIntegrityStorefrontPayload(lead, integrityLabel),
        reference: posting.id,
      },
      logFields,
    );

    if (!result.ok) {
      await rejectPosting(posting.id, leadId, result.reason, vendorKey, resaleMode);
      return { posted: false, reason: result.reason };
    }

    const externalRef = result.externalLeadId ?? ping.externalRef;
    if (externalRef) {
      await prisma.resalePosting.update({
        where: { id: posting.id },
        data: { externalRef },
      });
    }
  } else {
    const result = await submitToIntegrity(
      submitUrl,
      {
        ...buildIntegrityLeadPayload(lead, integrityLabel),
        reference: posting.id,
      },
      logFields,
    );

    if (!result.ok) {
      await rejectPosting(posting.id, leadId, result.reason, vendorKey, resaleMode);
      return { posted: false, reason: result.reason };
    }

    if (result.externalLeadId) {
      await prisma.resalePosting.update({
        where: { id: posting.id },
        data: { externalRef: result.externalLeadId },
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
