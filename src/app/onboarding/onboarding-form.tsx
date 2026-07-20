"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { US_STATE_CODES, US_REGION_STATES } from "@/lib/constants/us-states";
import { ActionButton } from "@/components/ui/action-button";
import { StatusStrip } from "@/components/ui/status-strip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WarningCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Funnel,
  X,
} from "@phosphor-icons/react";
import { OnboardingSuccessModal } from "./onboarding-success-modal";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const LEAD_TYPE_LABELS: Record<string, string> = {
  traditional_iul: "Traditional IUL",
  high_intent_iul: "High Intent IUL",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProfileFields = {
  firstName: string;
  lastName: string;
  affiliation: string;
  residenceState: string;
};

type LeadType = "traditional_iul" | "high_intent_iul";
type LeadTypeSelection = LeadType | "";

type FilterSetTemplate = {
  id: string;
  name: string;
  description: string | null;
  leadType: LeadType;
  filterStates: string[];
};

type InitialProfile = Partial<ProfileFields> & { email?: string };

export type OnboardingSkipControl = {
  visible: boolean;
  disabled: boolean;
  onSkip: () => void;
};

type Props = {
  initialProfile?: InitialProfile;
  step: 1 | 2 | 3;
  onStepChange: (step: 1 | 2 | 3) => void;
  onSkipControlChange?: (control: OnboardingSkipControl) => void;
};

// ---------------------------------------------------------------------------
// Tag input
// ---------------------------------------------------------------------------

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function commit() {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="flex flex-wrap gap-1 rounded-md border border-slate-300 bg-white p-1.5 min-h-[36px]">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-700"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-brand-900"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[100px] text-xs outline-none bg-transparent"
          value={input}
          placeholder={values.length === 0 ? (placeholder ?? "Type and press Enter") : ""}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advanced Filters (step 3)
// ---------------------------------------------------------------------------

function AdvancedFiltersFields({
  criteria,
  onChange,
}: {
  criteria: FilterCriteria;
  onChange: (c: FilterCriteria) => void;
}) {
  function update(patch: Partial<FilterCriteria>) {
    onChange({ ...criteria, ...patch });
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lead Profile</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TagInput label="Intent (allow-list)" values={criteria.intent ?? []} onChange={(v) => update({ intent: v })} placeholder="e.g. buy_now" />
        <TagInput label="Have IUL (allow-list)" values={criteria.haveIul ?? []} onChange={(v) => update({ haveIul: v })} placeholder="e.g. yes" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="form-label">Age Min</label>
          <input type="number" min={0} max={120} placeholder="No min" className="form-input" value={criteria.ageMin ?? ""} onChange={(e) => update({ ageMin: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div>
          <label className="form-label">Age Max</label>
          <input type="number" min={0} max={120} placeholder="No max" className="form-input" value={criteria.ageMax ?? ""} onChange={(e) => update({ ageMax: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1">Attribution</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TagInput label="Source (allow-list)" values={criteria.source ?? []} onChange={(v) => update({ source: v })} placeholder="e.g. meta_leadconduit" />
        <TagInput label="Source (block-list)" values={criteria.excludeSource ?? []} onChange={(v) => update({ excludeSource: v })} />
        <TagInput label="Sub ID (allow-list)" values={criteria.subId ?? []} onChange={(v) => update({ subId: v })} />
        <TagInput label="Sub ID (block-list)" values={criteria.excludeSubId ?? []} onChange={(v) => update({ excludeSubId: v })} />
        <TagInput label="Pub ID (allow-list)" values={criteria.pubId ?? []} onChange={(v) => update({ pubId: v })} />
        <TagInput label="Pub ID (block-list)" values={criteria.excludePubId ?? []} onChange={(v) => update({ excludePubId: v })} />
        <TagInput label="Boberdoo Lead Type (allow-list)" values={criteria.boberdooLeadType ?? []} onChange={(v) => update({ boberdooLeadType: v })} />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1">Schedule (Eastern Time)</p>
      <div>
        <label className="form-label">Days you accept leads</label>
        <div className="flex flex-wrap gap-3 mt-1">
          {(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const).map((day) => (
            <label key={day} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={(criteria.acceptDays ?? []).includes(day)} onChange={(e) => { const days = criteria.acceptDays ?? []; update({ acceptDays: e.target.checked ? [...days, day] : days.filter((d) => d !== day) }); }} className="rounded border-slate-300" />
              {day.charAt(0).toUpperCase() + day.slice(1, 3)}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-400">Leave all unchecked to accept any day</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="form-label">From hour (ET, 0–23)</label>
          <input type="number" min={0} max={23} placeholder="No start" className="form-input" value={criteria.acceptHoursStart ?? ""} onChange={(e) => update({ acceptHoursStart: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div>
          <label className="form-label">To hour (ET, 0–23, exclusive)</label>
          <input type="number" min={0} max={23} placeholder="No end" className="form-input" value={criteria.acceptHoursEnd ?? ""} onChange={(e) => update({ acceptHoursEnd: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter set setup skeleton (header + template grid)
// ---------------------------------------------------------------------------

function FilterSetSetupSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading filter set templates">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-36" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-[88px] rounded-xl" />
        <Skeleton className="h-[88px] rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  selected,
  onClick,
}: {
  template: FilterSetTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 transition-all ${
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`text-sm font-semibold ${selected ? "text-brand-700" : "text-slate-900"}`}>
          {template.name}
        </span>
        {selected && (
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
            <Check size={11} weight="bold" className="text-white" />
          </span>
        )}
      </div>
      {template.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{template.description}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
          {LEAD_TYPE_LABELS[template.leadType]}
        </span>
        <span className="text-[11px] text-slate-400">{template.filterStates.length} states</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export default function OnboardingForm({
  initialProfile,
  step,
  onStepChange,
  onSkipControlChange,
}: Props) {
  const router = useRouter();
  const { user } = useUser();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Step 1 — profile
  const [profile, setProfile] = useState<ProfileFields>({
    firstName: initialProfile?.firstName ?? "",
    lastName: initialProfile?.lastName ?? "",
    affiliation: initialProfile?.affiliation ?? "",
    residenceState: initialProfile?.residenceState ?? "",
  });
  const accountEmail = initialProfile?.email ?? "";

  // Step 2 — filter set
  const [leadType, setLeadType] = useState<LeadTypeSelection>("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  // Templates
  const [templates, setTemplates] = useState<FilterSetTemplate[] | null>(null);

  // Back-fill first/last name from live Clerk session
  useEffect(() => {
    if (!user) return;
    setProfile((prev) => ({
      ...prev,
      firstName: prev.firstName || user.firstName || "",
      lastName: prev.lastName || user.lastName || "",
    }));
  }, [user]);

  // Fetch templates when entering step 2
  useEffect(() => {
    if (step !== 2 || templates !== null) return;
    const controller = new AbortController();
    fetch("/api/onboarding/filter-set-templates", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setTemplates([]); // fail silently — templates optional
      });
    return () => controller.abort();
  }, [step, templates]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function continueToFilterSet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const next: ProfileFields = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      affiliation: String(form.get("affiliation") ?? "").trim(),
      residenceState: String(form.get("residenceState") ?? ""),
    };
    if (!next.firstName || !next.lastName || !next.affiliation || !next.residenceState) {
      setError("Please fill in all profile fields before continuing.");
      return;
    }
    setProfile(next);
    onStepChange(2);
  }

  function selectTemplate(template: FilterSetTemplate) {
    if (selectedTemplateId === template.id) {
      // deselect
      setSelectedTemplateId(null);
    } else {
      setSelectedTemplateId(template.id);
      setLeadType(template.leadType);
      setSelectedStates([...template.filterStates]);
    }
  }

  function clearTemplate() {
    setSelectedTemplateId(null);
  }

  function toggleState(code: string) {
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
    if (selectedTemplateId) setSelectedTemplateId(null); // custom edit breaks template link
  }

  function selectAll(states: readonly string[]) {
    setSelectedStates([...states]);
    if (selectedTemplateId) setSelectedTemplateId(null);
  }

  function continueToAdvancedFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!leadType) {
      setError("Please select a lead type before continuing.");
      return;
    }
    if (selectedStates.length < 15) {
      setError("Please select at least 15 target states.");
      return;
    }
    onStepChange(3);
  }

  const submitOnboarding = useCallback(async () => {
    setError("");
    if (!leadType) {
      setError("Please select a lead type before continuing.");
      return;
    }
    if (selectedStates.length < 15) {
      setError("Please select at least 15 target states.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/partners/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          leadType,
          filterStates: selectedStates,
          filterCriteria,
          weeklyLimit: weeklyLimit ? Number(weeklyLimit) : null,
          monthlyLimit: monthlyLimit ? Number(monthlyLimit) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Onboarding failed");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Request failed. Please try again.");
      setLoading(false);
    }
  }, [
    profile,
    leadType,
    selectedStates,
    filterCriteria,
    weeklyLimit,
    monthlyLimit,
  ]);

  useEffect(() => {
    onSkipControlChange?.({
      visible: step === 3,
      disabled: loading || success,
      onSkip: submitOnboarding,
    });
  }, [step, loading, success, submitOnboarding, onSkipControlChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitOnboarding();
  }

  const isEligible = selectedStates.length >= 15;
  const templatesLoading = step === 2 && templates === null;
  const showFilterSetSetup = !templatesLoading && (templates?.length ?? 0) > 0;

  function goToDashboard() {
    router.push("/partner");
  }

  function formSubmitHandler(e: React.FormEvent<HTMLFormElement>) {
    if (step === 1) return continueToFilterSet(e);
    if (step === 2) return continueToAdvancedFilters(e);
    return handleSubmit(e);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
    <form onSubmit={formSubmitHandler}>
      {/* ================================================================ */}
      {/* Step 1 — Profile                                                  */}
      {/* ================================================================ */}
      {step === 1 && (
        <div className="space-y-4">
          {accountEmail && (
            <div>
              <label className="form-label">Account Email</label>
              <input
                type="email"
                readOnly
                className="form-input bg-slate-50 text-slate-600"
                value={accountEmail}
              />
              <p className="mt-1 text-xs text-slate-400">
                From your sign-up — used for lead delivery and account notifications
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">First Name</label>
              <input
                name="firstName"
                required
                className="form-input"
                placeholder="James"
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input
                name="lastName"
                required
                className="form-input"
                placeholder="Wilson"
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Company / Affiliation</label>
            <input
              name="affiliation"
              required
              className="form-input"
              placeholder="e.g. Family First Life"
              defaultValue={profile.affiliation}
            />
            <p className="mt-1 text-xs text-slate-400">The agency or company you work with</p>
          </div>

          <div>
            <label className="form-label">Residence State</label>
            <select
              name="residenceState"
              required
              className="form-select"
              defaultValue={profile.residenceState}
            >
              <option value="">Select state…</option>
              {US_STATE_CODES.map((s) => (
                <option key={s} value={s}>{US_STATE_NAMES[s]} ({s})</option>
              ))}
            </select>
          </div>

          {error && (
            <StatusStrip status="error" title="Could not save your profile" message={error} />
          )}

          <div className="pt-2">
            <ActionButton
              type="submit"
              className="w-full justify-center"
              icon={<ArrowRight size={15} />}
              slideIconOnHover
            >
              Continue — Set Up Filter Set
            </ActionButton>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Step 2 — Filter set setup                                         */}
      {/* ================================================================ */}
      {step === 2 && (
          <div className="space-y-5">

            {templatesLoading && <FilterSetSetupSkeleton />}

            {showFilterSetSetup && templates && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <Funnel size={14} className="text-brand-600" />
                      Set Up Your Filter Set
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose a template to start from, or configure your own
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${isEligible ? "text-emerald-600" : "text-amber-600"}`}>
                    {selectedStates.length} / 50 states
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Start from a template
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {templates.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        selected={selectedTemplateId === t.id}
                        onClick={() => selectTemplate(t)}
                      />
                    ))}
                  </div>
                  {selectedTemplateId && (
                    <button
                      type="button"
                      onClick={clearTemplate}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={12} /> Clear template selection
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Lead type */}
            <div>
              <label className="form-label">Lead Type</label>
              <select
                className="form-select"
                value={leadType}
                onChange={(e) => {
                  setLeadType(e.target.value as LeadTypeSelection);
                  if (selectedTemplateId) setSelectedTemplateId(null);
                }}
              >
                <option value="">Select lead type…</option>
                <option value="high_intent_iul">High Intent IUL</option>
                <option value="traditional_iul">Traditional IUL</option>
              </select>
            </div>

            {/* States */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <MapPin size={12} />
                  Target States
                  <span className="font-normal normal-case text-slate-400 ml-1">
                    — minimum 15 required
                  </span>
                </p>
              </div>

              {!isEligible && selectedStates.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <WarningCircle size={13} className="shrink-0" />
                  Select {15 - selectedStates.length} more state{15 - selectedStates.length !== 1 ? "s" : ""} to continue
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => selectAll(US_STATE_CODES)} className="btn-secondary btn-sm">All 50</button>
                <button type="button" onClick={() => selectAll([])} className="btn-secondary btn-sm">Clear</button>
                <button type="button" onClick={() => selectAll(US_REGION_STATES.southeast)} className="btn-secondary btn-sm">Southeast</button>
                <button type="button" onClick={() => selectAll(US_REGION_STATES.northeast)} className="btn-secondary btn-sm">Northeast</button>
                <button type="button" onClick={() => selectAll(US_REGION_STATES.midwest)} className="btn-secondary btn-sm">Midwest</button>
                <button type="button" onClick={() => selectAll(US_REGION_STATES.west)} className="btn-secondary btn-sm">West</button>
              </div>

              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
                {US_STATE_CODES.map((code) => {
                  const sel = selectedStates.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleState(code)}
                      title={US_STATE_NAMES[code]}
                      className={`relative flex flex-col items-center rounded-lg border-2 px-1.5 py-2 text-center transition-all ${
                        sel
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50/50"
                      }`}
                    >
                      <span className="text-xs font-bold">{code}</span>
                      {sel && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && !loading && (
              <StatusStrip status="error" title="Could not continue" message={error} />
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setError(""); onStepChange(1); }}
                className="btn-secondary"
                disabled={loading || success}
              >
                <ArrowLeft size={15} aria-hidden />
                Back
              </button>
              <ActionButton
                type="submit"
                className="flex-1 justify-center"
                disabled={!isEligible || !leadType}
                icon={<ArrowRight size={15} />}
                slideIconOnHover
              >
                Continue — Limits & filters (optional)
              </ActionButton>
            </div>
          </div>
      )}

      {/* ================================================================ */}
      {/* Step 3 — Volume limits & advanced filters (optional)                              */}
      {/* ================================================================ */}
      {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Funnel size={14} className="text-brand-600" />
                Volume limits &amp; advanced filters
                <span className="text-xs font-normal text-slate-400">(optional)</span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Weekly Limit <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="number"
                  min={1}
                  placeholder="No limit"
                  className="form-input"
                  value={weeklyLimit}
                  onChange={(e) => setWeeklyLimit(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">Max leads per 7 days</p>
              </div>
              <div>
                <label className="form-label">Monthly Limit <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="number"
                  min={1}
                  placeholder="No limit"
                  className="form-input"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">Max leads per 30 days</p>
              </div>
            </div>

            <AdvancedFiltersFields
              criteria={filterCriteria}
              onChange={setFilterCriteria}
            />

            {error && !loading && (
              <StatusStrip status="error" title="Onboarding failed" message={error} />
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setError(""); onStepChange(2); }}
                className="btn-secondary"
                disabled={loading || success}
              >
                <ArrowLeft size={15} aria-hidden />
                Back
              </button>
              <ActionButton
                type="submit"
                className="flex-1 min-w-[10rem] justify-center"
                loading={loading}
                success={success}
                loadingText="Setting up your account…"
                successText="Welcome aboard!"
                icon={<Check size={15} />}
              >
                Complete Onboarding
              </ActionButton>
            </div>
          </div>
      )}
    </form>
    <OnboardingSuccessModal open={success} onGoToDashboard={goToDashboard} />
    </>
  );
}
