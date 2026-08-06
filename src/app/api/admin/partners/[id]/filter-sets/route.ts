import { NextRequest, NextResponse } from "next/server";
import { LeadType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const filterSetSchema = z.object({
  name: z.string().min(1).default("Default"),
  leadType: z.enum(["traditional_iul", "high_intent_iul"]),
  filterStates: z.array(z.string().length(2)).min(15),
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
  hourlyLimit: z.number().int().positive().nullable().optional(),
  dailyLimit: z.number().int().positive().nullable().optional(),
  deliveryChannel: z.enum(["email", "webhook", "ringy"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const filterSets = await prisma.partnerFilterSet.findMany({
    where: { partnerId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ filterSets });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const partner = await prisma.partner.findUnique({ where: { id: params.id } });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = filterSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const filterSet = await prisma.partnerFilterSet.create({
    data: {
      partnerId: params.id,
      name: parsed.data.name,
      leadType: parsed.data.leadType as LeadType,
      filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()),
      priority: parsed.data.priority ?? 5,
      priceOverride: parsed.data.priceOverride,
      active: parsed.data.active ?? true,
      hourlyLimit: parsed.data.hourlyLimit,
      dailyLimit: parsed.data.dailyLimit,
      deliveryChannel: parsed.data.deliveryChannel,
    },
  });

  return NextResponse.json({ filterSet }, { status: 201 });
}
