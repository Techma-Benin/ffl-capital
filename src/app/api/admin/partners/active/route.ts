import { NextResponse } from "next/server";
import { PartnerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

/** GET /api/admin/partners/active — compact list for admin pickers */
export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const partners = await prisma.partner.findMany({
    where: { status: PartnerStatus.active },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      affiliation: true,
    },
  });

  return NextResponse.json({ partners });
}
