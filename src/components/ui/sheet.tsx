"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Accessible label for the dialog (required when open). */
  title: string;
  /** Optional description id target for aria-describedby. */
  description?: string;
};

export function Sheet({
  open,
  onOpenChange,
  children,
  title,
  description,
}: SheetProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  function onBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onOpenChange(false);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-layer-sheet)] flex justify-end motion-safe:animate-sheet-backdrop-in motion-reduce:animate-none bg-slate-900/40 backdrop-blur-[1px]"
      onMouseDown={onBackdropClick}
      aria-hidden={false}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={clsx(
          "flex h-full w-full max-w-[min(100vw,24rem)] flex-col border-l border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10",
          "motion-safe:animate-sheet-panel-in motion-reduce:animate-none opacity-0 motion-reduce:opacity-100",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4">
          <button
            ref={closeRef}
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="Close panel"
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">
            {title}
          </h2>
        </div>
        {description ? (
          <p id={descId} className="sr-only">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("min-h-0 flex-1 overflow-y-auto px-5 py-5", className)}>
      {children}
    </div>
  );
}
