import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const patchSchema = z.object({
  // `type` is intentionally excluded — immutable after creation
  src: z.string().nullable().optional(),
  label: z.string().min(1).optional(),
  defaultPrice: z.number().positive().nullable().optional(),
  enabled: z.boolean().optional(),
  integrityLabel: z.string().nullable().optional(),
});

/** PATCH /api/admin/lead-categories/[id] — update mutable fields (type is read-only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const existing = await prisma.leadCategory.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  // Reject attempts to change the immutable `type`
  if ("type" in body) {
    return NextResponse.json(
      { error: "The `type` field cannot be changed after creation" },
      { status: 422 },
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const category = await prisma.leadCategory.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.src !== undefined ? { src: parsed.data.src } : {}),
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.defaultPrice !== undefined ? { defaultPrice: parsed.data.defaultPrice } : {}),
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      ...(parsed.data.integrityLabel !== undefined ? { integrityLabel: parsed.data.integrityLabel } : {}),
    },
  });

  return NextResponse.json({ category });
}

/** DELETE /api/admin/lead-categories/[id] — blocked if any leads reference this type */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const existing = await prisma.leadCategory.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block deletion if any leads reference this type
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

  await prisma.leadCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
