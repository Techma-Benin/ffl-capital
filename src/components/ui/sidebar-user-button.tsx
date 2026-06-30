"use client";

import { UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/auth/clerk-appearance";

export function SidebarUserButton() {
  return (
    <UserButton
      afterSignOutUrl="/sign-in"
      appearance={{
        ...clerkAppearance,
        elements: {
          ...clerkAppearance.elements,
          avatarBox: "h-9 w-9",
          userButtonTrigger: "focus:shadow-none",
        },
      }}
    />
  );
}
