import { currentUser } from "@clerk/nextjs/server";
import { getCurrentPartner } from "./session";
import { getRoleFromMetadata } from "./roles";

/** Where to send a signed-in user based on role and onboarding state. */
export async function getPostAuthRedirectPath(): Promise<string> {
  const user = await currentUser();
  if (!user) return "/sign-in";

  const role = getRoleFromMetadata(user.publicMetadata as Record<string, unknown>);
  if (role === "admin") return "/admin";

  const partner = await getCurrentPartner();
  if (partner) return "/partner";

  return "/onboarding";
}
