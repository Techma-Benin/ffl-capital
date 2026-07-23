"use client";

import { useState, useEffect, useCallback } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyStateBlobIcon } from "@/components/ui/empty-state-blob-icon";
import { PartnerAvatar } from "@/components/admin/partner-avatar";
import { usePartner } from "@/components/partner/partner-provider";
import {
  PlugsConnected,
  Funnel,
  Plus,
  Trash,
  PencilSimple,
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
] as const;

type PartnerLeadType = (typeof PARTNER_CATEGORIES)[number]["type"];

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
            accent="amber"
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

const partnerStatusBadge: Record<string, "green" | "yellow" | "red" | "slate"> = {
  active: "green",
  pending_approval: "yellow",
  rejected: "red",
  disabled: "slate",
};

const partnerStatusLabel: Record<string, string> = {
  active: "Active",
  pending_approval: "Pending approval",
  rejected: "Rejected",
  disabled: "Disabled",
};

function formatMemberSince(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayProfileValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function leadTypeLabel(value: string | null | undefined) {
  const match = PARTNER_CATEGORIES.find((c) => c.type === value);
  return match?.label ?? displayProfileValue(value);
}

function formatPartnerDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  return name || "Partner";
}

const settingsSectionClass =
  "card scroll-mt-6 overflow-hidden";

function PartnerProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
        {displayProfileValue(value)}
      </dd>
    </div>
  );
}

function PartnerProfileSection({
  partner,
  statusBadge,
  statusLabel,
  avatarUrl,
}: {
  partner: ReturnType<typeof usePartner>["partner"];
  statusBadge: "green" | "yellow" | "red" | "slate";
  statusLabel: string;
  avatarUrl?: string;
}) {
  const clerk = useClerk();
  const { patchPartner } = usePartner();
  const [isEditing, setIsEditing] = useState(false);
  const [draftLeadType, setDraftLeadType] = useState<PartnerLeadType>(
    partner.leadType as PartnerLeadType,
  );
  const [leadTypeSaving, setLeadTypeSaving] = useState(false);
  const [leadTypeSuccess, setLeadTypeSuccess] = useState(false);
  const [leadTypeError, setLeadTypeError] = useState("");

  useEffect(() => {
    if (!isEditing) {
      setDraftLeadType(partner.leadType as PartnerLeadType);
    }
  }, [partner.leadType, isEditing]);

  const leadTypeDirty = draftLeadType !== partner.leadType;

  function startEditing() {
    setDraftLeadType(partner.leadType as PartnerLeadType);
    setLeadTypeError("");
    setLeadTypeSuccess(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftLeadType(partner.leadType as PartnerLeadType);
    setLeadTypeError("");
    setLeadTypeSuccess(false);
    setIsEditing(false);
  }

  async function saveProfile() {
    if (!leadTypeDirty) {
      setIsEditing(false);
      return;
    }
    setLeadTypeError("");
    setLeadTypeSuccess(false);
    setLeadTypeSaving(true);
    try {
      const res = await fetch("/api/partners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadType: draftLeadType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadTypeError(data.error ?? "Failed to save lead type");
        return;
      }
      patchPartner({ leadType: data.leadType });
      setLeadTypeSuccess(true);
      setIsEditing(false);
    } catch {
      setLeadTypeError("Request failed. Please try again.");
    } finally {
      setLeadTypeSaving(false);
    }
  }

  return (
    <section id="profile" className={settingsSectionClass}>
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <PartnerAvatar
            avatarUrl={avatarUrl}
            firstName={partner.firstName}
            lastName={partner.lastName}
            size="lg"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                {formatPartnerDisplayName(partner.firstName, partner.lastName)}
                <Badge variant={statusBadge}>{statusLabel}</Badge>
              </h2>
              <p
                className="mt-1 truncate text-sm text-slate-500"
                title={partner.email?.trim() || undefined}
              >
                {displayProfileValue(partner.email)}
              </p>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => clerk.openUserProfile()}
                  className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Update name, email, or photo
                </button>
              )}
            </div>
            {isEditing ? (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={leadTypeSaving}
                className="btn-secondary btn-sm shrink-0 self-start"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="btn-secondary btn-sm inline-flex shrink-0 items-center gap-1.5 self-start"
              >
                <PencilSimple size={16} weight={ICON_WEIGHT_LINEAR} />
                Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      <dl className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <PartnerProfileField
          label="Residence state"
          value={partner.residenceState}
        />
        <PartnerProfileField
          label="Affiliation (company)"
          value={partner.affiliation}
        />
        {isEditing ? (
          <div className="min-w-0">
            <dt className="text-xs font-medium text-slate-500">Lead type</dt>
            <dd className="mt-1">
              <select
                className="form-select max-w-xs"
                value={draftLeadType}
                onChange={(e) => {
                  setDraftLeadType(e.target.value as PartnerLeadType);
                  setLeadTypeSuccess(false);
                  setLeadTypeError("");
                }}
              >
                {PARTNER_CATEGORIES.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.label}
                  </option>
                ))}
              </select>
              {leadTypeError && (
                <p className="mt-1 text-xs text-red-600">{leadTypeError}</p>
              )}
            </dd>
          </div>
        ) : (
          <PartnerProfileField
            label="Lead type"
            value={leadTypeLabel(partner.leadType)}
          />
        )}
        <PartnerProfileField
          label="Member since"
          value={formatMemberSince(partner.createdAt)}
        />
      </dl>

      {isEditing && (
        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <ActionButton
            type="button"
            loading={leadTypeSaving}
            loadingText="Saving…"
            success={leadTypeSuccess}
            successText="Saved"
            disabled={!leadTypeDirty}
            onClick={saveProfile}
          >
            Save changes
          </ActionButton>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function PartnerSettingsView() {
  const { partner, patchPartner } = usePartner();
  const { user } = useUser();

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const [webhookUrl, setWebhookUrl] = useState(partner.crmWebhookUrl ?? "");

  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState(false);
  const [webhookError, setWebhookError] = useState("");

  const webhookDirty = webhookUrl !== (partner.crmWebhookUrl ?? "");

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

  const statusBadge = partnerStatusBadge[partner.status] ?? "slate";
  const statusLabel = partnerStatusLabel[partner.status] ?? partner.status;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Your profile, webhook integrations, and lead filter sets."
      />

      <div className="space-y-6">
        <PartnerProfileSection
          partner={partner}
          statusBadge={statusBadge}
          statusLabel={statusLabel}
          avatarUrl={user?.imageUrl}
        />

        <section id="webhook" className={`${settingsSectionClass} p-6`}>
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <PlugsConnected size={18} className="text-brand-600" weight={ICON_WEIGHT_LINEAR} />
              CRM delivery webhook
              <span className="ml-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Optional
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              We&apos;ll POST lead data (JSON) to this URL on each delivery.
              Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="form-label">Webhook URL</label>
            <input
              type="url"
              className="form-input max-w-3xl"
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
              Save webhook
            </ActionButton>
          </div>
        </section>

        <section id="filters" className={settingsSectionClass}>
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Funnel size={18} className="text-brand-600" weight={ICON_WEIGHT_LINEAR} />
                Filter sets
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
