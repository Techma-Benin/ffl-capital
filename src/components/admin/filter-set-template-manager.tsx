"use client";

import { useState, useEffect } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { EmptyStateBlobIcon } from "@/components/ui/empty-state-blob-icon";
import {
  Plus,
  PencilSimple,
  Trash,
  X,
  Funnel,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { US_STATE_CODES, US_REGION_STATES } from "@/lib/constants/us-states";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterSetTemplate = {
  id: string;
  name: string;
  description: string | null;
  leadType: "traditional_iul" | "high_intent_iul";
  filterStates: string[];
};

type TemplateFormData = {
  name: string;
  description: string;
  leadType: "traditional_iul" | "high_intent_iul";
  filterStates: string[];
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  traditional_iul: "Traditional IUL",
  high_intent_iul: "High Intent IUL",
};

// ---------------------------------------------------------------------------
// Template Editor
// ---------------------------------------------------------------------------

function TemplateEditor({
  initialData,
  onSaved,
  onClose,
  templateId,
}: {
  initialData: TemplateFormData;
  onSaved: (t: FilterSetTemplate) => void;
  onClose: () => void;
  templateId?: string;
}) {
  const [form, setForm] = useState<TemplateFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSet = new Set(form.filterStates);
  const isEditing = Boolean(templateId);

  function toggleState(code: string) {
    setForm((prev) => ({
      ...prev,
      filterStates: prev.filterStates.includes(code)
        ? prev.filterStates.filter((s) => s !== code)
        : [...prev.filterStates, code],
    }));
  }

  function selectAll(states: readonly string[]) {
    setForm((prev) => ({ ...prev, filterStates: [...states] }));
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (form.filterStates.length === 0) {
      setError("Select at least one state.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = templateId
        ? `/api/admin/filter-set-templates/${templateId}`
        : "/api/admin/filter-set-templates";
      const res = await fetch(url, {
        method: templateId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          leadType: form.leadType,
          filterStates: form.filterStates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved(data as FilterSetTemplate);
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {isEditing ? "Edit Template" : "New Template"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={16} weight={ICON_WEIGHT_LINEAR} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Southeast Traditional IUL"
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
                leadType: e.target.value as TemplateFormData["leadType"],
              }))
            }
          >
            <option value="traditional_iul">Traditional IUL</option>
            <option value="high_intent_iul">High Intent IUL</option>
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Description (optional)</label>
        <input
          className="form-input"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Brief description for partners"
        />
      </div>

      {/* State picker */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="form-label mb-0">States *</label>
          <span className="text-sm font-semibold text-slate-500">
            {form.filterStates.length} selected
          </span>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => selectAll(US_STATE_CODES)} className="btn-secondary btn-sm">
            All
          </button>
          <button type="button" onClick={() => selectAll([])} className="btn-secondary btn-sm">
            Clear
          </button>
          <button type="button" onClick={() => selectAll(US_REGION_STATES.southeast)} className="btn-secondary btn-sm">
            Southeast
          </button>
          <button type="button" onClick={() => selectAll(US_REGION_STATES.northeast)} className="btn-secondary btn-sm">
            Northeast
          </button>
          <button type="button" onClick={() => selectAll(US_REGION_STATES.midwest)} className="btn-secondary btn-sm">
            Midwest
          </button>
          <button type="button" onClick={() => selectAll(US_REGION_STATES.west)} className="btn-secondary btn-sm">
            West
          </button>
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
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <ActionButton
          type="button"
          loading={saving}
          loadingText="Saving…"
          onClick={save}
        >
          {isEditing ? "Save Changes" : "Create Template"}
        </ActionButton>
        <button type="button" onClick={onClose} className="btn-secondary btn-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FilterSetTemplateManager() {
  const [templates, setTemplates] = useState<FilterSetTemplate[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/admin/filter-set-templates", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load");
        setTemplates(await res.json());
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError("Could not load templates.");
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  function handleCreated(t: FilterSetTemplate) {
    setTemplates((prev) => [...(prev ?? []), t]);
    setShowCreate(false);
  }

  function handleUpdated(t: FilterSetTemplate) {
    setTemplates((prev) =>
      prev ? prev.map((tmpl) => (tmpl.id === t.id ? t : tmpl)) : prev,
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? Filter sets already copied from it won't be affected.")) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/filter-set-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete");
        return;
      }
      setTemplates((prev) => prev?.filter((t) => t.id !== id) ?? null);
    } catch {
      setDeleteError("Request failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const loaded = templates !== null;
  const isEmpty = loaded && templates.length === 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Funnel size={16} className="text-slate-500" weight={ICON_WEIGHT_LINEAR} />
        <h2 className="text-sm font-semibold text-slate-900">Filter Set Templates</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
          Admin
        </span>
        <div className="ml-auto">
          {loaded && !showCreate && (
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setEditingId(null);
              }}
              className="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              <Plus size={13} weight={ICON_WEIGHT_LINEAR} />
              Add Template
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4 text-xs text-slate-500 border-b border-slate-100">
        Templates give partners a starting point when creating filter sets. Partners can select a template
        and customize it before saving.
      </div>

      {loadError && (
        <p className="px-5 py-4 text-sm text-red-600">{loadError}</p>
      )}

      {!loaded && !loadError && (
        <p className="px-5 py-4 text-sm text-slate-400">Loading…</p>
      )}

      {showCreate && (
        <div className="px-5 py-5 border-b border-slate-100">
          <TemplateEditor
            initialData={{ name: "", description: "", leadType: "traditional_iul", filterStates: [] }}
            onSaved={handleCreated}
            onClose={() => setShowCreate(false)}
          />
        </div>
      )}

      {isEmpty && !showCreate && (
        <div className="group/empty px-5 py-8 text-center">
          <EmptyStateBlobIcon
            icon={Funnel}
            seed="No templates yet"
            accent="amber"
            size="sm"
            className="mb-3"
          />
          <p className="text-sm font-semibold text-slate-900 mb-1">No templates yet</p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Create templates that partners can use as starting points when building their filter sets.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setEditingId(null);
            }}
            className="btn-primary btn-sm inline-flex items-center gap-1.5"
          >
            <Plus size={13} weight={ICON_WEIGHT_LINEAR} />
            Create First Template
          </button>
        </div>
      )}

      {templates && templates.length > 0 && (
        <div>
          {templates.map((t) => {
            const isEditing = editingId === t.id;
            return (
              <div key={t.id} className="border-b border-slate-100 last:border-b-0">
                {isEditing ? (
                  <div className="px-5 py-5">
                    <TemplateEditor
                      templateId={t.id}
                      initialData={{
                        name: t.name,
                        description: t.description ?? "",
                        leadType: t.leadType,
                        filterStates: t.filterStates,
                      }}
                      onSaved={handleUpdated}
                      onClose={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 truncate">{t.name}</span>
                        <Badge variant="blue">{LEAD_TYPE_LABELS[t.leadType]}</Badge>
                        <span className="text-xs text-slate-500">{t.filterStates.length} states</span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => {
                          setEditingId(t.id);
                          setShowCreate(false);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <PencilSimple size={14} weight={ICON_WEIGHT_LINEAR} />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        disabled={deletingId === t.id}
                        onClick={() => handleDelete(t.id)}
                        className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        <Trash size={14} weight={ICON_WEIGHT_LINEAR} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deleteError && (
        <p className="px-5 py-2 text-xs text-red-600 border-t border-slate-100">{deleteError}</p>
      )}
    </div>
  );
}
