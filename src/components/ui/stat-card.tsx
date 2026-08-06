import { clsx } from "clsx";
import type { Icon } from "@/lib/icons/client";
import { ICON_WEIGHT } from "@/lib/icons/client";
import { KPI_BLOB_PATHS, resolveKpiBlobIndex } from "@/components/ui/kpi-blob-shapes";
import {
  STAT_CARD_GEOMETRIC_CORNER_PATHS,
  type StatCardCornerShape,
} from "@/components/ui/stat-card-corner-shapes";

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

const cornerHoverMotion =
  "transition-transform duration-300 ease-out motion-reduce:transition-none";

function CornerIconBadge({
  IconComponent,
  blobFillClassName,
  iconClassName,
  blobIndex,
  cornerShape,
}: {
  IconComponent: Icon;
  blobFillClassName: string;
  iconClassName: string;
  blobIndex: number;
  cornerShape: StatCardCornerShape;
}) {
  const isBlob = cornerShape === "blob";
  const pathD = isBlob
    ? KPI_BLOB_PATHS[blobIndex]
    : STAT_CARD_GEOMETRIC_CORNER_PATHS[cornerShape];

  return (
    <div
      className={clsx(
        "pointer-events-none absolute h-28 w-28",
        isBlob ? "-right-6 -top-6" : "right-0 top-0",
      )}
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
        {isBlob ? (
          <g transform="translate(128 72) rotate(18) scale(1.5)">
            <g
              className={clsx(
                "origin-top-right",
                cornerHoverMotion,
                "group-hover:scale-110 group-hover:rotate-6 motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0",
              )}
            >
              <path d={pathD} className="fill-current" />
            </g>
          </g>
        ) : (
          <g
            className={clsx(
              "origin-[100%_0%]",
              cornerHoverMotion,
              "group-hover:scale-105 motion-reduce:group-hover:scale-100",
            )}
          >
            <path d={pathD} className="fill-current" />
          </g>
        )}
      </svg>
      <div className="relative flex h-full w-full translate-x-[-0.75rem] translate-y-3 items-start justify-end p-3 pr-4 pt-6">
        <IconComponent size={30} weight={ICON_WEIGHT} className={iconClassName} />
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
  /** Corner decoration when `cornerShape` is `blob`; geometric shapes ignore blob rotation. */
  cornerShape?: StatCardCornerShape;
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
    cornerShape = "blob",
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
        "group relative cursor-default overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow duration-300 ease-out hover:shadow-md motion-reduce:transition-none",
        className,
      )}
    >
      {IconComponent && (
        <CornerIconBadge
          IconComponent={IconComponent}
          blobFillClassName={blobFill}
          iconClassName={iconClass}
          blobIndex={blobIndex}
          cornerShape={cornerShape}
        />
      )}
      <div className={clsx("min-w-0 p-6", IconComponent && "pr-24")}>
        <p className={clsx("text-3xl font-bold tracking-tight", valueClassName)}>
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
