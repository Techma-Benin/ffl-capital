"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeadCategoryManager } from "@/components/admin/lead-category-manager";
import { IntegrityTestPanel } from "@/components/admin/integrity-test-panel";
import { DEFAULT_CONTACT_RECIPIENT_EMAIL } from "@/lib/settings/contact-recipient";
import { DEFAULT_RESALE_VENDOR_CONFIGS } from "@/lib/settings/resale-vendor-defaults";
import {
  isSystemResaleVendorKey,
  resaleVendorLabel,
} from "@/lib/settings/resale-vendor-keys";

/* ─── types ─────────────────────────────────────────────────────────────── */
import { notify } from "@/lib/notify";

interface ResaleVendorRow {
  key: string;
  enabled: boolean;
  pingUrl: string;
  postUrl: string;
  /**
   * Read-only: the URL actually in effect right now (env var fallback when
   * postUrl is blank). Never sent back to the server — display only.
   */
  resolvedPostUrl?: string;
}

type FormTab = "general" | "lead-categories" | "integrations";

/* ─── helpers ───────────────────────────────────────────────────────────── */

function buildResaleRows(
  resaleConfigs: Record<
    string,
    { enabled?: boolean; pingUrl?: string; postUrl?: string; resolvedPostUrl?: string }
  >,
): ResaleVendorRow[] {
  return Object.entries(resaleConfigs).map(([key, cfg]) => ({
    key,
    enabled: cfg.enabled ?? true,
    pingUrl: cfg.pingUrl ?? "",
    postUrl: cfg.postUrl ?? "",
    resolvedPostUrl: cfg.resolvedPostUrl,
  }));
}

function resaleToPayload(rows: ResaleVendorRow[]) {
  const resaleVendorConfigs: Record<string, object> = {};
  for (const row of rows) {
    if (!row.key.trim()) continue;
    resaleVendorConfigs[row.key.trim()] = {
      enabled: row.enabled,
      pingUrl: row.pingUrl,
      postUrl: row.postUrl,
    };
  }
  return resaleVendorConfigs;
}

/* ─── shared primitives ─────────────────────────────────────────────────── */

/**
 * Card header row — icon + title + optional hint (same line) + optional right slot.
 */
function CardHead({
  iconBg,
  icon,
  title,
  hint,
  right,
}: {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "15px 20px",
        borderBottom: "1px solid #f4f3f8",
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 800, color: "#030229" }}>
        {title}
      </span>
      {hint && (
        <span style={{ fontSize: 13, color: "#8b8a99", marginLeft: 4 }}>
          {hint}
        </span>
      )}
      {right && <span style={{ flex: 1 }} />}
      {right}
    </div>
  );
}

/** Full-width toggle row — label + description on left, toggle on right */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  last,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        padding: "13px 0",
        borderBottom: last ? "none" : "1px solid #f4f3f8",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#030229" }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 13, color: "#8b8a99", marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      {/* iOS-style toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 40,
          height: 23,
          borderRadius: 20,
          position: "relative",
          flexShrink: 0,
          cursor: "pointer",
          border: "none",
          background: checked ? "#3A974C" : "#d7d6e0",
          transition: "background 0.18s",
        }}
      >
        <i
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 20 : 3,
            width: 17,
            height: 17,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.18s",
          }}
        />
      </button>
    </div>
  );
}

/* ─── resale vendor modal ───────────────────────────────────────────────── */

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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
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

