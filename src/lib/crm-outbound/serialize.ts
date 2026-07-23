import type { PartnerCrmOutboundConfig } from "@prisma/client";
import type { CrmOutboundConfigInput } from "./schemas";

export type CrmOutboundConfigResponse = {
  enabled: boolean;
  endpointUrl: string;
  httpMethod: "POST";
  authType: PartnerCrmOutboundConfig["authType"];
  authConfig: unknown;
  fieldMappings: CrmOutboundConfigInput["fieldMappings"];
  successRule: CrmOutboundConfigInput["successRule"];
  updatedAt: string;
};

export function serializeCrmOutboundConfig(
  row: PartnerCrmOutboundConfig,
): CrmOutboundConfigResponse {
  return {
    enabled: row.enabled,
    endpointUrl: row.endpointUrl,
    httpMethod: "POST",
    authType: row.authType,
    authConfig: row.authConfig,
    fieldMappings: row.fieldMappings as CrmOutboundConfigInput["fieldMappings"],
    successRule: row.successRule as CrmOutboundConfigInput["successRule"],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function crmOutboundConfiguredForDisplay(
  row: PartnerCrmOutboundConfig | null | undefined,
): boolean {
  if (!row?.enabled) return false;
  const mappings = row.fieldMappings as { source?: string; target?: string }[];
  return Array.isArray(mappings) && mappings.length > 0 && Boolean(row.endpointUrl?.trim());
}
