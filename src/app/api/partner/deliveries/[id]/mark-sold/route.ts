import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import { markPartnerAgedLeadSold } from "@/lib/aged/partner-mark-sold";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    const status = authResult.error === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: authResult.error }, { status });
  }

  const { id } = await params;

  try {
    const result = await markPartnerAgedLeadSold(id, authResult.partner.id);
    return NextResponse.json({
      ok: true,
      partnerSoldAt: result.partnerSoldAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message === "Delivery not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
