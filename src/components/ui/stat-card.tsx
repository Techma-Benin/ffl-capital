import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StatCardVariant =
  | "default"
  | "pink"
  | "orange"
  | "mint"
  | "blue"
  | "purple"
  | "peach";

const variantClass: Record<StatCardVariant, string> = {
  default: "stat-card",
  pink: "stat-card-pink",
  orange: "stat-card-orange",
  mint: "stat-card-mint",
  blue: "stat-card-blue",
  purple: "stat-card-purple",
  peach: "stat-card-peach",
};

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgClassName?: string;
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
  valueClassName,
  subtitleClassName,
  trend,
  variant = "default",
  sparkline,
  className,
}: StatCardProps) {
  return (
    <div className={clsx(variantClass[variant], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p
            className={clsx(
              "mt-2 text-3xl font-bold tracking-tight text-slate-900",
              valueClassName
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className={clsx("mt-1 text-sm text-slate-500", subtitleClassName)}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={clsx(
                "mt-2 text-xs font-medium",
                trend.up ? "text-accent-600" : "text-red-500"
              )}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>

        {sparkline ? (
          <div className="h-12 w-24 flex-shrink-0 self-end">{sparkline}</div>
        ) : Icon ? (
          <div className={clsx("rounded-xl p-2.5", iconBgClassName, iconColor)}>
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
