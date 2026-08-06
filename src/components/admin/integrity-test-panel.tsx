"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format-datetime";
import {
  formatStateForIntegrity,
  INTEGRITY_REALTIME_ELIGIBLE_STATE_CODES,
  US_STATE_NAMES,
} from "@/lib/constants/us-states";
import {
  buildLeadTypeThomOptions,
  resolveIntegrityLabelForMode,
} from "@/lib/integrity/build-payload";
import { IntegrityPostingsTable, type PostingRow } from "@/components/admin/integrity-postings-table";

type Flow = "realtime" | "storefront";

interface LeadOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  leadType: string | null;
  state: string;
  dob: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  trustedformCertUrl: string | null;
  leadidToken: string | null;
  externalId: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
  receivedAt: string;
}

interface CategoryOption {
  type: string;
  label?: string;
  integrityLabel: string | null;
  integrityLabelStorefront: string | null;
}

interface VendorStatus {
  key: string;
  enabled: boolean;
  hasUrl: boolean;
}

interface VendorsInfo {
  realtime: VendorStatus;
  storefront: VendorStatus;
}

interface TestResult {
  flow: Flow;
  httpStatus: number;
  response: unknown;
  lead: { id: string; name: string; leadType: string; state: string } | null;
  payload?: Record<string, string>;
  encodedBody?: string;
  encodedFields?: Record<string, string>;
  error?: string;
}

type ModalFields = Record<string, string>;

const HARDCODED_DEFAULTS: ModalFields = {
  first_name: "Mike",
  last_name: "Jones",
  email: "bill.ahognonvi+test@techma.ca",
  phone_1: "5127891111",
  state: "Texas",
  address_1: "",
  dob: "6/2/1980",
  dob_mmddyyyy_thom: "06/02/1980",
  trustedform_cert_url: "https://cert.trustedform.com/a1028cbb41b876744fa752eec276bec0e4c48b33",
  has_iul_thom: "yes",
  primary_goal_thom: "Stability",
  vendor_lead_id_thom: "test-001",
};

const INTEGRITY_REALTIME_STATES_LABEL = INTEGRITY_REALTIME_ELIGIBLE_STATE_CODES.map(
  (code) => US_STATE_NAMES[code],
).join(", ");

function formatDobMmDdYyyy(dob: string | null): string {
  if (!dob) return "";
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return dob;
}

function formatDobMdY(dob: string | null): string {
  const mmddyyyy = formatDobMmDdYyyy(dob);
  if (!mmddyyyy) return "";
  const match = mmddyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return mmddyyyy;
  return `${Number(match[1])}/${Number(match[2])}/${match[3]}`;
}

/* ─── shield icon ─────────────────────────────────────────────────────── */
const IconShield = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3A974C" strokeWidth={2}>
    <path d="M12 2l8 4v5c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V6z" />
  </svg>
);

/* ─── component ───────────────────────────────────────────────────────── */

