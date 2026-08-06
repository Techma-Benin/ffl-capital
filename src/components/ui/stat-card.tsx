import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

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
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-600",
  iconBgClassName = "bg-slate-100",
  valueClassName,
  subtitleClassName,
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={clsx("stat-card", className)}>
      <div className="flex items-start justify-between">
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
                trend.up ? "text-emerald-600" : "text-red-500"
              )}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx("rounded-xl p-2.5", iconBgClassName, iconColor)}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
