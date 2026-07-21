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

const sizeStyles = {
  sm: { box: "h-12 w-12", icon: 22 },
  md: { box: "h-16 w-16", icon: 28 },
} as const;

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
  const { box, icon: iconSize } = sizeStyles[size];

  return (
    <div
      className={clsx("relative mx-auto", box, className)}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        className={clsx("absolute inset-0 h-full w-full", styles.blobFill)}
      >
        <g transform="translate(100 100)">
          <path d={pathD} className="fill-current" />
        </g>
      </svg>
      <div className="relative flex h-full w-full items-center justify-center">
        <IconComponent size={iconSize} weight="duotone" className={styles.icon} />
      </div>
    </div>
  );
}
