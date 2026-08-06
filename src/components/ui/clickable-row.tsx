"use client";

import type { ReactNode } from "react";

export function ClickableRow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <tr
      className="cursor-pointer hover:bg-brand-50 transition-colors"
      onClick={() => { window.location.href = href; }}
    >
      {children}
    </tr>
  );
}
