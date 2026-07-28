import { ResaleMode } from "@prisma/client";
import {
  getIntegrationsMode,
  getIntegrityStorefrontVendor,
} from "@/lib/settings/app-settings";
import { INTEGRITY_STOREFRONT_VENDOR_KEY } from "@/lib/settings/resale-vendor-keys";
import { buildIntegrityPingPayload } from "./build-payload";
import { logIntegrityAction, urlHost } from "./log";

export interface IntegrityPingResult {
  accepted: boolean;
  externalRef?: string;
  message?: string;
}

/**
 * Performs a ping against the Integrity Storefront flow.
 * Only applicable for the Storefront (aged leads) flow.
 * The RealTime flow does NOT support ping — do not call this for RealTime.
 */
export async function integrityPing(
  leadId: string,
  mode?: ResaleMode,
): Promise<IntegrityPingResult> {
  if (mode && mode !== ResaleMode.storefront) {
    return { accepted: true };
  }

  const vendor = await getIntegrityStorefrontVendor();
  const vendorKey = INTEGRITY_STOREFRONT_VENDOR_KEY;

  if (!vendor || !vendor.enabled) {
    const reason = !vendor
      ? "Integrity storefront vendor not configured"
      : "Integrity storefront vendor disabled";
    logIntegrityAction("ping_skipped", {
      leadId,
      vendor: vendorKey,
      mode: ResaleMode.storefront,
      enabled: vendor?.enabled ?? false,
      reason,
      outcome: "skipped",
    });
    return { accepted: false, message: reason };
  }

  const integrationsMode = await getIntegrationsMode();

  if (integrationsMode === "mock") {
    logIntegrityAction("ping_mock", {
      leadId,
      vendor: vendorKey,
      mode: ResaleMode.storefront,
      enabled: vendor.enabled,
      integrationsMode,
      outcome: "mock",
    });
    return { accepted: true, externalRef: `mock-ping-${leadId.slice(0, 8)}` };
  }

  const pingUrl = vendor.postUrl;
  if (!pingUrl) {
    return {
      accepted: false,
      message: "INTEGRITY_STOREFRONT_SUBMIT_URL not configured",
    };
  }

  const { prisma } = await import("@/lib/db");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { accepted: false, message: "Lead not found" };
  }

  const category = await prisma.leadCategory.findUnique({
    where: { type: lead.leadType },
    select: { integrityLabel: true },
  });
  const pingPayload = buildIntegrityPingPayload(lead, category?.integrityLabel);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(pingPayload)) {
    if (value !== undefined) {
      params.append(key, value);
    }
  }

  logIntegrityAction("ping_attempt", {
    leadId,
    vendor: vendorKey,
    mode: ResaleMode.storefront,
    enabled: vendor.enabled,
    urlHost: urlHost(pingUrl),
    lead_type_thom: pingPayload.lead_type_thom,
    outcome: "attempt",
  });

  let res: Response;
  try {
    res = await fetch(pingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) {
    const message = `Ping network error: ${String(err)}`;
    logIntegrityAction("ping_response", {
      leadId,
      vendor: vendorKey,
      mode: ResaleMode.storefront,
      reason: message,
      outcome: "error",
    });
    return { accepted: false, message };
  }

  if (!res.ok) {
    const message = `Ping failed: ${res.status}`;
    logIntegrityAction("ping_response", {
      leadId,
      vendor: vendorKey,
      mode: ResaleMode.storefront,
      httpStatus: res.status,
      reason: message,
      outcome: "error",
    });
    return { accepted: false, message };
  }

  let data: { outcome?: string; lead?: { id?: string }; reason?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    const message = "Ping returned non-JSON response";
    logIntegrityAction("ping_response", {
      leadId,
      vendor: vendorKey,
      mode: ResaleMode.storefront,
      reason: message,
      outcome: "error",
    });
    return { accepted: false, message };
  }

  if (data.outcome === "failure" || data.outcome === "error") {
    const message = data.reason ?? `Ping rejected: ${data.outcome}`;
    logIntegrityAction("ping_response", {
      leadId,
      vendor: vendorKey,
      mode: ResaleMode.storefront,
      reason: message,
      outcome: "rejected",
    });
    return { accepted: false, message };
  }

  logIntegrityAction("ping_response", {
    leadId,
    vendor: vendorKey,
    mode: ResaleMode.storefront,
    externalRef: data.lead?.id,
    outcome: "success",
  });

  return {
    accepted: true,
    externalRef: data.lead?.id,
  };
}
