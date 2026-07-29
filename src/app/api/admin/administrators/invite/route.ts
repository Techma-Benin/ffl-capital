import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
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
  const redirectUrl = `${request.nextUrl.origin}/admin/sign-up`;

  const client = await clerkClient();

  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: "admin" },
      redirectUrl,
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    if (isClerkAPIResponseError(err)) {
      const alreadyExists = err.errors.some(
        (e) => e.code === "form_identifier_exists" || e.code === "duplicate_record",
      );
      if (alreadyExists) {
        return NextResponse.json(
          {
            error:
              "This email already has an account and can't be re-invited. If they previously tried signing in and were denied, ask them to try signing in again — their old account was removed and they can now be invited normally.",
          },
          { status: 409 },
        );
      }
      const message = err.errors[0]?.longMessage ?? err.errors[0]?.message;
      return NextResponse.json(
        { error: message ?? "Failed to send invitation." },
        { status: 422 },
      );
    }

    console.error("[admin/administrators/invite] unexpected error", err);
    return NextResponse.json(
      { error: "Failed to send invitation. Please try again." },
      { status: 500 },
    );
  }
}
