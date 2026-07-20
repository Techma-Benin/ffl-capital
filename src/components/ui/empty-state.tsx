import type { Icon } from "@/lib/icons/client";
import { ICON_WEIGHT } from "@/lib/icons/client";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="mb-4 rounded-full bg-slate-100 p-4">
          <Icon size={28} className="text-slate-400" weight={ICON_WEIGHT} />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
