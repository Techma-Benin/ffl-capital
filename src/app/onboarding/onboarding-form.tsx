"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { clsx } from "clsx";
import { US_STATE_CODES, US_REGION_STATES } from "@/lib/constants/us-states";
import type { FilterCriteria } from "@/lib/matching/types";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import type { LeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import { FilterSetEditorAdvancedFields } from "@/components/filter-sets/advanced-filters-fields";
import { StateChipGrid } from "@/components/filter-sets/state-chip-grid";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WarningCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Funnel,
  Users,
  X,
  ICON_WEIGHT_LINEAR,
  ICON_WEIGHT_BOLD,
} from "@/lib/icons/client";
import {
  formatEasternHourForTimeZone,
  useClientTimeZone,
} from "@/lib/client-time-zone";
import { OnboardingSuccessModal } from "./onboarding-success-modal";

const MIN_FILTER_STATES = 15;
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  traditional_iul: "Traditional IUL",
  high_intent_iul: "High Intent IUL",
};

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
  leadType: LeadType;
  filterStates: string[];
  filterCriteria?: FilterCriteria;
};

type InitialProfile = Partial<ProfileFields> & { email?: string };

type Props = {
  initialProfile?: InitialProfile;
  criteriaOptions: LeadFilterCriteriaOptions;
  step: 1 | 2 | 3;
  onStepChange: (step: 1 | 2 | 3) => void;
};

function SectionCard({
  icon,
  iconClassName,
  title,
  meta,
  action,
  children,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-visible rounded-xl border border-slate-200/80 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <span
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            iconClassName,
          )}
          aria-hidden
        >
          {icon}
        </span>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {meta}
        <span className="min-w-2 flex-1" />
        {action}
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

function FilterSetSetupSkeleton() {
  return (
    <SectionCard
      icon={<Funnel size={17} weight={ICON_WEIGHT_LINEAR} />}
      iconClassName="bg-brand-50 text-brand-700"
      title="Set up your filter set"
    >
      <div
        className="space-y-3"
        aria-busy="true"
        aria-label="Loading filter set templates"
      >
        <Skeleton className="h-3 w-36" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>
    </SectionCard>
  );
}

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
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        "rounded-xl border-2 p-4 text-left transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={clsx(
            "text-sm font-bold",
            selected ? "text-brand-700" : "text-slate-900",
          )}
        >
          {template.name}
        </span>
        {selected && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600">
            <Check
              size={11}
              weight={ICON_WEIGHT_BOLD}
              className="text-white"
              aria-hidden
            />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
          {LEAD_TYPE_LABELS[template.leadType]}
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          {template.filterStates.length} states
        </span>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="shrink-0 text-xs font-semibold text-slate-400">{label}</dt>
      <dd className="text-right text-xs font-bold leading-5 text-slate-700">
        {value}
      </dd>
    </div>
  );
}

function hasCriteria(criteria: FilterCriteria) {
  return Boolean(
    criteria.intent?.length ||
      criteria.haveIul?.length ||
      criteria.ageMin !== undefined ||
      criteria.ageMax !== undefined ||
      criteria.acceptDays?.length ||
      criteria.acceptHoursStart !== undefined ||
      criteria.acceptHoursEnd !== undefined,
  );
}

