"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CopySimple, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
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

export type FilterSetEditorPageProps = {
  mode: "create" | "edit";
  backHref: string;
  backLabel: string;
  subtitle?: string;
  filterSetId?: string;
  partnerId?: string;
  initial: FilterSetFormData;
  categories: CategoryOption[];
  /** Partner API uses `/api/partners/filter-sets`; admin uses partner-scoped admin routes */
  apiScope?: "admin" | "partner" | "template";
  variant?: FilterSetFormVariant;
  showTemplatePicker?: boolean;
  showSaveAsTemplate?: boolean;
  templateDescription?: string;
  filterSetName?: string;
  filterSetActive?: boolean;
  /** SSR templates for picker — avoids client waterfall */
  initialTemplates?: FilterSetTemplate[];
};

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

export function FilterSetEditorPage({
  mode,
  backHref,
  backLabel,
  subtitle,
  filterSetId,
  partnerId,
  initial,
  categories,
  apiScope = "admin",
  variant,
  showTemplatePicker = false,
  showSaveAsTemplate = false,
  templateDescription,
  filterSetName,
  filterSetActive,
  initialTemplates,
}: FilterSetEditorPageProps) {
  const router = useRouter();
  const formId = useId();
  const [step, setStep] = useState<"picker" | "editor">(
    mode === "create" && showTemplatePicker ? "picker" : "editor",
  );
  const [prefill, setPrefill] = useState<FilterSetFormData>(initial);
  const [pending, setPending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");

  const formVariant = formVariantFromScope(apiScope, variant);
  const title =
    apiScope === "template"
      ? mode === "edit"
        ? "Edit template"
        : "Create template"
      : mode === "edit"
        ? "Edit filter set"
        : "Create filter set";

  function handleSaved() {
    router.push(backHref);
    router.refresh();
  }

  async function handleSaveAsTemplate() {
    setSavingTemplate(true);
    setTemplateMsg("");
    try {
      const res = await fetch("/api/admin/filter-set-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prefill.name.trim() || filterSetName || "Filter set",
          description:
            templateDescription ??
            `From ${filterSetName ?? "partner"} filter set`,
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
      const data = await res.json();
      if (!res.ok) {
        setTemplateMsg(data.error ?? "Failed to create template");
        return;
      }
      setTemplateMsg("Saved as template");
    } catch {
      setTemplateMsg("Request failed");
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
          mode === "edit" && filterSetActive !== undefined ? (
            <Badge variant={filterSetActive ? "green" : "slate"}>
              {filterSetActive ? "Active" : "Inactive"}
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

      <div className="mx-auto max-w-2xl">
        <div className="card flex flex-col overflow-hidden rounded-2xl">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {step === "picker" ? (
              <FilterSetTemplatePicker
                initialTemplates={initialTemplates}
                onSelect={(template) => {
                  setPrefill((current) => ({
                    ...current,
                    name: template.name,
                    description: template.description ?? "",
                    leadType: template.leadType,
                    filterStates: [...template.filterStates],
                    weeklyLimit:
                      template.weeklyLimit != null
                        ? String(template.weeklyLimit)
                        : current.weeklyLimit,
                    monthlyLimit:
                      template.monthlyLimit != null
                        ? String(template.monthlyLimit)
                        : current.monthlyLimit,
                    filterCriteria: stripAttributionCriteria(
                      template.filterCriteria ?? {},
                    ),
                    priority:
                      template.priority != null
                        ? template.priority
                        : current.priority,
                    priceOverride:
                      template.priceOverride != null
                        ? String(template.priceOverride)
                        : current.priceOverride,
                  }));
                  setStep("editor");
                }}
                onSkip={() => setStep("editor")}
              />
            ) : (
              <FilterSetForm
                formId={formId}
                hideButtons
                variant={formVariant}
                onPendingChange={setPending}
                filterSetId={filterSetId}
                partnerId={partnerId}
                initial={prefill}
                categories={categories}
                buildUrl={(id) => buildFilterSetUrl(apiScope, partnerId, id)}
                onCancel={() => router.push(backHref)}
                onSaved={handleSaved}
                onFormChange={setPrefill}
              />
            )}
          </div>

          {step === "editor" && (
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              {showSaveAsTemplate ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    loading={savingTemplate}
                    loadingText="Saving template…"
                    icon={<CopySimple size={14} weight={ICON_WEIGHT_LINEAR} />}
                    onClick={handleSaveAsTemplate}
                  >
                    Save as template
                  </ActionButton>
                  {templateMsg && (
                    <span
                      className={`text-xs ${
                        templateMsg === "Saved as template"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {templateMsg}
                    </span>
                  )}
                </div>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <Link href={backHref} className="btn-secondary btn-sm">
                  Cancel
                </Link>
                <button
                  type="submit"
                  form={formId}
                  disabled={pending}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
