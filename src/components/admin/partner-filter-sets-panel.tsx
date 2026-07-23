"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PencilSimple, Plus, Trash, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { Badge } from "@/components/ui/badge";
import { InlineActionButton } from "@/components/ui/inline-action-button";
import { PortalLink } from "@/components/ui/portal-link";
import {
  adminPartnerFilterSetEditPath,
  adminPartnerFilterSetNewPath,
} from "@/lib/filter-sets/routes";
import { formatUsd, moneyCellClass, moneyHeaderClassName } from "@/lib/format-money";

// Re-export shared types so existing importers keep working
export type {
  CategoryOption,
  FilterSetRow,
  FilterSetFormData,
} from "@/components/filter-sets/filter-set-form";
export {
  FilterSetForm,
  emptyForm,
  toFormData,
} from "@/components/filter-sets/filter-set-form";

import type { CategoryOption, FilterSetRow } from "@/components/filter-sets/filter-set-form";

// ---------------------------------------------------------------------------
// Partner Filter Sets Panel (admin view of a partner's filter sets)
// ---------------------------------------------------------------------------

export function PartnerFilterSetsPanel({
  partnerId,
  filterSets,
  defaultStates: _defaultStates,
  layout = "table",
}: {
  partnerId: string;
  filterSets: FilterSetRow[];
  defaultStates: string[];
  /** `document` — bordered rows (P4/P5); `table` — legacy data table */
  layout?: "table" | "document";
}) {
  const router = useRouter();
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

  const createHref = adminPartnerFilterSetNewPath(partnerId);

  return (
    <div className="card overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Filter Sets</h2>
        <PortalLink
          href={createHref}
          className="btn-secondary btn-sm inline-flex items-center gap-1"
        >
          <Plus
            size={16}
            weight={ICON_WEIGHT_LINEAR}
            className="shrink-0 text-slate-700"
            aria-hidden
          />
          Add Filter Set
        </PortalLink>
      </div>

      <div className={layout === "document" ? "px-5 pb-5" : "overflow-x-auto"}>
        {filterSets.length === 0 ? (
          <p className={layout === "document" ? "py-6 text-sm text-slate-400" : "px-5 py-8 text-sm text-slate-400"}>
            No filter sets configured.
          </p>
        ) : layout === "document" ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active sets
            </p>
            {filterSets.map((fs) => (
              <div
                key={fs.id}
                role="link"
                tabIndex={0}
                onClick={() =>
                  router.push(adminPartnerFilterSetEditPath(partnerId, fs.id))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(adminPartnerFilterSetEditPath(partnerId, fs.id));
                  }
                }}
                className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-slate-100 p-3.5 transition-colors hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{fs.name}</p>
                    <Badge variant={fs.active ? "green" : "slate"}>
                      {fs.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="blue">
                      {categories.find((c) => c.type === fs.leadType)?.label ??
                        fs.leadType}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {fs.filterStates.length} state
                    {fs.filterStates.length === 1 ? "" : "s"} · Priority {fs.priority}
                    {fs.priceOverride != null
                      ? ` · ${formatUsd(fs.priceOverride)} override`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <InlineActionButton
                    tone="slate"
                    icon={<PencilSimple size={12} weight={ICON_WEIGHT_LINEAR} />}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(adminPartnerFilterSetEditPath(partnerId, fs.id));
                    }}
                  >
                    Edit
                  </InlineActionButton>
                  {filterSets.length > 1 && (
                    <InlineActionButton
                      tone="red"
                      icon={<Trash size={12} weight={ICON_WEIGHT_LINEAR} />}
                      loading={deletingId === fs.id}
                      loadingText="Deleting…"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(fs.id);
                      }}
                    >
                      Delete
                    </InlineActionButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Lead Type</th>
                <th>States</th>
                <th>Priority</th>
                <th className={moneyHeaderClassName}>Price Override</th>
                <th>Limits</th>
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
                      {categories.find((c) => c.type === fs.leadType)?.label ??
                        fs.leadType}
                    </Badge>
                  </td>
                  <td>{fs.filterStates.length}</td>
                  <td>{fs.priority}</td>
                  <td className={moneyCellClass()}>
                    {fs.priceOverride != null
                      ? formatUsd(fs.priceOverride)
                      : "—"}
                  </td>
                  <td className="text-xs text-slate-500">
                    {fs.weeklyLimit ?? "∞"}/wk · {fs.monthlyLimit ?? "∞"}/mo
                  </td>
                  <td>
                    <Badge variant={fs.active ? "green" : "slate"}>
                      {fs.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <InlineActionButton
                        tone="slate"
                        icon={<PencilSimple size={12} weight={ICON_WEIGHT_LINEAR} />}
                        onClick={() =>
                          router.push(adminPartnerFilterSetEditPath(partnerId, fs.id))
                        }
                      >
                        Edit
                      </InlineActionButton>
                      {filterSets.length > 1 && (
                        <InlineActionButton
                          tone="red"
                          icon={<Trash size={12} weight={ICON_WEIGHT_LINEAR} />}
                          loading={deletingId === fs.id}
                          loadingText="Deleting…"
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
