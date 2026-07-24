"use client";

import { useEffect, useState } from "react";
import type { FilterCriteria } from "@/lib/matching/types";

export type FilterSetTemplate = {
  id: string;
  name: string;
  description: string | null;
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
  onSelect,
  onSkip,
  initialTemplates,
}: {
  onSelect: (template: FilterSetTemplate) => void;
  onSkip: () => void;
  /** Prefer SSR data; falls back to partner templates API when omitted */
  initialTemplates?: FilterSetTemplate[];
}) {
  const [templates, setTemplates] = useState<FilterSetTemplate[] | null>(
    initialTemplates ?? null,
  );
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (initialTemplates !== undefined) {
      setTemplates(initialTemplates);
      return;
    }
    fetch("/api/partner/filter-set-templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setLoadError("Could not load templates."));
  }, [initialTemplates]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Select a preset to pre-fill your new filter set, or start from scratch.
      </p>

      {loadError && <p className="text-xs text-red-600">{loadError}</p>}

      {templates === null && !loadError && (
        <p className="text-sm text-slate-400">Loading templates…</p>
      )}

      {templates !== null && templates.length === 0 && (
        <p className="text-xs text-slate-400">No templates available yet.</p>
      )}

      {templates && templates.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className="group rounded-lg border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-900 group-hover:text-brand-700">
                  {template.name}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  {LEAD_TYPE_LABELS[template.leadType] ?? template.leadType}
                </span>
              </div>
              {template.description && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {template.description}
                </p>
              )}
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {template.filterStates.length} state
                {template.filterStates.length !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="pt-1">
        <button type="button" onClick={onSkip} className="btn-secondary btn-sm">
          Start blank
        </button>
      </div>
    </div>
  );
}
