"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyStateBlobIcon } from "@/components/ui/empty-state-blob-icon";
import {
  Plus,
  Trash,
  Funnel,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import {
  adminFilterSetTemplateEditPath,
  adminFilterSetTemplateNewPath,
} from "@/lib/filter-sets/routes";

type FilterSetTemplate = {
  id: string;
  name: string;
  description: string | null;
  leadType: string;
  filterStates: string[];
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  traditional_iul: "Traditional IUL",
  high_intent_iul: "High Intent IUL",
};

export function FilterSetTemplateManager({
  initialTemplates,
}: {
  initialTemplates: FilterSetTemplate[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this template? Filter sets already copied from it won't be affected.",
      )
    ) {
      return;
    }
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
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setDeleteError("Request failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const isEmpty = templates.length === 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Funnel size={16} className="text-slate-500" weight={ICON_WEIGHT_LINEAR} />
        <h2 className="text-sm font-semibold text-slate-900">Filter Set Templates</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
          Admin
        </span>
        <div className="ml-auto">
          {!isEmpty && (
            <Link
              href={adminFilterSetTemplateNewPath()}
              className="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              <Plus size={13} weight={ICON_WEIGHT_LINEAR} />
              Add Template
            </Link>
          )}
        </div>
      </div>

      <div className="px-5 py-4 text-xs text-slate-500 border-b border-slate-100">
        Templates give partners a starting point when creating filter sets. Partners can
        select a template and customize it before saving.
      </div>

      {isEmpty && (
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
            Create templates that partners can use as starting points when building their
            filter sets.
          </p>
          <Link
            href={adminFilterSetTemplateNewPath()}
            className="btn-primary btn-sm inline-flex items-center gap-1.5"
          >
            <Plus size={13} weight={ICON_WEIGHT_LINEAR} />
            Create First Template
          </Link>
        </div>
      )}

      {templates.length > 0 && (
        <div>
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center border-b border-slate-100 px-5 py-3.5 last:border-b-0 hover:bg-brand-50 transition-colors"
            >
              <Link
                href={adminFilterSetTemplateEditPath(t.id)}
                className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                aria-label={`Edit template ${t.name}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">
                    {t.name}
                  </span>
                  <Badge variant="blue">
                    {LEAD_TYPE_LABELS[t.leadType] ?? t.leadType}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {t.filterStates.length} states
                  </span>
                </div>
                {t.description && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {t.description}
                  </p>
                )}
              </Link>
              <button
                type="button"
                title="Delete"
                disabled={deletingId === t.id}
                onClick={() => handleDelete(t.id)}
                className="ml-4 flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <Trash size={14} weight={ICON_WEIGHT_LINEAR} />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteError && (
        <p className="border-t border-slate-100 px-5 py-2 text-xs text-red-600">
          {deleteError}
        </p>
      )}
    </div>
  );
}
