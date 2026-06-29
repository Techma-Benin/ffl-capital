import { auth, currentUser } from "@clerk/nextjs/server";
import { PartnerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRoleFromMetadata } from "./roles";

export async function getCurrentPartner() {
  const user = await currentUser();
  if (!user) return null;

  const partner = await prisma.partner.findFirst({
    where: {
      OR: [{ clerkUserId: user.id }, { email: user.emailAddresses[0]?.emailAddress }],
    },
  });

  return partner;
}

export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return { error: "unauthenticated" as const };

  const user = await currentUser();
  const role = getRoleFromMetadata(user?.publicMetadata as Record<string, unknown>);
  if (role !== "admin") return { error: "forbidden" as const };

  return { userId, user };
}

export async function requirePartner() {
  const { userId } = await auth();
  if (!userId) return { error: "unauthenticated" as const };

  const partner = await getCurrentPartner();
  if (!partner) return { error: "no_profile" as const };

  return { userId, partner };
}

export function isPartnerActive(partner: {
  status: PartnerStatus;
  filterStates: string[];
  walletBalance: { toString(): string } | number;
}, minLeadPrice = 25): boolean {
  if (partner.status !== PartnerStatus.active) return false;
  if (partner.filterStates.length < 15) return false;
  return Number(partner.walletBalance) >= minLeadPrice;
}

export function isAdminApprovalRequired(): boolean {
  return process.env.ADMIN_APPROVAL_REQUIRED !== "false";
}
