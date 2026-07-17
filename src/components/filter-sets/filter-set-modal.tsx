"use client";

import { useEffect, useId, useState } from "react";
import { X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import {
  FilterSetForm,
  type FilterSetFormData,
  type CategoryOption,
} from "./filter-set-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterSetTemplate = {
  id: string;
  name: string;
  description: string | null;
  leadType: "traditional_iul" | "high_intent_iul";
  filterStates: string[];
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  traditional_iul: "Traditional IUL",
  high_intent_iul: "High Intent IUL",
};

// ---------------------------------------------------------------------------
// Template Picker (partner create flow)
// ---------------------------------------------------------------------------

function TemplatePicker({
  onSelect,
  onSkip,
}: {
  onSelect: (t: FilterSetTemplate) => void;
  onSkip: () => void;
}) {
  const [templates, setTemplates] = useState<FilterSetTemplate[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/partner/filter-set-templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setLoadError("Could not load templates."));
  }, []);

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
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className="text-left rounded-lg border border-slate-200 bg-white p-3.5 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-900 group-hover:text-brand-700">
                  {t.name}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">
                  {LEAD_TYPE_LABELS[t.leadType]}
                </span>
              </div>
              {t.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {t.description}
                </p>
              )}
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {t.filterStates.length} state
                {t.filterStates.length !== 1 ? "s" : ""}
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

// ---------------------------------------------------------------------------
// Universal Filter Set Modal
// ---------------------------------------------------------------------------

export type FilterSetModalProps = {
  mode: "create" | "edit";
  // For edit mode
  filterSetId?: string;
  filterSetName?: string;
  filterSetActive?: boolean;
  // Initial form data (required for edit; for create, provide emptyForm() or prefilled)
  initial: FilterSetFormData;
  categories: CategoryOption[];
  buildUrl?: (filterSetId?: string) => string;
  /** Admin-only: partnerId used to build the default URL when buildUrl is absent */
  partnerId?: string;
  /** Show the template picker step before the editor (partner create flow) */
  showTemplatePicker?: boolean;
  onClose: () => void;
  /** Called after a successful save (before onClose) */
  onSaved?: () => void;
  /** Called with raw API response on save — use to update local state */
  onSavedWithData?: (data: unknown) => void;
};

export function FilterSetModal({
  mode,
  filterSetId,
  filterSetName,
  filterSetActive,
  initial,
  categories,
  buildUrl,
  partnerId,
  showTemplatePicker = false,
  onClose,
  onSaved,
  onSavedWithData,
}: FilterSetModalProps) {
  const formId = useId();
  const [step, setStep] = useState<"picker" | "editor">(
    mode === "create" && showTemplatePicker ? "picker" : "editor",
  );
  const [prefill, setPrefill] = useState<FilterSetFormData>(initial);
  const [pending, setPending] = useState(false);

  // Scroll lock + Escape key
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const title =
    mode === "edit"
      ? (filterSetName ?? "Edit Filter Set")
      : step === "picker"
        ? "Start from a template"
        : "New Filter Set";

  function handleSaved() {
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal container */}
      <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">
              {title}
            </span>
            {mode === "edit" && (
              <Badge variant={filterSetActive ? "green" : "slate"}>
                {filterSetActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "picker" ? (
            <TemplatePicker
              onSelect={(t) => {
                setPrefill((p) => ({
                  ...p,
                  name: t.name,
                  leadType: t.leadType,
                  filterStates: [...t.filterStates],
                }));
                setStep("editor");
              }}
              onSkip={() => setStep("editor")}
            />
          ) : (
            <FilterSetForm
              formId={formId}
              hideButtons
              onPendingChange={setPending}
              filterSetId={filterSetId}
              partnerId={partnerId}
              initial={prefill}
              categories={categories}
              buildUrl={buildUrl}
              onCancel={onClose}
              onSaved={handleSaved}
              onSavedWithData={onSavedWithData}
            />
          )}
        </div>

        {/* Sticky footer */}
        {step === "editor" && (
          <div className="flex flex-shrink-0 items-center justify-between gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary btn-sm"
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              disabled={pending}
              className="btn-primary btn-sm"
            >
              {pending
                ? "Saving…"
                : mode === "edit"
                  ? "Save Changes"
                  : "Create Filter Set"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
