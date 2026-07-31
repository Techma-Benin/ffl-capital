import { NextRequest, NextResponse } from "next/server";
import { LeadEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { requireAdmin } from "@/lib/auth/session";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { prepareManualCategoryAssignment } from "@/lib/lead-categories/manual-category-assignment";
import { z } from "zod";

const bodySchema = z.object({
  categoryType: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const category = await prisma.leadCategory.findUnique({
    where: { type: body.categoryType },
    include: { criteria: { select: { field: true, value: true } } },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  let assignment;
  try {
    assignment = prepareManualCategoryAssignment({
      lead: {
        status: lead.status,
        available: lead.available,
        categoryResolution: lead.categoryResolution,
        categoryCandidateTypes: lead.categoryCandidateTypes,
        leadType: lead.leadType,
        rawPayload:
          lead.rawPayload && typeof lead.rawPayload === "object" && !Array.isArray(lead.rawPayload)
            ? (lead.rawPayload as Record<string, unknown>)
            : {},
      },
      category: {
        type: category.type,
        label: category.label,
        enabled: category.enabled,
        criteria: category.criteria,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assignment rejected" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        leadType: assignment.update.leadType,
        categoryResolution: assignment.update.categoryResolution,
        categoryCandidateTypes: assignment.update.categoryCandidateTypes,
        status: assignment.update.status,
        available: assignment.update.available,
        rawPayload: assignment.update.rawPayload as Prisma.InputJsonValue,
        ...(assignment.update.source !== undefined
          ? { source: assignment.update.source }
          : {}),
        ...(assignment.update.intent !== undefined
          ? { intent: assignment.update.intent }
          : {}),
      },
    });

    await emitLeadEvent(
      id,
      LeadEventType.category_assigned,
      {
        previousResolution: lead.categoryResolution,
        previousLeadType: lead.leadType,
        previousCandidateTypes: lead.categoryCandidateTypes,
        categoryType: category.type,
        categoryLabel: category.label,
        overwrittenCriteria: assignment.overwrittenCriteria,
        adminUserId: authResult.userId,
      },
      undefined,
      tx,
    );
  }, PRISMA_TX_OPTIONS);

  return NextResponse.json({
    success: true,
    requiresReprocess: assignment.requiresReprocess,
  });
}
