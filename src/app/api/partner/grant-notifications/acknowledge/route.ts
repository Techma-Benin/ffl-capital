import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import { acknowledgeGrantNotifications } from "@/lib/wallet/grant-notification";

export async function POST(request: Request) {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    const status = authResult.error === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: authResult.error }, { status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ids = Array.isArray((body as { ids?: unknown })?.ids)
    ? ((body as { ids: unknown[] }).ids.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      ))
    : null;

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids_required" }, { status: 400 });
  }

  const result = await acknowledgeGrantNotifications(
    authResult.partner.id,
    ids,
  );

  return NextResponse.json({ ok: true, acknowledged: result.acknowledged });
}
