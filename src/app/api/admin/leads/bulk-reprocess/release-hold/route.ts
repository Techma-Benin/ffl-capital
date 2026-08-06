import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { releaseLeadsFromReprocessHold } from "@/lib/jobs/reprocess-hold";

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

  releaseLeadsFromReprocessHold(leadIds);
  return NextResponse.json({ released: leadIds.length });
}
