"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CopySimple,
  ArrowRight,
  X,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { notify } from "@/lib/notify";
import type { FilterCriteria } from "@/lib/matching/types";

export type FilterSetTemplate = {
  id: string;
  name: string;
  leadType: string;
  filterStates: string[];
  priority?: number;
  priceOverride?: number | null;
  weeklyLimit?: number | null;
  monthlyLimit?: number | null;
  filterCriteria?: FilterCriteria;
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  traditional_iul: "Traditional IUL",
  high_intent_iul: "High Intent IUL",
};

export function FilterSetTemplatePicker({
  open,
  onOpenChange,
  onSelect,
  onSkip,
  initialTemplates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: FilterSetTemplate) => void;
  onSkip: () => void;
  /** Prefer SSR data; falls back to partner templates API when omitted */
  initialTemplates?: FilterSetTemplate[];
}) {
  const [templates, setTemplates] = useState<FilterSetTemplate[] | null>(
    initialTemplates ?? null,
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialTemplates !== undefined) {
      setTemplates(initialTemplates);
      return;
    }
    fetch("/api/partner/filter-set-templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => notify.error("Could not load templates."));
  }, [initialTemplates]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Start from a template"
    >
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => onOpenChange(false)}
      />
      <section className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200/80 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"
            aria-hidden
          >
            <CopySimple size={17} weight={ICON_WEIGHT_LINEAR} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Start from a template
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Choose a preset or begin with a blank filter set.
            </p>
          </div>
          <span className="flex-1" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {templates === null && (
            <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading templates">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
                />
              ))}
            </div>
          )}

          {templates !== null && templates.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No templates are available yet. Start with a blank filter set.
            </p>
          )}

          {templates && templates.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onSelect(template);
                    onOpenChange(false);
                  }}
                  className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-brand-700">
                      {template.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      {LEAD_TYPE_LABELS[template.leadType] ?? template.leadType}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-400">
                      {template.filterStates.length} state
                      {template.filterStates.length !== 1 ? "s" : ""}
                    </p>
                    <ArrowRight
                      size={15}
                      weight={ICON_WEIGHT_LINEAR}
                      className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
                      aria-hidden
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                onSkip();
                onOpenChange(false);
              }}
              className="btn-secondary btn-sm"
            >
              Start blank
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
