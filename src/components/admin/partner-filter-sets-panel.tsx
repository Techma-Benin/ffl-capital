"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { InlineActionButton } from "@/components/ui/inline-action-button";
import { FilterSetModal } from "@/components/filter-sets/filter-set-modal";
import {
  emptyForm,
  toFormData,
} from "@/components/filter-sets/filter-set-form";

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
  defaultStates,
}: {
  partnerId: string;
  filterSets: FilterSetRow[];
  defaultStates: string[];
}) {
  const router = useRouter();
  const [modalMode, setModalMode] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function handleSaved() {
    setModalMode("none");
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
        {modalMode === "none" && (
          <button
            type="button"
            onClick={() => setModalMode("create")}
            className="btn-secondary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={14} />
            Add Filter Set
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        {filterSets.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">
            No filter sets configured.
          </p>
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
                      {categories.find((c) => c.type === fs.leadType)?.label ??
                        fs.leadType}
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
                    {fs.weeklyLimit ?? "∞"}/wk · {fs.monthlyLimit ?? "∞"}/mo
                  </td>
                  <td className="text-xs capitalize">
                    {fs.deliveryChannel ?? "email"}
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
                        icon={<PencilSimple size={12} />}
                        disabled={modalMode !== "none"}
                        onClick={() => {
                          setEditingId(fs.id);
                          setModalMode("edit");
                        }}
                      >
                        Edit
                      </InlineActionButton>
                      {filterSets.length > 1 && (
                        <InlineActionButton
                          tone="red"
                          icon={<Trash size={12} />}
                          loading={deletingId === fs.id}
                          loadingText="Deleting…"
                          disabled={modalMode !== "none"}
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

      {/* Create modal */}
      {modalMode === "create" && (
        <FilterSetModal
          mode="create"
          partnerId={partnerId}
          initial={emptyForm(defaultStates)}
          categories={categories}
          onClose={() => setModalMode("none")}
          onSaved={handleSaved}
        />
      )}

      {/* Edit modal */}
      {modalMode === "edit" && editingFilterSet && (
        <FilterSetModal
          mode="edit"
          partnerId={partnerId}
          filterSetId={editingFilterSet.id}
          filterSetName={editingFilterSet.name}
          filterSetActive={editingFilterSet.active}
          initial={toFormData(editingFilterSet)}
          categories={categories}
          onClose={() => {
            setModalMode("none");
            setEditingId(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
