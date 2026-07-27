"use client";

import { clsx } from "clsx";

export function MainContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={clsx(
        "relative flex min-h-0 flex-1 flex-col overflow-y-auto p-6",
        className,
      )}
    >
      {children}
    </main>
  );
}
