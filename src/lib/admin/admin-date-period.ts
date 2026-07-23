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

/** Preset periods for the admin operations dashboard header filter. */
export const ADMIN_DASHBOARD_PERIOD_OPTIONS: {
  value: AdminDatePeriod;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "custom", label: "Custom period" },
];

const DASHBOARD_PERIODS = new Set<AdminDatePeriod>(
  ADMIN_DASHBOARD_PERIOD_OPTIONS.map((o) => o.value),
);

/** Default preset when the dashboard loads without an explicit period in the URL. */
export const ADMIN_DASHBOARD_DEFAULT_PERIOD: AdminDatePeriod = "last_7_days";

export function adminDashboardHasExplicitPeriod(searchParams: {
  period?: string;
  from?: string;
  to?: string;
}): boolean {
  const period = searchParams.period;
  if (period === "custom") {
    return !!(searchParams.from || searchParams.to);
  }
  if (period && DASHBOARD_PERIODS.has(period as AdminDatePeriod)) {
    return true;
  }
  return !!(searchParams.from || searchParams.to);
}

export function parseAdminDashboardPeriod(searchParams: {
  period?: string;
  from?: string;
  to?: string;
}): {
  datePeriod: AdminDatePeriod;
  from?: string;
  to?: string;
} {
  const period = searchParams.period;
  if (period === "custom") {
    if (searchParams.from || searchParams.to) {
      return {
        datePeriod: "custom",
        from: searchParams.from,
        to: searchParams.to,
      };
    }
    return { datePeriod: ADMIN_DASHBOARD_DEFAULT_PERIOD };
  }
  if (period && DASHBOARD_PERIODS.has(period as AdminDatePeriod)) {
    return {
      datePeriod: period as AdminDatePeriod,
      from: searchParams.from,
      to: searchParams.to,
    };
  }
  if (searchParams.from || searchParams.to) {
    return {
      datePeriod: "custom",
      from: searchParams.from,
      to: searchParams.to,
    };
  }
  return { datePeriod: ADMIN_DASHBOARD_DEFAULT_PERIOD };
}

export function resolveAdminDashboardReceivedAtRange(
  searchParams: { period?: string; from?: string; to?: string },
  now: Date = new Date(),
): { gte: Date; lte: Date } {
  const filters = parseAdminDashboardPeriod(searchParams);
  const range =
    resolveAdminReceivedAtRange(filters, now) ??
    resolveAdminReceivedAtRange(
      { datePeriod: ADMIN_DASHBOARD_DEFAULT_PERIOD },
      now,
    )!;
  return { gte: range.gte!, lte: range.lte! };
}

export function adminDatePeriodLabel(
  period: AdminDatePeriod | undefined,
): string | null {
  if (!period) return null;
  return ADMIN_DATE_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Local calendar date as `YYYY-MM-DD` (no timezone shift). */
export function adminDateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function adminParseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local calendar "today" for admin date pickers (start of day, no TZ shift). */
export function adminCalendarToday(now: Date = new Date()): Date {
  return adminParseYmd(adminDateToYmd(now));
}

/** Clamp a working range so neither bound exceeds local today. */
export function clampAdminDateRangeToToday(
  start: Date | null,
  end: Date | null,
  now: Date = new Date(),
): { start: Date | null; end: Date | null } {
  const maxYmd = adminDateToYmd(now);
  let s = start;
  let e = end;
  if (s && adminDateToYmd(s) > maxYmd) s = adminParseYmd(maxYmd);
  if (e && adminDateToYmd(e) > maxYmd) e = adminParseYmd(maxYmd);
  if (s && e && adminDateToYmd(s) > adminDateToYmd(e)) e = s;
  return { start: s, end: e };
}

export function formatAdminDateRangeFieldLabel(ymd: string): string {
  const d = adminParseYmd(ymd);
  return `${MONTHS_LONG[d.getMonth()]}, ${String(d.getDate()).padStart(2, "0")}`;
}

/** Short label for custom range triggers and chart headers. */
export function formatAdminCustomRangeLabel(
  from?: string,
  to?: string,
): string {
  if (!from && !to) return "Select date range";
  const start = from ? adminParseYmd(from) : adminParseYmd(to!);
  const end = to ? adminParseYmd(to) : start;
  const sStr = `${MONTHS_SHORT[start.getMonth()]} ${String(start.getDate()).padStart(2, "0")}`;
  const eStr = `${MONTHS_SHORT[end.getMonth()]} ${String(end.getDate()).padStart(2, "0")}`;
  const yr = end.getFullYear();
  return `${sStr} - ${eStr} ${yr}`;
}

export function adminDashboardPeriodDisplayLabel(
  datePeriod: AdminDatePeriod,
  from?: string,
  to?: string,
): string {
  if (datePeriod === "custom") {
    if (from || to) return formatAdminCustomRangeLabel(from, to);
    return adminDatePeriodLabel("custom") ?? "Custom period";
  }
  return adminDatePeriodLabel(datePeriod) ?? "Last 7 days";
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
