"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LEAD_DELIVERY_SOURCE_FIELDS,
  parseTopLevelJsonKeys,
} from "@/lib/crm-outbound/source-fields";
import type { CrmOutboundConfigInput } from "@/lib/crm-outbound/schemas";
import { ActionButton } from "@/components/ui/action-button";

type AuthType = CrmOutboundConfigInput["authType"];

type WizardForm = {
  enabled: boolean;
  endpointUrl: string;
  authType: AuthType;
  bearerToken: string;
  apiHeaderName: string;
  apiHeaderValue: string;
  basicUsername: string;
  basicPassword: string;
  bodyFields: { key: string; value: string }[];
  fieldMappings: { source: string; target: string }[];
  require2xx: boolean;
  bodyContains: string;
  bodyRegex: string;
  bodyKeyEqualsKey: string;
  bodyKeyEqualsValue: string;
};

const defaultMapping = (): { source: string; target: string }[] => [
  { source: "firstName", target: "first_name" },
  { source: "lastName", target: "last_name" },
  { source: "email", target: "email" },
  { source: "phone", target: "phone" },
];

function emptyForm(): WizardForm {
  return {
    enabled: false,
    endpointUrl: "",
    authType: "none",
    bearerToken: "",
    apiHeaderName: "X-Api-Key",
    apiHeaderValue: "",
    basicUsername: "",
    basicPassword: "",
    bodyFields: [{ key: "sid", value: "" }, { key: "authToken", value: "" }],
    fieldMappings: defaultMapping(),
    require2xx: true,
    bodyContains: "",
    bodyRegex: "",
    bodyKeyEqualsKey: "",
    bodyKeyEqualsValue: "",
  };
}

function authConfigFromForm(form: WizardForm): Record<string, unknown> {
  switch (form.authType) {
    case "bearer":
      return { token: form.bearerToken };
    case "api_key_header":
      return {
        headerName: form.apiHeaderName,
        headerValue: form.apiHeaderValue,
      };
    case "basic":
      return { username: form.basicUsername, password: form.basicPassword };
    case "body_fields":
      return { fields: form.bodyFields.filter((f) => f.key.trim()) };
    default:
      return {};
  }
}

function formFromApi(data: CrmOutboundConfigInput & { updatedAt?: string }): WizardForm {
  const base = emptyForm();
  base.enabled = data.enabled;
  base.endpointUrl = data.endpointUrl;
  base.authType = data.authType;
  base.fieldMappings =
    data.fieldMappings.length > 0 ? data.fieldMappings : defaultMapping();

  const auth = (data.authConfig ?? {}) as Record<string, unknown>;
  if (data.authType === "bearer" && typeof auth.token === "string") {
    base.bearerToken = auth.token;
  }
  if (data.authType === "api_key_header") {
    if (typeof auth.headerName === "string") base.apiHeaderName = auth.headerName;
    if (typeof auth.headerValue === "string") base.apiHeaderValue = auth.headerValue;
  }
  if (data.authType === "basic") {
    if (typeof auth.username === "string") base.basicUsername = auth.username;
    if (typeof auth.password === "string") base.basicPassword = auth.password;
  }
  if (data.authType === "body_fields" && Array.isArray(auth.fields)) {
    base.bodyFields = auth.fields as { key: string; value: string }[];
  }

  const rule = data.successRule ?? { require2xx: true };
  base.require2xx = rule.require2xx !== false;
  base.bodyContains = rule.bodyContains ?? "";
  base.bodyRegex = rule.bodyRegex ?? "";
  base.bodyKeyEqualsKey = rule.bodyKeyEquals?.key ?? "";
  base.bodyKeyEqualsValue = rule.bodyKeyEquals?.value ?? "";

  return base;
}

function buildPayload(form: WizardForm): CrmOutboundConfigInput {
  const successRule: CrmOutboundConfigInput["successRule"] = {
    require2xx: form.require2xx,
  };
  if (form.bodyContains.trim()) successRule.bodyContains = form.bodyContains.trim();
  if (form.bodyRegex.trim()) successRule.bodyRegex = form.bodyRegex.trim();
  if (form.bodyKeyEqualsKey.trim()) {
    successRule.bodyKeyEquals = {
      key: form.bodyKeyEqualsKey.trim(),
      value: form.bodyKeyEqualsValue,
    };
  }

  return {
    enabled: form.enabled,
    endpointUrl: form.endpointUrl.trim(),
    httpMethod: "POST",
    authType: form.authType,
    authConfig: authConfigFromForm(form),
    fieldMappings: form.fieldMappings.filter(
      (m) => m.source.trim() && m.target.trim(),
    ),
    successRule,
  };
}

const STEPS = ["Endpoint", "Auth", "Mapping", "Success", "Test & save"] as const;

