"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format-datetime";

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
  trustedformCertUrl: string | null;
  externalId: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
  receivedAt: string;
}

interface CategoryOption {
  type: string;
  integrityLabel: string | null;
}

interface TestResult {
  flow: Flow;
  httpStatus: number;
  response: unknown;
  lead: { id: string; name: string; leadType: string; state: string } | null;
  payload?: Record<string, string>;
  error?: string;
}

type ModalFields = Record<string, string>;

const LEAD_TYPE_OPTIONS = [
  "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
  "Final Expense Facebook (Realtime Lead)",
  "Mortgage Protection Facebook (Realtime Lead)",
  "Veteran Final Expense Lead (Realtime Lead)",
  "Veteran Life Facebook (Realtime Lead)",
];

const HARDCODED_DEFAULTS: ModalFields = {
  first_name: "Mike",
  last_name: "Jones",
  email: "bill.ahognonvi+test@techma.ca",
  phone_1: "5127891111",
  state: "TX",
  dob_mmddyyyy_thom: "06/02/1980",
  lead_type_thom: "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
  trustedform_cert_url: "https://cert.trustedform.com/a1028cbb41b876744fa752eec276bec0e4c48b33",
  has_iul_thom: "yes",
  primary_goal_thom: "Stability",
  vendor_lead_id_thom: "test-001",
};

function formatDob(dob: string | null): string {
  if (!dob) return "";
  // ISO yyyy-mm-dd → MM/DD/YYYY
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return dob;
}

export function IntegrityTestPanel() {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [modal, setModal] = useState<{ open: boolean; flow: Flow; fields: ModalFields } | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/integrity/test")
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads ?? []);
        setCategories(d.categories ?? []);
      });
  }, []);

  function openModal(flow: Flow) {
    setResult(null);
    let fields: ModalFields;

    if (selectedLeadId) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      if (!lead) return;
      const cat = categories.find((c) => c.type === (lead.leadType ?? ""));
      const integrityLabel =
        cat?.integrityLabel ?? "Indexed Universal Life [IUL] Facebook (Realtime Lead)";
      fields = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email ?? "",
        phone_1: lead.phone ?? "",
        state: lead.state,
        dob_mmddyyyy_thom: formatDob(lead.dob),
        lead_type_thom: integrityLabel,
        trustedform_cert_url: lead.trustedformCertUrl ?? "",
        has_iul_thom: lead.haveIul ?? "",
        primary_goal_thom: lead.primaryGoal ?? "",
        vendor_lead_id_thom: lead.externalId ?? lead.id,
      };
    } else {
      fields = { ...HARDCODED_DEFAULTS };
      if (flow === "storefront") {
        fields.lead_type_thom = "Indexed Universal Life [IUL] Facebook (Realtime Lead)";
      }
    }

    setModal({ open: true, flow, fields });
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
        body: JSON.stringify({ flow: modal.flow, manualPayload: modal.fields }),
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

  return (
    <>
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Connection test</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fires an <code className="font-mono bg-slate-100 px-1 rounded">is_test=yes</code> payload
            at the selected flow. Nothing is saved to the database or routed to an agent.
          </p>
        </div>

        {/* Lead picker */}
        <div className="space-y-2">
          <label className="form-label">Payload</label>
          <select
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
            className="form-select text-sm"
          >
            <option value="">Use test payload (Mike Jones)</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.firstName} {l.lastName} — {l.leadType ?? "unknown"} · {l.state} ·{" "}
                {formatDateTime(l.receivedAt)}
              </option>
            ))}
          </select>
          {selectedLead && (
            <div className="flex gap-3 mt-1">
              <Pill ok={!!selectedLead.trustedformCertUrl} label="TrustedForm cert" />
              <Pill ok={!!selectedLead.dob} label="Date of birth" />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button type="button" onClick={() => openModal("realtime")} className="btn-primary btn-sm">
            Test RealTime flow
          </button>
          <button
            type="button"
            onClick={() => openModal("storefront")}
            className="btn-sm border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium"
          >
            Test Storefront flow
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg border p-4 space-y-2 ${isSuccess ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${isSuccess ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {isSuccess ? "✓ Success" : "✗ Failed"}
              </span>
              <span className="text-xs text-slate-500">{result.flow} · HTTP {result.httpStatus}</span>
            </div>
            <pre className="text-xs font-mono text-slate-700 bg-white/70 rounded p-3 overflow-x-auto whitespace-pre-wrap">
              {result.error ?? JSON.stringify(result.response, null, 2)}
            </pre>
            {result.payload && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">View payload sent</summary>
                <pre className="mt-2 font-mono text-slate-700 bg-white/70 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(result.payload, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {modal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Review payload</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Flow: <span className="font-medium capitalize">{modal.flow}</span> · Edit any field then send
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {(["first_name", "last_name", "email", "phone_1", "state", "dob_mmddyyyy_thom", "has_iul_thom", "primary_goal_thom", "vendor_lead_id_thom"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="form-label">{key}</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      value={modal.fields[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Lead type full-width */}
              <div className="space-y-1">
                <label className="form-label">lead_type_thom</label>
                <select
                  className="form-select text-sm"
                  value={modal.fields.lead_type_thom ?? ""}
                  onChange={(e) => setField("lead_type_thom", e.target.value)}
                >
                  <option value="">— select —</option>
                  {LEAD_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* TrustedForm cert — full width, prominent */}
              <div className="space-y-1">
                <label className="form-label">
                  trustedform_cert_url
                  {!modal.fields.trustedform_cert_url && (
                    <span className="ml-2 text-amber-600 font-normal">⚠ paste a fresh cert URL here</span>
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
              <button type="button" onClick={() => setModal(null)} className="btn-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-4 py-1.5 text-sm">
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}
