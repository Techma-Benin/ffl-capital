export type AuthPortal = "admin" | "partner";

export const AUTH_CONTINUE_PARTNER = "/auth/continue?portal=partner";
export const AUTH_CONTINUE_ADMIN = "/auth/continue?portal=admin";

export function parseAuthPortal(value: string | string[] | undefined): AuthPortal {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "admin" ? "admin" : "partner";
}
