"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { clsx } from "clsx";
import { clerkAppearance } from "@/lib/auth/clerk-appearance";
import { usePortal } from "@/components/layout/portal-provider";

export function SidebarUserButton({
  afterSignOutUrl = "/sign-in",
  displayName,
  isActive,
}: {
  afterSignOutUrl?: string;
  /** Optional override (e.g. partner DB name). Falls back to Clerk profile. */
  displayName?: string;
  /** When true, shows a small green indicator dot before the name. */
  isActive?: boolean;
}) {
  const { user } = useUser();
  const { sidebarCollapsed } = usePortal();
  const name =
    displayName ||
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  return (
    <div
      className={clsx(
        "flex items-center",
        sidebarCollapsed ? "justify-center" : "gap-3",
      )}
    >
      <UserButton
        afterSignOutUrl={afterSignOutUrl}
        appearance={{
          ...clerkAppearance,
          elements: {
            ...clerkAppearance.elements,
            avatarBox: "h-9 w-9",
            userButtonTrigger: "focus:shadow-none",
          },
        }}
      />
      <div
        className={clsx(
          "min-w-0 overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}
      >
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
          {isActive !== undefined && (
            <span
              className={clsx(
                "inline-block h-2 w-2 flex-shrink-0 rounded-full",
                isActive ? "bg-emerald-500" : "bg-slate-300",
              )}
            />
          )}
          {name}
        </p>
      </div>
    </div>
  );
}
