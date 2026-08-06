"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CopySimple,
  Warning,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { notify } from "@/lib/notify";
import {
  FilterSetForm,
  type CategoryOption,
  type FilterSetFormData,
  type FilterSetFormVariant,
} from "@/components/filter-sets/filter-set-form";
import {
  FilterSetTemplatePicker,
  type FilterSetTemplate,
} from "@/components/filter-sets/filter-set-template-picker";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";
import type { LeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import {
  formatEasternHourForTimeZone,
  useClientTimeZone,
} from "@/lib/client-time-zone";

export type FilterSetEditorPageProps = {
  mode: "create" | "edit";
  backHref: string;
  backLabel: string;
  subtitle?: string;
  filterSetId?: string;
  partnerId?: string;
  initial: FilterSetFormData;
  categories: CategoryOption[];
  criteriaOptions: LeadFilterCriteriaOptions;
  apiScope?: "admin" | "partner" | "template";
  variant?: FilterSetFormVariant;
  showTemplatePicker?: boolean;
  showSaveAsTemplate?: boolean;
  filterSetName?: string;
  filterSetActive?: boolean;
  initialTemplates?: FilterSetTemplate[];
};

const MIN_FILTER_STATES = 15;
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function buildFilterSetUrl(
  apiScope: "admin" | "partner" | "template",
  partnerId: string | undefined,
  filterSetId?: string,
) {
  if (apiScope === "template") {
    return filterSetId
      ? `/api/admin/filter-set-templates/${filterSetId}`
      : "/api/admin/filter-set-templates";
  }
  if (apiScope === "partner") {
    return filterSetId
      ? `/api/partners/filter-sets/${filterSetId}`
      : "/api/partners/filter-sets";
  }
  return filterSetId
    ? `/api/admin/partners/${partnerId}/filter-sets/${filterSetId}`
    : `/api/admin/partners/${partnerId}/filter-sets`;
}

function formVariantFromScope(
  apiScope: "admin" | "partner" | "template",
  variant?: FilterSetFormVariant,
): FilterSetFormVariant {
  if (variant) return variant;
  if (apiScope === "partner") return "partner";
  if (apiScope === "template") return "template";
  return "admin";
}

function optionLabels(
  values: string[] | undefined,
  options: Array<{ value: string; label: string }>,
) {
  return (values ?? []).map(
    (value) => options.find((option) => option.value === value)?.label ?? value,
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="shrink-0 text-xs font-semibold text-slate-400">{label}</dt>
      <dd className="text-right text-xs font-bold leading-5 text-slate-700">
        {value}
      </dd>
    </div>
  );
}

export function FilterSetEditorPage({
  mode,
  backHref,
  backLabel,
  subtitle,
  filterSetId,
  partnerId,
  initial,
  categories,
  criteriaOptions,
  apiScope = "admin",
  variant,
  showTemplatePicker = false,
  showSaveAsTemplate = false,
  filterSetName,
  initialTemplates,
}: FilterSetEditorPageProps) {
  const router = useRouter();
  const formId = useId();
  const [pickerOpen, setPickerOpen] = useState(
    mode === "create" && showTemplatePicker,
  );
  const [prefill, setPrefill] = useState<FilterSetFormData>(initial);
  const [sourceTemplateId, setSourceTemplateId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const clientTime = useClientTimeZone();

  const formVariant = formVariantFromScope(apiScope, variant);
  const showPricing = formVariant === "admin" || formVariant === "template";
  const showLimits = formVariant !== "partner";
  const isEligible = prefill.filterStates.length >= MIN_FILTER_STATES;
  const isDirty = JSON.stringify(prefill) !== JSON.stringify(initial);
  const title =
    apiScope === "template"
      ? mode === "edit"
        ? "Edit template"
        : "Create template"
      : mode === "edit"
        ? "Edit filter set"
        : "Create filter set";

  const summary = useMemo(() => {
    const criteria = prefill.filterCriteria;
    const leadType =
      categories.find((category) => category.type === prefill.leadType)?.label ??
      prefill.leadType;

    const profileParts: string[] = [];
    const intent = optionLabels(criteria.intent, criteriaOptions.intent);
    const haveIul = optionLabels(criteria.haveIul, criteriaOptions.haveIul);
    if (intent.length) profileParts.push(`${intent.join("/")} intent`);
    if (haveIul.length) profileParts.push(`Have IUL: ${haveIul.join("/")}`);
    if (criteria.ageMin !== undefined && criteria.ageMax !== undefined) {
      profileParts.push(`Ages ${criteria.ageMin}–${criteria.ageMax}`);
    } else if (criteria.ageMin !== undefined) {
      profileParts.push(`Age ${criteria.ageMin}+`);
    } else if (criteria.ageMax !== undefined) {
      profileParts.push(`Up to age ${criteria.ageMax}`);
    }

    const days = criteria.acceptDays ?? [];
    const weekdaysOnly =
      days.length === WEEKDAYS.length &&
      WEEKDAYS.every((day) => days.includes(day));
    const dayText =
      days.length === 0 || days.length === 7
        ? "Any day"
        : weekdaysOnly
          ? "Weekdays"
          : `${days.length} selected days`;

    const start = criteria.acceptHoursStart;
    const end = criteria.acceptHoursEnd;
    const localHour = (hour: number) =>
      formatEasternHourForTimeZone(hour, clientTime.timeZone);
    const hourText =
      start !== undefined && end !== undefined
        ? `${localHour(start)}–${localHour(end)}`
        : start !== undefined
          ? `From ${localHour(start)}`
          : end !== undefined
            ? `Until ${localHour(end)}`
            : "Any hour";
    const schedule =
      hourText === "Any hour"
        ? `${dayText} · ${hourText}`
        : `${dayText} · ${hourText} · ${clientTime.displayName}`;

    const capParts: string[] = [];
    if (showLimits && prefill.weeklyLimit) capParts.push(`${prefill.weeklyLimit}/wk`);
    if (showLimits && prefill.monthlyLimit) capParts.push(`${prefill.monthlyLimit}/mo`);

    const profile = profileParts.length ? profileParts.join(" · ") : "Any";
    const price = prefill.priceOverride
      ? `$${Number(prefill.priceOverride).toFixed(2)}`
      : "Default price";

    let matchingRule = `Send ${leadType} leads from ${prefill.filterStates.length} state${
      prefill.filterStates.length === 1 ? "" : "s"
    }`;
    if (profileParts.length) matchingRule += `, matching ${profileParts.join(" · ")}`;
    matchingRule += `, on ${dayText.toLowerCase()} ${hourText.toLowerCase()}`;
    if (hourText !== "Any hour") {
      matchingRule += ` in ${clientTime.displayName}`;
    }
    if (showLimits && capParts.length) matchingRule += `, capped at ${capParts.join(" and ")}`;
    if (showPricing) {
      matchingRule += `, at ${price.toLowerCase()} with priority ${prefill.priority}`;
    }
    matchingRule += ".";

    if (!isEligible) {
      matchingRule = `This set is not eligible yet — ${
        MIN_FILTER_STATES - prefill.filterStates.length
      } more state${
        MIN_FILTER_STATES - prefill.filterStates.length === 1 ? "" : "s"
      } needed before leads can be routed.`;
    }

    return {
      leadType,
      profile,
      schedule,
      caps: capParts.length ? capParts.join(" · ") : "No limit",
      price,
      matchingRule,
    };
  }, [
    categories,
    clientTime.displayName,
    clientTime.timeZone,
    criteriaOptions,
    isEligible,
    prefill,
    showLimits,
    showPricing,
  ]);

  function handleSaved() {
    notify.success("Filter set saved");
    router.push(backHref);
    router.refresh();
  }

  async function handleSaveAsTemplate() {
    setSavingTemplate(true);
    try {
      const response = await fetch("/api/admin/filter-set-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prefill.name.trim() || filterSetName || "Filter set",
          leadType: prefill.leadType,
          filterStates: prefill.filterStates,
          priority: prefill.priority,
          priceOverride: prefill.priceOverride
            ? Number(prefill.priceOverride)
            : null,
          active: prefill.active,
          weeklyLimit: prefill.weeklyLimit ? Number(prefill.weeklyLimit) : null,
          monthlyLimit: prefill.monthlyLimit
            ? Number(prefill.monthlyLimit)
            : null,
          filterCriteria: stripAttributionCriteria(prefill.filterCriteria),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        notify.error(data.error ?? "Failed to create template");
        return;
      }
      notify.success("Saved as template");
    } catch {
      notify.error("Request failed");
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        badge={
          mode === "edit" ? (
            <Badge variant={prefill.active ? "green" : "slate"}>
              {prefill.active ? "Active" : "Inactive"}
            </Badge>
          ) : undefined
        }
        action={
          <Link
            href={backHref}
            className="btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={16} weight={ICON_WEIGHT_LINEAR} />
            {backLabel}
          </Link>
        }
      />

      {showTemplatePicker && (
        <FilterSetTemplatePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialTemplates={initialTemplates}
          onSelect={(template) => {
            setSourceTemplateId(template.id);
            setPrefill((current) => ({
              ...current,
              name: template.name,
              leadType: template.leadType,
              filterStates: [...template.filterStates],
              weeklyLimit:
                showLimits && template.weeklyLimit != null
                  ? String(template.weeklyLimit)
                  : current.weeklyLimit,
              monthlyLimit:
                showLimits && template.monthlyLimit != null
                  ? String(template.monthlyLimit)
                  : current.monthlyLimit,
              filterCriteria: stripAttributionCriteria(
                template.filterCriteria ?? {},
              ),
              priority: template.priority ?? current.priority,
              priceOverride:
                template.priceOverride != null
                  ? String(template.priceOverride)
                  : current.priceOverride,
            }));
          }}
          onSkip={() => setSourceTemplateId(null)}
        />
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80">
        <>
            {showTemplatePicker && (
              <div className="flex items-center justify-end px-4 pt-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="btn-secondary btn-sm"
                >
                  Start from a template
                </button>
              </div>
            )}
            <div className="grid items-start gap-5 px-3 py-4 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <FilterSetForm
                key={sourceTemplateId ?? "blank"}
                formId={formId}
                hideButtons
                variant={formVariant}
                onPendingChange={setPending}
                filterSetId={filterSetId}
                partnerId={partnerId}
                initial={prefill}
                categories={categories}
                criteriaOptions={criteriaOptions}
                buildUrl={(id) => buildFilterSetUrl(apiScope, partnerId, id)}
                onCancel={() => router.push(backHref)}
                onSaved={handleSaved}
                onFormChange={setPrefill}
                sourceTemplateId={sourceTemplateId}
              />

              <aside className="space-y-4 xl:sticky xl:top-5">
                <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                    <h2 className="text-sm font-bold text-slate-900">
                      Matching rule
                    </h2>
                    <span className="flex-1" />
                    <Badge variant={isEligible ? "green" : "yellow"}>
                      {isEligible ? "Eligible" : "Not eligible"}
                    </Badge>
                  </div>
                  <p className="px-4 py-4 text-sm font-medium leading-6 text-slate-600">
                    {summary.matchingRule}
                  </p>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3.5">
                    <h2 className="text-sm font-bold text-slate-900">Summary</h2>
                  </div>
                  <dl className="px-4 pb-1">
                    <SummaryRow label="Name" value={prefill.name || "Default"} />
                    <SummaryRow label="Lead type" value={summary.leadType} />
                    <SummaryRow
                      label="States"
                      value={`${prefill.filterStates.length} of 50`}
                    />
                    {showPricing && (
                      <>
                        <SummaryRow
                          label="Priority"
                          value={`P${prefill.priority}`}
                        />
                        <SummaryRow label="Price" value={summary.price} />
                      </>
                    )}
                    <SummaryRow label="Caps" value={summary.caps} />
                    <SummaryRow label="Profile" value={summary.profile} />
                    <SummaryRow label="Schedule" value={summary.schedule} />
                  </dl>
                </section>

                {!isEligible && (
                  <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800"
                  >
                    <Warning
                      size={17}
                      weight={ICON_WEIGHT_LINEAR}
                      className="mt-0.5 shrink-0"
                    />
                    <span>
                      Select at least {MIN_FILTER_STATES} states —{" "}
                      {MIN_FILTER_STATES - prefill.filterStates.length} more to
                      go.
                    </span>
                  </div>
                )}
              </aside>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6">
              {showSaveAsTemplate ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    loading={savingTemplate}
                    loadingText="Saving template…"
                    disabled={!isEligible}
                    icon={<CopySimple size={14} weight={ICON_WEIGHT_LINEAR} />}
                    onClick={handleSaveAsTemplate}
                    className="btn-sm"
                  >
                    Save as template
                  </ActionButton>
                </div>
              ) : null}

              <span className="min-w-2 flex-1" />
              {isDirty && (
                <span className="text-xs font-semibold text-slate-400">
                  Unsaved changes
                </span>
              )}
              <Link href={backHref} className="btn-secondary btn-sm">
                Cancel
              </Link>
              <button
                type="submit"
                form={formId}
                disabled={pending || !isEligible}
                className="btn-primary btn-sm"
              >
                {pending
                  ? "Saving…"
                  : mode === "edit"
                    ? "Save changes"
                    : apiScope === "template"
                      ? "Create template"
                      : "Create filter set"}
              </button>
            </div>
          </>
      </div>
    </div>
  );
}
