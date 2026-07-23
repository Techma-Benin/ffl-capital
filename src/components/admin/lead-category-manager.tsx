"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsdPlain, moneyCellClass, moneyHeaderClassName } from "@/lib/format-money";

/* ─── types ─────────────────────────────────────────────────────────────── */

export interface LeadCategory {
  id: string;
  type: string;
  src: string | null;
  label: string;
  defaultPrice: number | null;
  enabled: boolean;
  integrityLabel: string | null;
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
  type: string;
  src: string;
  label: string;
  defaultPrice: string;
  enabled: boolean;
  integrityLabel: string;
}

function emptyForm(): CategoryFormData {
  return {
    type: "",
    src: "",
    label: "",
    defaultPrice: "",
    enabled: true,
    integrityLabel: "",
  };
}

function categoryToForm(cat: LeadCategory): CategoryFormData {
  return {
    type: cat.type,
    src: cat.src ?? "",
    label: cat.label,
    defaultPrice: cat.defaultPrice != null ? String(cat.defaultPrice) : "",
    enabled: cat.enabled,
    integrityLabel: cat.integrityLabel ?? "",
  };
}

function CategoryModal({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: CategoryFormData;
  isNew: boolean;
  onSave: (data: CategoryFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set(patch: Partial<CategoryFormData>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function handleTypeInput(value: string) {
    // Auto-format to snake_case
    const clean = value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    set({ type: clean });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type.trim() || !form.label.trim()) {
      setError("Type and label are required.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setPending(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setPending(false);
    }
  }

  return (
    <ModalOverlay title={isNew ? "New lead category" : `Edit — ${initial.label}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Type (internal key)"
          hint={isNew ? "Snake_case identifier — cannot be changed after saving." : "Read-only after creation."}
        >
          <input
            type="text"
            value={form.type}
            onChange={(e) => handleTypeInput(e.target.value)}
            disabled={!isNew}
            placeholder="e.g. mortgage_protection"
            className="form-input font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
          />
        </Field>

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
          label="LeadConduit SRC value"
          hint="The SRC field value that maps to this category on intake"
        >
          <input
            type="text"
            value={form.src}
            onChange={(e) => set({ src: e.target.value })}
            placeholder="e.g. Mortgage_LeadConduit"
            className="form-input font-mono text-sm"
          />
        </Field>

        <Field
          label="Integrity Connect label"
          hint="Exact string sent as lead_type_thom to Integrity. Leave blank to use the default IUL label."
        >
          <input
            type="text"
            value={form.integrityLabel}
            onChange={(e) => set({ integrityLabel: e.target.value })}
            placeholder="e.g. Mortgage Protection Facebook (Realtime Lead)"
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

        {error && <p className="text-xs text-red-600">{error}</p>}

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

/* ─── main component ─────────────────────────────────────────────────────── */

export function LeadCategoryManager() {
  const router = useRouter();
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    form: CategoryFormData;
    category: LeadCategory | null; // null = new
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
      ...(isNew ? { type: data.type } : {}),
      src: data.src || null,
      label: data.label,
      defaultPrice: data.defaultPrice !== "" ? Number(data.defaultPrice) : null,
      enabled: data.enabled,
      integrityLabel: data.integrityLabel || null,
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
          isNew={modal.category === null}
          onSave={handleSave}
          onDelete={modal.category ? handleDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Lead categories</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Single source of truth for lead classification. Each category defines the
            SRC mapping, pricing, matching rules, and Integrity Connect label.
            The internal type is set once and cannot be renamed.
          </p>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 py-4">Loading…</p>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">SRC</th>
                  <th className={`px-4 py-2.5 ${moneyHeaderClassName}`}>Price</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    onClick={() => openEdit(cat)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-sm">{cat.label}</div>
                      <div className="font-mono text-xs text-slate-400">{cat.type}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {cat.src ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={moneyCellClass("px-4 py-3 text-xs text-slate-600")}>
                      {cat.defaultPrice != null
                        ? formatUsdPlain(cat.defaultPrice)
                        : <span className="text-slate-400">global</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        cat.enabled
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {cat.enabled ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                      No categories — click below to add one
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={openNew}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add category
        </button>
      </div>
    </>
  );
}
