"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsdPlain, moneyCellClass, moneyHeaderClassName } from "@/lib/format-money";
import { notify } from "@/lib/notify";

/* ─── types ─────────────────────────────────────────────────────────────── */

export interface LeadCategoryCriterion {
  id?: string;
  field: string;
  value: string;
}

export interface LeadCategory {
  id: string;
  type: string;
  label: string;
  defaultPrice: number | null;
  enabled: boolean;
  integrityLabel: string | null;
  integrityLabelStorefront: string | null;
  criteria: LeadCategoryCriterion[];
}

/* ─── modal ─────────────────────────────────────────────────────────────── */

function ModalOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="form-label mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

/* ─── category form (shared by create + edit) ───────────────────────────── */

interface CategoryFormData {
  label: string;
  defaultPrice: string;
  enabled: boolean;
  integrityLabel: string;
  integrityLabelStorefront: string;
  criteria: LeadCategoryCriterion[];
}

function emptyCriterion(): LeadCategoryCriterion {
  return { field: "SRC", value: "" };
}

function emptyForm(): CategoryFormData {
  return {
    label: "",
    defaultPrice: "",
    enabled: true,
    integrityLabel: "",
    integrityLabelStorefront: "",
    criteria: [emptyCriterion()],
  };
}

function categoryToForm(cat: LeadCategory): CategoryFormData {
  return {
    label: cat.label,
    defaultPrice: cat.defaultPrice != null ? String(cat.defaultPrice) : "",
    enabled: cat.enabled,
    integrityLabel: cat.integrityLabel ?? "",
    integrityLabelStorefront: cat.integrityLabelStorefront ?? "",
    criteria: cat.criteria.length ? cat.criteria : [emptyCriterion()],
  };
}

