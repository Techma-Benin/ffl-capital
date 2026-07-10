import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { matchLead } from "@/lib/matching/engine";
import { deliverLead } from "@/lib/delivery/deliver-lead";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { LeadEventType } from "@prisma/client";

const redeliverSchema = z.object({
  partnerId: z.string().uuid().optional(),
  filterSetId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = redeliverSchema.safeParse(body);

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.lead.update({
    where: { id: params.id },
    data: { available: true, status: LeadStatus.unmatched },
  });

  const excludePartnerIds =
    parsed.success && parsed.data.partnerId ? [parsed.data.partnerId] : undefined;

  const matchResult = await matchLead(params.id, { excludePartnerIds });

  if (matchResult.matched && matchResult.deliveryId) {
    await deliverLead(matchResult.deliveryId);
    await emitLeadEvent(params.id, LeadEventType.reprocessed, {
      forced: true,
      filterSetId: parsed.success ? parsed.data.filterSetId : undefined,
      deliveryId: matchResult.deliveryId,
      partnerId: matchResult.partner?.id,
    });
  }

  return NextResponse.json(matchResult);
}
