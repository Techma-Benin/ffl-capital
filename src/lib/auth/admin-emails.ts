/** Comma-separated allowlist from ADMIN_EMAILS — bootstrap + admin-portal access. */
export function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmailAllowlist().has(email.trim().toLowerCase());
}
