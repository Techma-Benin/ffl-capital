"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PencilSimple, Plus, Trash, CaretDown, CaretUp } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { InlineActionButton } from "@/components/ui/inline-action-button";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import type { FilterCriteria } from "@/lib/matching/types";

export type FilterSetRow = {
  id: string;
  name: string;
  leadType: string;
  filterStates: string[];
  priority: number;
  priceOverride: number | null;
  active: boolean;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  filterCriteria: FilterCriteria;
  deliveryChannel: string;
};

type FilterSetFormData = {
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

function emptyForm(defaultStates: string[]): FilterSetFormData {
  return {
    name: "Default",
    leadType: "traditional_iul",
    filterStates: defaultStates.length >= 15 ? [...defaultStates] : [],
    priority: 5,
    priceOverride: "",
    active: true,
    weeklyLimit: "",
    monthlyLimit: "",
    deliveryChannel: "email",
    filterCriteria: {},
  };
}

function toFormData(fs: FilterSetRow): FilterSetFormData {
  return {
    name: fs.name,
    leadType: fs.leadType,
    filterStates: [...fs.filterStates],
    priority: fs.priority,
    priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : "",
    active: fs.active,
    weeklyLimit: fs.weeklyLimit != null ? String(fs.weeklyLimit) : "",
    monthlyLimit: fs.monthlyLimit != null ? String(fs.monthlyLimit) : "",
    deliveryChannel: fs.deliveryChannel as FilterSetFormData["deliveryChannel"],
    filterCriteria: fs.filterCriteria ?? {},
  };
}

// ---------------------------------------------------------------------------
// Tag input for comma/enter-separated string lists
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
    onChange({ ...criteria, ...patch });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors rounded-lg"
      >
        <span>Advanced Filters <span className="text-xs font-normal text-slate-400">(optional)</span></span>
        {open ? <CaretUp size={14} /> : <CaretDown size={14} />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
          {/* Lead Profile */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lead Profile</p>
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

          {/* Attribution */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1">Attribution</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TagInput
              label="Source (allow-list)"
              values={criteria.source ?? []}
              onChange={(v) => update({ source: v })}
              placeholder="e.g. meta_leadconduit"
            />
            <TagInput
              label="Source (block-list)"
              values={criteria.excludeSource ?? []}
              onChange={(v) => update({ excludeSource: v })}
            />
            <TagInput
              label="Sub ID (allow-list)"
              values={criteria.subId ?? []}
              onChange={(v) => update({ subId: v })}
            />
            <TagInput
              label="Sub ID (block-list)"
              values={criteria.excludeSubId ?? []}
              onChange={(v) => update({ excludeSubId: v })}
            />
            <TagInput
              label="Pub ID (allow-list)"
              values={criteria.pubId ?? []}
              onChange={(v) => update({ pubId: v })}
            />
            <TagInput
              label="Pub ID (block-list)"
              values={criteria.excludePubId ?? []}
              onChange={(v) => update({ excludePubId: v })}
            />
            <TagInput
              label="Boberdoo Lead Type (allow-list)"
              values={criteria.boberdooLeadType ?? []}
              onChange={(v) => update({ boberdooLeadType: v })}
            />
          </div>

          {/* Schedule */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1">Schedule (Eastern Time)</p>
          <div>
            <label className="form-label">Days you accept leads</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const).map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(criteria.acceptDays ?? []).includes(day)}
                    onChange={(e) => {
                      const days = criteria.acceptDays ?? [];
                      update({ acceptDays: e.target.checked ? [...days, day] : days.filter((d) => d !== day) });
                    }}
                    className="rounded border-slate-300"
                  />
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">Leave all unchecked to accept any day</p>
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
                onChange={(e) => update({ acceptHoursStart: e.target.value ? Number(e.target.value) : undefined })}
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
                onChange={(e) => update({ acceptHoursEnd: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type CategoryOption = { type: string; label: string };

// ---------------------------------------------------------------------------
// Filter Set Form
// ---------------------------------------------------------------------------

function FilterSetForm({
  partnerId,
  filterSetId,
  initial,
  categories,
  onCancel,
  onSaved,
}: {
  partnerId: string;
  filterSetId?: string;
  initial: FilterSetFormData;
  categories: CategoryOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const selected = new Set(form.filterStates);
  const isEligible = form.filterStates.length >= 15;

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

    const payload = {
      name: form.name.trim() || "Default",
      leadType: form.leadType,
      filterStates: form.filterStates,
      priority: form.priority,
      priceOverride: form.priceOverride ? Number(form.priceOverride) : null,
      active: form.active,
      weeklyLimit: form.weeklyLimit ? Number(form.weeklyLimit) : null,
      monthlyLimit: form.monthlyLimit ? Number(form.monthlyLimit) : null,
      filterCriteria: form.filterCriteria,
      deliveryChannel: form.deliveryChannel,
    };

    try {
      const url = filterSetId
        ? `/api/admin/partners/${partnerId}/filter-sets/${filterSetId}`
        : `/api/admin/partners/${partnerId}/filter-sets`;
      const res = await fetch(url, {
        method: filterSetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-slate-100 bg-slate-50/50 px-5 py-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">
        {filterSetId ? "Edit Filter Set" : "New Filter Set"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            placeholder="Default"
            className="form-input"
            value={form.priceOverride}
            onChange={(e) =>
              setForm((p) => ({ ...p, priceOverride: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="form-label">Weekly Limit</label>
          <input
            type="number"
            min={1}
            placeholder="Unlimited"
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
            placeholder="Unlimited"
            className="form-input"
            value={form.monthlyLimit}
            onChange={(e) =>
              setForm((p) => ({ ...p, monthlyLimit: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="form-label">Delivery Channel</label>
          <select
            className="form-select"
            value={form.deliveryChannel}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                deliveryChannel: e.target.value as FilterSetFormData["deliveryChannel"],
              }))
            }
          >
            <option value="email">Email</option>
            <option value="webhook">Webhook</option>
            <option value="ringy">Ringy</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700">
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
            Target States ({form.filterStates.length} selected, min 15)
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => selectStates(US_STATE_CODES)} className="btn-secondary btn-sm">
              All
            </button>
            <button type="button" onClick={() => selectStates([])} className="btn-secondary btn-sm">
              Clear
            </button>
            <button type="button" onClick={() => selectStates(US_REGION_STATES.southeast)} className="btn-secondary btn-sm">
              Southeast
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
          {US_STATE_CODES.map((code) => {
            const isSelected = selected.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleState(code)}
                className={`rounded px-1 py-1 text-[10px] font-bold transition-colors ${
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
      </div>

      <AdvancedFiltersAccordion
        criteria={form.filterCriteria}
        onChange={(c) => setForm((p) => ({ ...p, filterCriteria: c }))}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending || !isEligible} className="btn-primary btn-sm">
          {pending ? "Saving…" : filterSetId ? "Save Changes" : "Create Filter Set"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PartnerFilterSetsPanel({
  partnerId,
  filterSets,
  defaultStates,
}: {
  partnerId: string;
  filterSets: FilterSetRow[];
  defaultStates: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

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

  function handleSaved() {
    setMode("none");
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(filterSetId: string) {
    setDeletingId(filterSetId);
    try {
      const res = await fetch(
        `/api/admin/partners/${partnerId}/filter-sets/${filterSetId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setDeletingId(null);
    }
  }

  const editingFilterSet = editingId
    ? filterSets.find((fs) => fs.id === editingId)
    : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Filter Sets</h2>
        {mode === "none" && (
          <button
            type="button"
            onClick={() => setMode("create")}
            className="btn-secondary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={14} />
            Add Filter Set
          </button>
        )}
      </div>

      {mode === "create" && (
        <FilterSetForm
          partnerId={partnerId}
          initial={emptyForm(defaultStates)}
          categories={categories}
          onCancel={() => setMode("none")}
          onSaved={handleSaved}
        />
      )}

      {mode === "edit" && editingFilterSet && (
        <FilterSetForm
          partnerId={partnerId}
          filterSetId={editingFilterSet.id}
          initial={toFormData(editingFilterSet)}
          categories={categories}
          onCancel={() => {
            setMode("none");
            setEditingId(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <div className="overflow-x-auto">
        {filterSets.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">No filter sets configured.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Lead Type</th>
                <th>States</th>
                <th>Priority</th>
                <th>Price Override</th>
                <th>Limits</th>
                <th>Delivery</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filterSets.map((fs) => (
                <tr key={fs.id}>
                  <td className="font-medium">{fs.name}</td>
                  <td>
                    <Badge variant="blue">
                      {categories.find((c) => c.type === fs.leadType)?.label ?? fs.leadType}
                    </Badge>
                  </td>
                  <td>{fs.filterStates.length}</td>
                  <td>{fs.priority}</td>
                  <td>
                    {fs.priceOverride != null
                      ? `$${fs.priceOverride.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="text-xs text-slate-500">
                    {fs.weeklyLimit ?? "∞"}/wk · {fs.monthlyLimit ?? "∞"}/mo
                  </td>
                  <td className="text-xs capitalize">{fs.deliveryChannel ?? "email"}</td>
                  <td>
                    <Badge variant={fs.active ? "green" : "slate"}>
                      {fs.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <InlineActionButton
                        tone="slate"
                        icon={<PencilSimple size={12} />}
                        disabled={mode !== "none"}
                        onClick={() => {
                          setEditingId(fs.id);
                          setMode("edit");
                        }}
                      >
                        Edit
                      </InlineActionButton>
                      {filterSets.length > 1 && (
                        <InlineActionButton
                          tone="red"
                          icon={<Trash size={12} />}
                          loading={deletingId === fs.id}
                          loadingText="Deleting…"
                          disabled={mode !== "none"}
                          onClick={() => handleDelete(fs.id)}
                        >
                          Delete
                        </InlineActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
