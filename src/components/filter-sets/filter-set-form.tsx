"use client";

import { useEffect, useState } from "react";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import { StateChipGrid } from "@/components/filter-sets/state-chip-grid";
import { AdvancedFiltersAccordion } from "@/components/filter-sets/advanced-filters-fields";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import type { LeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import type {
  CategoryOption,
  FilterSetFormData,
  FilterSetFormVariant,
} from "@/components/filter-sets/filter-set-types";
export type {
  CategoryOption,
  FilterSetRow,
  FilterSetFormData,
  FilterSetFormVariant,
} from "@/components/filter-sets/filter-set-types";
export {
  emptyForm,
  toFormData,
} from "@/components/filter-sets/filter-set-types";

// ---------------------------------------------------------------------------
// Filter Set Form
// ---------------------------------------------------------------------------

export function FilterSetForm({
  partnerId,
  filterSetId,
  initial,
  categories,
  criteriaOptions,
  onCancel,
  onSaved,
  buildUrl,
  onSavedWithData,
  formId,
  hideButtons = false,
  onPendingChange,
  onFormChange,
  variant = "admin",
}: {
  partnerId?: string;
  filterSetId?: string;
  initial: FilterSetFormData;
  categories: CategoryOption[];
  /** Prefetched distinct intent / haveIul values (+ Empty). */
  criteriaOptions: LeadFilterCriteriaOptions;
  onCancel: () => void;
  onSaved: () => void;
  buildUrl?: (filterSetId?: string) => string;
  onSavedWithData?: (data: unknown) => void;
  formId?: string;
  hideButtons?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onFormChange?: (form: FilterSetFormData) => void;
  variant?: FilterSetFormVariant;
}) {
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isEligible = form.filterStates.length >= 15;
  const showPricing = variant === "admin" || variant === "template";

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  function toggleState(code: string) {
    setForm((prev) => ({
      ...prev,
      filterStates: prev.filterStates.includes(code)
        ? prev.filterStates.filter((s) => s !== code)
        : [...prev.filterStates, code],
    }));
  }

  function selectStates(states: readonly string[]) {
    setForm((prev) => ({ ...prev, filterStates: [...states] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEligible) {
      setError("Select at least 15 states.");
      return;
    }

    setPending(true);
    setError("");

    const criteria = stripAttributionCriteria(form.filterCriteria);
    const payload: Record<string, unknown> = {
      name: form.name.trim() || "Default",
      leadType: form.leadType,
      filterStates: form.filterStates,
      active: form.active,
      weeklyLimit: form.weeklyLimit ? Number(form.weeklyLimit) : null,
      monthlyLimit: form.monthlyLimit ? Number(form.monthlyLimit) : null,
      filterCriteria: criteria,
    };

    if (showPricing) {
      payload.priority = form.priority;
      payload.priceOverride = form.priceOverride
        ? Number(form.priceOverride)
        : null;
    }

    try {
      const url = buildUrl
        ? buildUrl(filterSetId)
        : filterSetId
          ? `/api/admin/partners/${partnerId}/filter-sets/${filterSetId}`
          : `/api/admin/partners/${partnerId}/filter-sets`;
      const res = await fetch(url, {
        method: filterSetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (onSavedWithData) onSavedWithData(data);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className={
        hideButtons
          ? "space-y-4"
          : "border-b border-slate-100 bg-slate-50/50 px-5 py-5 space-y-4"
      }
    >
      {!hideButtons && (
        <h3 className="text-sm font-semibold text-slate-900">
          {filterSetId
            ? variant === "template"
              ? "Edit Template"
              : "Edit Filter Set"
            : variant === "template"
              ? "New Template"
              : "New Filter Set"}
        </h3>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="form-label">Lead Type</label>
          <select
            className="form-select"
            value={form.leadType}
            onChange={(e) => setForm((p) => ({ ...p, leadType: e.target.value }))}
          >
            {categories.length === 0 ? (
              <option value={form.leadType}>{form.leadType}</option>
            ) : (
              categories.map((c) => (
                <option key={c.type} value={c.type}>
                  {c.label}
                </option>
              ))
            )}
          </select>
        </div>
        {showPricing && (
          <>
            <div>
              <label className="form-label">Priority (1–10)</label>
              <input
                type="number"
                min={1}
                max={10}
                className="form-input"
                value={form.priority}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priority: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="form-label">Price Override ($)</label>
              <input
                type="number"
                min={1}
                step={0.01}
                placeholder="Use default"
                className="form-input"
                value={form.priceOverride}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priceOverride: e.target.value }))
                }
              />
            </div>
          </>
        )}
        <div>
          <label className="form-label">Weekly Limit</label>
          <input
            type="number"
            min={1}
            placeholder="No limit"
            className="form-input"
            value={form.weeklyLimit}
            onChange={(e) =>
              setForm((p) => ({ ...p, weeklyLimit: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="form-label">Monthly Limit</label>
          <input
            type="number"
            min={1}
            placeholder="No limit"
            className="form-input"
            value={form.monthlyLimit}
            onChange={(e) =>
              setForm((p) => ({ ...p, monthlyLimit: e.target.value }))
            }
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((p) => ({ ...p, active: e.target.checked }))
              }
              className="rounded border-slate-300"
            />
            Active
          </label>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="form-label mb-0">
            Target States
            <span
              className={`ml-2 font-semibold ${isEligible ? "text-brand-600" : "text-slate-400"}`}
            >
              {form.filterStates.length} / {US_STATE_CODES.length} selected
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectStates(US_STATE_CODES)}
              className="btn-secondary btn-sm"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => selectStates([])}
              className="btn-secondary btn-sm"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => selectStates(US_REGION_STATES.southeast)}
              className="btn-secondary btn-sm"
            >
              Southeast
            </button>
            <button
              type="button"
              onClick={() => selectStates(US_REGION_STATES.northeast)}
              className="btn-secondary btn-sm"
            >
              Northeast
            </button>
            <button
              type="button"
              onClick={() => selectStates(US_REGION_STATES.midwest)}
              className="btn-secondary btn-sm"
            >
              Midwest
            </button>
            <button
              type="button"
              onClick={() => selectStates(US_REGION_STATES.west)}
              className="btn-secondary btn-sm"
            >
              West
            </button>
          </div>
        </div>
        <StateChipGrid
          ariaLabel="Target states"
          options={US_STATE_CODES.map((code) => ({ value: code, label: code }))}
          selected={form.filterStates}
          onToggle={toggleState}
        />
      </div>

      <AdvancedFiltersAccordion
        criteria={form.filterCriteria}
        criteriaOptions={criteriaOptions}
        onChange={(c) =>
          setForm((p) => ({
            ...p,
            filterCriteria: stripAttributionCriteria(c),
          }))
        }
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!hideButtons && (
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || !isEligible}
            className="btn-primary btn-sm"
          >
            {pending
              ? "Saving…"
              : filterSetId
                ? "Save Changes"
                : variant === "template"
                  ? "Create Template"
                  : "Create Filter Set"}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
