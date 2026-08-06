import { prisma } from "@/lib/db";
import type { CrmOutboundFieldMapping } from "@/lib/crm-outbound/schemas";
import { buildCrmOutboundTestSourcePayload } from "@/lib/crm-outbound/test-fixture";
import {
  buildFlatOutboundPayload,
  mergeBodyFieldAuth,
} from "@/lib/delivery/outbound-payload";
import { postPartnerCrmOutbound } from "@/lib/delivery/outbound-http";

export type CrmOutboundTestRunResult = {
  ok: boolean;
  statusCode: number | null;
  bodyPreview: string | null;
  error: string | null;
  requestPayload: Record<string, unknown>;
};

/** Synthetic POST using the partner's saved CRM outbound config. */
export async function runPartnerCrmOutboundTest(
  partnerId: string,
): Promise<
  | { ok: true; result: CrmOutboundTestRunResult }
  | { ok: false; error: string; status: number }
> {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { crmOutboundConfig: true },
  });

  if (!partner?.crmOutboundConfig) {
    return {
      ok: false,
      error: "Save CRM outbound settings before testing",
      status: 400,
    };
  }

  const config = partner.crmOutboundConfig;
  const sourcePayload = buildCrmOutboundTestSourcePayload(
    partner.id,
    partner.email,
  );
  const mappings = config.fieldMappings as CrmOutboundFieldMapping[];
  let requestPayload = buildFlatOutboundPayload(
    sourcePayload as Record<string, unknown>,
    mappings,
  );
  requestPayload = mergeBodyFieldAuth(
    requestPayload,
    config.authType,
    config.authConfig,
  );

  const result = await postPartnerCrmOutbound(
    config,
    sourcePayload as Record<string, unknown>,
  );

  return {
    ok: true,
    result: {
      ok: result.ok,
      statusCode: result.statusCode ?? null,
      bodyPreview: result.bodyPreview ?? null,
      error: result.error ?? null,
      requestPayload,
    },
  };
}
