import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import type { Partner } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { syncPartnerToClerk } from "@/lib/auth/clerk-profile";
import { getRoleFromMetadata } from "@/lib/auth/roles";
import { serializePartner } from "./serialize";
import type { PartnerSession } from "./types";

const IMPERSONATE_COOKIE = "admin_view_as_partner_id";

async function findPartnerForUser(userId: string, email?: string | null) {
  return prisma.partner.findFirst({
    where: {
      OR: [{ clerkUserId: userId }, ...(email ? [{ email }] : [])],
    },
  });
}

/** Partner id from Clerk metadata — avoids a DB lookup after the first sync. */
export const getPartnerId = cache(async (): Promise<string | null> => {
  const user = await currentUser();
  if (!user) return null;

  // Admin impersonation: if the viewer is an admin and the cookie is set,
  // return the impersonated partner's ID instead.
  const role = getRoleFromMetadata(
    user.publicMetadata as Record<string, unknown>,
  );
  if (role === "admin") {
    const cookieStore = await cookies();
    const impersonatedId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
    if (impersonatedId) {
      // Verify the partner actually exists before trusting the cookie.
      const exists = await prisma.partner.findUnique({
        where: { id: impersonatedId },
        select: { id: true },
      });
      if (exists) return exists.id;
    }
    // No valid impersonation cookie — fall through; admin has no partner row,
    // so we return null and the caller can handle the redirect.
    return null;
  }

  const metaId = user.publicMetadata?.partnerId;
  if (typeof metaId === "string" && metaId.length > 0) {
    return metaId;
  }

  const partner = await findPartnerForUser(
    user.id,
    user.emailAddresses[0]?.emailAddress,
  );
  if (!partner) return null;

  try {
    await syncPartnerToClerk(user, partner);
  } catch {
    // syncPartnerToClerk already logs; always return id once partner exists.
  }

  return partner.id;
});

/** Full partner row — cached per request; use in layout and /api/partners/me only. */
export const getPartnerSession = cache(async (): Promise<PartnerSession | null> => {
  const user = await currentUser();
  if (!user) return null;

  const partnerId = await getPartnerId();
  if (!partnerId) return null;

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { filterSets: { orderBy: { createdAt: "asc" } } },
  });
  if (!partner) return null;

  // Always use the Clerk primary email as the source of truth.
  const clerkEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress;

  // Silently sync the DB if the email has drifted.
  if (clerkEmail && clerkEmail !== partner.email) {
    await prisma.partner.update({
      where: { id: partner.id },
      data: { email: clerkEmail },
    }).catch(() => { /* non-fatal */ });
  }

  const { filterSets, ...row } = partner;
  return serializePartner(row, filterSets, clerkEmail);
});

/**
 * When the current user is an admin, returns the name of the partner being
 * impersonated (if any) so the layout can render the warning banner.
 */
export async function getImpersonatedPartnerName(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const role = getRoleFromMetadata(
    user.publicMetadata as Record<string, unknown>,
  );
  if (role !== "admin") return null;

  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  if (!impersonatedId) return null;

  const partner = await prisma.partner.findUnique({
    where: { id: impersonatedId },
    select: { firstName: true, lastName: true },
  });
  if (!partner) return null;

  return `${partner.firstName} ${partner.lastName}`;
}

/** @deprecated Prefer getPartnerSession in layout or getPartnerId in pages. */
export async function loadPartnerRecord(): Promise<Partner | null> {
  const session = await getPartnerSession();
  if (!session) return null;

  return prisma.partner.findUnique({ where: { id: session.id } });
}
