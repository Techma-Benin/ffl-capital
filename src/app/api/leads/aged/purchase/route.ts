import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePartner } from "@/lib/auth/session";
import { purchaseAgedLeads } from "@/lib/aged/purchase-aged-leads";

const purchaseSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(request: NextRequest) {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await purchaseAgedLeads(
    authResult.partner.id,
    parsed.data.leadIds,
  );

  return NextResponse.json(result);
}
