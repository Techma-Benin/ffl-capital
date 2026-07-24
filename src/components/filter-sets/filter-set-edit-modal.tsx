"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { FilterSetForm, type CategoryOption } from "@/components/filter-sets/filter-set-form";
import type { FilterSetFormData } from "@/components/filter-sets/filter-set-types";
import type { FilterListRow } from "@/components/admin/filter-list-table";

type FilterSetEditModalProps = {
  row: FilterListRow;
  onClose: () => void;
};

function rowToFormData(fs: FilterListRow["fs"]): FilterSetFormData {
  return {
    name: fs.name,
    leadType: fs.leadType,
    filterStates: [...fs.filterStates],
    priority: fs.priority,
    priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : "",
    active: fs.active,
    weeklyLimit: fs.weeklyLimit != null ? String(fs.weeklyLimit) : "",
    monthlyLimit: fs.monthlyLimit != null ? String(fs.monthlyLimit) : "",
    filterCriteria: fs.filterCriteria ?? {},
  };
}

export function FilterSetEditModal({ row, onClose }: FilterSetEditModalProps) {
  const { fs } = row;
  const router = useRouter();
  const formId = useId();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pending, setPending] = useState(false);
  const [prefill, setPrefill] = useState<FilterSetFormData>(() => rowToFormData(fs));
  const [active, setActive] = useState(fs.active);

  // Fetch categories once on mount
  useEffect(() => {
    fetch("/api/admin/lead-categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categories)) {
          setCategories(
            data.categories.map((c: { type: string; label: string }) => ({
              type: c.type,
              label: c.label,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Lock body scroll + Escape to close
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

  function handleSaved() {
    router.refresh();
    onClose();
  }

  const displayName = `${fs.partner.firstName} ${fs.partner.lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-labelledby="fs-edit-modal-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                id="fs-edit-modal-title"
                className="text-sm font-semibold text-slate-900"
              >
                Edit filter set
              </h2>
              <Badge variant={active ? "green" : "slate"}>
                {active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {displayName} · {fs.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FilterSetForm
            formId={formId}
            hideButtons
            filterSetId={fs.id}
            partnerId={fs.partnerId}
            initial={prefill}
            categories={categories}
            buildUrl={(id) =>
              `/api/admin/partners/${fs.partnerId}/filter-sets/${id}`
            }
            onPendingChange={setPending}
            onFormChange={(f) => {
              setPrefill(f);
              setActive(f.active);
            }}
            onCancel={onClose}
            onSaved={handleSaved}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
          <ActionButton
            type="submit"
            form={formId}
            variant="primary"
            className="btn-sm"
            loading={pending}
            loadingText="Saving…"
          >
            Save changes
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
