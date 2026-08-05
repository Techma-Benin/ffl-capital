import { ResaleMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getIntegrationsMode,
  getIntegrityRealtimeVendor,
} from "@/lib/settings/app-settings";
import { INTEGRITY_REALTIME_VENDOR_KEY } from "@/lib/settings/resale-vendor-keys";
import {
  buildRealtimeIulPingPayload,
  resolveIntegrityLabel,
  type IntegrityLabelSources,
} from "./build-payload";
import { logIntegrityAction } from "./log";
import {
  hasAzurePingSecrets,
  redactSecrets,
  resolveAzurePingUrl,
} from "./redact-secrets";

export interface RealtimeIulPingResult {
  accepted: boolean;
  campaignAccepted?: boolean;
  message?: string;
}

const IUL_LEAD_TYPES = new Set(["traditional_iul", "high_intent_iul"]);

export function isRealtimeIulLeadType(leadType: string | null | undefined): boolean {
  if (!leadType) return false;
  if (IUL_LEAD_TYPES.has(leadType)) return true;
  return leadType.includes("iul");
}

/**
 * Azure IsAcceptingCampaign ping for Realtime IUL only.
 * Storefront and non-IUL Realtime categories skip ping.
 */
export async function realtimeIulCampaignPing(
  leadId: string,
  mode: ResaleMode = ResaleMode.realtime,
): Promise<RealtimeIulPingResult> {
  if (mode !== ResaleMode.realtime) {
    return { accepted: true };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { accepted: false, message: "Lead not found" };
  }

  if (!isRealtimeIulLeadType(lead.leadType)) {
    return { accepted: true };
  }

  const vendor = await getIntegrityRealtimeVendor();
  if (!vendor?.enabled) {
    const reason = !vendor
      ? "Integrity realtime vendor not configured"
      : "Integrity realtime vendor disabled";
    logIntegrityAction("ping_skipped", redactSecrets({
      leadId,
      vendor: INTEGRITY_REALTIME_VENDOR_KEY,
      mode,
      reason,
      outcome: "skipped",
    }));
    return { accepted: false, message: reason };
  }

  const integrationsMode = await getIntegrationsMode();
  if (integrationsMode === "mock") {
    logIntegrityAction("ping_mock", redactSecrets({
      leadId,
      vendor: INTEGRITY_REALTIME_VENDOR_KEY,
      mode,
      integrationsMode,
      outcome: "mock",
    }));
    return { accepted: true, campaignAccepted: true };
  }

  if (!hasAzurePingSecrets()) {
    return {
      accepted: false,
      message:
        "Azure ping secrets not configured (INTEGRITY_REALTIME_PING_URL, INTEGRITY_PING_VENDOR_ID, INTEGRITY_PING_FUNCTIONS_KEY)",
    };
  }

  const pingUrl = resolveAzurePingUrl(vendor.pingUrl);
  if (!pingUrl) {
    return {
      accepted: false,
      message: "INTEGRITY_REALTIME_PING_URL not configured",
    };
  }

  const category = await prisma.leadCategory.findUnique({
    where: { type: lead.leadType ?? "" },
    select: { integrityLabel: true, integrityLabelStorefront: true },
  });
  const labelSources: IntegrityLabelSources = {
    realtime: category?.integrityLabel ?? null,
    storefront: category?.integrityLabelStorefront ?? null,
  };
  const leadTypeThom = resolveIntegrityLabel(labelSources.realtime);
  if (!leadTypeThom) {
    return {
      accepted: false,
      message: "Lead category has no Realtime Integrity label",
    };
  }

  const payload = buildRealtimeIulPingPayload(lead, leadTypeThom);
  const vendorId = process.env.INTEGRITY_PING_VENDOR_ID!.trim();
  const functionKey = process.env.INTEGRITY_PING_FUNCTIONS_KEY!.trim();

  logIntegrityAction("ping_attempt", redactSecrets({
    leadId,
    vendor: INTEGRITY_REALTIME_VENDOR_KEY,
    mode,
    pingHost: new URL(pingUrl).host,
    lead_type_thom: leadTypeThom,
    outcome: "attempt",
  }));

  let res: Response;
  try {
    res = await fetch(pingUrl, {
      method: "POST",
      headers: {
        VendorId: vendorId,
        "x-functions-key": functionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = `Ping network error: ${String(err)}`;
    logIntegrityAction("ping_response", redactSecrets({
      leadId,
      vendor: INTEGRITY_REALTIME_VENDOR_KEY,
      mode,
      reason: message,
      outcome: "error",
    }));
    return { accepted: false, message };
  }

  const raw = (await res.text()).trim();
  const normalized = raw.replace(/^"|"$/g, "").toLowerCase();

  if (!res.ok) {
    const message = `Ping failed: HTTP ${res.status}`;
    logIntegrityAction("ping_response", redactSecrets({
      leadId,
      vendor: INTEGRITY_REALTIME_VENDOR_KEY,
      mode,
      httpStatus: res.status,
      reason: message,
      outcome: "error",
    }));
    return { accepted: false, message };
  }

  if (normalized !== "true" && normalized !== "false") {
    const message = "Ping returned unexpected response shape";
    logIntegrityAction("ping_response", redactSecrets({
      leadId,
      vendor: INTEGRITY_REALTIME_VENDOR_KEY,
      mode,
      reason: message,
      outcome: "error",
    }));
    return { accepted: false, message };
  }

  const campaignAccepted = normalized === "true";
  logIntegrityAction("ping_response", redactSecrets({
    leadId,
    vendor: INTEGRITY_REALTIME_VENDOR_KEY,
    mode,
    campaignAccepted,
    outcome: campaignAccepted ? "accepted" : "rejected",
  }));

  if (!campaignAccepted) {
    return {
      accepted: false,
      campaignAccepted: false,
      message: "Campaign declined by Azure IsAcceptingCampaign",
    };
  }

  return { accepted: true, campaignAccepted: true };
}
