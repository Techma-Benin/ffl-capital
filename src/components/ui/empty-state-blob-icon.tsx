import { clsx } from "clsx";
import type { Icon } from "@phosphor-icons/react";
import { KPI_BLOB_PATHS, resolveKpiBlobIndex } from "@/components/ui/kpi-blob-shapes";

/** Accent tints for empty-state blobs — static Tailwind classes only (text-* + fill-current). */
const EMPTY_STATE_BLOB_ACCENTS = [
  { accent: "blue", blobFill: "text-blue-50", icon: "text-blue-600" },
  { accent: "violet", blobFill: "text-violet-50", icon: "text-violet-600" },
  { accent: "teal", blobFill: "text-teal-50", icon: "text-teal-600" },
  { accent: "emerald", blobFill: "text-emerald-50", icon: "text-emerald-600" },
  { accent: "red", blobFill: "text-red-50", icon: "text-red-600" },
  { accent: "amber", blobFill: "text-amber-50", icon: "text-amber-600" },
  { accent: "cyan", blobFill: "text-cyan-50", icon: "text-cyan-600" },
  { accent: "rose", blobFill: "text-rose-50", icon: "text-rose-600" },
  { accent: "purple", blobFill: "text-purple-50", icon: "text-purple-600" },
  { accent: "orange", blobFill: "text-orange-50", icon: "text-orange-600" },
] as const;

export type EmptyStateBlobAccent = (typeof EMPTY_STATE_BLOB_ACCENTS)[number]["accent"];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function resolveEmptyStateAccentStyle(seed: string, accentOverride?: EmptyStateBlobAccent) {
  if (accentOverride) {
    const found = EMPTY_STATE_BLOB_ACCENTS.find((a) => a.accent === accentOverride);
    if (found) return found;
  }
  return EMPTY_STATE_BLOB_ACCENTS[hashSeed(seed) % EMPTY_STATE_BLOB_ACCENTS.length];
}

/**
 * Empty-state blob + icon sizing (box Tailwind classes, Phosphor icon px, SVG blob scale).
 * Paths in KPI_BLOB_PATHS extend ~91 units from center; viewBox half-width is 100 — keep scale ≤ ~1.08
 * so the full organic shape stays inside the SVG (default overflow is hidden).
 */
export const EMPTY_STATE_BLOB_SIZE = {
  sm: { box: "h-20 w-20", icon: 35, blobScale: 1.08 },
  md: { box: "h-24 w-24", icon: 44, blobScale: 1.08 },
} as const;

const sizeStyles = EMPTY_STATE_BLOB_SIZE;

export function EmptyStateBlobIcon({
  icon: IconComponent,
  seed,
  accent,
  blobIndex: blobIndexProp,
  size = "md",
  className,
}: {
  icon: Icon;
  /** Stable seed for blob shape + accent (usually empty-state title). */
  seed: string;
  accent?: EmptyStateBlobAccent;
  blobIndex?: number;
  size?: keyof typeof sizeStyles;
  className?: string;
}) {
  const styles = resolveEmptyStateAccentStyle(seed, accent);
  const blobIndex = resolveKpiBlobIndex({
    blobIndex: blobIndexProp,
    accent: styles.accent,
    label: seed,
  });
  const pathD = KPI_BLOB_PATHS[blobIndex];
  const { box, icon: iconSize, blobScale } = sizeStyles[size];

  return (
    <div
      className={clsx(
        "group relative mx-auto overflow-visible",
        box,
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        className={clsx("absolute inset-0 h-full w-full overflow-visible", styles.blobFill)}
      >
        <g transform={`translate(100 100) scale(${blobScale})`}>
          <g
            className="origin-center transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0"
          >
            <path d={pathD} className="fill-current" />
          </g>
        </g>
      </svg>
      <div className="relative flex h-full w-full items-center justify-center">
        <IconComponent size={iconSize} weight="duotone" className={styles.icon} />
      </div>
    </div>
  );
}
