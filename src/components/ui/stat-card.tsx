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
  | "hero"
  | "modern";

const variantClass: Record<StatCardVariant, string> = {
  default: "stat-card",
  pink: "stat-card-pink",
  orange: "stat-card-orange",
  mint: "stat-card-mint",
  blue: "stat-card-blue",
  purple: "stat-card-purple",
  peach: "stat-card-peach",
  hero: "stat-card",
  modern: "stat-card",
};

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: Icon;
  iconColor?: string;
  iconBgClassName?: string;
  /** Circle background for hero variant e.g. "bg-emerald-400" */
  heroBg?: string;
  valueClassName?: string;
  subtitleClassName?: string;
  trend?: { value: string; up: boolean };
  variant?: StatCardVariant;
  sparkline?: ReactNode;
  className?: string;
}

export function StatCard(props: StatCardProps) {
  const {
    label,
    value,
    subtitle,
    icon: IconComponent,
    iconColor = "text-brand-600",
    iconBgClassName = "bg-white/70",
    heroBg = "bg-blue-400",
    valueClassName,
    subtitleClassName,
    trend,
    variant = "default",
    sparkline,
    className,
  } = props;

  if (variant === "modern") {
    return (
      <div
        className={clsx(
          "relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm",
          className,
        )}
      >
        {IconComponent && (
          <div
            className="absolute right-0 top-0 flex h-14 w-14 items-center justify-center rounded-[1.25rem] rounded-tr-[2rem] rounded-bl-[2rem] bg-blue-50"
          >
            <IconComponent size={26} weight="duotone" className={clsx("text-blue-600", iconColor)} />
          </div>
        )}
        <div className={clsx("min-w-0 p-6", IconComponent && "pr-20")}>
          <p className={clsx("text-3xl font-bold tracking-tight text-slate-900", valueClassName)}>
            {value}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
          {trend && (
            <p className="mt-2 text-sm">
              <span
                className={clsx("font-medium", trend.up ? "text-emerald-500" : "text-red-500")}
              >
                {trend.up ? "↑" : "↓"} {trend.value}
              </span>{" "}
              <span className="text-slate-400">this month</span>
            </p>
          )}
          {subtitle && (
            <p className={clsx("mt-2 text-sm text-slate-400", subtitleClassName)}>{subtitle}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={clsx("rounded-2xl bg-white p-4 shadow-sm border border-slate-100", className)}>
        <div className="flex items-center gap-4">
          {IconComponent && (
            <div className={clsx("shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-full", heroBg)}>
              <IconComponent size={26} weight="duotone" className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className={clsx("text-2xl font-bold tracking-tight text-slate-900", valueClassName)}>
              {value}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
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
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(variantClass[variant], className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <p className={clsx("text-3xl font-bold tracking-tight text-slate-900", valueClassName)}>
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
            <p className={clsx("mt-1.5 text-xs font-medium", trend.up ? "text-accent-600" : "text-red-500")}>
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>

        {sparkline ? (
          <div className="h-10 w-20 flex-shrink-0">{sparkline}</div>
        ) : IconComponent ? (
          <div className={clsx("rounded-xl p-2.5", iconBgClassName, iconColor)}>
            <IconComponent size={20} weight="duotone" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
