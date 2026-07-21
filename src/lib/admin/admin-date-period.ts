import type { AdminDatePeriod, AdminLeadViewFilters } from "@/lib/leads/list-view-schema";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const ADMIN_DATE_PERIOD_OPTIONS: {
  value: AdminDatePeriod | "";
  label: string;
}[] = [
  { value: "", label: "No date filter" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom period" },
];

export function adminDatePeriodLabel(
  period: AdminDatePeriod | undefined,
): string | null {
  if (!period) return null;
  return ADMIN_DATE_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}

/** Resolve admin view date filters to receivedAt bounds (local calendar days). */
export function resolveAdminReceivedAtRange(
  filters: Pick<AdminLeadViewFilters, "datePeriod" | "from" | "to">,
  now: Date = new Date(),
): { gte?: Date; lte?: Date } | null {
  const period =
    filters.datePeriod ??
    (filters.from || filters.to ? ("custom" as const) : undefined);

  if (!period) return null;

  switch (period) {
    case "today":
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { gte: startOfDay(y), lte: endOfDay(y) };
    }
    case "last_7_days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { gte: startOfDay(start), lte: endOfDay(now) };
    }
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { gte: startOfDay(first), lte: endOfDay(last) };
    }
    case "custom": {
      if (!filters.from && !filters.to) return null;
      const range: { gte?: Date; lte?: Date } = {};
      if (filters.from) range.gte = new Date(filters.from);
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
      return range;
    }
    default:
      return null;
  }
}
