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

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  leadType: z.string().min(1).optional(),
  filterStates: z.array(z.string().length(2)).min(15).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
  weeklyLimit: z.number().int().positive().nullable().optional(),
  monthlyLimit: z.number().int().positive().nullable().optional(),
  filterCriteria: filterCriteriaSchema,
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; filterSetId: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id, filterSetId } = await params;
  const filterSet = await prisma.partnerFilterSet.findFirst({
    where: {
      id: filterSetId,
      partnerId: id,
      isTemplate: false,
    },
  });

  if (!filterSet) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  return NextResponse.json({ filterSet });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filterSetId: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id, filterSetId } = await params;
  const existing = await prisma.partnerFilterSet.findFirst({
    where: {
      id: filterSetId,
      partnerId: id,
      isTemplate: false,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  const body = await request.json();
  if (body?.isTemplate === true) {
    return NextResponse.json(
      {
        error:
          "Cannot convert a partner filter set into a template via this endpoint",
      },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const filterSet = await prisma.partnerFilterSet.update({
    where: { id: filterSetId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.leadType !== undefined
        ? { leadType: parsed.data.leadType }
        : {}),
      ...(parsed.data.filterStates !== undefined
        ? { filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()) }
        : {}),
      ...(parsed.data.priority !== undefined
        ? { priority: parsed.data.priority }
        : {}),
      ...(parsed.data.priceOverride !== undefined
        ? { priceOverride: parsed.data.priceOverride }
        : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(parsed.data.weeklyLimit !== undefined
        ? { weeklyLimit: parsed.data.weeklyLimit }
        : {}),
      ...(parsed.data.monthlyLimit !== undefined
        ? { monthlyLimit: parsed.data.monthlyLimit }
        : {}),
      ...(parsed.data.filterCriteria !== undefined
        ? {
            filterCriteria: stripAttributionCriteria(
              (parsed.data.filterCriteria ?? {}) as FilterCriteria,
            ),
          }
        : {}),
    },
  });

  return NextResponse.json({ filterSet });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; filterSetId: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id, filterSetId } = await params;
  const existing = await prisma.partnerFilterSet.findFirst({
    where: {
      id: filterSetId,
      partnerId: id,
      isTemplate: false,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  const count = await prisma.partnerFilterSet.count({
    where: { partnerId: id, isTemplate: false },
  });
  if (count <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the only filter set for a partner" },
      { status: 400 },
    );
  }

  await prisma.partnerFilterSet.delete({ where: { id: filterSetId } });
  return NextResponse.json({ deleted: true });
}
