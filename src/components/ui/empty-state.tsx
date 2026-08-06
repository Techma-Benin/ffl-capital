import type { Icon } from "@/lib/icons/client";
import {
  EmptyStateBlobIcon,
  type EmptyStateBlobAccent,
} from "@/components/ui/empty-state-blob-icon";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  accent,
  blobIndex,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  accent?: EmptyStateBlobAccent;
  blobIndex?: number;
}) {
  return (
    <div className="empty-state group/empty">
      {Icon && (
        <EmptyStateBlobIcon
          icon={Icon}
          seed={title}
          accent={accent}
          blobIndex={blobIndex}
          className="mb-4"
        />
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
