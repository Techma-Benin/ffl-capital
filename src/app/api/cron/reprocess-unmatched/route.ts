import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/auth";
import { reprocessUnmatchedLeads } from "@/lib/jobs/reprocess-unmatched";

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reprocessUnmatchedLeads();
  return NextResponse.json(result);
}
