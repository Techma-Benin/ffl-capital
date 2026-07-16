"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusStrip } from "@/components/ui/status-strip";
import { Badge } from "@/components/ui/badge";
import { usePartner } from "@/components/partner/partner-provider";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import {
  WarningCircle,
  Check,
  MapPin,
  Gear,
  PlugsConnected,
  Funnel,
  CaretDown,
  CaretUp,
  Plus,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";

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
};

type FilterSetFormData = {
  name: string;
  leadType: "traditional_iul" | "high_intent_iul";
  filterStates: string[];
  active: boolean;
};

// ---------------------------------------------------------------------------
// Filter Set Editor (create/edit form)
// ---------------------------------------------------------------------------

function FilterSetEditor({
  initialData,
  onSaved,
  onClose,
  filterSetId,
}: {
  initialData: FilterSetFormData;
  onSaved: (fs: PartnerFilterSet) => void;
  onClose: () => void;
  filterSetId?: string;
}) {
  const [form, setForm] = useState<FilterSetFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSet = new Set(form.filterStates);
  const isEligible = form.filterStates.length >= 15;
  const isEditing = Boolean(filterSetId);

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

  async function save() {
    if (form.active && form.filterStates.length < 15) {
      setError("An active filter set requires at least 15 states. Add more states or save as inactive.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = filterSetId
        ? `/api/partners/filter-sets/${filterSetId}`
        : "/api/partners/filter-sets";
      const res = await fetch(url, {
        method: filterSetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || "Default",
          leadType: form.leadType,
          filterStates: form.filterStates,
          active: form.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved(data as PartnerFilterSet);
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {isEditing ? "Edit Filter Set" : "New Filter Set"}
        </h3>
        <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Name + Lead Type + Priority */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Southeast Traditional"
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

      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={form.active}
            onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
          />
          <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full" />
        </label>
        <span className="text-sm font-medium text-slate-700">
          {form.active ? "Active" : "Inactive"}
        </span>
        {form.active && !isEligible && (
          <span className="text-xs text-amber-600">
            ⚠ Needs {15 - form.filterStates.length} more state{15 - form.filterStates.length !== 1 ? "s" : ""} to activate
          </span>
        )}
      </div>

      {/* State picker */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="form-label mb-0">Target States</label>
          <span className={`text-sm font-semibold ${isEligible ? "text-emerald-600" : "text-amber-600"}`}>
            {form.filterStates.length} / 50 selected
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

        {!isEligible && (
          <p className="mt-1.5 text-xs text-amber-700">
            {15 - form.filterStates.length} more state{15 - form.filterStates.length !== 1 ? "s" : ""} needed to activate this filter set.
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <ActionButton
          type="button"
          loading={saving}
          loadingText="Saving…"
          onClick={save}
        >
          {isEditing ? "Save Changes" : "Create Filter Set"}
        </ActionButton>
        <button type="button" onClick={onClose} className="btn-secondary btn-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Sets section
// ---------------------------------------------------------------------------

function FilterSetsSection() {
  const [filterSets, setFilterSets] = useState<PartnerFilterSet[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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

  function handleCreated(created: PartnerFilterSet) {
    setFilterSets((prev) => [...(prev ?? []), created]);
    setShowCreate(false);
  }

  function handleUpdated(updated: PartnerFilterSet) {
    setFilterSets((prev) =>
      prev ? prev.map((fs) => (fs.id === updated.id ? updated : fs)) : prev,
    );
    setExpandedId(null);
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
    <div className="mb-5 card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Funnel size={16} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Filter Sets</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
          Targeting
        </span>
        <div className="ml-auto">
          {loaded && !showCreate && (
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setExpandedId(null);
              }}
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

      {/* Create form */}
      {showCreate && (
        <div className="px-5 py-5 border-b border-slate-100">
          <FilterSetEditor
            initialData={{
              name: "",
              leadType: "traditional_iul",
              filterStates: [],
              active: true,
            }}
            onSaved={handleCreated}
            onClose={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !showCreate && (
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
            onClick={() => setShowCreate(true)}
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
            const isExpanded = expandedId === fs.id;
            const eligible = fs.filterStates.length >= 15;
            return (
              <div key={fs.id} className="border-b border-slate-100 last:border-b-0">
                <div className="flex items-center justify-between px-5 py-3.5">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : fs.id);
                      setShowCreate(false);
                    }}
                  >
                    <span className="text-sm font-medium text-slate-900 truncate">{fs.name}</span>
                    <Badge variant={fs.active ? "green" : "slate"}>
                      {fs.active ? "Active" : "Inactive"}
                    </Badge>
                    {!eligible && (
                      <Badge variant="yellow">Below minimum</Badge>
                    )}
                  </button>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-500">
                      {fs.filterStates.length} state{fs.filterStates.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : fs.id);
                        setShowCreate(false);
                      }}
                      className="rounded p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      {isExpanded ? <CaretUp size={14} /> : <PencilSimple size={14} />}
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      disabled={deletingId === fs.id}
                      onClick={() => handleDelete(fs.id)}
                      className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5">
                    <FilterSetEditor
                      filterSetId={fs.id}
                      initialData={{
                        name: fs.name,
                        leadType: fs.leadType,
                        filterStates: fs.filterStates,
                        active: fs.active,
                      }}
                      onSaved={handleUpdated}
                      onClose={() => setExpandedId(null)}
                    />
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

// ---------------------------------------------------------------------------

const US_STATE_NAMES: Record<string, string> = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California",
  CO:"Colorado", CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia",
  HI:"Hawaii", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa",
  KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland",
  MA:"Massachusetts", MI:"Michigan", MN:"Minnesota", MS:"Mississippi", MO:"Missouri",
  MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire", NJ:"New Jersey",
  NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio",
  OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina",
  SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont",
  VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming",
};

function statesEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((code, i) => code === sortedB[i]);
}

export function PartnerSettingsView() {
  const { partner, patchPartner } = usePartner();

  const [selectedStates, setSelectedStates] = useState<string[]>(partner.filterStates);
  const [webhookUrl, setWebhookUrl] = useState(partner.crmWebhookUrl ?? "");
  const [leadType, setLeadType] = useState<"traditional_iul" | "high_intent_iul">(
    partner.leadType as "traditional_iul" | "high_intent_iul",
  );

  const [statesSaving, setStatesSaving] = useState(false);
  const [statesSuccess, setStatesSuccess] = useState(false);
  const [statesError, setStatesError] = useState("");

  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState(false);
  const [webhookError, setWebhookError] = useState("");

  const [leadTypeSaving, setLeadTypeSaving] = useState(false);
  const [leadTypeSuccess, setLeadTypeSuccess] = useState(false);
  const [leadTypeError, setLeadTypeError] = useState("");

  const selected = new Set(selectedStates);
  const selectedCount = selected.size;
  const isEligible = selectedCount >= 15;
  const statesDirty = !statesEqual(selectedStates, partner.filterStates);
  const webhookDirty = webhookUrl !== (partner.crmWebhookUrl ?? "");
  const leadTypeDirty = leadType !== partner.leadType;

  function toggleState(code: string) {
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
    setStatesSuccess(false);
    setStatesError("");
  }

  function selectStates(states: readonly string[]) {
    setSelectedStates([...states]);
    setStatesSuccess(false);
    setStatesError("");
  }

  async function saveStates() {
    setStatesError("");
    setStatesSuccess(false);

    if (selectedStates.length < 15) {
      setStatesError("Select at least 15 target states.");
      return;
    }

    setStatesSaving(true);
    try {
      const res = await fetch("/api/partners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filterStates: selectedStates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatesError(data.error ?? "Failed to save states");
        return;
      }
      patchPartner({
        filterStates: data.filterStates,
        hasEligibleFilterSet: data.hasEligibleFilterSet,
        hasStatesInAnyFilterSet: data.hasStatesInAnyFilterSet,
        maxFilterSetStates: data.maxFilterSetStates,
      });
      setStatesSuccess(true);
    } catch {
      setStatesError("Request failed. Please try again.");
    } finally {
      setStatesSaving(false);
    }
  }

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
      if (!res.ok) {
        setWebhookError(data.error ?? "Failed to save webhook");
        return;
      }
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
      if (!res.ok) {
        setLeadTypeError(data.error ?? "Failed to save lead type");
        return;
      }
      patchPartner({ leadType: data.leadType });
      setLeadTypeSuccess(true);
    } catch {
      setLeadTypeError("Request failed. Please try again.");
    } finally {
      setLeadTypeSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your lead targeting and delivery preferences"
      />

      <div className="mb-5 card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gear size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Account Settings</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Lead Type</label>
            <div className="flex gap-2">
              <select
                className="form-select flex-1"
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
              <ActionButton
                type="button"
                variant="secondary"
                className="whitespace-nowrap"
                loading={leadTypeSaving}
                loadingText="Saving…"
                success={leadTypeSuccess}
                successText="Saved"
                disabled={!leadTypeDirty}
                onClick={saveLeadType}
              >
                Save
              </ActionButton>
            </div>
            {leadTypeError && (
              <p className="mt-1 text-xs text-red-600">{leadTypeError}</p>
            )}
          </div>
          <div>
            <label className="form-label">Affiliation (Company)</label>
            <input
              className="form-input"
              defaultValue={partner.affiliation ?? ""}
              placeholder="e.g. Family First Life"
              disabled
            />
            <p className="mt-1 text-xs text-slate-400">Contact admin to update</p>
          </div>
        </div>
      </div>

      <div className="mb-5 card p-5">
        <div className="flex items-center gap-2 mb-4">
          <PlugsConnected size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">CRM Delivery Webhook</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
            Optional
          </span>
        </div>
        <div className="max-w-xl">
          <label className="form-label">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              className="form-input flex-1"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setWebhookSuccess(false);
                setWebhookError("");
              }}
              placeholder="https://rest.gohighlevel.com/v1/contacts/"
            />
            <ActionButton
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              loading={webhookSaving}
              loadingText="Saving…"
              success={webhookSuccess}
              successText="Saved"
              disabled={!webhookDirty}
              onClick={saveWebhook}
            >
              Save
            </ActionButton>
          </div>
          {webhookError && (
            <p className="mt-2 text-xs text-red-600">{webhookError}</p>
          )}
          <p className="mt-1.5 text-xs text-slate-400">
            We&apos;ll POST lead data (JSON) to this URL on each delivery. Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
          </p>
        </div>
      </div>

      <FilterSetsSection />

      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Default Target States</h2>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-semibold ${isEligible ? "text-emerald-600" : "text-amber-600"}`}
            >
              {selectedCount} / 50 selected
            </span>
            {!isEligible && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <WarningCircle size={11} />
                Min 15 required
              </span>
            )}
            {isEligible && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <Check size={11} />
                Eligible
              </span>
            )}
          </div>
        </div>

        {!isEligible && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            You need at least <strong>15 states</strong> selected to be eligible for lead matching.
            {selectedCount < 15
              ? ` ${15 - selectedCount} more needed.`
              : " Eligible once saved."}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => selectStates(US_STATE_CODES)} className="btn-secondary btn-sm">
            Select All
          </button>
          <button type="button" onClick={() => selectStates([])} className="btn-secondary btn-sm">
            Clear All
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.southeast)} className="btn-secondary btn-sm">
            Select Southeast
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.northeast)} className="btn-secondary btn-sm">
            Select Northeast
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.midwest)} className="btn-secondary btn-sm">
            Select Midwest
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.west)} className="btn-secondary btn-sm">
            Select West
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
          {US_STATE_CODES.map((code) => {
            const isSelected = selected.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleState(code)}
                title={US_STATE_NAMES[code]}
                className={`group relative flex flex-col items-center rounded-lg border-2 px-2 py-2.5 text-center transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50/50"
                }`}
              >
                <span className="text-xs font-bold leading-none">{code}</span>
                <span className="mt-0.5 text-[9px] leading-none text-current opacity-60 truncate w-full text-center">
                  {US_STATE_NAMES[code]?.split(" ")[0]}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[8px] text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {statesError && (
          <div className="mt-4">
            <StatusStrip status="error" title="Could not save states" message={statesError} />
          </div>
        )}
        {statesSuccess && (
          <div className="mt-4">
            <StatusStrip
              status="success"
              title="Target states saved"
              message="Your selection is active for future lead matching."
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Changes to your target states take effect immediately for future lead matching.
          </p>
          <ActionButton
            type="button"
            loading={statesSaving}
            loadingText="Saving…"
            disabled={!statesDirty || !isEligible}
            onClick={saveStates}
          >
            Save Changes
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
