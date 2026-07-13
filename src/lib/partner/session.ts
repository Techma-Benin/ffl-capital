import { currentUser } from "@clerk/nextjs/server";
import type { Partner } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { syncPartnerToClerk } from "@/lib/auth/clerk-profile";
import { serializePartner } from "./serialize";
import type { PartnerSession } from "./types";

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

  const { filterSets, ...row } = partner;
  return serializePartner(row, filterSets);
});

/** @deprecated Prefer getPartnerSession in layout or getPartnerId in pages. */
export async function loadPartnerRecord(): Promise<Partner | null> {
  const session = await getPartnerSession();
  if (!session) return null;

  return prisma.partner.findUnique({ where: { id: session.id } });
}
