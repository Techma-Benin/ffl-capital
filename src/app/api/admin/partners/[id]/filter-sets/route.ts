import { NextRequest, NextResponse } from "next/server";
import { LeadType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const filterCriteriaSchema = z
  .object({
    intent: z.array(z.string()).optional(),
    haveIul: z.array(z.string()).optional(),
    ageMin: z.number().int().min(0).optional(),
    ageMax: z.number().int().min(0).optional(),
    source: z.array(z.string()).optional(),
    excludeSource: z.array(z.string()).optional(),
    subId: z.array(z.string()).optional(),
    excludeSubId: z.array(z.string()).optional(),
    pubId: z.array(z.string()).optional(),
    excludePubId: z.array(z.string()).optional(),
    boberdooLeadType: z.array(z.string()).optional(),
    acceptDays: z.array(z.string()).optional(),
    acceptHoursStart: z.number().int().min(0).max(23).optional(),
    acceptHoursEnd: z.number().int().min(0).max(23).optional(),
  })
  .optional();

const filterSetSchema = z.object({
  name: z.string().min(1).default("Default"),
  leadType: z.enum(["traditional_iul", "high_intent_iul"]),
  filterStates: z.array(z.string().length(2)).min(15),
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
  weeklyLimit: z.number().int().positive().nullable().optional(),
  monthlyLimit: z.number().int().positive().nullable().optional(),
  filterCriteria: filterCriteriaSchema,
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
      weeklyLimit: parsed.data.weeklyLimit,
      monthlyLimit: parsed.data.monthlyLimit,
      filterCriteria: parsed.data.filterCriteria ?? {},
      deliveryChannel: parsed.data.deliveryChannel,
    },
  });

  return NextResponse.json({ filterSet }, { status: 201 });
}
