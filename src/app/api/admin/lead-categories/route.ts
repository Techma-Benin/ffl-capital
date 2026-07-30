import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import {
  categoryCreateSchema,
  deriveCategoryType,
} from "@/lib/lead-categories/flexible-lead-categories";

const categoryInclude = {
  criteria: {
    select: { id: true, field: true, value: true },
    orderBy: { createdAt: "asc" as const },
  },
};

/** GET /api/admin/lead-categories — list all categories */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const categories = await prisma.leadCategory.findMany({
    orderBy: { createdAt: "asc" },
    include: categoryInclude,
  });

  return NextResponse.json({ categories });
}

/** POST /api/admin/lead-categories — create a new category (type is immutable after this) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const body = await request.json();
  if ("type" in body) {
    return NextResponse.json(
      { error: "Internal type is generated from the display label and cannot be supplied" },
      { status: 400 },
    );
  }

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const occupiedTypes = (
    await prisma.leadCategory.findMany({ select: { type: true } })
  ).map((category) => category.type);

  let type: string;
  try {
    type = deriveCategoryType({
      label: parsed.data.label,
      occupiedTypes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid label" },
      { status: 409 },
    );
  }

  try {
    const category = await prisma.leadCategory.create({
      data: {
        type,
        label: parsed.data.label,
        defaultPrice: parsed.data.defaultPrice ?? null,
        enabled: parsed.data.enabled ?? true,
        integrityLabel: parsed.data.integrityLabel ?? null,
        criteria: {
          create: parsed.data.criteria,
        },
      },
      include: categoryInclude,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: `A category with type "${type}" already exists` },
        { status: 409 },
      );
    }
    throw error;
  }
}
