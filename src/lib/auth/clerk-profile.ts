import { clerkClient } from "@clerk/nextjs/server";

/** Clerk profile image for a linked partner user (admin/server only). */
export async function getClerkPartnerImageUrl(
  clerkUserId: string | null | undefined,
): Promise<string | null> {
  if (!clerkUserId) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    return user.imageUrl || null;
  } catch {
    return null;
  }
}

/** Keep Clerk profile and metadata aligned with the partner record (best-effort). */
export async function syncPartnerToClerk(
  user: { id: string; firstName: string | null; lastName: string | null; publicMetadata?: Record<string, unknown> },
  partner: { id: string; firstName: string; lastName: string },
) {
  const metaId = user.publicMetadata?.partnerId;
  const needsId = metaId !== partner.id;
  const firstName = user.firstName || partner.firstName;
  const lastName = user.lastName || partner.lastName;
  const needsNames = !user.firstName || !user.lastName;

  if (!needsId && !needsNames) return;

  const client = await clerkClient();

  try {
    if (needsNames && firstName && lastName) {
      await client.users.updateUser(user.id, { firstName, lastName });
    }

    if (needsId) {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: { partnerId: partner.id },
      });
    }
  } catch (error) {
    // Don't block app load if Clerk rejects the update (e.g. instance policy).
    console.warn("[syncPartnerToClerk] Clerk update failed:", error);
  }
}
