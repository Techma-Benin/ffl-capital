import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { processRefundApproval } from "@/lib/refunds/process-refund";
import { getPartnerId } from "@/lib/partner/session";

const bulkSchema = z.object({
  refundRequestIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reviewerId = await getPartnerId();
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const id of parsed.data.refundRequestIds) {
    try {
      const request = await prisma.refundRequest.findUnique({ where: { id } });
      if (!request || request.status !== "pending") {
        results.push({ id, status: "skipped", error: "Not pending" });
        continue;
      }
      await processRefundApproval(id, reviewerId ?? undefined);
      results.push({ id, status: "approved" });
    } catch (err) {
      results.push({
        id,
        status: "error",
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  return NextResponse.json({ results });
}
