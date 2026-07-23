import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { buildCrmOutboundTestSourcePayload } from "@/lib/crm-outbound/test-fixture";
import { postPartnerCrmOutbound } from "@/lib/delivery/outbound-http";

export async function POST() {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { crmOutboundConfig: true },
  });

  if (!partner?.crmOutboundConfig) {
    return NextResponse.json(
      { error: "Save CRM outbound settings before testing" },
      { status: 400 },
    );
  }

  const sourcePayload = buildCrmOutboundTestSourcePayload(
    partner.id,
    partner.email,
  );

  const result = await postPartnerCrmOutbound(
    partner.crmOutboundConfig,
    sourcePayload as Record<string, unknown>,
  );

  return NextResponse.json({
    ok: result.ok,
    statusCode: result.statusCode ?? null,
    bodyPreview: result.bodyPreview ?? null,
    error: result.error ?? null,
  });
}
