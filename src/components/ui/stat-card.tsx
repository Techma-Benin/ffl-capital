import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: { value: string; up: boolean };
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-600",
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
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
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
          <div className={clsx("rounded-xl bg-slate-100 p-2.5", iconColor)}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
