import { NextRequest, NextResponse } from "next/server";
import { PartnerStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const patchSchema = z.object({
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  status: z.enum(["active", "disabled", "pending_approval", "rejected"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      leadDeliveries: {
        orderBy: { deliveredAt: "desc" },
        take: 10,
        include: { lead: true },
      },
    },
  });

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  return NextResponse.json({ partner });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data: {
    priority?: number;
    priceOverride?: number | null;
    status?: PartnerStatus;
  } = {};

  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.priceOverride !== undefined) {
    data.priceOverride = parsed.data.priceOverride;
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status as PartnerStatus;
  }

  const partner = await prisma.partner.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ partner });
}
