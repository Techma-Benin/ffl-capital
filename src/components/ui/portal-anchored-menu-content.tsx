"use client";

import { createPortal } from "react-dom";
import type { PortalAnchoredMenuStyle } from "@/hooks/use-portal-anchored-menu";

export function PortalAnchoredMenuContent({
  open,
  menuRef,
  menuStyle,
  className,
  children,
}: {
  open: boolean;
  menuRef: React.Ref<HTMLDivElement>;
  menuStyle: PortalAnchoredMenuStyle | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className={className}
      style={
        menuStyle
          ? { top: menuStyle.top, left: menuStyle.left }
          : { visibility: "hidden", top: 0, left: 0 }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
