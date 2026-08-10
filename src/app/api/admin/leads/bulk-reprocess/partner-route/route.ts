import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { shouldShowPartnerPickerForLeads } from "@/lib/jobs/reprocess-unmatched";

/**
 * POST /api/admin/leads/bulk-reprocess/partner-route
 * Returns whether Partner is the primary route for all given leads
 * (used to decide whether to show the partner picker).
 */
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

  const partnerPrimary = await shouldShowPartnerPickerForLeads(leadIds);
  return NextResponse.json({ partnerPrimary });
}
