"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  XCircle,
  DotsThree,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";

type ActionKey = "approve" | "reject";

const actions: {
  key: ActionKey;
  label: string;
  loadingLabel: string;
  icon: ReactNode;
  menuClass: string;
}[] = [
  {
    key: "approve",
    label: "Approve",
    loadingLabel: "Approving…",
    icon: (
      <CheckCircle size={14} className="text-emerald-500" weight={ICON_WEIGHT_LINEAR} />
    ),
    menuClass: "text-emerald-700 hover:bg-emerald-50",
  },
  {
    key: "reject",
    label: "Reject",
    loadingLabel: "Rejecting…",
    icon: <XCircle size={14} className="text-red-400" weight={ICON_WEIGHT_LINEAR} />,
    menuClass: "text-red-700 hover:bg-red-50",
  },
];

function RefundReviewMenu({
  pending,
  onAction,
}: {
  pending: ActionKey | null;
  onAction: (key: ActionKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
      const menuWidth = menu?.offsetWidth ?? 176;
      const menuHeight = menu?.offsetHeight ?? actions.length * 40;
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
  }, [open, pending]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={pending !== null}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-60"
        aria-label="Refund actions"
        aria-expanded={open}
      >
        <DotsThree size={18} weight={ICON_WEIGHT_LINEAR} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[11rem] rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg"
            style={
              menuStyle
                ? { top: menuStyle.top, left: menuStyle.left }
                : { visibility: "hidden", top: 0, left: 0 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((a) => {
              const isThisLoading = pending === a.key;
              const label = isThisLoading ? a.loadingLabel : a.label;

              return (
                <button
                  key={a.key}
                  type="button"
                  disabled={pending !== null}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors disabled:opacity-60 ${a.menuClass}`}
                  onClick={() => {
                    setOpen(false);
                    onAction(a.key);
                  }}
                >
                  {isThisLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    a.icon
                  )}
                  {label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

export function RefundReviewActions({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<ActionKey | null>(null);

  async function handleAction(action: ActionKey) {
    setPending(action);
    try {
      const res = await fetch(`/api/admin/refunds/${refundId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
      <RefundReviewMenu pending={pending} onAction={handleAction} />
    </div>
  );
}
