import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const createSchema = z.object({
  type: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "type must be lowercase letters, digits, and underscores only"),
  src: z.string().optional(),
  label: z.string().min(1),
  defaultPrice: z.number().positive().nullable().optional(),
  enabled: z.boolean().optional(),
  integrityLabel: z.string().optional(),
});

/** GET /api/admin/lead-categories — list all categories */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const categories = await prisma.leadCategory.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ categories });
}

/** POST /api/admin/lead-categories — create a new category (type is immutable after this) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.leadCategory.findUnique({ where: { type: parsed.data.type } });
  if (existing) {
    return NextResponse.json({ error: `A category with type "${parsed.data.type}" already exists` }, { status: 409 });
  }

  const category = await prisma.leadCategory.create({
    data: {
      type: parsed.data.type,
      src: parsed.data.src ?? null,
      label: parsed.data.label,
      defaultPrice: parsed.data.defaultPrice ?? null,
      enabled: parsed.data.enabled ?? true,
      integrityLabel: parsed.data.integrityLabel ?? null,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
