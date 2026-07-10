import { NextRequest, NextResponse } from "next/server";
import { RefundType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { processRefundApproval } from "@/lib/refunds/process-refund";
import { getPartnerId } from "@/lib/partner/session";

const refundSchema = z.object({
  refundType: z.enum(["wrong_filter", "invalid_phone"]),
  reason: z.string().max(500).optional(),
  leadDeliveryId: z.string().uuid().optional(),
  autoApprove: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      leadDeliveries: {
        where: { refundedAt: null },
        orderBy: { deliveredAt: "desc" },
        take: 1,
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const deliveryId =
    parsed.data.leadDeliveryId ?? lead.leadDeliveries[0]?.id;
  if (!deliveryId) {
    return NextResponse.json({ error: "No delivery to refund" }, { status: 400 });
  }

  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: deliveryId },
  });
  if (!delivery || delivery.leadId !== params.id) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  const reviewerId = await getPartnerId();

  const refundRequest = await prisma.refundRequest.create({
    data: {
      leadDeliveryId: delivery.id,
      partnerId: delivery.partnerId,
      refundType: parsed.data.refundType as RefundType,
      reason: parsed.data.reason ?? "Admin-initiated refund",
    },
  });

  if (parsed.data.autoApprove !== false) {
    await processRefundApproval(refundRequest.id, reviewerId ?? undefined);
  }

  return NextResponse.json({ refundRequest });
}
