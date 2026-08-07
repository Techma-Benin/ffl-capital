import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { adminReprocessIntegrityPosting } from "@/lib/integrity/post";

/**
 * POST /api/admin/integrity/postings/[id]/reprocess
 * Admin-only: re-send the lead to Integrity using this posting's mode
 * (realtime or storefront). Optional JSON body `{ manualPayload }` is supported
 * for Connection-test-style overrides; the PostingModal Reprocess button sends
 * with an empty body (payload built from the lead).
 * Blocks live-sold leads / sold postings.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const { id } = await context.params;

  let manualPayload: Record<string, string> | undefined;
  try {
    const body = (await request.json().catch(() => null)) as {
      manualPayload?: Record<string, string>;
    } | null;
    if (body?.manualPayload && typeof body.manualPayload === "object") {
      manualPayload = Object.fromEntries(
        Object.entries(body.manualPayload).map(([k, v]) => [k, String(v ?? "")]),
      );
    }
  } catch {
    // empty / non-JSON body is fine — payload built from lead
  }

  try {
    const result = await adminReprocessIntegrityPosting(id, { manualPayload });
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
