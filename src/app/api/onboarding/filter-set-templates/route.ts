import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Public-ish endpoint for fetching filter set templates during onboarding.
 * Only requires a valid Clerk session — no partner record needed yet.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
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
