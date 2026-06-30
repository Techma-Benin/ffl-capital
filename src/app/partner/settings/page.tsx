import { getCurrentPartner } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { US_STATE_CODES } from "@/lib/constants/us-states";
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

export default async function PartnerSettingsPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  const selected = new Set(partner.filterStates);
  const selectedCount = selected.size;
  const isEligible = selectedCount >= 15;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your lead targeting and delivery preferences"
      />

      {/* Lead type & delivery */}
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

      {/* CRM Webhook */}
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
              defaultValue={partner.crmWebhookUrl ?? ""}
              placeholder="https://rest.gohighlevel.com/v1/contacts/"
            />
            <button className="btn-secondary whitespace-nowrap">Save</button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            We&apos;ll POST lead data (JSON) to this URL on each delivery. Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
          </p>
        </div>
      </div>

      {/* Target States editor */}
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
            Currently {selectedCount < 15 ? `${15 - selectedCount} more needed` : "eligible"}.
          </div>
        )}

        {/* Quick select buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm">Select All</button>
          <button className="btn-secondary btn-sm">Clear All</button>
          <button className="btn-secondary btn-sm">Select Top 20</button>
          <button className="btn-secondary btn-sm">Select Southeast</button>
          <button className="btn-secondary btn-sm">Select Northeast</button>
          <button className="btn-secondary btn-sm">Select Midwest</button>
          <button className="btn-secondary btn-sm">Select West</button>
        </div>

        {/* States grid */}
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
          {US_STATE_CODES.map((code) => {
            const isSelected = selected.has(code);
            return (
              <button
                key={code}
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

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Changes to your target states take effect immediately for future lead matching.
          </p>
          <button className="btn-primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
