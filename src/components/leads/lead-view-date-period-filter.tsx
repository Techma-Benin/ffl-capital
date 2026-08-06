"use client";

import { useRef, useState } from "react";
import type { AdminDatePeriod } from "@/lib/leads/list-view-schema";
import {
  ADMIN_DATE_PERIOD_OPTIONS,
  formatAdminCustomRangeLabel,
} from "@/lib/admin/admin-date-period";
import { AdminDateRangePopover } from "@/components/admin/admin-date-range-popover";

type DateFilterPatch = {
  datePeriod?: AdminDatePeriod;
  from?: string;
  to?: string;
};

export function LeadViewDatePeriodFilter({
  datePeriod,
  from,
  to,
  onChange,
}: {
  datePeriod?: AdminDatePeriod;
  from?: string;
  to?: string;
  onChange: (patch: DateFilterPatch) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={anchorRef}>
      <label className="form-label text-[10px]" htmlFor="lead-view-date-period">
        Date period
      </label>
      <select
        id="lead-view-date-period"
        className="form-select w-full text-sm"
        value={datePeriod ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            setPickerOpen(false);
            onChange({
              datePeriod: undefined,
              from: undefined,
              to: undefined,
            });
            return;
          }
          if (value === "custom") {
            onChange({ datePeriod: "custom" });
            setPickerOpen(true);
            return;
          }
          setPickerOpen(false);
          onChange({
            datePeriod: value as AdminDatePeriod,
            from: undefined,
            to: undefined,
          });
        }}
      >
        {ADMIN_DATE_PERIOD_OPTIONS.map((option) => (
          <option key={option.value || "none"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {datePeriod === "custom" && (
        <>
          <button
            type="button"
            className="form-input mt-2 flex w-full items-center justify-between text-left text-sm"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen(true)}
          >
            {formatAdminCustomRangeLabel(from, to)}
            <span aria-hidden>▾</span>
          </button>
          {pickerOpen && (
            <AdminDateRangePopover
              hideTrigger
              anchorRef={anchorRef}
              allowPartialRange
              from={from}
              to={to}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onApply={(nextFrom, nextTo) => {
                onChange({
                  datePeriod: "custom",
                  from: nextFrom,
                  to: nextTo,
                });
                setPickerOpen(false);
              }}
              onCancel={() => setPickerOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
