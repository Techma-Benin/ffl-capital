"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";

export type CategoryAssignmentOption = {
  type: string;
  label: string;
  criteria: Array<{ field: string; value: string }>;
};

export function AdminLeadCategoryAssignPanel({
  leadId,
  categories,
  candidateTypes,
}: {
  leadId: string;
  categories: CategoryAssignmentOption[];
  candidateTypes: string[];
}) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(
    candidateTypes.length === 1 ? candidateTypes[0]! : "",
  );
  const [pending, setPending] = useState(false);

  const selectedCategory = categories.find(
    (category) => category.type === selectedType,
  );

  async function handleAssign() {
    if (!selectedType) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/assign-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryType: selectedType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Assignment failed",
        );
      }
      notify.success("Category assigned — use Reprocess to match partners");
      router.refresh();
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : "Failed to assign category",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Assign category
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Choose a category to resolve this review lead. Criteria will be
          written into the payload; use Reprocess afterward to run matching.
        </p>
      </div>

      <div>
        <label className="form-label" htmlFor="category-type">
          Category
        </label>
        <select
          id="category-type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="form-input"
        >
          <option value="">Select a category…</option>
          {categories.map((category) => (
            <option key={category.type} value={category.type}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {selectedCategory && selectedCategory.criteria.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Criteria preview
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCategory.criteria.map((criterion) => (
              <Badge key={criterion.field} variant="purple">
                {criterion.field} = {criterion.value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selectedType || pending}
          onClick={handleAssign}
          className="btn-primary btn-sm"
        >
          {pending ? "Assigning…" : "Assign category"}
        </button>
      </div>
    </div>
  );
}
