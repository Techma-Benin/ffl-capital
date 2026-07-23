"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { ArrowLeft, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function LeadDetailPageHeader({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  return (
    <header>
      <LeadDetailBackLink href={backHref} label={backLabel} />
    </header>
  );
}

export function LeadDetailBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
    >
      <ArrowLeft
        size={14}
        weight={ICON_WEIGHT_LINEAR}
        aria-hidden
        className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
      />
      {label}
    </Link>
  );
}

export function LeadDetailSummaryCard({
  title,
  subtitle,
  badges,
  actions,
  kpis,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  kpis: ReactNode;
}) {
  return (
    <div className="card space-y-2.5 p-3.5 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {title}
            {badges}
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">{subtitle}</p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="h-px bg-slate-100" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{kpis}</div>
    </div>
  );
}

export function LeadDetailKpiTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <p className={clsx("text-sm font-bold text-slate-900", valueClassName)}>
        {value}
      </p>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function LeadDetailSectionCard({
  title,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("card overflow-hidden", className)}>
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-[18px]">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className={bodyClassName ?? "p-4 sm:p-[18px]"}>{children}</div>
    </section>
  );
}

export function LeadDetailFieldRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function LeadDetailFieldList({ children }: { children: ReactNode }) {
  return <dl className="space-y-2.5">{children}</dl>;
}

export function LeadDetailTabBar<T extends string>({
  tabs,
  activeId,
  onSelect,
  ariaLabel = "Lead detail sections",
}: {
  tabs: readonly { id: T; label: string }[];
  activeId: T;
  onSelect: (id: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-page/95 px-1 py-2 backdrop-blur-sm"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((t) => {
        const active = activeId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.id)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function LeadDetailTwoColumnLayout({
  main,
  sidebar,
}: {
  main: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">{main}</div>
      {sidebar}
    </div>
  );
}
