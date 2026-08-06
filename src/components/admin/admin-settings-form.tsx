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

export function AdminSettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
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
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Settings saved");
      router.refresh();
    } catch {
      setMessage("Failed to save");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="card p-6 text-sm text-slate-500">Loading settings…</div>;
  }

  return (
    <form onSubmit={handleSave} className="card p-6 space-y-5 max-w-xl">
      <div>
        <label className="form-label">Default realtime price ($)</label>
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
                  {["Vendor", "Status", "Post URL", "Actions"].map((col, i) => (
                    <th
                      key={col}
                      className="px-3.5 py-2.5 text-xs font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap"
                      style={{ textAlign: i === 3 ? "right" : "left" }}
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
                    <td className="px-3.5 py-[11px]" style={{ textAlign: "right" }}>
                      {!isSystemResaleVendorKey(row.key) && (
                        <button
                          type="button"
                          onClick={(e) => deleteResaleByIndex(i, e)}
                          className="inline-flex items-center justify-center rounded-lg transition-colors"
                          style={{
                            width: 30,
                            height: 30,
                            border: "1.5px solid #ececf3",
                            background: "#fff",
                            color: "#8b8a99",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#c0392b";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#ffd9cc";
                            (e.currentTarget as HTMLButtonElement).style.background = "#fdf6f4";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#8b8a99";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#ececf3";
                            (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                          }}
                        >
                          <IconTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {resaleVendors.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
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
        <label htmlFor="adminApproval" className="text-sm text-slate-700">
          Require admin approval for new partners
        </label>
      </div>
      <div>
        <label className="form-label">Integrations mode</label>
        <select
          value={form.integrationsMode}
          onChange={(e) =>
            setForm({
              ...form,
              integrationsMode: e.target.value as "mock" | "live",
            })
          }
          className="form-select"
        >
          <option value="mock">Mock (log only)</option>
          <option value="live">Live (email, CRM, Integrity)</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Saving…" : "Save Settings"}
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </form>
  );
}
