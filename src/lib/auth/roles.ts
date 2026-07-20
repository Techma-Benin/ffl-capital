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
