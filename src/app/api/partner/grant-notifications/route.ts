import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import { getUnacknowledgedGrantNotifications } from "@/lib/wallet/grant-notification";

export async function GET() {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    const status = authResult.error === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: authResult.error }, { status });
  }

  const notifications = await getUnacknowledgedGrantNotifications(
    authResult.partner.id,
  );

  return NextResponse.json({ notifications });
}
