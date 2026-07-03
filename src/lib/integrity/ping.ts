import { getIntegrationsMode } from "@/lib/settings/app-settings";

export interface IntegrityPingResult {
  accepted: boolean;
  externalRef?: string;
  message?: string;
}

export async function integrityPing(leadId: string): Promise<IntegrityPingResult> {
  const mode = await getIntegrationsMode();

  if (mode === "mock") {
    return { accepted: true, externalRef: `mock-ping-${leadId.slice(0, 8)}` };
  }

  const pingUrl = process.env.INTEGRITY_PING_URL;
  if (!pingUrl) {
    return { accepted: false, message: "INTEGRITY_PING_URL not configured" };
  }

  const res = await fetch(pingUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId }),
  });

  if (!res.ok) {
    return { accepted: false, message: `Ping failed: ${res.status}` };
  }

  const data = (await res.json()) as { accepted?: boolean; ref?: string };
  return {
    accepted: data.accepted ?? true,
    externalRef: data.ref,
  };
}
