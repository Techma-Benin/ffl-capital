"use client";

import { useEffect, useState } from "react";
import { CaretDown, CaretUp, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import { StateChipGrid } from "@/components/filter-sets/state-chip-grid";
import type { FilterCriteria } from "@/lib/matching/types";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
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
// Tag input
// ---------------------------------------------------------------------------

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function commit() {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="flex flex-wrap gap-1 rounded-md border border-slate-300 bg-white p-1.5 min-h-[36px]">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-700"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-brand-900"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[100px] text-xs outline-none bg-transparent"
          value={input}
          placeholder={values.length === 0 ? (placeholder ?? "Type and press Enter") : ""}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advanced Filters accordion
// ---------------------------------------------------------------------------

function AdvancedFiltersAccordion({
  criteria,
  onChange,
}: {
  criteria: FilterCriteria;
  onChange: (c: FilterCriteria) => void;
}) {
  const [open, setOpen] = useState(false);

  function update(patch: Partial<FilterCriteria>) {
    onChange(stripAttributionCriteria({ ...criteria, ...patch }));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors rounded-lg"
      >
        <span>
          Advanced Filters{" "}
          <span className="text-xs font-normal text-slate-400">(optional)</span>
        </span>
        {open ? <CaretUp size={14} weight={ICON_WEIGHT_LINEAR} /> : <CaretDown size={14} weight={ICON_WEIGHT_LINEAR} />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Lead Profile
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TagInput
              label="Intent (allow-list)"
              values={criteria.intent ?? []}
              onChange={(v) => update({ intent: v })}
              placeholder="e.g. buy_now"
            />
            <TagInput
              label="Have IUL (allow-list)"
              values={criteria.haveIul ?? []}
              onChange={(v) => update({ haveIul: v })}
              placeholder="e.g. yes"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">Age Min</label>
              <input
                type="number"
                min={0}
                max={120}
                placeholder="No min"
                className="form-input"
                value={criteria.ageMin ?? ""}
                onChange={(e) =>
                  update({ ageMin: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div>
              <label className="form-label">Age Max</label>
              <input
                type="number"
                min={0}
                max={120}
                placeholder="No max"
                className="form-input"
                value={criteria.ageMax ?? ""}
                onChange={(e) =>
                  update({ ageMax: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1">
            Schedule (Eastern Time)
          </p>
          <div>
            <label className="form-label">Days you accept leads</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {(
                [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ] as const
              ).map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(criteria.acceptDays ?? []).includes(day)}
                    onChange={(e) => {
                      const days = criteria.acceptDays ?? [];
                      update({
                        acceptDays: e.target.checked
                          ? [...days, day]
                          : days.filter((d) => d !== day),
                      });
                    }}
                    className="rounded border-slate-300"
                  />
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Leave all unchecked to accept any day
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">From hour (ET, 0–23)</label>
              <input
                type="number"
                min={0}
                max={23}
                placeholder="No start"
                className="form-input"
                value={criteria.acceptHoursStart ?? ""}
                onChange={(e) =>
                  update({
                    acceptHoursStart: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div>
              <label className="form-label">To hour (ET, 0–23, exclusive)</label>
              <input
                type="number"
                min={0}
                max={23}
                placeholder="No end"
                className="form-input"
                value={criteria.acceptHoursEnd ?? ""}
                onChange={(e) =>
                  update({
                    acceptHoursEnd: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Set Form
// ---------------------------------------------------------------------------

export function FilterSetForm({
  partnerId,
  filterSetId,
  initial,
  categories,
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
