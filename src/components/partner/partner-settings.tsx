"use client";

import { useState, useEffect, useCallback } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyStateBlobIcon } from "@/components/ui/empty-state-blob-icon";
import { usePartner } from "@/components/partner/partner-provider";
import {
  Gear,
  PlugsConnected,
  Funnel,
  Plus,
  Trash,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import type { FilterCriteria } from "@/lib/matching/types";
import { FilterSetModal } from "@/components/filter-sets/filter-set-modal";
import {
  type FilterSetFormData,
} from "@/components/filter-sets/filter-set-form";

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
  priceOverride?: number | null;
  weeklyLimit?: number | null;
  monthlyLimit?: number | null;
  deliveryChannel?: string;
  filterCriteria?: FilterCriteria;
};

const PARTNER_CATEGORIES = [
  { type: "traditional_iul", label: "Traditional IUL" },
  { type: "high_intent_iul", label: "High Intent IUL" },
];

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

function partnerFilterSetUrl(filterSetId?: string) {
  return filterSetId
    ? `/api/partners/filter-sets/${filterSetId}`
    : "/api/partners/filter-sets";
}

function toFilterSetFormData(fs: PartnerFilterSet): FilterSetFormData {
  return {
    name: fs.name,
    leadType: fs.leadType,
    filterStates: fs.filterStates,
    priority: fs.priority ?? 5,
    priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : "",
    active: fs.active,
    weeklyLimit: fs.weeklyLimit != null ? String(fs.weeklyLimit) : "",
    monthlyLimit: fs.monthlyLimit != null ? String(fs.monthlyLimit) : "",
    deliveryChannel: (fs.deliveryChannel ?? "email") as FilterSetFormData["deliveryChannel"],
    filterCriteria: (fs.filterCriteria as FilterCriteria) ?? {},
  };
}

// ---------------------------------------------------------------------------
// Filter Sets section
// ---------------------------------------------------------------------------

function FilterSetsSection({ embedded = false }: { embedded?: boolean }) {
  const [filterSets, setFilterSets] = useState<PartnerFilterSet[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editingFs, setEditingFs] = useState<PartnerFilterSet | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  useEffect(() => {
    void load();
  }, [load]);

  function handleCreated(created: PartnerFilterSet) {
    setFilterSets((prev) => [...(prev ?? []), created]);
    setShowCreateModal(false);
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
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
          Targeting
        </span>
        <div className="ml-auto">
          {loaded && !showCreateModal && !editingFs && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              <Plus
                size={18}
                weight={ICON_WEIGHT_LINEAR}
                className="shrink-0 text-slate-700"
              />
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

      {/* Empty state */}
      {isEmpty && (
        <div className="group/empty px-5 py-8 text-center">
          <EmptyStateBlobIcon
            icon={Funnel}
            seed="No filter sets yet"
            size="sm"
            className="mb-3"
          />
          <p className="text-sm font-semibold text-slate-900 mb-1">
            No filter sets yet
          </p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            At least one active filter set with ≥15 states is required to
            receive leads. Create your first filter set to get started.
          </p>
        </div>
      )}

      {/* List */}
      {filterSets && filterSets.length > 0 && (
        <div>
          {filterSets.map((fs) => {
            const eligible = fs.filterStates.length >= 15;
            return (
              <div
                key={fs.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setEditingFs(fs)}
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {fs.name}
                    </span>
                    <Badge variant={fs.active ? "green" : "slate"}>
                      {fs.active ? "Active" : "Inactive"}
                    </Badge>
                    {!eligible && (
                      <Badge variant="yellow">Below minimum</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <button
                      type="button"
                      title="Delete"
                      disabled={deletingId === fs.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(fs.id);
                      }}
                      className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash size={14} weight={ICON_WEIGHT_LINEAR} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteError && (
        <p className="px-5 py-2 text-xs text-red-600 border-t border-slate-100">
          {deleteError}
        </p>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <FilterSetModal
          mode="create"
          showTemplatePicker
          initial={DEFAULT_FORM}
          categories={PARTNER_CATEGORIES}
          buildUrl={partnerFilterSetUrl}
          onClose={() => setShowCreateModal(false)}
          onSavedWithData={(data) => handleCreated(data as PartnerFilterSet)}
          onSaved={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit modal */}
      {editingFs && (
        <FilterSetModal
          mode="edit"
          filterSetId={editingFs.id}
          filterSetName={editingFs.name}
          filterSetActive={editingFs.active}
          initial={toFilterSetFormData(editingFs)}
          categories={PARTNER_CATEGORIES}
          buildUrl={partnerFilterSetUrl}
          onClose={() => setEditingFs(null)}
          onSavedWithData={(data) => handleUpdated(data as PartnerFilterSet)}
          onSaved={() => setEditingFs(null)}
        />
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
    <div className="min-h-full">
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences, webhook integrations, and lead filter sets."
      />

      <div className="mx-auto max-w-4xl space-y-8 px-8 py-10 pb-32">

        {/* Account Settings */}
        <section
          id="account"
          className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm scroll-mt-12"
        >
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Gear size={18} className="text-brand-600" weight={ICON_WEIGHT_LINEAR} />
              Account Settings
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your basic profile and preferences.
            </p>
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
              {leadTypeError && (
                <p className="mt-1 text-xs text-red-600">{leadTypeError}</p>
              )}
            </div>
            <div>
              <label className="form-label">Affiliation (Company)</label>
              <input
                className="form-input bg-slate-50"
                defaultValue={partner.affiliation ?? ""}
                placeholder="e.g. Family First Life"
                disabled
              />
              <p className="mt-1 text-xs text-slate-400">
                Contact admin to update
              </p>
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
              <PlugsConnected size={18} className="text-brand-600" weight={ICON_WEIGHT_LINEAR} />
              CRM Delivery Webhook
              <span className="ml-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Optional
              </span>
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              We&apos;ll POST lead data (JSON) to this URL on each delivery.
              Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
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
            {webhookError && (
              <p className="mt-1.5 text-xs text-red-600">{webhookError}</p>
            )}
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
                <Funnel size={18} className="text-brand-600" weight={ICON_WEIGHT_LINEAR} />
                Filter Sets
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage targeting rules for your lead delivery.
              </p>
            </div>
          </div>
          <FilterSetsSection embedded />
        </section>

      </div>
    </div>
  );
}
