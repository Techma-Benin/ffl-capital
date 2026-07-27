"use client";

import type { ReactNode } from "react";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";

export function ClickableRow({ href, children }: { href: string; children: ReactNode }) {
  const { push } = useNavigateWithPending();
  return (
    <tr
      className="cursor-pointer hover:bg-brand-50 transition-colors"
      onClick={() => push(href)}
    >
      {children}
    </tr>
  );
}
