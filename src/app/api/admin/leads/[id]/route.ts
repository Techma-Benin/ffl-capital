import { NextRequest, NextResponse } from "next/server";
import { LeadEventType, LeadStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { emitLeadEvent } from "@/lib/leads/lead-events";

const editSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().length(2).optional(),
  zip: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  age: z.string().nullable().optional(),
  intent: z.string().nullable().optional(),
  haveIul: z.string().nullable().optional(),
  primaryGoal: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      data[key] = key === "state" ? String(value).toUpperCase() : value;
    }
  }

  const lead = await prisma.lead.update({
    where: { id },
    data,
  });

  return NextResponse.json({ lead });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: { status: "dead", available: false },
  });

  await emitLeadEvent(id, LeadEventType.deleted, {
    previousStatus: existing.status,
  });

  return NextResponse.json({ lead });
}
