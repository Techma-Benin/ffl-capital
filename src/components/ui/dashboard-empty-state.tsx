import { clsx } from "clsx";
import type { Icon } from "@/lib/icons/client";
import {
  EmptyStateBlobIcon,
  type EmptyStateBlobAccent,
} from "@/components/ui/empty-state-blob-icon";

/** Compact empty state for dashboard cards and table placeholders (blob + icon + title). */
export function DashboardEmptyState({
  icon,
  title,
  description,
  accent,
  blobIndex,
  className,
}: {
  icon: Icon;
  title: string;
  description?: string;
  accent?: EmptyStateBlobAccent;
  blobIndex?: number;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "group/empty flex flex-col items-center justify-center text-center",
        className,
      )}
    >
      <EmptyStateBlobIcon
        icon={icon}
        seed={title}
        accent={accent}
        blobIndex={blobIndex}
        size="sm"
        className="mb-3"
      />
      <p className="text-sm text-slate-400">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
