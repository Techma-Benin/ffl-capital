import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { adminReprocessIntegrityPosting } from "@/lib/integrity/post";

/**
 * POST /api/admin/integrity/postings/[id]/reprocess
 * Admin-only: re-send the lead to Integrity using this posting's mode
 * (realtime or storefront). Blocks live-sold leads / sold postings.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const result = await adminReprocessIntegrityPosting(id);
    if (!result.posted) {
      return NextResponse.json(
        { error: result.reason ?? "Integrity reprocess failed", ...result },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Integrity reprocess failed",
      },
      { status: 400 },
    );
  }
}
