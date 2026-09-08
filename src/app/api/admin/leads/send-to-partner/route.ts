import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PartnerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { sendLeadsToPartner } from "@/lib/admin/send-lead-to-partner";

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(200),
  partnerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({
    where: { id: parsed.data.partnerId },
    select: { id: true, status: true },
  });
  if (!partner || partner.status !== PartnerStatus.active) {
    return NextResponse.json(
      { error: "Active partner not found" },
      { status: 400 },
    );
  }

  const result = await sendLeadsToPartner(
    parsed.data.leadIds,
    parsed.data.partnerId,
  );
  return NextResponse.json(result);
}
