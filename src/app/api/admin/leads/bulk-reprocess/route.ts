import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { reprocessSingleLead } from "@/lib/jobs/reprocess-unmatched";
import { releaseLeadsFromReprocessHold } from "@/lib/jobs/reprocess-hold";

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const { leadIds, partnerIds } = body as {
    leadIds: string[];
    partnerIds: string[];
  };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json(
      { error: "leadIds must be a non-empty array" },
      { status: 400 },
    );
  }

  if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
    return NextResponse.json(
      { error: "partnerIds must be a non-empty array" },
      { status: 400 },
    );
  }

  let processed = 0;
  let matched = 0;
  let unmatched = 0;
  let errors = 0;

  try {
    for (const id of leadIds) {
      try {
        const result = await reprocessSingleLead(id, {
          includePartnerIds: partnerIds,
          mode: "manual",
        });
        processed++;
        if (result.matched) {
          matched++;
        } else {
          unmatched++;
        }
      } catch {
        errors++;
      }
    }
  } finally {
    releaseLeadsFromReprocessHold(leadIds);
  }

  return NextResponse.json({ processed, matched, errors, unmatched });
}
