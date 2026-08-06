import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/auth";
import { reprocessUnmatchedLeadsWithCoordinator } from "@/lib/lead-routing/coordinator";

async function handleCronRequest(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reprocessUnmatchedLeadsWithCoordinator();
  return NextResponse.json({
    attempted: result.attempted,
    posted: result.integrityQueued,
    matched: result.matched,
    waiting: result.waiting,
    errors: result.errors,
    skipped: result.skipped,
  });
}

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}
