"use client";

import { FilterSelectDropdown } from "@/components/admin/filter-select-dropdown";
import type { FilterCriteria } from "@/lib/matching/types";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import type { LeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import {
  useClientTimeZone,
  type LocalHourOption,
} from "@/lib/client-time-zone";

export type AdvancedFiltersFieldsProps = {
  criteria: FilterCriteria;
  onChange: (c: FilterCriteria) => void;
  /** Prefetched distinct intent / haveIul options (+ Empty). */
  criteriaOptions: LeadFilterCriteriaOptions;
};

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
] as const;

const WEEKDAYS = DAYS.slice(0, 5).map(([day]) => day);

function closestEasternHour(
  options: LocalHourOption[],
  targetLocalMinute: number,
) {
  return options.reduce((closest, option) => {
    const optionDistance = Math.min(
      Math.abs(option.localMinuteOfDay - targetLocalMinute),
      1440 - Math.abs(option.localMinuteOfDay - targetLocalMinute),
    );
    const closestDistance = Math.min(
      Math.abs(closest.localMinuteOfDay - targetLocalMinute),
      1440 - Math.abs(closest.localMinuteOfDay - targetLocalMinute),
    );
    return optionDistance < closestDistance ? option : closest;
  }).value;
}

function HourSelect({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value?: number;
  placeholder: string;
  options: LocalHourOption[];
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="form-select"
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : Number(event.target.value),
          )
        }
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterSetEditorAdvancedFields({
  criteria,
  onChange,
  criteriaOptions,
}: AdvancedFiltersFieldsProps) {
  const clientTime = useClientTimeZone();

  function update(patch: Partial<FilterCriteria>) {
    onChange(stripAttributionCriteria({ ...criteria, ...patch }));
  }

  const selectedDays = criteria.acceptDays ?? [];
  const localBusinessStart = closestEasternHour(clientTime.options, 9 * 60);
  const localBusinessEnd = closestEasternHour(clientTime.options, 17 * 60);
  const localBusinessStartLabel = clientTime.options.find(
    (option) => option.value === localBusinessStart,
  )?.label;
  const localBusinessEndLabel = clientTime.options.find(
    (option) => option.value === localBusinessEnd,
  )?.label;

  return (
    <div className="space-y-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        Lead Profile
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="criteria-age-min">
            Minimum age
          </label>
          <input
            id="criteria-age-min"
            type="number"
            min={0}
            max={120}
            placeholder="No min"
            className="form-input"
            value={criteria.ageMin ?? ""}
            onChange={(e) =>
              update({
                ageMin: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div>
          <label className="form-label" htmlFor="criteria-age-max">
            Maximum age
          </label>
          <input
            id="criteria-age-max"
            type="number"
            min={0}
            max={120}
            placeholder="No max"
            className="form-input"
            value={criteria.ageMax ?? ""}
            onChange={(e) =>
              update({
                ageMax: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Schedule · Your timezone
        </p>
        <p className="mt-1 text-xs font-medium normal-case tracking-normal text-slate-400">
          {clientTime.displayName}
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="form-label mb-0">Days you accept leads</label>
            <button
              type="button"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
              onClick={() => update({ acceptDays: [...WEEKDAYS] })}
            >
              Weekdays only
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {DAYS.map(([day, label]) => {
              const selected = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    update({
                      acceptDays: selected
                        ? selectedDays.filter((item) => item !== day)
                        : [...selectedDays, day],
                    })
                  }
                  className={`h-10 rounded-lg border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    selected
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Leave every day unselected to accept leads on any day.
          </p>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3">
            <HourSelect
              id="criteria-hours-start"
              label="Start"
              value={criteria.acceptHoursStart}
              placeholder="Any time"
              options={clientTime.options}
              onChange={(acceptHoursStart) => update({ acceptHoursStart })}
            />
            <HourSelect
              id="criteria-hours-end"
              label="Stop"
              value={criteria.acceptHoursEnd}
              placeholder="Any time"
              options={clientTime.options}
              onChange={(acceptHoursEnd) => update({ acceptHoursEnd })}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-slate-400">
              Stop time is exclusive. Times are shown in your timezone.
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
              onClick={() =>
                update({
                  acceptHoursStart: localBusinessStart,
                  acceptHoursEnd: localBusinessEnd,
                })
              }
            >
              Use {localBusinessStartLabel}–{localBusinessEndLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact legacy presentation used by onboarding. The full-page filter-set
 * editor uses FilterSetEditorAdvancedFields so the onboarding flow stays
 * outside the editor redesign.
 */
export function AdvancedFiltersFields({
  criteria,
  onChange,
  criteriaOptions,
}: AdvancedFiltersFieldsProps) {
  const clientTime = useClientTimeZone();

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
          <FilterSelectDropdown
            id="criteria-intent"
            dimensionLabel="Intent"
            selectionMode="multi"
            value={criteria.intent ?? []}
            allValue="__any__"
            options={criteriaOptions.intent}
            onChange={(value) => update({ intent: value })}
            accent="teal"
            menuWidthClass="w-64"
          />
          <p className="mt-1 text-xs text-slate-400">
            Leave unchecked to accept any. Empty = null/blank.
          </p>
        </div>
        <div>
          <label className="form-label" htmlFor="criteria-have-iul">
            Have IUL
          </label>
          <FilterSelectDropdown
            id="criteria-have-iul"
            dimensionLabel="Have IUL"
            selectionMode="multi"
            value={criteria.haveIul ?? []}
            allValue="__any__"
            options={criteriaOptions.haveIul}
            onChange={(value) => update({ haveIul: value })}
            accent="teal"
            menuWidthClass="w-64"
          />
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
            onChange={(event) =>
              update({
                ageMin: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
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
            onChange={(event) =>
              update({
                ageMax: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Schedule (your timezone)
        </p>
        <p className="mt-1 text-xs text-slate-400">{clientTime.displayName}</p>
      </div>
      <div>
        <label className="form-label">Days you accept leads</label>
        <div className="mt-1 flex flex-wrap gap-3">
          {DAYS.map(([day, label]) => (
            <label
              key={day}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={(criteria.acceptDays ?? []).includes(day)}
                onChange={(event) => {
                  const selectedDays = criteria.acceptDays ?? [];
                  update({
                    acceptDays: event.target.checked
                      ? [...selectedDays, day]
                      : selectedDays.filter((item) => item !== day),
                  });
                }}
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Leave all unchecked to accept any day
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <HourSelect
          id="onboarding-criteria-hours-start"
          label="Start"
          value={criteria.acceptHoursStart}
          placeholder="Any time"
          options={clientTime.options}
          onChange={(acceptHoursStart) => update({ acceptHoursStart })}
        />
        <HourSelect
          id="onboarding-criteria-hours-end"
          label="Stop"
          value={criteria.acceptHoursEnd}
          placeholder="Any time"
          options={clientTime.options}
          onChange={(acceptHoursEnd) => update({ acceptHoursEnd })}
        />
      </div>
    </div>
  );
}