function ResaleVendorModal({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: ResaleVendorRow;
  isNew: boolean;
  onSave: (row: ResaleVendorRow) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [row, setRow] = useState<ResaleVendorRow>(initial);
  const isSystemVendor = isSystemResaleVendorKey(initial.key);

  function set(patch: Partial<ResaleVendorRow>) {
    setRow((r) => ({ ...r, ...patch }));
  }

  return (
    <ModalOverlay
      title={isNew ? "Add resale vendor" : `Edit — ${resaleVendorLabel(initial.key)}`}
      onClose={onClose}
    >
      <Field label="Vendor key" hint="Internal identifier (e.g. integrity_realtime)">
        <input
          type="text"
          value={row.key}
          onChange={(e) => set({ key: e.target.value })}
          disabled={!isNew}
          placeholder="e.g. integrity_realtime"
          className="form-input font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={row.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="rounded border-slate-300"
        />
        Enabled — send leads to this vendor
      </label>

      {!isSystemVendor && (
        <Field label="Ping URL" hint="Optional availability check endpoint">
          <input
            type="url"
            value={row.pingUrl}
            onChange={(e) => set({ pingUrl: e.target.value })}
            placeholder="https://…"
            className="form-input text-sm"
          />
        </Field>
      )}

      <Field
        label="Post URL"
        hint={
          isSystemVendor
            ? "LeadConduit submit URL. Storefront ping uses the same URL. Leave blank to use the env var fallback."
            : "Lead delivery endpoint"
        }
      >
        <input
          type="url"
          value={row.postUrl}
          onChange={(e) => set({ postUrl: e.target.value })}
          placeholder={row.resolvedPostUrl || "https://…"}
          className="form-input text-sm"
        />
        {!row.postUrl && row.resolvedPostUrl && (
          <p className="text-xs text-slate-400 mt-1">
            Currently using the environment default:{" "}
            <span className="font-mono">{row.resolvedPostUrl}</span>. Enter a
            URL above to override it.
          </p>
        )}
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={() => onSave(row)} className="btn-primary btn-sm">
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          Cancel
        </button>
        {!isNew && !isSystemVendor && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Remove vendor
          </button>
        )}
      </div>
    </ModalOverlay>
  );
}

/* ─── SVG icons ─────────────────────────────────────────────────────────── */

const IconPlatform = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#605BFF" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 12h8" />
  </svg>
);

const IconPricing = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3A974C" strokeWidth={2}>
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const IconLifecycle = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a5842b" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconResale = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a23ad1" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <rect x="3" y="14" width="18" height="6" rx="2" />
  </svg>
);

/* ─── main form ─────────────────────────────────────────────────────────── */

