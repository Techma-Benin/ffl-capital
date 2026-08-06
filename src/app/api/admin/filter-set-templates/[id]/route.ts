import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import {
  findFilterSetTemplate,
  serializeTemplateRow,
} from "@/lib/filter-sets/templates";
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

const templateUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  leadType: z.string().min(1).optional(),
  filterStates: z.array(z.string().length(2)).min(1).optional(),
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
  const existing = await findFilterSetTemplate(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serializeTemplateRow(existing));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = templateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await findFilterSetTemplate(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.partnerFilterSet.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.leadType !== undefined && { leadType: parsed.data.leadType }),
      ...(parsed.data.filterStates !== undefined && {
        filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()),
      }),
      ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
      ...(parsed.data.priceOverride !== undefined && {
        priceOverride: parsed.data.priceOverride,
      }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
      ...(parsed.data.weeklyLimit !== undefined && {
        weeklyLimit: parsed.data.weeklyLimit,
      }),
      ...(parsed.data.monthlyLimit !== undefined && {
        monthlyLimit: parsed.data.monthlyLimit,
      }),
      ...(parsed.data.filterCriteria !== undefined && {
        filterCriteria: stripAttributionCriteria(
          (parsed.data.filterCriteria ?? {}) as FilterCriteria,
        ),
      }),
    },
  });

  return NextResponse.json(serializeTemplateRow(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;

  const existing = await findFilterSetTemplate(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.partnerFilterSet.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
