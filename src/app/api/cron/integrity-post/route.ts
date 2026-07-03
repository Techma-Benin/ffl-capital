import { NextRequest, NextResponse } from "next/server";
import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron/auth";
import { integrityPostLead } from "@/lib/integrity/post";

const REPROCESS_WINDOW_HOURS = 24;

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - REPROCESS_WINDOW_HOURS);

  const leads = await prisma.lead.findMany({
    where: {
      status: LeadStatus.unmatched,
      available: true,
      receivedAt: { lte: cutoff },
    },
    take: 25,
  });

  let posted = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    const result = await integrityPostLead(lead.id);
    if (result.posted) posted++;
    else if (result.reason) errors.push(`${lead.id}: ${result.reason}`);
  }

  return NextResponse.json({ attempted: leads.length, posted, errors });
}
