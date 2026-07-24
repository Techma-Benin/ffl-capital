import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import {
  listFilterSetTemplates,
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

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  leadType: z.string().min(1),
  filterStates: z.array(z.string().length(2)).min(1),
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
  weeklyLimit: z.number().int().positive().nullable().optional(),
  monthlyLimit: z.number().int().positive().nullable().optional(),
  filterCriteria: filterCriteriaSchema,
});

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const templates = await listFilterSetTemplates();
  return NextResponse.json(templates.map(serializeTemplateRow));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const criteria = stripAttributionCriteria(
    (parsed.data.filterCriteria ?? {}) as FilterCriteria,
  );

  const template = await prisma.partnerFilterSet.create({
    data: {
      partnerId: null,
      isTemplate: true,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      leadType: parsed.data.leadType,
      filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()),
      priority: parsed.data.priority ?? 5,
      priceOverride: parsed.data.priceOverride ?? null,
      active: parsed.data.active ?? true,
      weeklyLimit: parsed.data.weeklyLimit ?? null,
      monthlyLimit: parsed.data.monthlyLimit ?? null,
      filterCriteria: criteria,
    },
  });

  return NextResponse.json(serializeTemplateRow(template), { status: 201 });
}
