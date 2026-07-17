"use client";

import { useState, useEffect, useCallback } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { usePartner } from "@/components/partner/partner-provider";
import {
  Gear,
  PlugsConnected,
  Funnel,
  Plus,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import type { FilterCriteria } from "@/lib/matching/types";
import {
  FilterSetForm,
  type FilterSetFormData,
} from "@/components/admin/partner-filter-sets-panel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PartnerFilterSet = {
  id: string;
  name: string;
  leadType: "traditional_iul" | "high_intent_iul";
  filterStates: string[];
  priority: number;
  active: boolean;
  weeklyLimit?: number | null;
  monthlyLimit?: number | null;
  filterCriteria?: FilterCriteria;
};

type FilterSetTemplate = {
  id: string;
  name: string;
  description: string | null;
  leadType: "traditional_iul" | "high_intent_iul";
  filterStates: string[];
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  traditional_iul: "Traditional IUL",
  high_intent_iul: "High Intent IUL",
};

// ---------------------------------------------------------------------------
// Template Picker
// ---------------------------------------------------------------------------

function TemplatePicker({
  onSelect,
  onSkip,
  onClose,
}: {
  onSelect: (t: FilterSetTemplate) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<FilterSetTemplate[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/partner/filter-set-templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setLoadError("Could not load templates."));
  }, []);

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Start from a template</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Select a preset to pre-fill your new filter set, or start from scratch.
      </p>

      {loadError && <p className="text-xs text-red-600">{loadError}</p>}

      {templates === null && !loadError && (
        <p className="text-sm text-slate-400">Loading templates…</p>
      )}

      {templates !== null && templates.length === 0 && (
        <p className="text-xs text-slate-400">No templates available yet.</p>
      )}

      {templates && templates.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className="text-left rounded-lg border border-slate-200 bg-white p-3.5 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-900 group-hover:text-brand-700">
                  {t.name}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">
                  {LEAD_TYPE_LABELS[t.leadType]}
                </span>
              </div>
              {t.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.description}</p>
              )}
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {t.filterStates.length} state{t.filterStates.length !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="pt-1">
        <button type="button" onClick={onSkip} className="btn-secondary btn-sm">
          Start blank
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partner URL builder for FilterSetForm
// ---------------------------------------------------------------------------

const PARTNER_CATEGORIES = [
  { type: "traditional_iul", label: "Traditional IUL" },
  { type: "high_intent_iul", label: "High Intent IUL" },
];

function partnerFilterSetUrl(filterSetId?: string) {
  return filterSetId
    ? `/api/partners/filter-sets/${filterSetId}`
    : "/api/partners/filter-sets";
}

// ---------------------------------------------------------------------------
// Filter Set Modal (edit existing)
// ---------------------------------------------------------------------------

function FilterSetModal({
  filterSet,
  onSaved,
  onClose,
}: {
  filterSet: PartnerFilterSet;
  onSaved: (updated: PartnerFilterSet) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const eligible = filterSet.filterStates.length >= 15;

  const initial: FilterSetFormData = {
    name: filterSet.name,
    leadType: filterSet.leadType,
    filterStates: filterSet.filterStates,
    priority: filterSet.priority ?? 5,
    priceOverride: "",
    active: filterSet.active,
    weeklyLimit: filterSet.weeklyLimit != null ? String(filterSet.weeklyLimit) : "",
    monthlyLimit: filterSet.monthlyLimit != null ? String(filterSet.monthlyLimit) : "",
    deliveryChannel: "email",
    filterCriteria: (filterSet.filterCriteria as FilterCriteria) ?? {},
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate">{filterSet.name}</span>
            <Badge variant={filterSet.active ? "green" : "slate"}>
              {filterSet.active ? "Active" : "Inactive"}
            </Badge>
            {!eligible && <Badge variant="yellow">Below minimum</Badge>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <FilterSetForm
            filterSetId={filterSet.id}
            initial={initial}
            categories={PARTNER_CATEGORIES}
            buildUrl={partnerFilterSetUrl}
            onSavedWithData={(data) => onSaved(data as PartnerFilterSet)}
            onSaved={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Sets section
// ---------------------------------------------------------------------------

// "create" mode: "picker" → template picker shown; "editor" → editor shown (possibly pre-filled)
type CreateMode = null | "picker" | "editor";

const DEFAULT_FORM: FilterSetFormData = {
  name: "",
  leadType: "traditional_iul",
  filterStates: [],
  priority: 5,
  priceOverride: "",
  active: true,
  weeklyLimit: "",
  monthlyLimit: "",
  deliveryChannel: "email",
  filterCriteria: {},
};

function FilterSetsSection({ embedded = false }: { embedded?: boolean }) {
  const [filterSets, setFilterSets] = useState<PartnerFilterSet[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editingFs, setEditingFs] = useState<PartnerFilterSet | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [prefillData, setPrefillData] = useState<FilterSetFormData>(DEFAULT_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/filter-sets");
      if (!res.ok) throw new Error("Failed to load");
      setFilterSets(await res.json());
    } catch {
      setLoadError("Could not load filter sets.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openPicker() {
    setPrefillData(DEFAULT_FORM);
    setCreateMode("picker");
    setEditingFs(null);
  }

  function handleTemplateSelected(t: FilterSetTemplate) {
    setPrefillData({
      ...DEFAULT_FORM,
      name: t.name,
      leadType: t.leadType,
      filterStates: [...t.filterStates],
    });
    setCreateMode("editor");
  }

  function handleSkipTemplate() {
    setPrefillData(DEFAULT_FORM);
    setCreateMode("editor");
  }

  function closeCreate() {
    setCreateMode(null);
    setPrefillData(DEFAULT_FORM);
  }

  function handleCreated(created: PartnerFilterSet) {
    setFilterSets((prev) => [...(prev ?? []), created]);
    closeCreate();
  }

  function handleUpdated(updated: PartnerFilterSet) {
    setFilterSets((prev) =>
      prev ? prev.map((fs) => (fs.id === updated.id ? updated : fs)) : prev,
    );
    setEditingFs(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this filter set? It will be deactivated.")) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/partners/filter-sets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete");
        return;
      }
      setFilterSets((prev) => prev?.filter((fs) => fs.id !== id) ?? null);
    } catch {
      setDeleteError("Request failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const loaded = filterSets !== null;
  const isEmpty = loaded && filterSets.length === 0;

  return (
    <div className={embedded ? "overflow-hidden" : "mb-5 card overflow-hidden"}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Funnel size={16} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Filter Sets</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
          Targeting
        </span>
        <div className="ml-auto">
          {loaded && createMode === null && (
            <button
              type="button"
              onClick={openPicker}
              className="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              <Plus size={13} />
              Add Filter Set
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <p className="px-5 py-4 text-sm text-red-600">{loadError}</p>
      )}

      {!loaded && !loadError && (
        <p className="px-5 py-4 text-sm text-slate-400">Loading…</p>
      )}

      {/* Step 1: Template picker */}
      {createMode === "picker" && (
        <div className="px-5 py-5 border-b border-slate-100">
          <TemplatePicker
            onSelect={handleTemplateSelected}
            onSkip={handleSkipTemplate}
            onClose={closeCreate}
          />
        </div>
      )}

      {/* Step 2: Editor (blank or pre-filled from template) */}
      {createMode === "editor" && (
        <div className="px-5 py-5 border-b border-slate-100">
          <FilterSetForm
            initial={prefillData}
            categories={PARTNER_CATEGORIES}
            buildUrl={partnerFilterSetUrl}
            onSavedWithData={(data) => handleCreated(data as PartnerFilterSet)}
            onSaved={closeCreate}
            onCancel={closeCreate}
          />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && createMode === null && (
        <div className="px-5 py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Funnel size={22} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">No filter sets yet</p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            At least one active filter set with ≥15 states is required to receive leads. Create your first filter set to get started.
          </p>
          <button
            type="button"
            onClick={openPicker}
            className="btn-primary btn-sm inline-flex items-center gap-1.5"
          >
            <Plus size={13} />
            Create First Filter Set
          </button>
        </div>
      )}

      {/* List */}
      {filterSets && filterSets.length > 0 && (
        <div>
          {filterSets.map((fs) => {
            const eligible = fs.filterStates.length >= 15;
            return (
              <div key={fs.id} className="border-b border-slate-100 last:border-b-0">
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => { setEditingFs(fs); setCreateMode(null); }}
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-slate-900 truncate">{fs.name}</span>
                    <Badge variant={fs.active ? "green" : "slate"}>
                      {fs.active ? "Active" : "Inactive"}
                    </Badge>
                    {!eligible && <Badge variant="yellow">Below minimum</Badge>}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="rounded p-1 text-slate-400">
                      <PencilSimple size={14} />
                    </span>
                    <button
                      type="button"
                      title="Delete"
                      disabled={deletingId === fs.id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(fs.id); }}
                      className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {editingFs && (
            <FilterSetModal
              filterSet={editingFs}
              onSaved={handleUpdated}
              onClose={() => setEditingFs(null)}
            />
          )}
        </div>
      )}

      {deleteError && (
        <p className="px-5 py-2 text-xs text-red-600 border-t border-slate-100">{deleteError}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function PartnerSettingsView() {
  const { partner, patchPartner } = usePartner();

  const [webhookUrl, setWebhookUrl] = useState(partner.crmWebhookUrl ?? "");
  const [leadType, setLeadType] = useState<"traditional_iul" | "high_intent_iul">(
    partner.leadType as "traditional_iul" | "high_intent_iul",
  );

  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState(false);
  const [webhookError, setWebhookError] = useState("");

  const [leadTypeSaving, setLeadTypeSaving] = useState(false);
  const [leadTypeSuccess, setLeadTypeSuccess] = useState(false);
  const [leadTypeError, setLeadTypeError] = useState("");

  const webhookDirty = webhookUrl !== (partner.crmWebhookUrl ?? "");
  const leadTypeDirty = leadType !== partner.leadType;

  async function saveWebhook() {
    setWebhookError("");
    setWebhookSuccess(false);
    setWebhookSaving(true);
    try {
      const res = await fetch("/api/partners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmWebhookUrl: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setWebhookError(data.error ?? "Failed to save webhook"); return; }
      patchPartner({ crmWebhookUrl: data.crmWebhookUrl });
      setWebhookUrl(data.crmWebhookUrl ?? "");
      setWebhookSuccess(true);
    } catch {
      setWebhookError("Request failed. Please try again.");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function saveLeadType() {
    setLeadTypeError("");
    setLeadTypeSuccess(false);
    setLeadTypeSaving(true);
    try {
      const res = await fetch("/api/partners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadType }),
      });
      const data = await res.json();
      if (!res.ok) { setLeadTypeError(data.error ?? "Failed to save lead type"); return; }
      patchPartner({ leadType: data.leadType });
      setLeadTypeSuccess(true);
    } catch {
      setLeadTypeError("Request failed. Please try again.");
    } finally {
      setLeadTypeSaving(false);
    }
  }

  return (
    <div className="-mx-6 -mt-6 min-h-full">
      {/* Page header */}
      <div className="bg-white px-8 pt-10 pb-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account preferences, webhook integrations, and lead filter sets.
        </p>
      </div>


      {/* Scrollable content */}
      <div className="mx-auto max-w-4xl space-y-8 px-8 py-10 pb-32">

        {/* Account Settings */}
        <section
          id="account"
          className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm scroll-mt-12"
        >
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Gear size={18} className="text-brand-600" />
              Account Settings
            </h2>
            <p className="mt-1 text-sm text-slate-500">Manage your basic profile and preferences.</p>
          </div>

          <div className="grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <div>
              <label className="form-label">Lead Type</label>
              <select
                className="form-select"
                value={leadType}
                onChange={(e) => {
                  setLeadType(e.target.value as typeof leadType);
                  setLeadTypeSuccess(false);
                  setLeadTypeError("");
                }}
              >
                <option value="traditional_iul">Traditional IUL</option>
                <option value="high_intent_iul">High Intent IUL</option>
              </select>
              {leadTypeError && <p className="mt-1 text-xs text-red-600">{leadTypeError}</p>}
            </div>
            <div>
              <label className="form-label">Affiliation (Company)</label>
              <input
                className="form-input bg-slate-50"
                defaultValue={partner.affiliation ?? ""}
                placeholder="e.g. Family First Life"
                disabled
              />
              <p className="mt-1 text-xs text-slate-400">Contact admin to update</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <ActionButton
              type="button"
              loading={leadTypeSaving}
              loadingText="Saving…"
              success={leadTypeSuccess}
              successText="Saved"
              disabled={!leadTypeDirty}
              onClick={saveLeadType}
            >
              Save Changes
            </ActionButton>
          </div>
        </section>

        {/* CRM Webhook */}
        <section
          id="webhook"
          className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm scroll-mt-12"
        >
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <PlugsConnected size={18} className="text-brand-600" />
              CRM Delivery Webhook
              <span className="ml-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Optional
              </span>
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              We&apos;ll POST lead data (JSON) to this URL on each delivery. Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="form-label">Webhook URL</label>
            <input
              type="url"
              className="form-input"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setWebhookSuccess(false);
                setWebhookError("");
              }}
              placeholder="https://rest.gohighlevel.com/v1/contacts/"
            />
            {webhookError && <p className="mt-1.5 text-xs text-red-600">{webhookError}</p>}
          </div>

          <div className="mt-8 flex justify-end">
            <ActionButton
              type="button"
              loading={webhookSaving}
              loadingText="Saving…"
              success={webhookSuccess}
              successText="Saved"
              disabled={!webhookDirty}
              onClick={saveWebhook}
            >
              Save Webhook
            </ActionButton>
          </div>
        </section>

        {/* Filter Sets */}
        <section
          id="filters"
          className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm scroll-mt-12"
        >
          <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Funnel size={18} className="text-brand-600" />
                Filter Sets
              </h2>
              <p className="mt-1 text-sm text-slate-500">Manage targeting rules for your lead delivery.</p>
            </div>
          </div>
          <FilterSetsSection embedded />
        </section>

      </div>
    </div>
  );
}
