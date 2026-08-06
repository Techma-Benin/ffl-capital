import { NextRequest, NextResponse } from "next/server";
import { LeadType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  leadType: z.enum(["traditional_iul", "high_intent_iul"]).optional(),
  filterStates: z.array(z.string().length(2)).min(15).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
  hourlyLimit: z.number().int().positive().nullable().optional(),
  dailyLimit: z.number().int().positive().nullable().optional(),
  deliveryChannel: z.enum(["email", "webhook", "ringy"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; filterSetId: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const filterSet = await prisma.partnerFilterSet.findFirst({
    where: { id: params.filterSetId, partnerId: params.id },
  });

  if (!filterSet) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  return NextResponse.json({ filterSet });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; filterSetId: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const existing = await prisma.partnerFilterSet.findFirst({
    where: { id: params.filterSetId, partnerId: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const filterSet = await prisma.partnerFilterSet.update({
    where: { id: params.filterSetId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.leadType !== undefined
        ? { leadType: parsed.data.leadType as LeadType }
        : {}),
      ...(parsed.data.filterStates !== undefined
        ? { filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()) }
        : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.priceOverride !== undefined
        ? { priceOverride: parsed.data.priceOverride }
        : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(parsed.data.hourlyLimit !== undefined
        ? { hourlyLimit: parsed.data.hourlyLimit }
        : {}),
      ...(parsed.data.dailyLimit !== undefined
        ? { dailyLimit: parsed.data.dailyLimit }
        : {}),
      ...(parsed.data.deliveryChannel !== undefined
        ? { deliveryChannel: parsed.data.deliveryChannel }
        : {}),
    },
  });

  return NextResponse.json({ filterSet });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; filterSetId: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const existing = await prisma.partnerFilterSet.findFirst({
    where: { id: params.filterSetId, partnerId: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  const count = await prisma.partnerFilterSet.count({
    where: { partnerId: params.id },
  });
  if (count <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the only filter set for a partner" },
      { status: 400 },
    );
  }

  await prisma.partnerFilterSet.delete({ where: { id: params.filterSetId } });
  return NextResponse.json({ deleted: true });
}
