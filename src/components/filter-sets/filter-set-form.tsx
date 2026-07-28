"use client";

import { useEffect, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  Funnel,
  Lightning,
  MapPin,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import { StateChipGrid } from "@/components/filter-sets/state-chip-grid";
import { FilterSetEditorAdvancedFields } from "@/components/filter-sets/advanced-filters-fields";
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

const MIN_FILTER_STATES = 15;

function SectionCard({
  icon,
  iconClassName,
  title,
  meta,
  action,
  children,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-visible rounded-xl border border-slate-200/80 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <span
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            iconClassName,
          )}
          aria-hidden
        >
          {icon}
        </span>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {meta}
        <span className="min-w-2 flex-1" />
        {action}
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

function hasAdvancedCriteria(form: FilterSetFormData) {
  const criteria = form.filterCriteria;
  return Boolean(
    criteria.intent?.length ||
      criteria.haveIul?.length ||
      criteria.ageMin !== undefined ||
      criteria.ageMax !== undefined ||
      criteria.acceptDays?.length ||
      criteria.acceptHoursStart !== undefined ||
      criteria.acceptHoursEnd !== undefined,
  );
}

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
  sourceTemplateId,
}: {
  partnerId?: string;
  filterSetId?: string;
  initial: FilterSetFormData;
  categories: CategoryOption[];
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
  /** When creating from a template, server applies admin-set limits from this template. */
  sourceTemplateId?: string | null;
}) {
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = form.filterStates.length;
  const isEligible = selectedCount >= MIN_FILTER_STATES;
  const showPricing = variant === "admin" || variant === "template";
  const showLimits = variant !== "partner";
  const criteriaConfigured = hasAdvancedCriteria(form);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  function toggleState(code: string) {
    setForm((previous) => ({
      ...previous,
      filterStates: previous.filterStates.includes(code)
        ? previous.filterStates.filter((state) => state !== code)
        : [...previous.filterStates, code],
    }));
  }

  function toggleRegion(states: readonly string[]) {
    setForm((previous) => {
      const allSelected = states.every((state) =>
        previous.filterStates.includes(state),
      );
      return {
        ...previous,
        filterStates: allSelected
          ? previous.filterStates.filter((state) => !states.includes(state))
          : Array.from(new Set([...previous.filterStates, ...states])),
      };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isEligible) {
      setError(`Select at least ${MIN_FILTER_STATES} states.`);
      return;
    }

    setPending(true);
    setError("");

    const payload: Record<string, unknown> = {
      name: form.name.trim() || "Default",
      leadType: form.leadType,
      filterStates: form.filterStates,
      active: form.active,
      filterCriteria: stripAttributionCriteria(form.filterCriteria),
    };

    if (showLimits) {
      payload.weeklyLimit = form.weeklyLimit ? Number(form.weeklyLimit) : null;
      payload.monthlyLimit = form.monthlyLimit ? Number(form.monthlyLimit) : null;
    } else if (!filterSetId && sourceTemplateId) {
      payload.sourceTemplateId = sourceTemplateId;
    }

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
      const response = await fetch(url, {
        method: filterSetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Save failed");
      onSavedWithData?.(data);
      onSaved();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Save failed",
      );
    } finally {
      setPending(false);
    }
  }

  const regionButtons = [
    ["Southeast", US_REGION_STATES.southeast],
    ["Northeast", US_REGION_STATES.northeast],
    ["Midwest", US_REGION_STATES.midwest],
    ["West", US_REGION_STATES.west],
  ] as const;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <SectionCard
        icon={<Funnel size={17} weight={ICON_WEIGHT_LINEAR} />}
        iconClassName="bg-brand-50 text-brand-700"
        title={variant === "template" ? "Template identity" : "Filter set identity"}
        action={
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-500">Active</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              aria-label="Filter set active"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  active: !previous.active,
                }))
              }
              className={clsx(
                "relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                form.active ? "bg-accent-500" : "bg-slate-300",
              )}
            >
              <span
                className={clsx(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  form.active ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="filter-set-name">
              Name
            </label>
            <input
              id="filter-set-name"
              className="form-input"
              placeholder="Default"
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="form-label" htmlFor="filter-set-lead-type">
              Lead type
            </label>
            <select
              id="filter-set-lead-type"
              className="form-select"
              value={form.leadType}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  leadType: event.target.value,
                }))
              }
            >
              {categories.length === 0 ? (
                <option value={form.leadType}>{form.leadType}</option>
              ) : (
                categories.map((category) => (
                  <option key={category.type} value={category.type}>
                    {category.label}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<MapPin size={17} weight={ICON_WEIGHT_LINEAR} />}
        iconClassName="bg-blue-50 text-blue-600"
        title="Target states"
        meta={
          <span className="text-[11px] font-bold text-slate-400">
            {selectedCount} / {US_STATE_CODES.length} selected
          </span>
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  filterStates: [...US_STATE_CODES],
                }))
              }
              className="btn-secondary btn-sm"
            >
              All
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, filterStates: [] }))
              }
              className="btn-secondary btn-sm"
            >
              Clear
            </button>
            {regionButtons.map(([label, states]) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleRegion(states)}
                className="btn-secondary btn-sm"
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <StateChipGrid
          ariaLabel="Target states"
          options={US_STATE_CODES.map((code) => ({ value: code, label: code }))}
          selected={form.filterStates}
          onToggle={toggleState}
          variant="editor"
        />
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="State eligibility progress"
            aria-valuemin={0}
            aria-valuemax={MIN_FILTER_STATES}
            aria-valuenow={Math.min(selectedCount, MIN_FILTER_STATES)}
          >
            <span
              className={clsx(
                "block h-full rounded-full transition-[width,background-color]",
                isEligible ? "bg-accent-500" : "bg-amber-400",
              )}
              style={{
                width: `${Math.min(100, (selectedCount / MIN_FILTER_STATES) * 100)}%`,
              }}
            />
          </div>
          <span
            className={clsx(
              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
              isEligible
                ? "bg-accent-50 text-accent-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            {isEligible
              ? "Eligible · minimum met"
              : `${MIN_FILTER_STATES - selectedCount} more needed`}
          </span>
        </div>
      </SectionCard>

      {(showPricing || showLimits) && (
      <SectionCard
        icon={<Lightning size={17} weight={ICON_WEIGHT_LINEAR} />}
        iconClassName="bg-accent-50 text-accent-700"
        title={showPricing ? "Delivery & pricing" : "Delivery limits"}
      >
        {showPricing && (
          <>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Routing & price
            </p>
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="filter-set-priority">
                  Priority (1–10)
                </label>
                <input
                  id="filter-set-priority"
                  type="number"
                  min={1}
                  max={10}
                  className="form-input"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      priority: Number(event.target.value),
                    }))
                  }
                />
                <p className="mt-1 text-xs text-slate-400">
                  Higher priority wins when several filter sets match.
                </p>
              </div>
              <div>
                <label className="form-label" htmlFor="filter-set-price">
                  Price override ($)
                </label>
                <input
                  id="filter-set-price"
                  type="number"
                  min={1}
                  step={0.01}
                  placeholder="Use default"
                  className="form-input"
                  value={form.priceOverride}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      priceOverride: event.target.value,
                    }))
                  }
                />
                <p className="mt-1 text-xs text-slate-400">
                  Leave blank to use the configured default lead price.
                </p>
              </div>
            </div>
          </>
        )}
        {showLimits && (
          <>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Volume caps
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="filter-set-weekly-limit">
                  Weekly limit
                </label>
                <input
                  id="filter-set-weekly-limit"
                  type="number"
                  min={1}
                  placeholder="No limit"
                  className="form-input"
                  value={form.weeklyLimit}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      weeklyLimit: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="form-label" htmlFor="filter-set-monthly-limit">
                  Monthly limit
                </label>
                <input
                  id="filter-set-monthly-limit"
                  type="number"
                  min={1}
                  placeholder="No limit"
                  className="form-input"
                  value={form.monthlyLimit}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      monthlyLimit: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </>
        )}
      </SectionCard>
      )}

      <SectionCard
        icon={<Funnel size={17} weight={ICON_WEIGHT_LINEAR} />}
        iconClassName="bg-amber-50 text-amber-700"
        title="Lead profile & schedule"
        meta={
          <span className="text-[11px] font-bold text-slate-400">Optional</span>
        }
        action={
          criteriaConfigured ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  filterCriteria: {},
                }))
              }
            >
              Reset
            </button>
          ) : undefined
        }
      >
        <FilterSetEditorAdvancedFields
          criteria={form.filterCriteria}
          criteriaOptions={criteriaOptions}
          onChange={(criteria) =>
            setForm((previous) => ({
              ...previous,
              filterCriteria: stripAttributionCriteria(criteria),
            }))
          }
        />
      </SectionCard>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {!hideButtons && (
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending || !isEligible}
            className="btn-primary btn-sm"
          >
            {pending
              ? "Saving…"
              : filterSetId
                ? "Save changes"
                : variant === "template"
                  ? "Create template"
                  : "Create filter set"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
