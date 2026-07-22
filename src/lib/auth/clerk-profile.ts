import { clerkClient } from "@clerk/nextjs/server";

/** Clerk CDN URL sized for admin profile avatar (display ~96px, 2× for retina). */
export function clerkProfileImageUrlForDisplay(
  imageUrl: string,
  displayPx = 96,
): string {
  const size = displayPx * 2;
  const sep = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${sep}width=${size}&height=${size}&fit=crop`;
}

/** Clerk profile image for a linked partner user (admin/server only). */
export async function getClerkPartnerImageUrl(
  clerkUserId: string | null | undefined,
  displayPx = 96,
): Promise<string | null> {
  if (!clerkUserId) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    if (!user.imageUrl) return null;
    return clerkProfileImageUrlForDisplay(user.imageUrl, displayPx);
  } catch {
    return null;
  }
}

/** Deduped Clerk avatar URLs for many partners (one API call per unique user). */
export async function getClerkPartnerImageUrlMap(
  clerkUserIds: Iterable<string | null | undefined>,
  displayPx = 96,
): Promise<Map<string, string | null>> {
  const unique = [
    ...new Set(
      [...clerkUserIds].filter((id): id is string => Boolean(id)),
    ),
  ];
  const entries = await Promise.all(
    unique.map(async (id) => [
      id,
      await getClerkPartnerImageUrl(id, displayPx).catch(() => null),
    ] as const),
  );
  return new Map(entries);
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
