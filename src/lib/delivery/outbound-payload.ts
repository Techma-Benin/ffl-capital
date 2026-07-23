import type { CrmOutboundFieldMapping } from "@/lib/crm-outbound/schemas";
import type { PartnerCrmOutboundAuthType } from "@prisma/client";

type SourcePayload = Record<string, unknown>;

export function buildFlatOutboundPayload(
  source: SourcePayload,
  mappings: CrmOutboundFieldMapping[],
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};

  for (const { source: srcKey, target } of mappings) {
    if (!(srcKey in source)) continue;
    const value = source[srcKey];
    if (value === undefined) continue;
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[target] = value;
    } else {
      out[target] = String(value);
    }
  }

  return out;
}

export function mergeBodyFieldAuth(
  body: Record<string, string | number | boolean | null>,
  authType: PartnerCrmOutboundAuthType,
  authConfig: unknown,
): Record<string, string | number | boolean | null> {
  if (authType !== "body_fields") return body;

  const cfg = authConfig as { fields?: { key: string; value: string }[] } | null;
  const fields = cfg?.fields ?? [];
  const merged = { ...body };
  for (const { key, value } of fields) {
    merged[key] = value;
  }
  return merged;
}
