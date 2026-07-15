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
  filterStates: z
    .array(stateCodeSchema)
    .min(MIN_FILTER_STATES)
    .max(50),
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

  const filterStates = Array.from(
    new Set(parsed.data.filterStates.map((s) => s.toUpperCase())),
  );

  const updated = await prisma.partnerFilterSet.update({
    where: { id: params.filterSetId },
    data: { filterStates },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    leadType: updated.leadType,
    filterStates: updated.filterStates,
    active: updated.active,
  });
}
