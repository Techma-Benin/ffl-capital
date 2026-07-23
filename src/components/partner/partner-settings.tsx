"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyStateBlobIcon } from "@/components/ui/empty-state-blob-icon";
import { PartnerAvatar } from "@/components/admin/partner-avatar";
import { PortalLink } from "@/components/ui/portal-link";
import { usePartner } from "@/components/partner/partner-provider";
import {
  Funnel,
  Plus,
  Trash,
  PencilSimple,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import {
  partnerFilterSetEditPath,
  partnerFilterSetNewPath,
} from "@/lib/filter-sets/routes";
import { PartnerLeadDeliveryCard } from "@/components/partner/partner-lead-delivery-card";
import type { PartnerCrmSummary } from "@/lib/partner/types";

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
  filterCriteria?: import("@/lib/matching/types").FilterCriteria;
};

// ---------------------------------------------------------------------------
// Filter Sets section
// ---------------------------------------------------------------------------

function FilterSetsSection({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [filterSets, setFilterSets] = useState<PartnerFilterSet[] | null>(null);
  const [loadError, setLoadError] = useState("");
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
          {loaded && (
            <PortalLink
              href={partnerFilterSetNewPath()}
              className="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              <Plus
                size={18}
                weight={ICON_WEIGHT_LINEAR}
                className="shrink-0 text-slate-700"
              />
              Add Filter Set
            </PortalLink>
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
                  onClick={() => router.push(partnerFilterSetEditPath(fs.id))}
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

function formatPartnerDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  return name || "Partner";
}

const settingsSectionClass =
  "card scroll-mt-6 overflow-hidden";

function PartnerProfileCard({
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
  const detailRows = [
    { label: "Company", value: displayProfileValue(partner.affiliation) },
    {
      label: "Residence state",
      value: displayProfileValue(partner.residenceState),
    },
    {
      label: "Member since",
      value: formatMemberSince(partner.createdAt),
    },
  ];

  return (
    <section
      id="profile"
      className="card flex h-full min-w-0 flex-col overflow-hidden rounded-xl"
    >
      <div className="flex flex-col items-center gap-3 border-b border-slate-100 px-5 py-6 text-center">
        <PartnerAvatar
          avatarUrl={avatarUrl}
          firstName={partner.firstName}
          lastName={partner.lastName}
          size="lg"
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-900">
            {formatPartnerDisplayName(partner.firstName, partner.lastName)}
          </p>
          <p
            className="mt-0.5 truncate text-sm text-slate-500"
            title={partner.email?.trim() || undefined}
          >
            {displayProfileValue(partner.email)}
          </p>
        </div>
        <Badge variant={statusBadge}>{statusLabel}</Badge>
      </div>

      <dl className="flex-1 space-y-2.5 px-5 py-4 text-sm">
        {detailRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3"
          >
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="truncate font-semibold text-slate-900" title={row.value}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="px-5 pb-4 text-xs text-slate-400">
        Managed by your account. Contact support to change email.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function PartnerSettingsView({
  initialCrm = null,
}: {
  initialCrm?: PartnerCrmSummary;
}) {
  const { partner } = usePartner();
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    if (id === "crm-outbound") {
      router.replace("/partner/settings/crm-outbound");
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [router]);

  const statusBadge = partnerStatusBadge[partner.status] ?? "slate";
  const statusLabel = partnerStatusLabel[partner.status] ?? partner.status;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Your profile, lead delivery, and filter sets."
        action={
          <button
            type="button"
            onClick={() => openUserProfile()}
            className="btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            <PencilSimple size={16} weight={ICON_WEIGHT_LINEAR} />
            Edit profile
          </button>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <PartnerProfileCard
            partner={partner}
            statusBadge={statusBadge}
            statusLabel={statusLabel}
            avatarUrl={user?.imageUrl}
          />
          <PartnerLeadDeliveryCard
            partnerEmail={partner.email}
            initialCrm={initialCrm}
          />
        </div>

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
