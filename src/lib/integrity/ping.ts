import { ResaleMode } from "@prisma/client";
import { getIntegrationsMode } from "@/lib/settings/app-settings";
import { buildIntegrityPingPayload } from "./build-payload";

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
  // Only Storefront supports ping; RealTime is direct submit
  if (mode && mode !== ResaleMode.storefront) {
    return { accepted: true };
  }

  const integrationsMode = await getIntegrationsMode();

  if (integrationsMode === "mock") {
    return { accepted: true, externalRef: `mock-ping-${leadId.slice(0, 8)}` };
  }

  const pingUrl = process.env.INTEGRITY_STOREFRONT_SUBMIT_URL;
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

  let res: Response;
  try {
    res = await fetch(pingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) {
    return { accepted: false, message: `Ping network error: ${String(err)}` };
  }

  if (!res.ok) {
    return { accepted: false, message: `Ping failed: ${res.status}` };
  }

  let data: { outcome?: string; lead?: { id?: string }; reason?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { accepted: false, message: "Ping returned non-JSON response" };
  }

  if (data.outcome === "failure" || data.outcome === "error") {
    return {
      accepted: false,
      message: data.reason ?? `Ping rejected: ${data.outcome}`,
    };
  }

  return {
    accepted: true,
    externalRef: data.lead?.id,
  };
}
