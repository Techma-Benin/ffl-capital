import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { reprocessSingleLead } from "@/lib/jobs/reprocess-unmatched";

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

  let processed = 0;
  let errors = 0;

  for (const id of leadIds) {
    try {
      await reprocessSingleLead(id);
      processed++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ processed, errors });
}
