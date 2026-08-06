"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusStrip } from "@/components/ui/status-strip";
import { usePartner } from "@/components/partner/partner-provider";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import { AlertCircle, Check, MapPin, Settings, Webhook } from "lucide-react";

const US_STATE_NAMES: Record<string, string> = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California",
  CO:"Colorado", CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia",
  HI:"Hawaii", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa",
  KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland",
  MA:"Massachusetts", MI:"Michigan", MN:"Minnesota", MS:"Mississippi", MO:"Missouri",
  MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire", NJ:"New Jersey",
  NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio",
  OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina",
  SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont",
  VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming",
};

function statesEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((code, i) => code === sortedB[i]);
}

export function PartnerSettingsView() {
  const { partner, patchPartner } = usePartner();

  const [selectedStates, setSelectedStates] = useState<string[]>(partner.filterStates);
  const [webhookUrl, setWebhookUrl] = useState(partner.crmWebhookUrl ?? "");

  const [statesSaving, setStatesSaving] = useState(false);
  const [statesSuccess, setStatesSuccess] = useState(false);
  const [statesError, setStatesError] = useState("");

  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState(false);
  const [webhookError, setWebhookError] = useState("");

  const selected = new Set(selectedStates);
  const selectedCount = selected.size;
  const isEligible = selectedCount >= 15;
  const statesDirty = !statesEqual(selectedStates, partner.filterStates);
  const webhookDirty = webhookUrl !== (partner.crmWebhookUrl ?? "");

  function toggleState(code: string) {
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
    setStatesSuccess(false);
    setStatesError("");
  }

  function selectStates(states: readonly string[]) {
    setSelectedStates([...states]);
    setStatesSuccess(false);
    setStatesError("");
  }

  async function saveStates() {
    setStatesError("");
    setStatesSuccess(false);

    if (selectedStates.length < 15) {
      setStatesError("Select at least 15 target states.");
      return;
    }

    setStatesSaving(true);
    try {
      const res = await fetch("/api/partners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filterStates: selectedStates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatesError(data.error ?? "Failed to save states");
        return;
      }
      patchPartner({ filterStates: data.filterStates });
      setStatesSuccess(true);
    } catch {
      setStatesError("Request failed. Please try again.");
    } finally {
      setStatesSaving(false);
    }
  }

  async function saveWebhook() {
    setWebhookError("");
    setWebhookSuccess(false);
    setWebhookSaving(true);

    try {
      const res = await fetch("/api/partners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmWebhookUrl: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWebhookError(data.error ?? "Failed to save webhook");
        return;
      }
      patchPartner({ crmWebhookUrl: data.crmWebhookUrl });
      setWebhookUrl(data.crmWebhookUrl ?? "");
      setWebhookSuccess(true);
    } catch {
      setWebhookError("Request failed. Please try again.");
    } finally {
      setWebhookSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your lead targeting and delivery preferences"
      />

      <div className="mb-5 card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Account Settings</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Lead Type</label>
            <select className="form-select" defaultValue={partner.leadType} disabled>
              <option value="traditional_iul">Traditional IUL</option>
              <option value="high_intent_iul">High Intent IUL</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">Contact admin to change lead type</p>
          </div>
          <div>
            <label className="form-label">Affiliation (Company)</label>
            <input
              className="form-input"
              defaultValue={partner.affiliation ?? ""}
              placeholder="e.g. Family First Life"
              disabled
            />
            <p className="mt-1 text-xs text-slate-400">Contact admin to update</p>
          </div>
        </div>
      </div>

      <div className="mb-5 card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Webhook size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">CRM Delivery Webhook</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
            Optional
          </span>
        </div>
        <div className="max-w-xl">
          <label className="form-label">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              className="form-input flex-1"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setWebhookSuccess(false);
                setWebhookError("");
              }}
              placeholder="https://rest.gohighlevel.com/v1/contacts/"
            />
            <ActionButton
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              loading={webhookSaving}
              loadingText="Saving…"
              success={webhookSuccess}
              successText="Saved"
              disabled={!webhookDirty}
              onClick={saveWebhook}
            >
              Save
            </ActionButton>
          </div>
          {webhookError && (
            <p className="mt-2 text-xs text-red-600">{webhookError}</p>
          )}
          <p className="mt-1.5 text-xs text-slate-400">
            We&apos;ll POST lead data (JSON) to this URL on each delivery. Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Target States</h2>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-semibold ${isEligible ? "text-emerald-600" : "text-amber-600"}`}
            >
              {selectedCount} / 50 selected
            </span>
            {!isEligible && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <AlertCircle size={11} />
                Min 15 required
              </span>
            )}
            {isEligible && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <Check size={11} />
                Eligible
              </span>
            )}
          </div>
        </div>

        {!isEligible && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            You need at least <strong>15 states</strong> selected to be eligible for lead matching.
            {selectedCount < 15
              ? ` ${15 - selectedCount} more needed.`
              : " Eligible once saved."}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => selectStates(US_STATE_CODES)} className="btn-secondary btn-sm">
            Select All
          </button>
          <button type="button" onClick={() => selectStates([])} className="btn-secondary btn-sm">
            Clear All
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.southeast)} className="btn-secondary btn-sm">
            Select Southeast
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.northeast)} className="btn-secondary btn-sm">
            Select Northeast
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.midwest)} className="btn-secondary btn-sm">
            Select Midwest
          </button>
          <button type="button" onClick={() => selectStates(US_REGION_STATES.west)} className="btn-secondary btn-sm">
            Select West
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
          {US_STATE_CODES.map((code) => {
            const isSelected = selected.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleState(code)}
                title={US_STATE_NAMES[code]}
                className={`group relative flex flex-col items-center rounded-lg border-2 px-2 py-2.5 text-center transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50/50"
                }`}
              >
                <span className="text-xs font-bold leading-none">{code}</span>
                <span className="mt-0.5 text-[9px] leading-none text-current opacity-60 truncate w-full text-center">
                  {US_STATE_NAMES[code]?.split(" ")[0]}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[8px] text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {statesError && (
          <div className="mt-4">
            <StatusStrip status="error" title="Could not save states" message={statesError} />
          </div>
        )}
        {statesSuccess && (
          <div className="mt-4">
            <StatusStrip
              status="success"
              title="Target states saved"
              message="Your selection is active for future lead matching."
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Changes to your target states take effect immediately for future lead matching.
          </p>
          <ActionButton
            type="button"
            loading={statesSaving}
            loadingText="Saving…"
            disabled={!statesDirty || !isEligible}
            onClick={saveStates}
          >
            Save Changes
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