export function PartnerCrmOutboundWizard({
  sectionClass,
  showPageChrome = true,
}: {
  sectionClass: string;
  /** When false, page supplies title/back; wizard body only. */
  showPageChrome?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [configured, setConfigured] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const [sampleJson, setSampleJson] = useState("");

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partners/me/crm-outbound");
      if (res.status === 404) {
        setConfigured(false);
        setForm(emptyForm());
        return;
      }
      if (!res.ok) {
        setError("Could not load CRM settings");
        return;
      }
      const data = (await res.json()) as CrmOutboundConfigInput;
      setForm(formFromApi(data));
      setConfigured(true);
    } catch {
      setError("Could not load CRM settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const canSave = useMemo(() => {
    return (
      form.endpointUrl.trim().startsWith("http") &&
      form.fieldMappings.some((m) => m.source && m.target)
    );
  }, [form]);

  async function saveConfig() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const body = buildPayload(form);
      const res = await fetch("/api/partners/me/crm-outbound", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setConfigured(true);
      setForm(formFromApi(data));
      setSuccess("CRM outbound settings saved.");
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTestResult("");
    setError("");
    setTesting(true);
    try {
      if (canSave) {
        await saveConfig();
      }
      const res = await fetch("/api/partners/me/crm-outbound/test", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Test failed");
        return;
      }
      if (data.ok) {
        setTestResult(
          `Success — HTTP ${data.statusCode ?? "?"}${data.bodyPreview ? `: ${data.bodyPreview}` : ""}`,
        );
      } else {
        setTestResult(
          `Failed — ${data.error ?? "unknown"}${data.statusCode ? ` (HTTP ${data.statusCode})` : ""}`,
        );
      }
    } catch {
      setError("Test request failed");
    } finally {
      setTesting(false);
    }
  }

  async function deleteConfig() {
    if (!configured) return;
    if (!window.confirm("Remove CRM outbound configuration?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/partners/me/crm-outbound", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Delete failed");
        return;
      }
      setConfigured(false);
      setForm(emptyForm());
      setSuccess("CRM outbound configuration removed.");
    } catch {
      setError("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function importSampleKeys() {
    setError("");
    try {
      const keys = parseTopLevelJsonKeys(sampleJson);
      setForm((prev) => ({
        ...prev,
        fieldMappings: keys.map((target) => ({
          target,
          source: LEAD_DELIVERY_SOURCE_FIELDS.includes(
            target as (typeof LEAD_DELIVERY_SOURCE_FIELDS)[number],
          )
            ? target
            : "",
        })),
      }));
      setSuccess("Imported target keys from sample JSON.");
    } catch {
      setError("Invalid sample JSON — use a flat object with top-level keys only.");
    }
  }

  if (loading) {
    return (
      <section id="crm-outbound" className={`${sectionClass} p-6`}>
        <p className="text-sm text-slate-500">Loading CRM outbound settings…</p>
      </section>
    );
  }

  return (
    <section id="crm-outbound" className={`${sectionClass} p-6`}>
      {showPageChrome ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">CRM outbound (POST)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Optional JSON POST to your CRM on each lead delivery. Email delivery always runs
            separately.
          </p>
        </div>
      ) : null}

      <div className={`${showPageChrome ? "mb-6" : "mb-4"} flex flex-wrap gap-2`}>
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              step === i
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enable CRM POST on each delivery
          </label>
          <div>
            <label className="form-label">Endpoint URL</label>
            <input
              type="url"
              className="form-input max-w-3xl"
              value={form.endpointUrl}
              onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
              placeholder="https://your-crm.example.com/leads"
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div>
            <label className="form-label">Authentication</label>
            <select
              className="form-input max-w-md"
              value={form.authType}
              onChange={(e) =>
                setForm({ ...form, authType: e.target.value as AuthType })
              }
            >
              <option value="none">None</option>
              <option value="bearer">Bearer token</option>
              <option value="api_key_header">API key header</option>
              <option value="basic">Basic auth</option>
              <option value="body_fields">Body fields (e.g. SID + token)</option>
            </select>
          </div>
          {form.authType === "bearer" && (
            <input
              type="password"
              className="form-input max-w-xl"
              placeholder="Bearer token"
              value={form.bearerToken}
              onChange={(e) => setForm({ ...form, bearerToken: e.target.value })}
            />
          )}
          {form.authType === "api_key_header" && (
            <div className="flex flex-wrap gap-3">
              <input
                className="form-input"
                placeholder="Header name"
                value={form.apiHeaderName}
                onChange={(e) => setForm({ ...form, apiHeaderName: e.target.value })}
              />
              <input
                type="password"
                className="form-input min-w-[200px]"
                placeholder="Header value"
                value={form.apiHeaderValue}
                onChange={(e) => setForm({ ...form, apiHeaderValue: e.target.value })}
              />
            </div>
          )}
          {form.authType === "basic" && (
            <div className="flex flex-wrap gap-3">
              <input
                className="form-input"
                placeholder="Username"
                value={form.basicUsername}
                onChange={(e) => setForm({ ...form, basicUsername: e.target.value })}
              />
              <input
                type="password"
                className="form-input"
                placeholder="Password"
                value={form.basicPassword}
                onChange={(e) => setForm({ ...form, basicPassword: e.target.value })}
              />
            </div>
          )}
          {form.authType === "body_fields" && (
            <div className="space-y-2">
              {form.bodyFields.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="form-input w-40"
                    placeholder="Key"
                    value={row.key}
                    onChange={(e) => {
                      const bodyFields = [...form.bodyFields];
                      bodyFields[idx] = { ...row, key: e.target.value };
                      setForm({ ...form, bodyFields });
                    }}
                  />
                  <input
                    type="password"
                    className="form-input flex-1"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => {
                      const bodyFields = [...form.bodyFields];
                      bodyFields[idx] = { ...row, value: e.target.value };
                      setForm({ ...form, bodyFields });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-brand-600"
                onClick={() =>
                  setForm({
                    ...form,
                    bodyFields: [...form.bodyFields, { key: "", value: "" }],
                  })
                }
              >
                + Add field
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div>
            <label className="form-label">Import keys from sample JSON</label>
            <textarea
              className="form-input min-h-[80px] font-mono text-xs"
              placeholder='{"first_name":"","email":""}'
              value={sampleJson}
              onChange={(e) => setSampleJson(e.target.value)}
            />
            <button type="button" className="btn-secondary btn-sm mt-2" onClick={importSampleKeys}>
              Parse top-level keys
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2 pr-4">Source field</th>
                  <th className="pb-2">CRM JSON key</th>
                </tr>
              </thead>
              <tbody>
                {form.fieldMappings.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-4">
                      <select
                        className="form-input"
                        value={row.source}
                        onChange={(e) => {
                          const fieldMappings = [...form.fieldMappings];
                          fieldMappings[idx] = { ...row, source: e.target.value };
                          setForm({ ...form, fieldMappings });
                        }}
                      >
                        <option value="">—</option>
                        {LEAD_DELIVERY_SOURCE_FIELDS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <input
                        className="form-input"
                        value={row.target}
                        onChange={(e) => {
                          const fieldMappings = [...form.fieldMappings];
                          fieldMappings[idx] = { ...row, target: e.target.value };
                          setForm({ ...form, fieldMappings });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="text-xs text-brand-600"
            onClick={() =>
              setForm({
                ...form,
                fieldMappings: [...form.fieldMappings, { source: "", target: "" }],
              })
            }
          >
            + Add mapping row
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.require2xx}
              onChange={(e) => setForm({ ...form, require2xx: e.target.checked })}
            />
            Require HTTP 2xx
          </label>
          <div>
            <label className="form-label">Body contains (optional)</label>
            <input
              className="form-input max-w-xl"
              value={form.bodyContains}
              onChange={(e) => setForm({ ...form, bodyContains: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Body regex (optional)</label>
            <input
              className="form-input max-w-xl font-mono text-xs"
              value={form.bodyRegex}
              onChange={(e) => setForm({ ...form, bodyRegex: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              className="form-input"
              placeholder="Top-level JSON key"
              value={form.bodyKeyEqualsKey}
              onChange={(e) => setForm({ ...form, bodyKeyEqualsKey: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Expected value"
              value={form.bodyKeyEqualsValue}
              onChange={(e) => setForm({ ...form, bodyKeyEqualsValue: e.target.value })}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-600">
            Save your configuration, then send a synthetic test lead to your endpoint.
          </p>
          {testResult && (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-800">{testResult}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <ActionButton
              type="button"
              variant="primary"
              loading={saving}
              success={Boolean(success) && !testing}
              onClick={() => void saveConfig()}
              disabled={!canSave || saving}
            >
              Save
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              loading={testing}
              onClick={() => void runTest()}
              disabled={!canSave || testing}
            >
              Test connection
            </ActionButton>
            {configured && (
              <ActionButton
                type="button"
                variant="secondary"
                loading={deleting}
                onClick={() => void deleteConfig()}
                disabled={deleting}
              >
                Delete config
              </ActionButton>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      {success && step !== 4 && (
        <p className="mt-4 text-xs text-green-700">{success}</p>
      )}

      <div className="mt-6 flex justify-between border-t border-slate-100 pt-4">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={step >= STEPS.length - 1}
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        >
          Next
        </button>
      </div>
    </section>
  );
}
