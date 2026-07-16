import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { MIN_FILTER_STATES } from "@/lib/partner/constants";
import { US_STATE_CODES } from "@/lib/constants/us-states";

const stateCodeSchema = z.enum(
  US_STATE_CODES as unknown as [string, ...string[]],
);

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  leadType: z.enum(["traditional_iul", "high_intent_iul"]).optional(),
  filterStates: z
    .array(stateCodeSchema)
    .min(1) // min enforced conditionally below for active sets
    .max(50)
    .optional(),
  priority: z.number().int().min(1).max(10).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { filterSetId: string } },
) {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify this filter set belongs to the authenticated partner
  const existing = await prisma.partnerFilterSet.findFirst({
    where: { id: params.filterSetId, partnerId },
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join("; ") },
      { status: 400 },
    );
  }

  const { name, leadType, filterStates: rawStates, priority, active } = parsed.data;

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
  if (priority !== undefined) data.priority = priority;
  if (active !== undefined) data.active = active;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.partnerFilterSet.update({
    where: { id: params.filterSetId },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    leadType: updated.leadType,
    filterStates: updated.filterStates,
    priority: updated.priority,
    active: updated.active,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { filterSetId: string } },
) {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify this filter set belongs to the authenticated partner
  const existing = await prisma.partnerFilterSet.findFirst({
    where: { id: params.filterSetId, partnerId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter set not found" }, { status: 404 });
  }

  // Soft-delete: deactivate the filter set rather than hard-deleting
  // (preserves delivery history references)
  await prisma.partnerFilterSet.update({
    where: { id: params.filterSetId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
