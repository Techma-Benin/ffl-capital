import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/partner/session";

export async function GET() {
  const partner = await getPartnerSession();
  if (!partner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(partner);
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Profile updates use Clerk. CRM outbound: PATCH /api/partners/me/crm-outbound" },
    { status: 400 },
  );
}
