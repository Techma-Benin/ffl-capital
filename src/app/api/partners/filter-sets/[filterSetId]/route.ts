import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { MIN_FILTER_STATES } from "@/lib/partner/constants";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import { isLeadTypeAvailableToPartners } from "@/lib/lead-categories/partner-availability";
import type { FilterCriteria } from "@/lib/matching/types";
import type { PartnerFilterSet } from "@prisma/client";

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

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  leadType: z.string().min(1).optional(),
  filterStates: z
    .array(stateCodeSchema)
    .min(1) // min enforced conditionally below for active sets
    .max(50)
    .optional(),
  priority: z.number().int().min(1).max(10).optional(),
  active: z.boolean().optional(),
  filterCriteria: filterCriteriaSchema,
});

/**
 * Partner-facing serialization — excludes weekly/monthly limits, which are
 * admin/template-only fields not editable (or visible) in the partner portal.
 */
function serializePartnerFilterSet(fs: Pick<PartnerFilterSet, "id" | "name" | "leadType" | "filterStates" | "priority" | "active" | "filterCriteria">) {
  return {
    id: fs.id,
    name: fs.name,
    leadType: fs.leadType,
    filterStates: fs.filterStates,
    priority: fs.priority,
    active: fs.active,
    filterCriteria: stripAttributionCriteria(
      (fs.filterCriteria ?? {}) as FilterCriteria,
    ),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ filterSetId: string }> },
) {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filterSetId } = await params;
  // Verify this filter set belongs to the authenticated partner
  const existing = await prisma.partnerFilterSet.findFirst({
    where: { id: filterSetId, partnerId, isTemplate: false },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
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

  const parsed = patchSchema.safeParse(body);
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
    filterCriteria,
  } = parsed.data;

  const nextLeadType = leadType ?? existing.leadType;
  if (!(await isLeadTypeAvailableToPartners(nextLeadType))) {
    return NextResponse.json(
      { error: "That lead type is not active for partners right now." },
      { status: 422 },
    );
  }

  // Deduplicate states if provided
  const filterStates = rawStates
    ? Array.from(new Set(rawStates.map((s) => s.toUpperCase())))
    : undefined;

  // Enforce 15-state minimum when the set is (or will be) active
  const willBeActive = active !== undefined ? active : existing.active;
  const effectiveStates = filterStates ?? existing.filterStates;
  if (willBeActive && effectiveStates.length < MIN_FILTER_STATES) {
    return NextResponse.json(
      {
        error: `An active filter set must target at least ${MIN_FILTER_STATES} states. Select more states or set the filter set to inactive.`,
      },
      { status: 422 },
    );
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim() || existing.name;
  if (leadType !== undefined) data.leadType = leadType;
  if (filterStates !== undefined) data.filterStates = filterStates;
  // Partners may send priority but it is ignored (admin-only field).
  void priority;
  if (active !== undefined) data.active = active;
  if (filterCriteria !== undefined) {
    data.filterCriteria = stripAttributionCriteria(
      (filterCriteria ?? {}) as FilterCriteria,
    );
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.partnerFilterSet.update({
    where: { id: filterSetId },
    data,
  });

  return NextResponse.json(serializePartnerFilterSet(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ filterSetId: string }> },
) {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filterSetId } = await params;
  // Verify this filter set belongs to the authenticated partner
  const existing = await prisma.partnerFilterSet.findFirst({
    where: { id: filterSetId, partnerId, isTemplate: false },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  // Soft-delete: deactivate the filter set rather than hard-deleting
  // (preserves delivery history references)
  await prisma.partnerFilterSet.update({
    where: { id: filterSetId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
