"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import Link from "next/link";
import { X, Funnel, CopySimple } from "@phosphor-icons/react";
import { US_STATE_CODES, US_REGION_STATES } from "@/lib/constants/us-states";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterListRow = {
  fs: {
    id: string;
    partnerId: string;
    name: string;
    leadType: "traditional_iul" | "high_intent_iul";
    filterStates: string[];
    priority: number;
    priceOverride: string | null;
    active: boolean;
    hourlyLimit: number | null;
    dailyLimit: number | null;
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
  usage: { hourly: number; daily: number };
  price: number;
};

type EditForm = {
  name: string;
  leadType: "traditional_iul" | "high_intent_iul";
  filterStates: string[];
  priority: number;
  priceOverride: string;
  active: boolean;
  hourlyLimit: string;
  dailyLimit: string;
  deliveryChannel: "email" | "webhook" | "ringy";
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
    hourlyLimit: fs.hourlyLimit != null ? String(fs.hourlyLimit) : "",
    dailyLimit: fs.dailyLimit != null ? String(fs.dailyLimit) : "",
    deliveryChannel: (fs.deliveryChannel as EditForm["deliveryChannel"]) || "email",
  };
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
            hourlyLimit: form.hourlyLimit !== "" ? Number(form.hourlyLimit) : null,
            dailyLimit: form.dailyLimit !== "" ? Number(form.dailyLimit) : null,
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

  return (
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

          {/* Limits */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Hourly limit</label>
              <input
                type="number"
                min={1}
                placeholder="No limit"
                className="form-input"
                value={form.hourlyLimit}
                onChange={(e) => setForm((p) => ({ ...p, hourlyLimit: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Daily limit</label>
              <input
                type="number"
                min={1}
                placeholder="No limit"
                className="form-input"
                value={form.dailyLimit}
                onChange={(e) => setForm((p) => ({ ...p, dailyLimit: e.target.value }))}
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
    </div>
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
                <th>Usage (H/D)</th>
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
                        {usage.hourly}/{fs.hourlyLimit ?? "∞"} · {usage.daily}/
                        {fs.dailyLimit ?? "∞"}
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
