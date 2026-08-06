import { auth, currentUser } from "@clerk/nextjs/server";
import { getPartnerId, getPartnerSession } from "@/lib/partner/session";
import { isPartnerActive } from "@/lib/partner/active";
import { getRoleFromMetadata, isSuperAdminFromMetadata } from "./roles";

export { isPartnerActive } from "@/lib/partner/active";

/** @deprecated Use getPartnerSession in layout or getPartnerId in pages. */
export async function getCurrentPartner() {
  return getPartnerSession();
}

export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return { error: "unauthenticated" as const };

  const user = await currentUser();
  const role = getRoleFromMetadata(user?.publicMetadata as Record<string, unknown>);
  if (role !== "admin") return { error: "forbidden" as const };

  return { userId, user };
}

export async function requireSuperAdmin() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult;

  const isSuperAdmin = isSuperAdminFromMetadata(
    authResult.user?.publicMetadata as Record<string, unknown>,
  );
  if (!isSuperAdmin) return { error: "forbidden" as const };

  return authResult;
}

export async function requirePartner() {
  const { userId } = await auth();
  if (!userId) return { error: "unauthenticated" as const };

  const partnerId = await getPartnerId();
  if (!partnerId) return { error: "no_profile" as const };

  const partner = await getPartnerSession();
  if (!partner) return { error: "no_profile" as const };

  return { userId, partner };
}

export function isAdminApprovalRequired(): boolean {
  return process.env.ADMIN_APPROVAL_REQUIRED !== "false";
}
