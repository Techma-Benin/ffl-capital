"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4500}
      toastOptions={{
        style: {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties,
        classNames: {
          toast: "font-sans shadow-lg",
          success: "border-blue-700/20",
          error: "border-red-500/20",
        },
      }}
    />
  );
}
