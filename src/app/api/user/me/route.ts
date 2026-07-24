/**
 * GET /api/user/me
 * Returns the authenticated admin's profile from the DB (admin_profiles table).
 * Falls back to Clerk data when no DB row exists yet (first time).
 *
 * PATCH /api/user/me
 * Upserts the admin profile in the DB and syncs names to Clerk via the
 * server-side admin client (bypasses instance-level name-edit restrictions).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.adminProfile.findUnique({
    where: { clerkUserId: userId },
  });

  if (row) {
    return NextResponse.json({
      firstName: row.firstName,
      lastName: row.lastName,
      avatarUrl: row.avatarUrl ?? null,
    });
  }

  // No DB row yet — fall back to Clerk data so the UI isn't blank.
  const user = await currentUser();
  return NextResponse.json({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    avatarUrl: user?.imageUrl ?? null,
  });
}

const patchSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
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

  const { firstName, lastName, avatarUrl } = parsed.data;

  // Upsert admin profile row.
  const row = await prisma.adminProfile.upsert({
    where: { clerkUserId: userId },
    create: {
      clerkUserId: userId,
      firstName,
      lastName,
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
    update: {
      firstName,
      lastName,
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  });

  // Sync names to Clerk server-side.
  try {
    const client = await clerkClient();
    await client.users.updateUser(userId, { firstName, lastName });
  } catch (err) {
    // Non-fatal — DB is source of truth.
    console.warn("[PATCH /api/user/me] Clerk sync failed:", err);
  }

  return NextResponse.json({
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl ?? null,
  });
}
