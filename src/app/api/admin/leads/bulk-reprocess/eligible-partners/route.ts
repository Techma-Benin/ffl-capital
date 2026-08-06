import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  getEligiblePartnersForReprocess,
  ReprocessEligibilityError,
} from "@/lib/jobs/reprocess-eligible-partners";

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

  try {
    const partners = await getEligiblePartnersForReprocess(leadIds);
    return NextResponse.json({ partners });
  } catch (err) {
    if (err instanceof ReprocessEligibilityError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
