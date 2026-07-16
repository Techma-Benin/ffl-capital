import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth/session";

export async function GET() {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const templates = await prisma.filterSetTemplate.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      leadType: true,
      filterStates: true,
    },
  });

  return NextResponse.json(templates);
}
