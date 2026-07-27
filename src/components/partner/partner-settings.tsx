"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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
import { PartnerWalletSummaryCard } from "@/components/partner/partner-wallet-summary-card";
import { ManageAccountModal } from "@/components/partner/manage-account-modal";
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
// Helpers
// ---------------------------------------------------------------------------

const partnerStatusLabel: Record<string, string> = {
  active: "Active",
  pending_approval: "Pending approval",
  rejected: "Rejected",
  disabled: "Disabled",
};

function formatPartnerDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  return name || "Partner";
}

function formatMemberSinceShort(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Profile banner — light card
// ---------------------------------------------------------------------------

function ProfileBanner({
  partner,
  avatarUrl,
  walletBalance,
  onEditProfile,
}: {
  partner: ReturnType<typeof usePartner>["partner"];
  avatarUrl?: string;
  walletBalance: number;
  onEditProfile: () => void;
}) {
  const statusLabel = partnerStatusLabel[partner.status] ?? partner.status;
  const isActive = partner.status === "active";
  const buyingLive = isActive && walletBalance >= 25;

  const sincePart = formatMemberSinceShort(partner.createdAt);
  const statePart = partner.residenceState?.trim() || null;
  const locationSince =
    statePart && sincePart
      ? `${statePart} · since ${sincePart}`
      : statePart || (sincePart ? `since ${sincePart}` : null);

  const company = partner.affiliation?.trim() || null;
  const email = partner.email?.trim() || null;
  const subtitle = [company, email].filter(Boolean).join(" · ");

  const chipClass =
    "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 whitespace-nowrap";

  return (
    <div className="card flex flex-col gap-4 overflow-hidden px-6 py-5 sm:flex-row sm:items-center sm:gap-6">
      {/* Left: avatar + name */}
      <div className="flex items-center gap-4">
        <PartnerAvatar
          avatarUrl={avatarUrl}
          firstName={partner.firstName}
          lastName={partner.lastName}
          size="md"
        />
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900">
            {formatPartnerDisplayName(partner.firstName, partner.lastName)}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: chips row — status + location + edit */}
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {/* Active / status */}
        <span className={chipClass}>
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isActive ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {statusLabel}
        </span>

        {/* Buying live */}
        {isActive && (
          <span className={chipClass}>
            {buyingLive ? "Buying live" : "Wallet low"}
          </span>
        )}

        {/* Location · since */}
        {locationSince && (
          <span className={chipClass}>{locationSince}</span>
        )}

        {/* Edit profile — amber accent */}
        <button
          type="button"
          onClick={onEditProfile}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 whitespace-nowrap transition-colors hover:bg-amber-100 hover:text-amber-900"
        >
          <PencilSimple size={12} weight={ICON_WEIGHT_LINEAR} />
          Edit profile
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter sets — row format
// ---------------------------------------------------------------------------

function FilterSetsSection() {
  const router = useRouter();
  const { partner, patchPartner } = usePartner();
  const [filterSets, setFilterSets] = useState<PartnerFilterSet[] | null>(
    () => partner.filterSets as PartnerFilterSet[],
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(id: string) {
    if (!confirm("Delete this filter set? It cannot be undone.")) return;
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
      patchPartner({
        filterSets: partner.filterSets.filter((filterSet) => filterSet.id !== id),
      });
    } catch {
      setDeleteError("Request failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const loaded = filterSets !== null;
  const isEmpty = loaded && filterSets.length === 0;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">Filter sets</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Targeting rules · at least one active set with ≥15 states is required to receive leads
          </p>
        </div>
        {loaded && !isEmpty && (
          <PortalLink
            href={partnerFilterSetNewPath()}
            className="btn-primary btn-sm inline-flex shrink-0 items-center gap-1"
          >
            <Plus size={15} weight={ICON_WEIGHT_LINEAR} />
            Add filter set
          </PortalLink>
        )}
      </div>

      {!loaded && (
        <p className="px-5 py-4 text-sm text-slate-400">Loading…</p>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="px-5 py-10 text-center">
          <EmptyStateBlobIcon
            icon={Funnel}
            seed="No filter sets yet"
            accent="amber"
            size="sm"
            className="mb-3"
          />
          <p className="mb-1 text-sm font-semibold text-slate-900">No filter sets yet</p>
          <p className="mx-auto mb-5 max-w-xs text-xs text-slate-500">
            At least one active filter set with ≥15 states is required to receive leads.
          </p>
          <PortalLink
            href={partnerFilterSetNewPath()}
            className="btn-primary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={15} weight={ICON_WEIGHT_LINEAR} />
            Add filter set
          </PortalLink>
        </div>
      )}

      {/* Rows */}
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
                  className="flex cursor-pointer items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50"
                  onClick={() => router.push(partnerFilterSetEditPath(fs.id))}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {fs.name}
                    </span>
                    <Badge variant={fs.active ? "green" : "slate"}>
                      {fs.active ? "Active" : "Inactive"}
                    </Badge>
                    {!eligible && (
                      <Badge variant="yellow">Below minimum</Badge>
                    )}
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title="Delete"
                      disabled={deletingId === fs.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(fs.id);
                      }}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash size={13} weight={ICON_WEIGHT_LINEAR} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {deleteError && (
            <p className="border-t border-slate-100 px-5 py-2 text-xs text-red-600">
              {deleteError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function PartnerSettingsView({
  initialCrm = null,
  initialBalance,
  initialSubscription,
}: {
  initialCrm?: PartnerCrmSummary;
  initialBalance?: number;
  initialSubscription?: { active: boolean; amount: number } | null;
}) {
  const { partner, patchPartner } = usePartner();
  const { user } = useUser();
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);

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

  const balance = initialBalance ?? partner.walletBalance;

  return (
    <div className="space-y-5">
      <ManageAccountModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        initialFirstName={partner.firstName}
        initialLastName={partner.lastName}
        initialAvatarUrl={partner.avatarUrl}
        initialAffiliation={partner.affiliation ?? ""}
        onSaved={({ firstName, lastName, avatarUrl, affiliation }) => {
          patchPartner({
            firstName,
            lastName,
            avatarUrl: avatarUrl ?? null,
            ...(affiliation !== undefined && { affiliation }),
          });
        }}
      />
      {/* Profile banner */}
      <ProfileBanner
        partner={partner}
        avatarUrl={partner.avatarUrl ?? user?.imageUrl ?? undefined}
        walletBalance={balance}
        onEditProfile={() => setEditModalOpen(true)}
      />

      {/* Two-column: Lead delivery + Wallet & billing — equal height */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_360px]">
        <PartnerLeadDeliveryCard
          partnerEmail={partner.email}
          initialCrm={initialCrm}
        />
        <PartnerWalletSummaryCard
          initialBalance={initialBalance}
          initialSubscription={initialSubscription}
        />
      </div>

      {/* Filter sets */}
      <FilterSetsSection />
    </div>
  );
}
