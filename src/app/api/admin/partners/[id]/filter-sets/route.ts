import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import type { FilterCriteria } from "@/lib/matching/types";

const filterCriteriaSchema = z
  .object({
    intent: z.array(z.string()).optional(),
    haveIul: z.array(z.string()).optional(),
    ageMin: z.number().int().min(0).optional(),
    ageMax: z.number().int().min(0).optional(),
    acceptDays: z.array(z.string()).optional(),
    acceptHoursStart: z.number().int().min(0).max(23).optional(),
    acceptHoursEnd: z.number().int().min(0).max(23).optional(),
  })
  .passthrough()
  .optional();

const filterSetSchema = z.object({
  name: z.string().min(1).default("Default"),
  leadType: z.string().min(1),
  filterStates: z.array(z.string().length(2)).min(15),
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
  weeklyLimit: z.number().int().positive().nullable().optional(),
  monthlyLimit: z.number().int().positive().nullable().optional(),
  filterCriteria: filterCriteriaSchema,
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const filterSets = await prisma.partnerFilterSet.findMany({
    where: { partnerId: id, isTemplate: false },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ filterSets });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const body = await request.json();
  if (body?.isTemplate === true) {
    return NextResponse.json(
      { error: "Use template endpoints to create templates" },
      { status: 400 },
    );
  }

  const parsed = filterSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const filterSet = await prisma.partnerFilterSet.create({
    data: {
      partnerId: id,
      isTemplate: false,
      name: parsed.data.name,
      leadType: parsed.data.leadType,
      filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()),
      priority: parsed.data.priority ?? 5,
      priceOverride: parsed.data.priceOverride,
      active: parsed.data.active ?? true,
      weeklyLimit: parsed.data.weeklyLimit,
      monthlyLimit: parsed.data.monthlyLimit,
      filterCriteria: stripAttributionCriteria(
        (parsed.data.filterCriteria ?? {}) as FilterCriteria,
      ),
    },
  });

  return NextResponse.json({ filterSet }, { status: 201 });
}
