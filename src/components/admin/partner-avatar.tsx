"use client";

import { useState } from "react";
import { clsx } from "clsx";

export function partnerInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const sizeClasses = {
  sm: {
    box: "h-10 w-10",
    text: "text-sm",
    px: 40,
  },
  md: {
    box: "h-12 w-12",
    text: "text-base",
    px: 48,
  },
  lg: {
    box: "h-24 w-24",
    text: "text-2xl",
    px: 96,
  },
} as const;

export function PartnerAvatar({
  avatarUrl,
  firstName,
  lastName,
  size = "lg",
  className,
}: {
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = partnerInitials(firstName, lastName);
  const showImage = Boolean(avatarUrl) && !imageFailed;
  const displayName = `${firstName} ${lastName}`.trim();
  const { box, text, px } = sizeClasses[size];

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Clerk CDN (img.clerk.com); plain img + onError fallback
      <img
        src={avatarUrl!}
        alt={displayName}
        width={px}
        height={px}
        className={clsx(box, "shrink-0 rounded-full object-cover", className)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={clsx(
        // Match Clerk UserButton default avatar (--clerk-color-primary from ClerkProvider).
        "flex shrink-0 items-center justify-center rounded-full bg-[var(--clerk-color-primary,#2563eb)] font-medium text-white",
        box,
        text,
        className,
      )}
      aria-label={displayName}
      role="img"
    >
      {initials}
    </div>
  );
}
