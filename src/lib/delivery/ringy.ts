import type { Lead, LeadDelivery, Partner } from "@prisma/client";
import { buildLeadDeliveryPayload } from "./lead-payload";

const RINGY_URL = "https://app.ringy.com/api/public/leads/new-lead";

function formatBirthday(dob: string | null): string | undefined {
  if (!dob) return undefined;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return dob;
  const m = parsed.getMonth() + 1;
  const d = parsed.getDate();
  const y = parsed.getFullYear();
  return `${m}/${d}/${y}`;
}

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function buildRingyPayload(
  delivery: LeadDelivery,
  lead: Lead,
  partner: Partner,
) {
  const base = buildLeadDeliveryPayload(delivery, lead, partner);
  return {
    sid: partner.ringySid,
    authToken: partner.ringyAuthToken,
    first_name: base.firstName,
    last_name: base.lastName,
    state: base.state,
    phone_number: formatPhone(base.phone),
    email: base.email,
    birthday: formatBirthday(base.dob),
    age: base.age ? parseInt(base.age, 10) || undefined : undefined,
    do_you_have_an_iul: base.haveIul,
    goal: base.primaryGoal,
    date_created: base.receivedAt,
  };
}

export interface RingyDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
}

export async function deliverToRingy(
  delivery: LeadDelivery,
  lead: Lead,
  partner: Partner,
): Promise<RingyDeliveryResult> {
  if (!partner.ringySid || !partner.ringyAuthToken) {
    return { success: false, error: "Ringy credentials not configured" };
  }

  const payload = buildRingyPayload(delivery, lead, partner);

  try {
    const res = await fetch(RINGY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseBody = await res.text();
    const success =
      res.ok && /vendorResponseId/.test(responseBody);

    return {
      success,
      statusCode: res.status,
      responseBody: responseBody.slice(0, 500),
      error: success ? undefined : `Ringy returned ${res.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ringy request failed",
    };
  }
}
