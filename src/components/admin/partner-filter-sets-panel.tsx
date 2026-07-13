"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InlineActionButton } from "@/components/ui/inline-action-button";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";

export type FilterSetRow = {
  id: string;
  name: string;
  leadType: string;
  filterStates: string[];
  priority: number;
  priceOverride: number | null;
  active: boolean;
  hourlyLimit: number | null;
  dailyLimit: number | null;
  deliveryChannel: string;
};

type FilterSetFormData = {
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

function emptyForm(defaultStates: string[]): FilterSetFormData {
  return {
    name: "Default",
    leadType: "traditional_iul",
    filterStates: defaultStates.length >= 15 ? [...defaultStates] : [],
    priority: 5,
    priceOverride: "",
    active: true,
    hourlyLimit: "",
    dailyLimit: "",
    deliveryChannel: "email",
  };
}

function toFormData(fs: FilterSetRow): FilterSetFormData {
  return {
    name: fs.name,
    leadType: fs.leadType as FilterSetFormData["leadType"],
    filterStates: [...fs.filterStates],
    priority: fs.priority,
    priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : "",
    active: fs.active,
    hourlyLimit: fs.hourlyLimit != null ? String(fs.hourlyLimit) : "",
    dailyLimit: fs.dailyLimit != null ? String(fs.dailyLimit) : "",
    deliveryChannel: fs.deliveryChannel as FilterSetFormData["deliveryChannel"],
  };
}

function FilterSetForm({
  partnerId,
  filterSetId,
  initial,
  onCancel,
  onSaved,
}: {
  partnerId: string;
  filterSetId?: string;
  initial: FilterSetFormData;
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
      hourlyLimit: form.hourlyLimit ? Number(form.hourlyLimit) : null,
      dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : null,
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
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                leadType: e.target.value as FilterSetFormData["leadType"],
              }))
            }
          >
            <option value="traditional_iul">Traditional IUL</option>
            <option value="high_intent_iul">High Intent IUL</option>
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
          <label className="form-label">Hourly Limit</label>
          <input
            type="number"
            min={1}
            placeholder="Unlimited"
            className="form-input"
            value={form.hourlyLimit}
            onChange={(e) =>
              setForm((p) => ({ ...p, hourlyLimit: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="form-label">Daily Limit</label>
          <input
            type="number"
            min={1}
            placeholder="Unlimited"
            className="form-input"
            value={form.dailyLimit}
            onChange={(e) =>
              setForm((p) => ({ ...p, dailyLimit: e.target.value }))
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
          onCancel={() => setMode("none")}
          onSaved={handleSaved}
        />
      )}

      {mode === "edit" && editingFilterSet && (
        <FilterSetForm
          partnerId={partnerId}
          filterSetId={editingFilterSet.id}
          initial={toFormData(editingFilterSet)}
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
                      {fs.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
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
                    {fs.hourlyLimit ?? "∞"}/hr · {fs.dailyLimit ?? "∞"}/day
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
                        icon={<Pencil size={12} />}
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
                          icon={<Trash2 size={12} />}
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
