export type AppRole = "admin" | "partner";

export function isClerkConfigured(): boolean {
  const publishable =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY;
  return !!(publishable && process.env.CLERK_SECRET_KEY);
}

export function getRoleFromMetadata(
  metadata: Record<string, unknown> | undefined,
): AppRole | null {
  const role = metadata?.role;
  if (role === "admin" || role === "partner") return role;
  return null;
}

/**
 * Super admin is a flag layered on top of the "admin" role, not a separate
 * role — every super admin is also an admin. Exactly one user should hold
 * this flag at a time (enforced by the transfer action, not this helper).
 */
export function isSuperAdminFromMetadata(
  metadata: Record<string, unknown> | undefined,
): boolean {
  return (
    getRoleFromMetadata(metadata) === "admin" && metadata?.isSuperAdmin === true
  );
}
