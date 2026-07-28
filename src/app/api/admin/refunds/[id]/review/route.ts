import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getPartnerId } from "@/lib/partner/session";
import {
  processRefundApproval,
  processRefundRejection,
} from "@/lib/refunds/process-refund";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reviewerPartnerId = await getPartnerId();

  try {
    const result =
      parsed.data.action === "approve"
        ? await processRefundApproval(id, reviewerPartnerId ?? undefined)
        : await processRefundRejection(id, reviewerPartnerId ?? undefined);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Review failed" },
      { status: 400 },
    );
  }
}
