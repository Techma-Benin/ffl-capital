import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { categoryUpdateSchema } from "@/lib/lead-categories/flexible-lead-categories";

const categoryInclude = {
  criteria: {
    select: { id: true, field: true, value: true },
    orderBy: { createdAt: "asc" as const },
  },
};

/** PATCH /api/admin/lead-categories/[id] — update mutable fields (type is read-only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.leadCategory.findUnique({
    where: { id },
    include: categoryInclude,
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  if (
    typeof body === "object" &&
    body !== null &&
    "type" in body
  ) {
    return NextResponse.json(
      { error: "The `type` field cannot be changed after creation" },
      { status: 422 },
    );
  }

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const category = await prisma.$transaction(async (tx) => {
    if (parsed.data.criteria) {
      await tx.leadCategoryCriterion.deleteMany({ where: { categoryId: id } });
      await tx.leadCategoryCriterion.createMany({
        data: parsed.data.criteria.map((criterion) => ({
          categoryId: id,
          field: criterion.field,
          value: criterion.value,
        })),
      });
    }

    return tx.leadCategory.update({
      where: { id },
      data: {
        ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
        ...(parsed.data.defaultPrice !== undefined
          ? { defaultPrice: parsed.data.defaultPrice }
          : {}),
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.integrityLabel !== undefined
          ? { integrityLabel: parsed.data.integrityLabel }
          : {}),
      },
      include: categoryInclude,
    });
  });

  return NextResponse.json({ category });
}

/** DELETE /api/admin/lead-categories/[id] — blocked if any leads reference this type */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.leadCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const leadCount = await prisma.lead.count({ where: { leadType: existing.type } });
  if (leadCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete — ${leadCount} lead${leadCount === 1 ? "" : "s"} use this category. Deactivate it instead.`,
        leadCount,
      },
      { status: 409 },
    );
  }

  await prisma.leadCategory.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
