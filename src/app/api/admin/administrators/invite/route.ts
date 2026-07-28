import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";

const inviteSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const { email } = parsed.data;
  // Derive from the actual incoming request rather than the NEXT_PUBLIC_APP_URL
  // secret, which can drift from the real published domain (see next.config.mjs).
  const redirectUrl = `${request.nextUrl.origin}/admin/sign-in`;

  const client = await clerkClient();

  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { role: "admin" },
    redirectUrl,
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
