import { NextRequest, NextResponse } from "next/server";
import { PartnerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { requireAdmin } from "@/lib/auth/session";
import { syncFilterSetsActiveWithPartnerStatus } from "@/lib/partner/default-filter-set";
import { z } from "zod";

const approveSchema = z.object({
  partnerId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const status =
    parsed.data.action === "approve"
      ? PartnerStatus.active
      : PartnerStatus.rejected;

  const partner = await prisma.$transaction(async (tx) => {
    const updated = await tx.partner.update({
      where: { id: parsed.data.partnerId },
      data: { status },
    });
    await syncFilterSetsActiveWithPartnerStatus(
      parsed.data.partnerId,
      status,
      tx,
    );
    return updated;
  }, PRISMA_TX_OPTIONS);

  return NextResponse.json({ partnerId: partner.id, status: partner.status });
}
