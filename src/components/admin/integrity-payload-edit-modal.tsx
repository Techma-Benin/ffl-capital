"use client";

import { buildLeadTypeThomOptions } from "@/lib/integrity/build-payload";

export type IntegrityPayloadFlow = "realtime" | "storefront";

export type IntegrityPayloadFields = Record<string, string>;

export type IntegrityPayloadCategory = {
  type: string;
  label?: string;
  integrityLabel: string | null;
  integrityLabelStorefront: string | null;
};

const EDITABLE_KEYS = [
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
] as const;

type IntegrityPayloadEditModalProps = {
  flow: IntegrityPayloadFlow;
  fields: IntegrityPayloadFields;
  categories: IntegrityPayloadCategory[];
  category: IntegrityPayloadCategory | null;
  pending?: boolean;
  sendLabel?: string;
  onFieldChange: (key: string, value: string) => void;
  onCancel: () => void;
  onSend: () => void;
};

export function IntegrityPayloadEditModal({
  flow,
  fields,
  categories,
  category,
  pending = false,
  sendLabel,
  onFieldChange,
  onCancel,
  onSend,
}: IntegrityPayloadEditModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Review payload</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Flow: <span className="font-medium capitalize">{flow}</span> · Edit any
              field then send
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {EDITABLE_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <label className="form-label">{key}</label>
                <input
                  type="text"
                  className="form-input text-sm"
                  value={fields[key] ?? ""}
                  onChange={(e) => onFieldChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="form-label">lead_type_thom</label>
            {category && (
              <p className="text-xs text-slate-500 mb-1">
                From category <span className="font-medium">{category.type}</span>
              </p>
            )}
            <select
              className="form-select text-sm"
              value={fields.lead_type_thom ?? ""}
              onChange={(e) => onFieldChange("lead_type_thom", e.target.value)}
            >
              <option value="">— not configured on category —</option>
              {buildLeadTypeThomOptions(flow, categories, category).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="form-label">
              trustedform_cert_url
              {!fields.trustedform_cert_url && (
                <span className="ml-2 text-amber-600 font-normal">
                  ⚠ paste a fresh cert URL here
                </span>
              )}
            </label>
            <input
              type="text"
              className="form-input text-sm font-mono"
              placeholder="https://cert.trustedform.com/…"
              value={fields.trustedform_cert_url ?? ""}
              onChange={(e) => onFieldChange("trustedform_cert_url", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="btn-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-4 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={pending}
            className="btn-primary btn-sm disabled:opacity-40"
          >
            {pending ? "Sending…" : (sendLabel ?? `Send to ${flow}`)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Convert a stored request payload into editable string fields. */
export function payloadRecordToFields(
  payload: Record<string, unknown> | null | undefined,
): IntegrityPayloadFields {
  if (!payload) return {};
  const fields: IntegrityPayloadFields = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "is_test" || key === "reference") continue;
    if (value == null) continue;
    fields[key] = String(value);
  }
  return fields;
}
