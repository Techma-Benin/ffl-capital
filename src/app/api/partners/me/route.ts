import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getPartnerSession } from "@/lib/partner/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const partner = await getPartnerSession();
  if (!partner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(partner);
}

// Email is not editable — it is set once at partner creation and never
// changed afterward (not by the partner, not by an admin, not synced from
// Clerk). Deliberately excluded from this schema.
const patchSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  affiliation: z.string().max(200).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function PATCH(request: Request) {
  const [{ userId }, partner] = await Promise.all([auth(), getPartnerSession()]);
  if (!partner || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { firstName, lastName, affiliation, avatarUrl } = parsed.data;

  if (!firstName && !lastName && affiliation === undefined && avatarUrl === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 422 });
  }

  const updated = await prisma.partner.update({
    where: { id: partner.id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(affiliation !== undefined && { affiliation }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  });

  // Sync names to Clerk server-side (bypasses client-level instance
  // restrictions that block user.update() from the browser).
  if (firstName !== undefined || lastName !== undefined) {
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      });
    } catch (err) {
      // Non-fatal: DB is the source of truth; log but don't fail the request.
      console.warn("[PATCH /api/partners/me] Clerk sync failed:", err);
    }
  }

  return NextResponse.json({
    id: updated.id,
    firstName: updated.firstName,
    lastName: updated.lastName,
    email: updated.email,
    avatarUrl: updated.avatarUrl,
  });
}
