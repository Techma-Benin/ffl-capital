import { clsx } from "clsx";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { KPI_BLOB_PATHS, resolveKpiBlobIndex } from "@/components/ui/kpi-blob-shapes";

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

const accentStyles: Record<StatCardAccent, { blobFill: string; icon: string }> = {
  blue: { blobFill: "text-blue-50", icon: "text-blue-600" },
  emerald: { blobFill: "text-emerald-50", icon: "text-emerald-600" },
  red: { blobFill: "text-red-50", icon: "text-red-600" },
  violet: { blobFill: "text-violet-50", icon: "text-violet-600" },
  cyan: { blobFill: "text-cyan-50", icon: "text-cyan-600" },
  purple: { blobFill: "text-purple-50", icon: "text-purple-600" },
  rose: { blobFill: "text-rose-50", icon: "text-rose-600" },
  orange: { blobFill: "text-orange-50", icon: "text-orange-600" },
  amber: { blobFill: "text-amber-50", icon: "text-amber-600" },
  mint: { blobFill: "text-teal-50", icon: "text-teal-600" },
  brand: { blobFill: "text-brand-50", icon: "text-brand-600" },
  pink: { blobFill: "text-pink-50", icon: "text-pink-600" },
  peach: { blobFill: "text-orange-50", icon: "text-orange-500" },
};

/** Map legacy bg-* blob overrides to text-* so SVG fill-current picks up a scanned Tailwind class. */
function blobSvgColorClass(className: string) {
  return className.replace(/\bbg-/g, "text-");
}

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

function CornerIconBadge({
  IconComponent,
  blobFillClassName,
  iconClassName,
  blobIndex,
}: {
  IconComponent: Icon;
  blobFillClassName: string;
  iconClassName: string;
  blobIndex: number;
}) {
  const pathD = KPI_BLOB_PATHS[blobIndex];

  return (
    <div
      className="pointer-events-none absolute -right-6 -top-6 h-28 w-28"
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        className={clsx(
          "absolute inset-0 h-full w-full",
          blobSvgColorClass(blobFillClassName),
        )}
        aria-hidden
      >
        <g transform="translate(128 72) rotate(18) scale(1.5)">
          <g
            className="origin-center transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          >
            <path d={pathD} className="fill-current" />
          </g>
        </g>
      </svg>
      <div className="relative flex h-full w-full translate-x-[-0.375rem] translate-y-1.5 items-start justify-end p-3 pr-5 pt-5">
        <IconComponent size={30} weight="duotone" className={iconClassName} />
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
  /** Pick one of eight organic blob shapes (0–7). Defaults to a stable hash of accent + label. */
  blobIndex?: number;
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
    blobIndex: blobIndexProp,
    accent: accentProp,
    valueClassName,
    subtitleClassName,
    trend,
    variant = "default",
    className,
  } = props;

  const accent = accentProp ?? variantToAccent[variant];
  const styles = accentStyles[accent];
  const blobFill = iconBgClassName ?? styles.blobFill;
  const iconClass = iconColor ?? styles.icon;
  const blobIndex = resolveKpiBlobIndex({
    blobIndex: blobIndexProp,
    accent,
    label,
  });

  return (
    <div
      className={clsx(
        "group relative cursor-default overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm",
        className,
      )}
    >
      {IconComponent && (
        <CornerIconBadge
          IconComponent={IconComponent}
          blobFillClassName={blobFill}
          iconClassName={iconClass}
          blobIndex={blobIndex}
        />
      )}
      <div className={clsx("min-w-0 p-6", IconComponent && "pr-24")}>
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
