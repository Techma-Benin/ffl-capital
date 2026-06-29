import { NextRequest, NextResponse } from "next/server";
import { PartnerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
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

  const partner = await prisma.partner.update({
    where: { id: parsed.data.partnerId },
    data: { status },
  });

  return NextResponse.json({ partnerId: partner.id, status: partner.status });
}
