"use client";

import { useState } from "react";
import { CaretDown, CaretUp, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { FilterSelectDropdown } from "@/components/admin/filter-select-dropdown";
import type { FilterCriteria } from "@/lib/matching/types";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import type { LeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";

export type AdvancedFiltersFieldsProps = {
  criteria: FilterCriteria;
  onChange: (c: FilterCriteria) => void;
  /** Prefetched distinct intent / haveIul options (+ Empty). */
  criteriaOptions: LeadFilterCriteriaOptions;
};

export function AdvancedFiltersFields({
  criteria,
  onChange,
  criteriaOptions,
}: AdvancedFiltersFieldsProps) {
  function update(patch: Partial<FilterCriteria>) {
    onChange(stripAttributionCriteria({ ...criteria, ...patch }));
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Lead Profile
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="criteria-intent">
            Intent
          </label>
          <div>
            <FilterSelectDropdown
              id="criteria-intent"
              dimensionLabel="Intent"
              selectionMode="multi"
              value={criteria.intent ?? []}
              allValue="__any__"
              options={criteriaOptions.intent}
              onChange={(v) => update({ intent: v })}
              accent="teal"
              menuWidthClass="w-64"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Leave unchecked to accept any. Empty = null/blank.
          </p>
        </div>
        <div>
          <label className="form-label" htmlFor="criteria-have-iul">
            Have IUL
          </label>
          <div>
            <FilterSelectDropdown
              id="criteria-have-iul"
              dimensionLabel="Have IUL"
              selectionMode="multi"
              value={criteria.haveIul ?? []}
              allValue="__any__"
              options={criteriaOptions.haveIul}
              onChange={(v) => update({ haveIul: v })}
              accent="teal"
              menuWidthClass="w-64"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Leave unchecked to accept any. Empty = null/blank.
          </p>
        </div>
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
  );
}

export function AdvancedFiltersAccordion({
  criteria,
  onChange,
  criteriaOptions,
}: AdvancedFiltersFieldsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
      >
        <span>
          Advanced Filters{" "}
          <span className="text-xs font-normal text-slate-400">(optional)</span>
        </span>
        {open ? (
          <CaretUp size={14} weight={ICON_WEIGHT_LINEAR} />
        ) : (
          <CaretDown size={14} weight={ICON_WEIGHT_LINEAR} />
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-4 border-t border-slate-100 pt-4">
          <AdvancedFiltersFields
            criteria={criteria}
            onChange={onChange}
            criteriaOptions={criteriaOptions}
          />
        </div>
      )}
    </div>
  );
}
