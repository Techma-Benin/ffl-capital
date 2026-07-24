import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { listPartnerFilterSets } from "@/lib/partner/default-filter-set";
import { MIN_FILTER_STATES } from "@/lib/partner/constants";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import type { FilterCriteria } from "@/lib/matching/types";

const stateCodeSchema = z.enum(
  US_STATE_CODES as unknown as [string, ...string[]],
);

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

const createSchema = z.object({
  name: z.string().min(1).max(100),
  leadType: z.string().min(1),
  filterStates: z.array(stateCodeSchema).min(1).max(50),
  priority: z.number().int().min(1).max(10).default(5),
  active: z.boolean().default(true),
  weeklyLimit: z.number().int().positive().nullable().optional(),
  monthlyLimit: z.number().int().positive().nullable().optional(),
  filterCriteria: filterCriteriaSchema,
});

export async function GET() {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filterSets = await listPartnerFilterSets(partnerId);

  return NextResponse.json(
    filterSets.map((fs) => ({
      id: fs.id,
      name: fs.name,
      leadType: fs.leadType,
      filterStates: fs.filterStates,
      priority: fs.priority,
      active: fs.active,
      weeklyLimit: fs.weeklyLimit,
      monthlyLimit: fs.monthlyLimit,
      filterCriteria: stripAttributionCriteria(
        (fs.filterCriteria ?? {}) as FilterCriteria,
      ),
    })),
  );
}

export async function POST(request: NextRequest) {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body &&
    typeof body === "object" &&
    "isTemplate" in body &&
    (body as { isTemplate?: unknown }).isTemplate === true
  ) {
    return NextResponse.json(
      { error: "Partners cannot create templates" },
      { status: 403 },
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join("; ") },
      { status: 400 },
    );
  }

  const {
    name,
    leadType,
    filterStates: rawStates,
    priority,
    active,
    weeklyLimit,
    monthlyLimit,
    filterCriteria,
  } = parsed.data;
  const filterStates = Array.from(new Set(rawStates.map((s) => s.toUpperCase())));

  // Enforce 15-state minimum for active sets
  if (active && filterStates.length < MIN_FILTER_STATES) {
    return NextResponse.json(
      {
        error: `An active filter set must target at least ${MIN_FILTER_STATES} states. Add more states or save as inactive.`,
      },
      { status: 422 },
    );
  }

  const created = await prisma.partnerFilterSet.create({
    data: {
      partnerId,
      isTemplate: false,
      name: name.trim(),
      leadType,
      filterStates,
      priority,
      active,
      weeklyLimit: weeklyLimit ?? null,
      monthlyLimit: monthlyLimit ?? null,
      filterCriteria: stripAttributionCriteria(
        (filterCriteria ?? {}) as FilterCriteria,
      ),
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      leadType: created.leadType,
      filterStates: created.filterStates,
      priority: created.priority,
      active: created.active,
      weeklyLimit: created.weeklyLimit,
      monthlyLimit: created.monthlyLimit,
      filterCriteria: created.filterCriteria,
    },
    { status: 201 },
  );
}
