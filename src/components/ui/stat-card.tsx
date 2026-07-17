import { clsx } from "clsx";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export type StatCardVariant =
  | "default"
  | "pink"
  | "orange"
  | "mint"
  | "blue"
  | "purple"
  | "peach"
  | "hero";

const variantClass: Record<StatCardVariant, string> = {
  default: "stat-card",
  pink: "stat-card-pink",
  orange: "stat-card-orange",
  mint: "stat-card-mint",
  blue: "stat-card-blue",
  purple: "stat-card-purple",
  peach: "stat-card-peach",
  hero: "stat-card",
};

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: Icon;
  iconColor?: string;
  iconBgClassName?: string;
  /** Circle background color for hero variant, e.g. "bg-green-400" */
  heroBg?: string;
  valueClassName?: string;
  subtitleClassName?: string;
  trend?: { value: string; up: boolean };
  /** Pastel KPI background (PNG / mockup patterns). */
  variant?: StatCardVariant;
  /** Optional sparkline / mini-chart slot (right side). */
  sparkline?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-600",
  iconBgClassName = "bg-white/70",
  heroBg = "bg-blue-400",
  valueClassName,
  subtitleClassName,
  trend,
  variant = "default",
  sparkline,
  className,
}: StatCardProps) {
  if (variant === "hero") {
    return (
      <div className={clsx("rounded-2xl bg-white p-5 shadow-sm border border-slate-100", className)}>
        {/* Icon circle */}
        {Icon && (
          <div className={clsx("mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full", heroBg)}>
            <Icon size={26} weight="duotone" className="text-white" />
          </div>
        )}
        {/* Value */}
        <p className={clsx("text-3xl font-bold tracking-tight text-slate-900", valueClassName)}>
          {value}
        </p>
        {/* Label + trend row */}
        <div className="mt-1.5 flex items-center gap-3">
          <p className="text-sm text-slate-500">{label}</p>
          {trend && (
            <p className={clsx("text-xs font-semibold", trend.up ? "text-emerald-500" : "text-red-500")}>
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {subtitle && (
          <p className={clsx("mt-1 text-sm text-slate-400", subtitleClassName)}>{subtitle}</p>
        )}
      </div>
    );
  }

  return (
    <div className={clsx(variantClass[variant], className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <p
              className={clsx(
                "text-3xl font-bold tracking-tight text-slate-900",
                valueClassName,
              )}
            >
              {value}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
          </div>
          {subtitle && (
            <p className={clsx("mt-1.5 text-sm text-slate-500", subtitleClassName)}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={clsx(
                "mt-1.5 text-xs font-medium",
                trend.up ? "text-accent-600" : "text-red-500",
              )}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>

        {sparkline ? (
          <div className="h-10 w-20 flex-shrink-0">{sparkline}</div>
        ) : Icon ? (
          <div className={clsx("rounded-xl p-2.5", iconBgClassName, iconColor)}>
            <Icon size={20} weight="duotone" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
