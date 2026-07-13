import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Query parameter q is required" }, { status: 400 });
  }

  const phoneDigits = normalizePhoneDigits(q);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

  const orConditions: Prisma.LeadWhereInput[] = [
    ...(isUuid ? [{ id: q }] : []),
    { externalId: q },
    { email: { contains: q, mode: "insensitive" as const } },
  ];

  if (phoneDigits.length >= 7) {
    orConditions.push({ phone: { contains: phoneDigits } });
  }

  const leads = await prisma.lead.findMany({
    where: { OR: orConditions },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      leadDeliveries: {
        include: { partner: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { deliveredAt: "desc" },
        take: 3,
      },
    },
  });

  return NextResponse.json({ leads, count: leads.length });
}
