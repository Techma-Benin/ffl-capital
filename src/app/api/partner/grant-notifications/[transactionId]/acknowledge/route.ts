import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import { acknowledgeGrantNotification } from "@/lib/wallet/grant-notification";

type RouteContext = {
  params: Promise<{ transactionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    const status = authResult.error === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: authResult.error }, { status });
  }

  const { transactionId } = await context.params;

  const result = await acknowledgeGrantNotification(
    authResult.partner.id,
    transactionId,
  );

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 409;
    return NextResponse.json({ error: result.code }, { status });
  }

  return NextResponse.json({ ok: true });
}
