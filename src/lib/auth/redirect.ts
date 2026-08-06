import { currentUser } from "@clerk/nextjs/server";
import { getCurrentPartner } from "./session";
import { getRoleFromMetadata } from "./roles";
import type { AuthPortal } from "./portal";
import { promoteAdminIfEligible } from "./promote-admin";

/** Partner portal redirect — never sends users to /admin. */
export async function getPartnerPostAuthRedirectPath(): Promise<string> {
  const partner = await getCurrentPartner();
  if (partner) return "/partner";
  return "/onboarding";
}

/** Admin portal redirect — requires admin role (promotes from ADMIN_EMAILS first). */
export async function getAdminPostAuthRedirectPath(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const allowed = await promoteAdminIfEligible(user);
  return allowed ? "/admin" : null;
}

/** Default when portal is unknown (e.g. home page) — admin wins, else partner flow. */
export async function getPostAuthRedirectPath(): Promise<string> {
  const user = await currentUser();
  if (!user) return "/sign-in";

  const role = getRoleFromMetadata(user.publicMetadata as Record<string, unknown>);
  if (role === "admin") return "/admin";

  return getPartnerPostAuthRedirectPath();
}

export async function getPostAuthRedirectPathForPortal(
  portal: AuthPortal,
): Promise<string> {
  if (portal === "admin") {
    return (await getAdminPostAuthRedirectPath()) ?? "/admin/access-denied";
  }
  return getPartnerPostAuthRedirectPath();
}