function CategoryModal({
  initial,
  existingType,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: CategoryFormData;
  existingType?: string;
  isNew: boolean;
  onSave: (data: CategoryFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set(patch: Partial<CategoryFormData>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function setCriterion(index: number, patch: Partial<LeadCategoryCriterion>) {
    setForm((f) => ({
      ...f,
      criteria: f.criteria.map((criterion, i) =>
        i === index ? { ...criterion, ...patch } : criterion,
      ),
    }));
  }

  function addCriterion() {
    setForm((f) => ({ ...f, criteria: [...f.criteria, emptyCriterion()] }));
  }

  function removeCriterion(index: number) {
    setForm((f) => ({
      ...f,
      criteria:
        f.criteria.length > 1
          ? f.criteria.filter((_, i) => i !== index)
          : f.criteria,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) {
      notify.error("Display label is required.");
      return;
    }
    if (
      form.criteria.length === 0 ||
      form.criteria.some((criterion) => !criterion.field.trim() || !criterion.value.trim())
    ) {
      notify.error("Each criterion needs a field name and exact value.");
      return;
    }
    setPending(true);
    try {
      await onSave(form);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setPending(true);
    try {
      await onDelete();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Delete failed");
      setPending(false);
    }
  }

  return (
    <ModalOverlay title={isNew ? "New lead category" : `Edit — ${initial.label}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isNew && existingType && (
          <Field label="Internal type" hint="Set once at creation and never changed.">
            <input
              type="text"
              value={existingType}
              disabled
              className="form-input font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
            />
          </Field>
        )}

        <Field label="Display label" hint="Shown in dashboards and partner UIs">
          <input
            type="text"
            value={form.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="e.g. Mortgage Protection"
            className="form-input"
          />
        </Field>

        <Field
          label="Matching criteria"
          hint="All rows must match exactly (case-sensitive) on the top-level ActiveProspect payload."
        >
          <div className="space-y-2">
            {form.criteria.map((criterion, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={criterion.field}
                  onChange={(e) => setCriterion(index, { field: e.target.value })}
                  placeholder="Field"
                  className="form-input font-mono text-sm flex-1"
                />
                <input
                  type="text"
                  value={criterion.value}
                  onChange={(e) => setCriterion(index, { value: e.target.value })}
                  placeholder="Exact value"
                  className="form-input font-mono text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  className="text-slate-400 hover:text-red-500 text-lg leading-none px-1"
                  aria-label="Remove criterion"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCriterion}
              className="text-xs font-semibold text-[#605BFF] hover:text-[#4f4ad8]"
            >
              + Add criterion
            </button>
          </div>
        </Field>

        <Field
          label="Integrity Realtime label"
          hint="Exact string sent as lead_type_thom for Realtime posts. Leave blank to use the default IUL Realtime label."
        >
          <input
            type="text"
            value={form.integrityLabel}
            onChange={(e) => set({ integrityLabel: e.target.value })}
            placeholder="e.g. Indexed Universal Life [IUL] Facebook (Realtime Lead)"
            className="form-input text-sm"
          />
        </Field>

        <Field
          label="Integrity Storefront label"
          hint="Exact string sent as lead_type_thom for Storefront posts. Leave blank to fall back to the Realtime label."
        >
          <input
            type="text"
            value={form.integrityLabelStorefront}
            onChange={(e) => set({ integrityLabelStorefront: e.target.value })}
            placeholder="Leave blank to use Realtime label"
            className="form-input text-sm"
          />
        </Field>

        <Field label="Default price ($)" hint="Override global default price for this category">
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.defaultPrice}
            onChange={(e) => set({ defaultPrice: e.target.value })}
            placeholder="Use global"
            className="form-input"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Active — accept and route leads of this category
        </label>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button type="submit" disabled={pending} className="btn-primary btn-sm disabled:opacity-40">
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="btn-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium">
            Cancel
          </button>

          {!isNew && onDelete && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Delete
            </button>
          )}
          {!isNew && onDelete && confirmDelete && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-500">Leads using this category block deletion.</span>
              <button type="button" onClick={handleDelete} disabled={pending} className="text-xs text-red-600 font-semibold hover:text-red-800">
                Confirm delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>
    </ModalOverlay>
  );
}

function formatCriteriaSummary(criteria: LeadCategoryCriterion[]): string {
  if (!criteria.length) return "—";
  return criteria.map((criterion) => `${criterion.field}=${criterion.value}`).join(" · ");
}

/* ─── main component ─────────────────────────────────────────────────────── */

export function LeadCategoryManager() {
  const router = useRouter();
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    form: CategoryFormData;
    category: LeadCategory | null;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/lead-categories");
      const data = await res.json();
      setCategories(data.categories ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setModal({ form: emptyForm(), category: null });
  }

  function openEdit(cat: LeadCategory) {
    setModal({ form: categoryToForm(cat), category: cat });
  }

  async function handleSave(data: CategoryFormData) {
    const isNew = modal?.category === null;
    const url = isNew
      ? "/api/admin/lead-categories"
      : `/api/admin/lead-categories/${modal!.category!.id}`;

    const body = {
      label: data.label,
      criteria: data.criteria.map(({ field, value }) => ({ field, value })),
      defaultPrice: data.defaultPrice !== "" ? Number(data.defaultPrice) : null,
      enabled: data.enabled,
      integrityLabel: data.integrityLabel || null,
      integrityLabelStorefront: data.integrityLabelStorefront || null,
    };

    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Save failed");
    }

    setModal(null);
    notify.success(isNew ? "Category created" : "Category saved");
    await load();
    router.refresh();
  }

  async function handleDelete() {
    if (!modal?.category) return;
    const res = await fetch(`/api/admin/lead-categories/${modal.category.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Delete failed");
    }
    setModal(null);
    await load();
    router.refresh();
  }

  return (
    <>
      {modal && (
        <CategoryModal
          initial={modal.form}
          existingType={modal.category?.type}
          isNew={modal.category === null}
          onSave={handleSave}
          onDelete={modal.category ? handleDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <div
        className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)] overflow-hidden"
      >
        {loading ? (
          <p className="px-5 py-6 text-sm text-[#8b8a99]">Loading…</p>
        ) : (
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="px-3.5 py-2.5 text-left text-xs font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap">
                  Category
                </th>
                <th className="px-3.5 py-2.5 text-left text-xs font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap">
                  Criteria
                </th>
                <th className={`px-3.5 py-2.5 text-xs font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap ${moneyHeaderClassName}`}>
                  Price
                </th>
                <th className="px-3.5 py-2.5 text-left text-xs font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr
                  key={cat.id}
                  onClick={() => openEdit(cat)}
                  className="cursor-pointer hover:bg-[#fbfbfe] transition-colors"
                  style={{
                    borderBottom:
                      idx < categories.length - 1 ? "1px solid #f4f3f8" : "none",
                  }}
                >
                  <td className="px-3.5 py-[11px]">
                    <div
                      style={{ fontWeight: 800, fontSize: 13, color: "#030229" }}
                    >
                      {cat.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 12,
                        color: "#b3b3bf",
                        marginTop: 2,
                      }}
                    >
                      {cat.type}
                    </div>
                  </td>
                  <td
                    className="px-3.5 py-[11px]"
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                      color: "#8b8a99",
                      maxWidth: 280,
                    }}
                  >
                    {formatCriteriaSummary(cat.criteria)}
                  </td>
                  <td className={moneyCellClass("px-3.5 py-[11px]")}
                    style={{ fontSize: 13, fontWeight: 800 }}
                  >
                    {cat.defaultPrice != null ? (
                      <span style={{ color: "#030229" }}>
                        {formatUsdPlain(cat.defaultPrice)}
                      </span>
                    ) : (
                      <span style={{ color: "#8b8a99" }}>global</span>
                    )}
                  </td>
                  <td className="px-3.5 py-[11px]">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-extrabold"
                      style={
                        cat.enabled
                          ? { background: "rgba(58,151,76,0.1)", color: "#3A974C" }
                          : { background: "#f2f1f8", color: "#8b8a99" }
                      }
                    >
                      {cat.enabled ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3.5 py-8 text-center text-sm text-[#8b8a99]"
                  >
                    No categories yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#8b8a99", lineHeight: 1.5 }}>
        Single source of truth for lead classification — exact field/value criteria,
        pricing, matching rules, and Integrity Realtime / Storefront labels. The internal type is
        generated once from the display label and cannot be renamed.
      </p>

      <button
        type="button"
        onClick={openNew}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          height: 50,
          padding: "0 22px",
          borderRadius: 26,
          border: "none",
          background: "#605BFF",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 8px 24px -4px rgba(96,91,255,0.45)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add category
      </button>
    </>
  );
}
