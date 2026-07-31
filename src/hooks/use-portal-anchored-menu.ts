import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type PortalAnchoredMenuStyle = { top: number; left: number };

export function usePortalAnchoredMenu({
  open,
  onClose,
  estimatedMenuWidth = 176,
  estimatedMenuHeight = 120,
  repositionKey,
}: {
  open: boolean;
  onClose: () => void;
  estimatedMenuWidth?: number;
  estimatedMenuHeight?: number;
  /** Changes when menu size/content shifts so placement recalculates. */
  repositionKey?: string | number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<PortalAnchoredMenuStyle | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }
    function place() {
      const btn = buttonRef.current;
      const menu = menuRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = menu?.offsetWidth ?? estimatedMenuWidth;
      const menuHeight = menu?.offsetHeight ?? estimatedMenuHeight;
      const gap = 4;
      const left = Math.max(8, rect.right - menuWidth);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
      const top = openUp ? rect.top - gap - menuHeight : rect.bottom + gap;
      setMenuStyle({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, estimatedMenuWidth, estimatedMenuHeight, repositionKey]);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return { buttonRef, menuRef, menuStyle };
}
