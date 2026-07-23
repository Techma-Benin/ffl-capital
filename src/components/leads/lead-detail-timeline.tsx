import { formatDateTime, formatDateTimeLong } from "@/lib/format-datetime";
import { LeadDetailSectionCard } from "@/components/leads/lead-detail-ui";
import type { LeadDetailTimelineItem } from "@/components/leads/lead-detail-types";

export function LeadDetailTimelineCard({
  items,
  className,
}: {
  items: LeadDetailTimelineItem[];
  className?: string;
}) {
  return (
    <LeadDetailSectionCard title="Timeline" className={className}>
      <ol className="space-y-3.5">
        {items.map((event, i) => (
          <li key={i} className="border-l-2 border-orange-200 pl-3">
            <p className="text-sm font-medium text-slate-900">{event.label}</p>
            <p className="text-xs text-slate-500">{event.detail}</p>
            <p
              className="text-[10px] text-slate-400"
              suppressHydrationWarning
            >
              {formatDateTimeLong(event.at) ?? formatDateTime(event.at)}
            </p>
          </li>
        ))}
      </ol>
    </LeadDetailSectionCard>
  );
}