export default function OnboardingForm({
  initialProfile,
  criteriaOptions,
  step,
  onStepChange,
}: Props) {
  const router = useRouter();
  const { user } = useUser();
  const clientTime = useClientTimeZone();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>({
    firstName: initialProfile?.firstName ?? "",
    lastName: initialProfile?.lastName ?? "",
    affiliation: initialProfile?.affiliation ?? "",
    residenceState: initialProfile?.residenceState ?? "",
  });
  const accountEmail = initialProfile?.email ?? "";

  const [leadType, setLeadType] = useState<LeadTypeSelection>("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});
  const [templates, setTemplates] = useState<FilterSetTemplate[] | null>(null);

  useEffect(() => {
    if (!user) return;
    setProfile((previous) => ({
      ...previous,
      firstName: previous.firstName || user.firstName || "",
      lastName: previous.lastName || user.lastName || "",
    }));
  }, [user]);

  useEffect(() => {
    if (step !== 2 || templates !== null) return;
    const controller = new AbortController();
    fetch("/api/onboarding/filter-set-templates", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((caughtError) => {
        if (caughtError instanceof Error && caughtError.name === "AbortError") {
          return;
        }
        setTemplates([]);
      });
    return () => controller.abort();
  }, [step, templates]);

  function continueToFilterSet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const next = {
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      affiliation: profile.affiliation.trim(),
      residenceState: profile.residenceState,
    };
    if (
      !next.firstName ||
      !next.lastName ||
      !next.affiliation ||
      !next.residenceState
    ) {
      setError("Please fill in all profile fields before continuing.");
      return;
    }
    setProfile(next);
    onStepChange(2);
  }

  function selectTemplate(template: FilterSetTemplate) {
    if (selectedTemplateId === template.id) {
      setSelectedTemplateId(null);
      return;
    }
    setSelectedTemplateId(template.id);
    setLeadType(template.leadType);
    setSelectedStates([...template.filterStates]);
    if (template.filterCriteria) {
      setFilterCriteria(stripAttributionCriteria(template.filterCriteria));
    }
  }

  function clearTemplate() {
    setSelectedTemplateId(null);
  }

  function clearTemplateForCustomEdit() {
    if (selectedTemplateId) setSelectedTemplateId(null);
  }

  function toggleState(code: string) {
    setSelectedStates((previous) =>
      previous.includes(code)
        ? previous.filter((state) => state !== code)
        : [...previous, code],
    );
    clearTemplateForCustomEdit();
  }

  function selectStates(states: readonly string[]) {
    setSelectedStates([...states]);
    clearTemplateForCustomEdit();
  }

  function toggleRegion(states: readonly string[]) {
    setSelectedStates((previous) => {
      const allSelected = states.every((state) => previous.includes(state));
      return allSelected
        ? previous.filter((state) => !states.includes(state))
        : Array.from(new Set([...previous, ...states]));
    });
    clearTemplateForCustomEdit();
  }

  function continueToAdvancedFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!leadType) {
      setError("Please select a lead type before continuing.");
      return;
    }
    if (selectedStates.length < MIN_FILTER_STATES) {
      setError(`Please select at least ${MIN_FILTER_STATES} target states.`);
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
    if (selectedStates.length < MIN_FILTER_STATES) {
      setError(`Please select at least ${MIN_FILTER_STATES} target states.`);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/partners/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          leadType,
          filterStates: selectedStates,
          filterCriteria: stripAttributionCriteria(filterCriteria),
          ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Onboarding failed");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    profile,
    leadType,
    selectedStates,
    filterCriteria,
    selectedTemplateId,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitOnboarding();
  }

  function formSubmitHandler(event: React.FormEvent<HTMLFormElement>) {
    if (step === 1) return continueToFilterSet(event);
    if (step === 2) return continueToAdvancedFilters(event);
    return handleSubmit(event);
  }

  function goToDashboard() {
    setNavigating(true);
    router.push("/partner");
  }

  const isEligible = selectedStates.length >= MIN_FILTER_STATES;
  const templatesLoading = step === 2 && templates === null;
  const criteriaConfigured = hasCriteria(filterCriteria);
  const fullName =
    `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim() || "—";
  const leadTypeLabel = leadType ? LEAD_TYPE_LABELS[leadType] : "—";

  const intentLabels = (filterCriteria.intent ?? []).map(
    (value) =>
      criteriaOptions.intent.find((option) => option.value === value)?.label ??
      value,
  );
  const haveIulLabels = (filterCriteria.haveIul ?? []).map(
    (value) =>
      criteriaOptions.haveIul.find((option) => option.value === value)?.label ??
      value,
  );
  const profileParts: string[] = [];
  if (intentLabels.length) profileParts.push(`${intentLabels.join("/")} intent`);
  if (haveIulLabels.length) {
    profileParts.push(`Have IUL: ${haveIulLabels.join("/")}`);
  }
  if (
    filterCriteria.ageMin !== undefined &&
    filterCriteria.ageMax !== undefined
  ) {
    profileParts.push(
      `Ages ${filterCriteria.ageMin}–${filterCriteria.ageMax}`,
    );
  } else if (filterCriteria.ageMin !== undefined) {
    profileParts.push(`Age ${filterCriteria.ageMin}+`);
  } else if (filterCriteria.ageMax !== undefined) {
    profileParts.push(`Up to age ${filterCriteria.ageMax}`);
  }

  const selectedDays = filterCriteria.acceptDays ?? [];
  const weekdaysOnly =
    selectedDays.length === WEEKDAYS.length &&
    WEEKDAYS.every((day) => selectedDays.includes(day));
  const dayText =
    selectedDays.length === 0 || selectedDays.length === 7
      ? "Any day"
      : weekdaysOnly
        ? "Weekdays"
        : `${selectedDays.length} selected days`;
  const startHour = filterCriteria.acceptHoursStart;
  const endHour = filterCriteria.acceptHoursEnd;
  const localHour = (hour: number) =>
    formatEasternHourForTimeZone(hour, clientTime.timeZone);
  const hourText =
    startHour !== undefined && endHour !== undefined
      ? `${localHour(startHour)}–${localHour(endHour)}`
      : startHour !== undefined
        ? `From ${localHour(startHour)}`
        : endHour !== undefined
          ? `Until ${localHour(endHour)}`
          : "Any hour";
  const scheduleText =
    hourText === "Any hour"
      ? `${dayText} · ${hourText}`
      : `${dayText} · ${hourText} · ${clientTime.displayName}`;

  let panelSentence =
    "Complete your details so we can create and review your partner account.";
  if (step === 2) {
    panelSentence = isEligible
      ? `Receive ${leadTypeLabel} leads from ${selectedStates.length} selected states.`
      : `Select ${
          MIN_FILTER_STATES - selectedStates.length
        } more state${
          MIN_FILTER_STATES - selectedStates.length === 1 ? "" : "s"
        } to make your filter set eligible.`;
  } else if (step === 3) {
    panelSentence = `Receive ${leadTypeLabel} leads from ${
      selectedStates.length
    } states, on ${dayText.toLowerCase()} ${hourText.toLowerCase()}.`;
  }

  const regionButtons = [
    ["Southeast", US_REGION_STATES.southeast],
    ["Northeast", US_REGION_STATES.northeast],
    ["Midwest", US_REGION_STATES.midwest],
    ["West", US_REGION_STATES.west],
  ] as const;

  return (
    <>
      <form onSubmit={formSubmitHandler}>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            {step === 1 && (
              <SectionCard
                icon={<Users size={17} weight={ICON_WEIGHT_LINEAR} />}
                iconClassName="bg-brand-50 text-brand-700"
                title="Your details"
              >
                <div className="space-y-4">
                  {accountEmail && (
                    <div>
                      <label className="form-label" htmlFor="onboarding-email">
                        Account email
                      </label>
                      <input
                        id="onboarding-email"
                        type="email"
                        readOnly
                        className="form-input bg-slate-50 text-slate-600"
                        value={accountEmail}
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        From your sign-up — used for lead delivery and account
                        notifications.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className="form-label"
                        htmlFor="onboarding-first-name"
                      >
                        First name
                      </label>
                      <input
                        id="onboarding-first-name"
                        required
                        className="form-input"
                        placeholder="James"
                        value={profile.firstName}
                        onChange={(event) =>
                          setProfile((previous) => ({
                            ...previous,
                            firstName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label
                        className="form-label"
                        htmlFor="onboarding-last-name"
                      >
                        Last name
                      </label>
                      <input
                        id="onboarding-last-name"
                        required
                        className="form-input"
                        placeholder="Wilson"
                        value={profile.lastName}
                        onChange={(event) =>
                          setProfile((previous) => ({
                            ...previous,
                            lastName: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className="form-label"
                      htmlFor="onboarding-affiliation"
                    >
                      Company / affiliation
                    </label>
                    <input
                      id="onboarding-affiliation"
                      required
                      className="form-input"
                      placeholder="e.g. Family First Life"
                      value={profile.affiliation}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          affiliation: event.target.value,
                        }))
                      }
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      The agency or company you work with.
                    </p>
                  </div>
                  <div>
                    <label
                      className="form-label"
                      htmlFor="onboarding-residence-state"
                    >
                      Residence state
                    </label>
                    <select
                      id="onboarding-residence-state"
                      required
                      className="form-select"
                      value={profile.residenceState}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          residenceState: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select state…</option>
                      {US_STATE_CODES.map((state) => (
                        <option key={state} value={state}>
                          {US_STATE_NAMES[state]} ({state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionCard>
            )}

            {step === 2 && templatesLoading && <FilterSetSetupSkeleton />}

            {step === 2 && !templatesLoading && (
              <>
                <SectionCard
                  icon={<Funnel size={17} weight={ICON_WEIGHT_LINEAR} />}
                  iconClassName="bg-brand-50 text-brand-700"
                  title="Set up your filter set"
                  meta={
                    <span className="text-[11px] font-semibold text-slate-400">
                      Choose a template or configure your own
                    </span>
                  }
                >
                  <div className="space-y-4">
                    {templates && templates.length > 0 && (
                      <div>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Start from a template
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {templates.map((template) => (
                            <TemplateCard
                              key={template.id}
                              template={template}
                              selected={selectedTemplateId === template.id}
                              onClick={() => selectTemplate(template)}
                            />
                          ))}
                        </div>
                        {selectedTemplateId && (
                          <button
                            type="button"
                            onClick={clearTemplate}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                          >
                            <X size={12} weight={ICON_WEIGHT_LINEAR} />
                            Clear template selection
                          </button>
                        )}
                      </div>
                    )}
                    <div className="max-w-sm">
                      <label
                        className="form-label"
                        htmlFor="onboarding-lead-type"
                      >
                        Lead type
                      </label>
                      <select
                        id="onboarding-lead-type"
                        className="form-select"
                        value={leadType}
                        onChange={(event) => {
                          setLeadType(
                            event.target.value as LeadTypeSelection,
                          );
                          clearTemplateForCustomEdit();
                        }}
                      >
                        <option value="">Select lead type…</option>
                        <option value="high_intent_iul">
                          High Intent IUL
                        </option>
                        <option value="traditional_iul">
                          Traditional IUL
                        </option>
                      </select>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={<MapPin size={17} weight={ICON_WEIGHT_LINEAR} />}
                  iconClassName="bg-blue-50 text-blue-600"
                  title="Target states"
                  meta={
                    <span className="text-[11px] font-bold text-slate-400">
                      {selectedStates.length} / {US_STATE_CODES.length} selected
                      · minimum {MIN_FILTER_STATES}
                    </span>
                  }
                  action={
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectStates(US_STATE_CODES)}
                        className="btn-secondary btn-sm"
                      >
                        All 50
                      </button>
                      <button
                        type="button"
                        onClick={() => selectStates([])}
                        className="btn-secondary btn-sm"
                      >
                        Clear
                      </button>
                      {regionButtons.map(([label, states]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleRegion(states)}
                          className="btn-secondary btn-sm"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <StateChipGrid
                    ariaLabel="Target states"
                    options={US_STATE_CODES.map((state) => ({
                      value: state,
                      label: state,
                    }))}
                    selected={selectedStates}
                    onToggle={toggleState}
                    variant="editor"
                  />
                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label="State eligibility progress"
                      aria-valuemin={0}
                      aria-valuemax={MIN_FILTER_STATES}
                      aria-valuenow={Math.min(
                        selectedStates.length,
                        MIN_FILTER_STATES,
                      )}
                    >
                      <span
                        className={clsx(
                          "block h-full rounded-full transition-[width,background-color]",
                          isEligible ? "bg-accent-500" : "bg-amber-400",
                        )}
                        style={{
                          width: `${Math.min(
                            100,
                            (selectedStates.length / MIN_FILTER_STATES) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span
                      className={clsx(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
                        isEligible
                          ? "bg-accent-50 text-accent-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {isEligible
                        ? "Eligible · minimum met"
                        : `${
                            MIN_FILTER_STATES - selectedStates.length
                          } more needed`}
                    </span>
                  </div>
                </SectionCard>
              </>
            )}

            {step === 3 && (
              <SectionCard
                icon={<Funnel size={17} weight={ICON_WEIGHT_LINEAR} />}
                iconClassName="bg-amber-50 text-amber-700"
                title="Lead profile & schedule"
                meta={
                  <span className="text-[11px] font-semibold text-slate-400">
                    Optional
                  </span>
                }
                action={
                  criteriaConfigured ? (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setFilterCriteria({})}
                    >
                      Reset
                    </button>
                  ) : undefined
                }
              >
                <FilterSetEditorAdvancedFields
                  criteria={filterCriteria}
                  criteriaOptions={criteriaOptions}
                  onChange={(criteria) =>
                    setFilterCriteria(stripAttributionCriteria(criteria))
                  }
                />
              </SectionCard>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-5">
            <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">
                  {step === 1
                    ? "Profile"
                    : step === 2
                      ? "Filter set"
                      : "Ready to finish"}
                </h2>
                <span className="flex-1" />
                {step === 1 ? (
                  <Badge variant="blue">In progress</Badge>
                ) : (
                  <Badge variant={isEligible ? "green" : "yellow"}>
                    {isEligible ? "Eligible" : "Not eligible"}
                  </Badge>
                )}
              </div>
              <p className="px-4 py-4 text-sm font-medium leading-6 text-slate-600">
                {panelSentence}
              </p>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <div className="border-b border-slate-100 px-4 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">Your setup</h2>
              </div>
              <dl className="px-4 pb-1">
                <SummaryRow label="Name" value={fullName} />
                <SummaryRow
                  label="Company"
                  value={profile.affiliation.trim() || "—"}
                />
                <SummaryRow
                  label="Residence"
                  value={
                    profile.residenceState
                      ? `${US_STATE_NAMES[profile.residenceState]} (${profile.residenceState})`
                      : "—"
                  }
                />
                <SummaryRow label="Lead type" value={leadTypeLabel} />
                <SummaryRow
                  label="States"
                  value={
                    selectedStates.length
                      ? `${selectedStates.length} of ${US_STATE_CODES.length}`
                      : "—"
                  }
                />
                <SummaryRow
                  label="Profile"
                  value={
                    profileParts.length ? profileParts.join(" · ") : "Any"
                  }
                />
                <SummaryRow label="Schedule" value={scheduleText} />
              </dl>
            </section>

            {step === 2 && !isEligible && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
                <WarningCircle size={17} className="mt-0.5 shrink-0" />
                <span>
                  Select {MIN_FILTER_STATES - selectedStates.length} more state
                  {MIN_FILTER_STATES - selectedStates.length === 1 ? "" : "s"}{" "}
                  to continue.
                </span>
              </div>
            )}

            {error && !loading && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700"
              >
                <WarningCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 py-3.5">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setError("");
                onStepChange(step === 3 ? 2 : 1);
              }}
              className="btn-secondary"
              disabled={loading || success}
            >
              <ArrowLeft size={15} weight={ICON_WEIGHT_LINEAR} aria-hidden />
              Back
            </button>
          )}
          <span className="min-w-2 flex-1" />
          {step === 3 && (
            <button
              type="button"
              onClick={submitOnboarding}
              className="btn-secondary"
              disabled={loading || success}
            >
              Skip & finish
            </button>
          )}
          <ActionButton
            type="submit"
            disabled={
              loading ||
              success ||
              (step === 2 && (!isEligible || !leadType))
            }
            loading={step === 3 && loading}
            success={step === 3 && success}
            loadingText="Setting up your account…"
            successText="Welcome aboard!"
            icon={
              step === 3 ? (
                <Check size={15} />
              ) : (
                <ArrowRight size={15} weight={ICON_WEIGHT_LINEAR} />
              )
            }
            slideIconOnHover={step !== 3}
          >
            {step === 1
              ? "Continue — Set up filter set"
              : step === 2
                ? "Continue — Lead filters"
                : "Complete onboarding"}
          </ActionButton>
        </div>
      </form>

      <OnboardingSuccessModal
        open={success}
        onGoToDashboard={goToDashboard}
        loading={navigating}
      />
    </>
  );
}
