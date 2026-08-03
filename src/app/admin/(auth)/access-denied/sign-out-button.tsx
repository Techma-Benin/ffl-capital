"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

const AFTER_SIGN_OUT = "/admin/sign-in";

/**
 * Access-denied often deletes orphan Clerk users on the server before this
 * button mounts. Clerk's stock SignOutButton can then hang or no-op because
 * the Backend user is gone while the browser still holds a session cookie.
 * Mirror the sidebar pattern (useClerk().signOut) and always land on admin
 * sign-in — with a hard navigation fallback if signOut never redirects.
 */
export function AccessDeniedSignOutButton({
  className,
}: {
  className?: string;
}) {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);

    const forceRedirect = () => {
      window.location.assign(AFTER_SIGN_OUT);
    };
    const timeoutId = window.setTimeout(forceRedirect, 2500);

    try {
      await signOut({ redirectUrl: AFTER_SIGN_OUT });
    } catch {
      // Session may already be invalid after orphan cleanup.
    } finally {
      window.clearTimeout(timeoutId);
      forceRedirect();
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "Signing out…" : "Sign out and try another account"}
    </button>
  );
}
