import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/integrity/postings
 * Returns the 50 most recent ResalePostings with basic lead info.
 */
export async function GET() {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const postings = await prisma.resalePosting.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      leadId: true,
      mode: true,
      status: true,
      externalRef: true,
      postedAt: true,
      createdAt: true,
      lead: {
        select: {
          firstName: true,
          lastName: true,
          state: true,
          leadType: true,
        },
      },
    },
  });

  // Serialize dates and add rejectionReason placeholder (not yet stored in schema)
  const rows = postings.map((p) => ({
    id: p.id,
    leadId: p.leadId,
    mode: p.mode,
    status: p.status,
    externalRef: p.externalRef ?? null,
    postedAt: p.postedAt ? p.postedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    lead: p.lead,
    rejectionReason: null as string | null,
  }));

  return NextResponse.json({ postings: rows });
}
