import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  leadType: z.enum(["traditional_iul", "high_intent_iul"]),
  filterStates: z.array(z.string().length(2)).min(1),
});

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const templates = await prisma.filterSetTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const template = await prisma.filterSetTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      leadType: parsed.data.leadType,
      filterStates: parsed.data.filterStates,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