export function IntegrityTestPanel({
  mode,
  onModeChange,
}: {
  mode: "mock" | "live";
  onModeChange: (v: "mock" | "live") => void;
}) {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [vendors, setVendors] = useState<VendorsInfo | null>(null);
  const [postings, setPostings] = useState<PostingRow[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [testCategoryType, setTestCategoryType] = useState<string>("");
  const [modal, setModal] = useState<{ open: boolean; flow: Flow; fields: ModalFields; category: CategoryOption | null } | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/integrity/test")
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads ?? []);
        setCategories(d.categories ?? []);
        setVendors(d.vendors ?? null);
        const cats = d.categories ?? [];
        if (cats.length > 0) {
          const preferred = cats.find(
            (c: CategoryOption) => c.type === "traditional_iul",
          );
          setTestCategoryType(preferred?.type ?? cats[0].type);
        }
      });
    fetch("/api/admin/integrity/postings")
      .then((r) => r.json())
      .then((d) => {
        setPostings(d.postings ?? []);
      });
  }, []);

  function openModal(flow: Flow) {
    setResult(null);
    let fields: ModalFields;
    let category: CategoryOption | null = null;

    if (selectedLeadId) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      if (!lead) return;
      category = categories.find((c) => c.type === (lead.leadType ?? "")) ?? null;
      const integrityLabel =
        resolveIntegrityLabelForMode(flow, {
          realtime: category?.integrityLabel,
          storefront: category?.integrityLabelStorefront,
        }) ?? "";
      fields = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email ?? "",
        phone_1: lead.phone ?? "",
        state: formatStateForIntegrity(lead.state),
        address_1: lead.address ?? "",
        city: lead.city ?? "",
        postal_code: lead.zip ?? "",
        dob: formatDobMdY(lead.dob),
        dob_mmddyyyy_thom: formatDobMmDdYyyy(lead.dob),
        lead_type_thom: integrityLabel,
        trustedform_cert_url: lead.trustedformCertUrl ?? "",
        universal_leadid: lead.leadidToken ?? "",
        has_iul_thom: lead.haveIul ?? "",
        primary_goal_thom: lead.primaryGoal ?? "",
        vendor_lead_id_thom: lead.externalId ?? lead.id,
      };
    } else {
      category = categories.find((c) => c.type === testCategoryType) ?? null;
      const integrityLabel =
        resolveIntegrityLabelForMode(flow, {
          realtime: category?.integrityLabel,
          storefront: category?.integrityLabelStorefront,
        }) ?? "";
      fields = {
        ...HARDCODED_DEFAULTS,
        lead_type_thom: integrityLabel,
      };
    }

    setModal({ open: true, flow, fields, category });
  }

  function setField(key: string, value: string) {
    setModal((prev) => prev ? { ...prev, fields: { ...prev.fields, [key]: value } } : prev);
  }

  async function sendTest() {
    if (!modal) return;
    setPending(true);
    try {
      const res = await fetch("/api/admin/integrity/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow: modal.flow,
          categoryType: modal.category?.type ?? testCategoryType,
          manualPayload: modal.fields,
        }),
      });
      const data = await res.json();
      setResult({ flow: modal.flow, httpStatus: res.status, ...data });
    } catch (err) {
      setResult({ flow: modal.flow, httpStatus: 0, response: null, lead: null, error: String(err) });
    } finally {
      setPending(false);
      setModal(null);
    }
  }

  const outcome =
    result && typeof result.response === "object" && result.response !== null
      ? (result.response as Record<string, unknown>).outcome
      : null;
  const isSuccess = outcome === "success";
  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;

  const modeHint =
    mode === "live"
      ? "Live mode is saved immediately. Partner email/CRM and Integrity auto posts send real requests (automatic posts do not include is_test)."
      : "Mock mode is saved immediately. Partner email/CRM are logged only. Integrity auto posts still hit LeadConduit with is_test=yes; Azure ping is skipped. Connection tests below log without HTTP.";

  const realtimeVendor = vendors?.realtime;
  const storefrontVendor = vendors?.storefront;

  return (
    <>
      {/* ── Integrity Connect card ─────────────────────────────────────── */}
      <div
        className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)]"
        style={{ padding: 0, display: "flex", flexDirection: "column" }}
      >
        {/* Card header: icon + title + spacer + Mode label + select */}
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
              background: "rgba(58,151,76,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconShield />
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#030229" }}>
            Integrity Connect
          </span>
          <span style={{ flex: 1 }} />
          <label
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#8b8a99",
              margin: "0 8px 0 0",
              whiteSpace: "nowrap",
            }}
          >
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as "mock" | "live")}
            className="form-select"
            style={{ width: 230, height: 34, fontSize: 13, borderRadius: 9 }}
          >
            <option value="mock">Mock (test leads, log CRM/email)</option>
            <option value="live">Live (real delivery)</option>
          </select>
        </div>

        {/* Card body */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Mode hint */}
          <p style={{ fontSize: 13, color: "#8b8a99", margin: 0, lineHeight: 1.5 }}>
            {modeHint} Connection tests fire an{" "}
            <code
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                background: "#f2f1f8",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              is_test=yes
            </code>{" "}
            payload — nothing is saved or routed to an agent.
          </p>

          {/* Connection test row */}
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
              Connection test
            </label>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="form-select"
                style={{ flex: 1, minWidth: 260 }}
              >
                <option value="">Use test payload (Mike Jones)</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.firstName} {l.lastName} — {l.leadType ?? "unknown"} · {l.state} ·{" "}
                    {formatDateTime(l.receivedAt)}
                  </option>
                ))}
              </select>
              {!selectedLeadId && categories.length > 0 && (
                <select
                  value={testCategoryType}
                  onChange={(e) => setTestCategoryType(e.target.value)}
                  className="form-select"
                  style={{ minWidth: 200 }}
                  title="Lead category used for lead_type_thom when no lead is selected"
                >
                  {categories.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label ?? c.type}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => openModal("realtime")}
                disabled={realtimeVendor ? !realtimeVendor.enabled : false}
                className="btn-primary btn-sm whitespace-nowrap disabled:opacity-40"
                title={
                  realtimeVendor && !realtimeVendor.enabled
                    ? "Integrity RealTime vendor is disabled"
                    : undefined
                }
              >
                Test RealTime
                {realtimeVendor && (
                  <span className="ml-1.5 text-[11px] font-bold opacity-80">
                    ({realtimeVendor.enabled ? "on" : "off"})
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => openModal("storefront")}
                disabled={storefrontVendor ? !storefrontVendor.enabled : false}
                className="btn-sm border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap disabled:opacity-40"
                title={
                  storefrontVendor && !storefrontVendor.enabled
                    ? "Integrity Storefront vendor is disabled"
                    : undefined
                }
              >
                Test Storefront
                {storefrontVendor && (
                  <span className="ml-1.5 text-[11px] font-bold opacity-80">
                    ({storefrontVendor.enabled ? "on" : "off"})
                  </span>
                )}
              </button>
            </div>

            {/* Quality pills for selected lead */}
            {selectedLead && (
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <Pill ok={!!selectedLead.trustedformCertUrl} label="TrustedForm cert" />
                <Pill ok={!!selectedLead.dob} label="Date of birth" />
              </div>
            )}
          </div>

          {/* Test result */}
          {result && (
            <div
              style={{
                border: `1.5px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
                background: isSuccess ? "rgba(240,253,244,1)" : "rgba(254,242,242,1)",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                  style={
                    isSuccess
                      ? { background: "rgba(58,151,76,0.1)", color: "#3A974C" }
                      : { background: "#fdecea", color: "#c0392b" }
                  }
                >
                  {isSuccess ? "✓ Success" : "✗ Failed"}
                </span>
                <span style={{ fontSize: 13, color: "#8b8a99", fontWeight: 700 }}>
                  {result.flow} · HTTP {result.httpStatus}
                </span>
              </div>
              <pre
                style={{
                  background: "#fff",
                  borderRadius: 9,
                  padding: 12,
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#4a495c",
                  whiteSpace: "pre-wrap",
                  overflowX: "auto",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {result.error ?? JSON.stringify(result.response, null, 2)}
              </pre>
              {result.payload && (
                <details className="text-xs" open>
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                    View payload / encoded fields sent
                  </summary>
                  <pre
                    style={{
                      marginTop: 8,
                      background: "#fff",
                      borderRadius: 9,
                      padding: 12,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: "#4a495c",
                      whiteSpace: "pre-wrap",
                      overflowX: "auto",
                    }}
                  >
                    {JSON.stringify(
                      {
                        payload: result.payload,
                        encodedFields: result.encodedFields ?? null,
                        encodedBody: result.encodedBody ?? null,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent postings card ───────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)] overflow-hidden">
        <IntegrityPostingsTable postings={postings} />
      </div>

      {/* ── Edit payload modal ─────────────────────────────────────────── */}
      {modal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Review payload</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Flow: <span className="font-medium capitalize">{modal.flow}</span> · Edit any
                  field then send
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    "first_name",
                    "last_name",
                    "email",
                    "phone_1",
                    "state",
                    "address_1",
                    "city",
                    "postal_code",
                    "dob",
                    "dob_mmddyyyy_thom",
                    "has_iul_thom",
                    "primary_goal_thom",
                    "vendor_lead_id_thom",
                    "universal_leadid",
                  ] as const
                ).map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="form-label">
                      {key}
                      {key === "address_1" && (
                        <span className="ml-2 text-slate-400 font-normal">
                          (always sent, even if blank)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      value={modal.fields[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                    {key === "state" && modal.flow === "realtime" && (
                      <p className="text-xs text-slate-500">
                        Realtime campaigns: {INTEGRITY_REALTIME_STATES_LABEL}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="form-label">lead_type_thom</label>
                {modal.category && (
                  <p className="text-xs text-slate-500 mb-1">
                    From category <span className="font-medium">{modal.category.type}</span>
                  </p>
                )}
                <select
                  className="form-select text-sm"
                  value={modal.fields.lead_type_thom ?? ""}
                  onChange={(e) => setField("lead_type_thom", e.target.value)}
                >
                  <option value="">— not configured on category —</option>
                  {buildLeadTypeThomOptions(
                    modal.flow,
                    categories,
                    modal.category,
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="form-label">
                  trustedform_cert_url
                  {!modal.fields.trustedform_cert_url && (
                    <span className="ml-2 text-amber-600 font-normal">
                      ⚠ paste a fresh cert URL here
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-input text-sm font-mono"
                  placeholder="https://cert.trustedform.com/…"
                  value={modal.fields.trustedform_cert_url ?? ""}
                  onChange={(e) => setField("trustedform_cert_url", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="btn-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-4 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendTest}
                disabled={pending}
                className="btn-primary btn-sm disabled:opacity-40"
              >
                {pending ? "Sending…" : `Send to ${modal.flow}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={
        ok
          ? { background: "rgba(58,151,76,0.1)", color: "#3A974C" }
          : { background: "rgba(255,214,107,0.22)", color: "#a5842b" }
      }
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}
