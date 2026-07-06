import type { User } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdminEmail } from "./admin-emails";
import { getRoleFromMetadata } from "./roles";

/** Grant admin role when the user's email is on ADMIN_EMAILS. */
export async function promoteAdminIfEligible(user: User): Promise<boolean> {
  if (getRoleFromMetadata(user.publicMetadata as Record<string, unknown>) === "admin") {
    return true;
  }

  const email = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress;
  if (!email || !isAdminEmail(email)) return false;

  const client = await clerkClient();
  await client.users.updateUserMetadata(user.id, {
    publicMetadata: {
      ...(user.publicMetadata as Record<string, unknown>),
      role: "admin",
    },
  });
  return true;
}
