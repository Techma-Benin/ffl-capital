"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import Link from "next/link";
import { X, Funnel, CopySimple, CaretDown } from "@phosphor-icons/react";
import { US_STATE_CODES, US_REGION_STATES } from "@/lib/constants/us-states";
import type { FilterCriteria } from "@/lib/matching/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterListRow = {
  fs: {
    id: string;
    partnerId: string;
    name: string;
    leadType: string;
    filterStates: string[];
    priority: number;
    priceOverride: string | null;
    active: boolean;
    weeklyLimit: number | null;
    monthlyLimit: number | null;
    filterCriteria: FilterCriteria;
    deliveryChannel: string;
    partner: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      status: string;
      walletBalance: string;
    };
  };
  usage: { weekly: number; monthly: number };
  price: number;
};

type EditForm = {
  name: string;
  leadType: string;
  filterStates: string[];
  priority: number;
  priceOverride: string;
  active: boolean;
  weeklyLimit: string;
  monthlyLimit: string;
  deliveryChannel: "email" | "webhook" | "ringy";
  filterCriteria: FilterCriteria;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToForm(fs: FilterListRow["fs"]): EditForm {
  return {
    name: fs.name,
    leadType: fs.leadType,
    filterStates: [...fs.filterStates],
    priority: fs.priority,
    priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : "",
    active: fs.active,
    weeklyLimit: fs.weeklyLimit != null ? String(fs.weeklyLimit) : "",
    monthlyLimit: fs.monthlyLimit != null ? String(fs.monthlyLimit) : "",
    deliveryChannel: (fs.deliveryChannel as EditForm["deliveryChannel"]) || "email",
    filterCriteria: fs.filterCriteria ?? {},
  };
}

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
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
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
// Advanced Filters — Ignore / Include / Exclude field
// ---------------------------------------------------------------------------

type FilterMode = "ignore" | "include" | "exclude";

function FilterField({
  label,
  fieldId,
  includeValues,
  excludeValues = [],
  onIncludeChange,
  onExcludeChange,
  supportsExclude = true,
  placeholder = "e.g. value1, value2",
}: {
  label: string;
  fieldId: string;
  includeValues: string[];
  excludeValues?: string[];
  onIncludeChange: (v: string[]) => void;
  onExcludeChange?: (v: string[]) => void;
  supportsExclude?: boolean;
  placeholder?: string;
}) {
  const derivedMode: FilterMode =
    includeValues.length > 0 ? "include" :
    excludeValues.length > 0 ? "exclude" : "ignore";

  const [localText, setLocalText] = useState(() =>
    derivedMode === "include" ? includeValues.join(", ") :
    derivedMode === "exclude" ? excludeValues.join(", ") : ""
  );

  function handleModeChange(m: FilterMode) {
    setLocalText("");
    onIncludeChange([]);
    onExcludeChange?.([]);
  }

  function handleTextChange(raw: string, mode: FilterMode) {
    setLocalText(raw);
    const vals = raw.split(",").map((v) => v.trim()).filter(Boolean);
    if (mode === "include") onIncludeChange(vals);
    else if (mode === "exclude") onExcludeChange?.(vals);
  }

  const modes: FilterMode[] = supportsExclude
    ? ["ignore", "include", "exclude"]
    : ["ignore", "include"];

  const summary =
    derivedMode === "include" && includeValues.length > 0
      ? includeValues.join(", ")
      : derivedMode === "exclude" && excludeValues.length > 0
      ? excludeValues.join(", ")
      : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-4">
        {modes.map((m) => (
          <label
            key={m}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <input
              type="radio"
              name={fieldId}
              checked={derivedMode === m}
              onChange={() => handleModeChange(m)}
              className="h-3.5 w-3.5 accent-brand-600"
            />
            <span
              className={`text-xs font-medium ${
                derivedMode === m ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </span>
          </label>
        ))}
      </div>
      {derivedMode !== "ignore" && (
        <textarea
          rows={2}
          placeholder={placeholder}
          className="form-input w-full resize-none text-xs leading-relaxed"
          value={localText}
          onChange={(e) => handleTextChange(e.target.value, derivedMode)}
        />
      )}
      {derivedMode !== "ignore" && summary && (
        <p className="text-[11px] text-slate-400 truncate">
          <span
            className={`font-semibold ${
              derivedMode === "include" ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {derivedMode === "include" ? "Including" : "Excluding"}:
          </span>{" "}
          {summary}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advanced Filters accordion (no visible box — just a toggle)
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
    onChange({ ...criteria, ...patch });
  }

  // Count active filters for the summary badge
  const activeCount = [
    (criteria.intent?.length ?? 0) > 0,
    (criteria.haveIul?.length ?? 0) > 0,
    (criteria.source?.length ?? 0) > 0 || (criteria.excludeSource?.length ?? 0) > 0,
    (criteria.subId?.length ?? 0) > 0 || (criteria.excludeSubId?.length ?? 0) > 0,
    (criteria.pubId?.length ?? 0) > 0 || (criteria.excludePubId?.length ?? 0) > 0,
    (criteria.boberdooLeadType?.length ?? 0) > 0,
    criteria.ageMin !== undefined,
    criteria.ageMax !== undefined,
    (criteria.acceptDays?.length ?? 0) > 0,
    criteria.acceptHoursStart !== undefined,
    criteria.acceptHoursEnd !== undefined,
  ].filter(Boolean).length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <CaretDown
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        Advanced Filters
        {activeCount > 0 ? (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
            {activeCount} active
          </span>
        ) : (
          <span className="text-xs font-normal text-slate-400">(optional)</span>
        )}
      </button>

      {open && (
        <div className="mt-5 space-y-5">
          {/* Lead Profile */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Lead Profile
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterField
              fieldId="adv-intent"
              label="Intent"
              includeValues={criteria.intent ?? []}
              onIncludeChange={(v) => update({ intent: v })}
              supportsExclude={false}
              placeholder="e.g. buy_now, research"
            />
            <FilterField
              fieldId="adv-haveIul"
              label="Have IUL"
              includeValues={criteria.haveIul ?? []}
              onIncludeChange={(v) => update({ haveIul: v })}
              supportsExclude={false}
              placeholder="e.g. yes, no"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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

          {/* Attribution */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1">
            Attribution
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterField
              fieldId="adv-source"
              label="Source"
              includeValues={criteria.source ?? []}
              excludeValues={criteria.excludeSource ?? []}
              onIncludeChange={(v) => update({ source: v, excludeSource: [] })}
              onExcludeChange={(v) => update({ excludeSource: v, source: [] })}
              placeholder="e.g. meta_leadconduit"
            />
            <FilterField
              fieldId="adv-subId"
              label="Sub ID"
              includeValues={criteria.subId ?? []}
              excludeValues={criteria.excludeSubId ?? []}
              onIncludeChange={(v) => update({ subId: v, excludeSubId: [] })}
              onExcludeChange={(v) => update({ excludeSubId: v, subId: [] })}
              placeholder="e.g. sub_123"
            />
            <FilterField
              fieldId="adv-pubId"
              label="Pub ID"
              includeValues={criteria.pubId ?? []}
              excludeValues={criteria.excludePubId ?? []}
              onIncludeChange={(v) => update({ pubId: v, excludePubId: [] })}
              onExcludeChange={(v) => update({ excludePubId: v, pubId: [] })}
              placeholder="e.g. pub_456"
            />
            <FilterField
              fieldId="adv-boberdoo"
              label="Boberdoo Lead Type"
              includeValues={criteria.boberdooLeadType ?? []}
              onIncludeChange={(v) => update({ boberdooLeadType: v })}
              supportsExclude={false}
              placeholder="e.g. iul, mp"
            />
          </div>

          {/* Schedule */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1">
            Schedule (Eastern Time)
          </p>
          <div>
            <label className="form-label">Days you accept leads</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(
                ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
              ).map((day) => {
                const active = (criteria.acceptDays ?? []).includes(day);
                return (
                  <label
                    key={day}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => {
                        const days = criteria.acceptDays ?? [];
                        update({
                          acceptDays: e.target.checked
                            ? [...days, day]
                            : days.filter((d) => d !== day),
                        });
                      }}
                      className="hidden"
                    />
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </label>
                );
              })}
            </div>
            {(criteria.acceptDays?.length ?? 0) === 0 && (
              <p className="mt-1.5 text-[11px] text-slate-400">Any day</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                    acceptHoursStart: e.target.value ? Number(e.target.value) : undefined,
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
                    acceptHoursEnd: e.target.value ? Number(e.target.value) : undefined,
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
// Modal
// ---------------------------------------------------------------------------

function FilterSetModal({
  row,
  onClose,
  onSaved,
}: {
  row: FilterListRow;
  onClose: () => void;
  onSaved: (updated: FilterListRow["fs"]) => void;
}) {
  const { fs } = row;
  const [form, setForm] = useState<EditForm>(() => rowToForm(fs));
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [templateMsg, setTemplateMsg] = useState("");

  const selectedSet = new Set(form.filterStates);
  const stateCount = form.filterStates.length;
  const isEligible = stateCount >= 15;

  function toggleState(code: string) {
    setForm((prev) => ({
      ...prev,
      filterStates: prev.filterStates.includes(code)
        ? prev.filterStates.filter((s) => s !== code)
        : [...prev.filterStates, code],
    }));
    setError("");
  }

  function selectAll(states: readonly string[]) {
    setForm((prev) => ({ ...prev, filterStates: [...states] }));
    setError("");
  }

  async function handleSave() {
    if (!isEligible) {
      setError("Filter set requires at least 15 states.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/partners/${fs.partnerId}/filter-sets/${fs.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim() || fs.name,
            leadType: form.leadType,
            filterStates: form.filterStates,
            priority: form.priority,
            priceOverride: form.priceOverride !== "" ? Number(form.priceOverride) : null,
            active: form.active,
            weeklyLimit: form.weeklyLimit !== "" ? Number(form.weeklyLimit) : null,
            monthlyLimit: form.monthlyLimit !== "" ? Number(form.monthlyLimit) : null,
            filterCriteria: form.filterCriteria,
            deliveryChannel: form.deliveryChannel,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved(data.filterSet);
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsTemplate() {
    setSavingTemplate(true);
    setTemplateMsg("");
    try {
      const res = await fetch("/api/admin/filter-set-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || fs.name,
          description: `From ${fs.partner.firstName} ${fs.partner.lastName}'s filter set`,
          leadType: form.leadType,
          filterStates: form.filterStates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTemplateMsg(data.error ?? "Failed to create template");
        return;
      }
      setTemplateMsg("Saved as template ✓");
    } catch {
      setTemplateMsg("Request failed");
    } finally {
      setSavingTemplate(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">
              {fs.partner.firstName} {fs.partner.lastName} · {fs.partner.email}
            </p>
            <h2 className="text-base font-semibold text-slate-900 truncate">{fs.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* Name + lead type */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, leadType: e.target.value as EditForm["leadType"] }))
                }
              >
                <option value="traditional_iul">Traditional IUL</option>
                <option value="high_intent_iul">High Intent IUL</option>
              </select>
            </div>
          </div>

          {/* Priority + price override + delivery */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="form-label">Priority (1–10)</label>
              <input
                type="number"
                min={1}
                max={10}
                className="form-input"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="form-label">Price override ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="Use default"
                className="form-input"
                value={form.priceOverride}
                onChange={(e) => setForm((p) => ({ ...p, priceOverride: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Delivery channel</label>
              <select
                className="form-select"
                value={form.deliveryChannel}
                onChange={(e) =>
                  setForm((p) => ({ ...p, deliveryChannel: e.target.value as EditForm["deliveryChannel"] }))
                }
              >
                <option value="email">Email</option>
                <option value="webhook">Webhook</option>
                <option value="ringy">Ringy</option>
              </select>
            </div>
          </div>

          {/* Volume limits */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Weekly limit</label>
              <input
                type="number"
                min={1}
                placeholder="No limit"
                className="form-input"
                value={form.weeklyLimit}
                onChange={(e) => setForm((p) => ({ ...p, weeklyLimit: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Monthly limit</label>
              <input
                type="number"
                min={1}
                placeholder="No limit"
                className="form-input"
                value={form.monthlyLimit}
                onChange={(e) => setForm((p) => ({ ...p, monthlyLimit: e.target.value }))}
              />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Active
          </label>

          {/* State picker */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="form-label mb-0">Target States</label>
              <span
                className={`text-sm font-semibold ${isEligible ? "text-emerald-600" : "text-amber-600"}`}
              >
                {stateCount} / 50 selected
              </span>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["All", US_STATE_CODES],
                  ["Clear", []],
                  ["Southeast", US_REGION_STATES.southeast],
                  ["Northeast", US_REGION_STATES.northeast],
                  ["Midwest", US_REGION_STATES.midwest],
                  ["West", US_REGION_STATES.west],
                ] as [string, readonly string[]][]
              ).map(([label, states]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => selectAll(states)}
                  className="btn-secondary btn-sm"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {US_STATE_CODES.map((code) => {
                const isSelected = selectedSet.has(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleState(code)}
                    className={`rounded px-1 py-1.5 text-[10px] font-bold transition-colors ${
                      isSelected
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-50 text-slate-500 hover:bg-brand-50"
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
            {!isEligible && (
              <p className="mt-1.5 text-xs text-amber-700">
                {15 - stateCount} more state{15 - stateCount !== 1 ? "s" : ""} needed (minimum 15).
              </p>
            )}
          </div>

          {/* Advanced filters */}
          <AdvancedFiltersAccordion
            criteria={form.filterCriteria}
            onChange={(c) => setForm((p) => ({ ...p, filterCriteria: c }))}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          {/* Save as template */}
          <div className="flex items-center gap-2">
            <ActionButton
              type="button"
              variant="secondary"
              loading={savingTemplate}
              loadingText="Saving template…"
              icon={<CopySimple size={14} />}
              onClick={handleSaveAsTemplate}
            >
              Save as template
            </ActionButton>
            {templateMsg && (
              <span
                className={`text-xs ${templateMsg.includes("✓") ? "text-emerald-600" : "text-red-600"}`}
              >
                {templateMsg}
              </span>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancel
            </button>
            <ActionButton
              type="button"
              loading={saving}
              loadingText="Saving…"
              onClick={handleSave}
            >
              Save changes
            </ActionButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function FilterListTable({ initialRows }: { initialRows: FilterListRow[] }) {
  const [rows, setRows] = useState<FilterListRow[]>(initialRows);
  const [selected, setSelected] = useState<FilterListRow | null>(null);

  function handleSaved(updated: FilterListRow["fs"]) {
    setRows((prev) =>
      prev.map((r) =>
        r.fs.id === updated.id ? { ...r, fs: { ...r.fs, ...updated } } : r,
      ),
    );
    setSelected((prev) =>
      prev ? { ...prev, fs: { ...prev.fs, ...updated } } : null,
    );
    setSelected(null);
  }

  return (
    <>
      {selected && (
        <FilterSetModal
          row={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Funnel size={15} className="text-slate-400" />
          Partner Filter Sets
        </h2>
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Filter Set</th>
                <th>Lead Type</th>
                <th>States</th>
                <th>Priority</th>
                <th>Price</th>
                <th>Balance</th>
                <th>Usage (W/M)</th>
                <th>Delivery</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    No filter sets configured
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const { fs, usage, price } = row;
                  return (
                    <tr
                      key={fs.id}
                      className="cursor-pointer hover:bg-brand-50 transition-colors"
                      onClick={() => setSelected(row)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/partners/${fs.partnerId}`}
                          className="hover:text-brand-600"
                        >
                          <p className="font-medium text-slate-900">
                            {fs.partner.firstName} {fs.partner.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{fs.partner.email}</p>
                        </Link>
                      </td>
                      <td className="font-medium">{fs.name}</td>
                      <td>
                        <Badge variant="blue">
                          {fs.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td>{fs.filterStates.length}</td>
                      <td>{fs.priority}</td>
                      <td className="font-semibold">${price.toFixed(2)}</td>
                      <td
                        className={
                          Number(fs.partner.walletBalance) >= price
                            ? "text-slate-900"
                            : "text-red-500"
                        }
                      >
                        ${Number(fs.partner.walletBalance).toFixed(2)}
                      </td>
                      <td className="text-xs text-slate-500">
                        {usage.weekly}/{fs.weeklyLimit ?? "∞"} · {usage.monthly}/
                        {fs.monthlyLimit ?? "∞"}
                      </td>
                      <td className="text-xs capitalize">{fs.deliveryChannel ?? "email"}</td>
                      <td>
                        <Badge
                          variant={
                            fs.active && fs.partner.status === "active" ? "green" : "slate"
                          }
                        >
                          {fs.active ? fs.partner.status : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