export function AdminSettingsForm({
  tab,
}: {
  tab: FormTab;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const [form, setForm] = useState({
    defaultRealtimePrice: 25,
    defaultAgedPrice: 5,
    adminApprovalRequired: true,
    integrationsMode: "mock" as "mock" | "live",
    agedDaysThreshold: 30,
    trustedformValidationEnabled: false,
    duplicateCheckEnabled: true,
    duplicateCheckWindowDays: 30,
    integrityPostDelayHours: 24,
    integrityReprocessEnabled: true,
    reprocessPartnerPickerEnabled: false,
    lifecycleRoutingEnabled: false,
    lifecycleRealtimeCutoffHours: 24,
    lifecycleStorefrontCutoffHours: 48,
    lifecycleMidWindowPrimary: "partner" as "partner" | "storefront",
    contactRecipientEmail: DEFAULT_CONTACT_RECIPIENT_EMAIL,
  });

  const [resaleVendors, setResaleVendors] = useState<ResaleVendorRow[]>([]);

  const [resaleModal, setResaleModal] = useState<{
    row: ResaleVendorRow;
    index: number | null;
  } | null>(null);

  /* load */
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings ?? {};
        setForm({
          defaultRealtimePrice: Number(s.default_realtime_price ?? 25),
          defaultAgedPrice: Number(s.default_aged_price ?? 5),
          adminApprovalRequired: Boolean(s.admin_approval_required ?? true),
          integrationsMode: (s.integrations_mode as "mock" | "live") ?? "mock",
          agedDaysThreshold: Number(s.aged_days_threshold ?? 30),
          trustedformValidationEnabled: Boolean(s.trustedform_validation_enabled ?? false),
          duplicateCheckEnabled: Boolean(s.duplicate_check_enabled ?? true),
          duplicateCheckWindowDays: Number(s.duplicate_check_window_days ?? 30),
          integrityPostDelayHours: Number(s.integrity_post_delay_hours ?? 24),
          integrityReprocessEnabled: Boolean(s.integrity_reprocess_enabled ?? true),
          reprocessPartnerPickerEnabled: Boolean(
            s.reprocess_partner_picker_enabled ?? false,
          ),
          lifecycleRoutingEnabled: Boolean(s.lifecycle_routing_enabled ?? false),
          lifecycleRealtimeCutoffHours: Number(
            s.lifecycle_realtime_cutoff_hours ?? 24,
          ),
          lifecycleStorefrontCutoffHours: Number(
            s.lifecycle_storefront_cutoff_hours ?? 48,
          ),
          lifecycleMidWindowPrimary:
            s.lifecycle_mid_window_primary === "storefront"
              ? "storefront"
              : "partner",
          contactRecipientEmail:
            typeof s.contact_recipient_email === "string" &&
            s.contact_recipient_email.trim()
              ? s.contact_recipient_email.trim()
              : DEFAULT_CONTACT_RECIPIENT_EMAIL,
        });
        setResaleVendors(
          buildResaleRows(
            (s.resale_vendor_configs as Record<
              string,
              { enabled?: boolean; pingUrl?: string; postUrl?: string }
            > | undefined) ?? DEFAULT_RESALE_VENDOR_CONFIGS,
          ),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  /* Persist integrations Mode immediately — tests and outbound reads DB, not form state. */
  async function handleIntegrationsModeChange(next: "mock" | "live") {
    const prev = form.integrationsMode;
    setForm((f) => ({ ...f, integrationsMode: next }));
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationsMode: next }),
      });
      if (!res.ok) throw new Error("Save failed");
      notify.success(next === "live" ? "Integrations mode: live" : "Integrations mode: mock");
    } catch {
      setForm((f) => ({ ...f, integrationsMode: prev }));
      notify.error("Failed to update integrations mode");
    }
  }

  /* save */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const resaleVendorConfigs = resaleToPayload(resaleVendors);
      const payload: Record<string, unknown> = {
        defaultRealtimePrice: form.defaultRealtimePrice,
        defaultAgedPrice: form.defaultAgedPrice,
        adminApprovalRequired: form.adminApprovalRequired,
        agedDaysThreshold: form.agedDaysThreshold,
        trustedformValidationEnabled: form.trustedformValidationEnabled,
        duplicateCheckEnabled: form.duplicateCheckEnabled,
        duplicateCheckWindowDays: form.duplicateCheckWindowDays,
        resaleVendorConfigs,
        integrityPostDelayHours: form.integrityPostDelayHours,
        integrityReprocessEnabled: form.integrityReprocessEnabled,
        reprocessPartnerPickerEnabled: form.reprocessPartnerPickerEnabled,
        lifecycleRoutingEnabled: form.lifecycleRoutingEnabled,
        lifecycleRealtimeCutoffHours: form.lifecycleRealtimeCutoffHours,
        lifecycleStorefrontCutoffHours: form.lifecycleStorefrontCutoffHours,
        lifecycleMidWindowPrimary: form.lifecycleMidWindowPrimary,
        contactRecipientEmail: form.contactRecipientEmail.trim(),
      };
      payload.integrationsMode = form.integrationsMode;
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      notify.success("Settings saved");
      router.refresh();
    } catch {
      notify.error("Failed to save");
    } finally {
      setPending(false);
    }
  }

  /* resale handlers */
  function openNewResale() {
    setResaleModal({ row: { key: "", enabled: true, pingUrl: "", postUrl: "" }, index: null });
  }
  function openEditResale(row: ResaleVendorRow, index: number) {
    setResaleModal({ row, index });
  }
  function saveResale(row: ResaleVendorRow) {
    if (resaleModal === null) return;
    if (resaleModal.index === null) {
      setResaleVendors((prev) => [...prev, row]);
    } else {
      setResaleVendors((prev) => prev.map((r, i) => (i === resaleModal.index ? row : r)));
    }
    setResaleModal(null);
  }
  function deleteResale() {
    if (resaleModal?.index == null) return;
    setResaleVendors((prev) => prev.filter((_, i) => i !== resaleModal.index));
    setResaleModal(null);
  }

  if (loading) {
    return (
      <div
        className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)]"
        style={{ padding: 24 }}
      >
        <p className="text-sm text-[#8b8a99]">Loading settings…</p>
      </div>
    );
  }

  return (
    <>
      {resaleModal && (
        <ResaleVendorModal
          initial={resaleModal.row}
          isNew={resaleModal.index === null}
          onSave={saveResale}
          onDelete={deleteResale}
          onClose={() => setResaleModal(null)}
        />
      )}

      <form id="admin-settings-form" onSubmit={handleSave}>

        {/* ── GENERAL TAB ────────────────────────────────────────────────── */}
        {tab === "general" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              alignItems: "start",
            }}
          >
            {/* Left column: Platform + Default pricing */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Platform card */}
              <div className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)]">
                <CardHead
                  iconBg="rgba(96,91,255,0.12)"
                  icon={<IconPlatform />}
                  title="Platform"
                />
                <div style={{ padding: "6px 20px 16px" }}>
                  <ToggleRow
                    label="Require admin approval for new partners"
                    description="Partners must be approved before buying"
                    checked={form.adminApprovalRequired}
                    onChange={(v) => setForm({ ...form, adminApprovalRequired: v })}
                  />
                  <div style={{ paddingTop: 4, paddingBottom: 4 }}>
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#030229",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Partner contact recipient
                    </label>
                    <input
                      type="email"
                      value={form.contactRecipientEmail}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contactRecipientEmail: e.target.value,
                        })
                      }
                      placeholder={DEFAULT_CONTACT_RECIPIENT_EMAIL}
                      className="form-input"
                      required
                    />
                    <p style={{ fontSize: 13, color: "#8b8a99", marginTop: 6 }}>
                      Inbox that receives Contact Us messages from partners.
                    </p>
                  </div>
                </div>
              </div>

              {/* Default pricing card */}
              <div className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)]">
                <CardHead
                  iconBg="rgba(58,151,76,0.1)"
                  icon={<IconPricing />}
                  title="Default pricing"
                />
                <div style={{ padding: "16px 20px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#030229",
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Realtime price ($)
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        value={form.defaultRealtimePrice}
                        onChange={(e) =>
                          setForm({ ...form, defaultRealtimePrice: Number(e.target.value) })
                        }
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#030229",
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Aged price ($)
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        value={form.defaultAgedPrice}
                        onChange={(e) =>
                          setForm({ ...form, defaultAgedPrice: Number(e.target.value) })
                        }
                        className="form-input"
                      />
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#8b8a99",
                      marginTop: 12,
                    }}
                  >
                    Per-category prices in{" "}
                    <strong style={{ color: "#605BFF" }}>Categories</strong>{" "}
                    override these globals.
                  </p>
                </div>
              </div>

            </div>

            {/* Right column: Lead lifecycle (full height) */}
            <div className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)]">
              <CardHead
                iconBg="rgba(255,214,107,0.22)"
                icon={<IconLifecycle />}
                title="Lead lifecycle"
              />
              <div style={{ padding: "16px 20px 18px" }}>
                {/* Two threshold inputs */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                    marginBottom: 4,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#030229",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Aged days threshold
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.agedDaysThreshold}
                      onChange={(e) =>
                        setForm({ ...form, agedDaysThreshold: Number(e.target.value) })
                      }
                      className="form-input"
                    />
                    <p style={{ fontSize: 13, color: "#8b8a99", marginTop: 6 }}>
                      Leads older than this move to the aged marketplace.
                    </p>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#030229",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Integrity unmatched delay (hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.integrityPostDelayHours}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          integrityPostDelayHours: Number(e.target.value),
                        })
                      }
                      className="form-input"
                    />
                    <p style={{ fontSize: 13, color: "#8b8a99", marginTop: 6 }}>
                      Unmatched leads younger than this are retried for matching every
                      cron run; older ones are sent to Integrity.
                    </p>
                  </div>
                </div>

                {/* Toggle rows */}
                <ToggleRow
                  label="Client-approved lifecycle routing"
                  description="When off, existing delay-based reprocessing applies. When on, enforces 0–24h Realtime, 24–48h priority/fallback, and 48h–30d partners-only routing."
                  checked={form.lifecycleRoutingEnabled}
                  onChange={(v) => setForm({ ...form, lifecycleRoutingEnabled: v })}
                />
                {form.lifecycleRoutingEnabled && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 14,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#030229",
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Realtime cutoff (hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.lifecycleRealtimeCutoffHours}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            lifecycleRealtimeCutoffHours: Number(e.target.value),
                          })
                        }
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#030229",
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Storefront cutoff (hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.lifecycleStorefrontCutoffHours}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            lifecycleStorefrontCutoffHours: Number(e.target.value),
                          })
                        }
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#030229",
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        24–48h primary route
                      </label>
                      <select
                        value={form.lifecycleMidWindowPrimary}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            lifecycleMidWindowPrimary: e.target.value as
                              | "partner"
                              | "storefront",
                          })
                        }
                        className="form-input"
                      >
                        <option value="partner">Platform partner</option>
                        <option value="storefront">ILC Storefront</option>
                      </select>
                    </div>
                  </div>
                )}
                <ToggleRow
                  label="Automated reprocessing"
                  description="Every 15 min: retry matching unmatched leads, then escalate old ones to Integrity. Turn off to pause the whole flow."
                  checked={form.integrityReprocessEnabled}
                  onChange={(v) => setForm({ ...form, integrityReprocessEnabled: v })}
                />
                <ToggleRow
                  label="Partner picker on reprocess"
                  description="When on, Reprocess opens a modal to choose partners. When off, reprocess runs immediately against all eligible partners."
                  checked={form.reprocessPartnerPickerEnabled}
                  onChange={(v) =>
                    setForm({ ...form, reprocessPartnerPickerEnabled: v })
                  }
                />
                <ToggleRow
                  label="TrustedForm validation on intake"
                  checked={form.trustedformValidationEnabled}
                  onChange={(v) =>
                    setForm({ ...form, trustedformValidationEnabled: v })
                  }
                />
                <ToggleRow
                  label="Duplicate lead checks"
                  checked={form.duplicateCheckEnabled}
                  onChange={(v) => setForm({ ...form, duplicateCheckEnabled: v })}
                  last={!form.duplicateCheckEnabled}
                />
                {form.duplicateCheckEnabled && (
                  <div style={{ paddingTop: 12 }}>
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#030229",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Duplicate check window (days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.duplicateCheckWindowDays}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          duplicateCheckWindowDays: Number(e.target.value),
                        })
                      }
                      className="form-input"
                      style={{ width: 160 }}
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── INTEGRATIONS TAB — Resale vendors (saveable) ───────────────── */}
        {tab === "integrations" && (
          <div className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)] overflow-hidden">
            <CardHead
              iconBg="rgba(162,58,209,0.1)"
              icon={<IconResale />}
              title="Resale vendors"
              hint="Third-party platforms that receive leads · click a row to edit"
              right={
                <button
                  type="button"
                  onClick={openNewResale}
                  className="btn-secondary btn-sm whitespace-nowrap"
                >
                  + Add vendor
                </button>
              }
            />
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Vendor", "Status", "Post URL"].map((col) => (
                    <th
                      key={col}
                      className="px-3.5 py-2.5 text-xs font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap text-left"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resaleVendors.map((row, i) => (
                  <tr
                    key={row.key || i}
                    onClick={() => openEditResale(row, i)}
                    className="cursor-pointer hover:bg-[#fbfbfe] transition-colors"
                    style={{
                      borderBottom:
                        i < resaleVendors.length - 1 ? "1px solid #f4f3f8" : "none",
                    }}
                  >
                    <td className="px-3.5 py-[11px]">
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#030229" }}>
                        {resaleVendorLabel(row.key)}
                      </div>
                      {resaleVendorLabel(row.key) !== row.key && (
                        <div
                          style={{
                            fontFamily: "ui-monospace, monospace",
                            fontSize: 12,
                            color: "#8b8a99",
                            marginTop: 2,
                          }}
                        >
                          {row.key}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-[11px]">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-extrabold"
                        style={
                          row.enabled
                            ? { background: "rgba(58,151,76,0.1)", color: "#3A974C" }
                            : { background: "#f2f1f8", color: "#8b8a99" }
                        }
                      >
                        {row.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td
                      className="px-3.5 py-[11px]"
                      style={{ fontSize: 13, color: "#8b8a99" }}
                    >
                      {row.postUrl ? (
                        row.postUrl
                      ) : row.resolvedPostUrl ? (
                        <span title="Using environment variable default">
                          {row.resolvedPostUrl}{" "}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#a5842b",
                              background: "rgba(255,214,107,0.22)",
                              borderRadius: 6,
                              padding: "1px 6px",
                              marginLeft: 4,
                            }}
                          >
                            env default
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#d7d6e0" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {resaleVendors.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3.5 py-6 text-center text-sm text-[#8b8a99]"
                    >
                      No resale vendors configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── status feedback ────────────────────────────────────────────── */}
        {pending && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Saving…</span>
          </div>
        )}

      </form>

      {/* Lead categories — outside the form; saves via its own modal API calls */}
      {tab === "lead-categories" && <LeadCategoryManager />}

      {/* Integrity Connect + Recent postings — outside the form, integrations tab only */}
      {tab === "integrations" && (
        <IntegrityTestPanel
          mode={form.integrationsMode}
          onModeChange={handleIntegrationsModeChange}
        />
      )}
    </>
  );
}
