import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "admin_view_as_partner_id";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // No maxAge → session cookie; cleared when browser closes or on DELETE.
};

/** POST /api/admin/impersonate — start impersonating a partner. */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const partnerId = typeof body?.partnerId === "string" ? body.partnerId : null;
  if (!partnerId) {
    return NextResponse.json({ error: "partnerId required" }, { status: 400 });
  }

  // Validate the partner actually exists.
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, partnerId, COOKIE_OPTS);
  return response;
}

/** DELETE /api/admin/impersonate — end impersonation; client handles navigation. */
export async function DELETE(_request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTS, maxAge: 0 });
  return response;
}
