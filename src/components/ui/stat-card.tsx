import { clsx } from "clsx";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** @deprecated Use `accent` instead — legacy colored card skins are mapped to accent tints. */
export type StatCardVariant =
  | "default"
  | "pink"
  | "orange"
  | "mint"
  | "blue"
  | "purple"
  | "peach"
  | "modern";

export type StatCardAccent =
  | "blue"
  | "emerald"
  | "red"
  | "violet"
  | "cyan"
  | "purple"
  | "rose"
  | "orange"
  | "amber"
  | "mint"
  | "brand"
  | "pink"
  | "peach";

const accentStyles: Record<StatCardAccent, { triangle: string; icon: string }> = {
  blue: { triangle: "bg-blue-50", icon: "text-blue-600" },
  emerald: { triangle: "bg-emerald-50", icon: "text-emerald-600" },
  red: { triangle: "bg-red-50", icon: "text-red-600" },
  violet: { triangle: "bg-violet-50", icon: "text-violet-600" },
  cyan: { triangle: "bg-cyan-50", icon: "text-cyan-600" },
  purple: { triangle: "bg-purple-50", icon: "text-purple-600" },
  rose: { triangle: "bg-rose-50", icon: "text-rose-600" },
  orange: { triangle: "bg-orange-50", icon: "text-orange-600" },
  amber: { triangle: "bg-amber-50", icon: "text-amber-600" },
  mint: { triangle: "bg-teal-50", icon: "text-teal-600" },
  brand: { triangle: "bg-brand-50", icon: "text-brand-600" },
  pink: { triangle: "bg-pink-50", icon: "text-pink-600" },
  peach: { triangle: "bg-orange-50", icon: "text-orange-500" },
};

const variantToAccent: Record<StatCardVariant, StatCardAccent> = {
  default: "blue",
  pink: "pink",
  orange: "orange",
  mint: "mint",
  blue: "blue",
  purple: "purple",
  peach: "peach",
  modern: "blue",
};

/** Top-right corner blob: outer edges follow card + rounded-tr-2xl; inner edge is one concave sweep. */
const CORNER_BLOB_VIEWBOX = 80;
const CORNER_BLOB_PATH =
  "M 8 0 H 64 A 16 16 0 0 1 80 16 V 58 C 54 58 50 8 8 0 Z";

function triangleFillClass(triangleClassName: string) {
  return triangleClassName.replace(/\bbg-/g, "fill-");
}

function CornerIconBadge({
  IconComponent,
  triangleClassName,
  iconClassName,
}: {
  IconComponent: Icon;
  triangleClassName: string;
  iconClassName: string;
}) {
  return (
    <div className="absolute right-0 top-0 h-[4.5rem] w-[4.5rem]" aria-hidden>
      <svg
        viewBox={`0 0 ${CORNER_BLOB_VIEWBOX} ${CORNER_BLOB_VIEWBOX}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          d={CORNER_BLOB_PATH}
          className={triangleFillClass(triangleClassName)}
        />
      </svg>
      <div className="relative flex h-full w-full items-start justify-end p-2.5">
        <IconComponent size={24} weight="duotone" className={iconClassName} />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: Icon;
  /** Icon color override (Tailwind text-* class). */
  iconColor?: string;
  /** Corner blob fill override (Tailwind bg-* class). */
  iconBgClassName?: string;
  accent?: StatCardAccent;
  valueClassName?: string;
  subtitleClassName?: string;
  trend?: { value: string; up: boolean };
  /** @deprecated Maps to `accent`; all cards use the modern white layout. */
  variant?: StatCardVariant;
  className?: string;
}

export function StatCard(props: StatCardProps) {
  const {
    label,
    value,
    subtitle,
    icon: IconComponent,
    iconColor,
    iconBgClassName,
    accent: accentProp,
    valueClassName,
    subtitleClassName,
    trend,
    variant = "default",
    className,
  } = props;

  const accent = accentProp ?? variantToAccent[variant];
  const styles = accentStyles[accent];
  const triangleClass = iconBgClassName ?? styles.triangle;
  const iconClass = iconColor ?? styles.icon;

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm",
        className,
      )}
    >
      {IconComponent && (
        <CornerIconBadge
          IconComponent={IconComponent}
          triangleClassName={triangleClass}
          iconClassName={iconClass}
        />
      )}
      <div className={clsx("min-w-0 p-6", IconComponent && "pr-20")}>
        <p className={clsx("text-3xl font-bold tracking-tight text-slate-900", valueClassName)}>
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
        {trend && (
          <p className="mt-2 text-sm">
            <span className={clsx("font-medium", trend.up ? "text-emerald-500" : "text-red-500")}>
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
