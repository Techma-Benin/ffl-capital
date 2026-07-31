import { NextRequest, NextResponse } from "next/server";
import { LeadStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { holdLeadsForReprocess } from "@/lib/jobs/reprocess-hold";

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const { leadIds } = body as { leadIds: string[] };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json(
      { error: "leadIds must be a non-empty array" },
      { status: 400 },
    );
  }

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
  });

  if (leads.length !== leadIds.length) {
    return NextResponse.json(
      { error: "One or more leads not found" },
      { status: 400 },
    );
  }

  const invalid = leads.filter(
    (lead) => !lead.available || lead.status !== LeadStatus.unmatched,
  );
  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: `${invalid.length} lead(s) are not available for reprocessing`,
      },
      { status: 400 },
    );
  }

  holdLeadsForReprocess(leadIds);
  return NextResponse.json({ held: leadIds.length });
}
