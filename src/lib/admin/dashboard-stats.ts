import { prisma } from "@/lib/db";
import { PartnerStatus } from "@prisma/client";
import {
  ADMIN_DASHBOARD_CLIENT_FILTER_LOOKBACK_DAYS,
  resolveAdminDashboardLookbackWindow,
} from "@/lib/admin/admin-date-period";
import {
  loadEnabledCategoryLabels,
  resolveLeadTypeDisplay,
} from "@/lib/lead-categories/category-labels";

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

function startOfHour(d: Date): Date {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}

function inclusiveCalendarDays(gte: Date, lte: Date): number {
  const start = startOfDay(gte).getTime();
  const end = startOfDay(lte).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

export type ChartGranularity = "hour" | "day" | "week" | "month";

/**
 * Adaptive buckets aim for ~12–24 visible progression points when possible.
 * Daily stays through ~2 months so presets like last_month (~30d) stay dense;
 * weekly only kicks in when daily would exceed ~60 points.
 */
export function resolveChartGranularity(
  gte: Date,
  lte: Date,
): ChartGranularity {
  const days = inclusiveCalendarDays(gte, lte);
  if (days <= 1) return "hour";
  if (days <= 60) return "day";
  if (days <= 90) return "week";
  return "month";
}

export function chartVolumeLabel(granularity: ChartGranularity): string {
  switch (granularity) {
    case "hour":
      return "Hourly volume";
    case "day":
      return "Daily volume";
    case "week":
      return "Weekly volume";
    case "month":
      return "Monthly volume";
  }
}

type ChartBucket = { start: Date; end: Date; label: string };

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

function formatHourLabel(d: Date): string {
  const h = d.getHours();
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${suffix}`;
}

function formatDayLabel(d: Date, singleDay: boolean): string {
  if (singleDay) {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

/** Single representative date (bucket start) — no “A–B” range labels. */
function formatWeekLabel(start: Date): string {
  return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`;
}

function formatMonthLabel(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Build inclusive timeline buckets; empty buckets keep zeros so the axis stays continuous. */
export function buildBuckets(
  gte: Date,
  lte: Date,
  granularity: ChartGranularity,
): ChartBucket[] {
  const rangeEnd = endOfDay(lte);
  const buckets: ChartBucket[] = [];

  if (granularity === "hour") {
    let cursor = startOfHour(gte);
    const lastHour = startOfHour(rangeEnd);
    while (cursor <= lastHour) {
      const next = new Date(cursor);
      next.setHours(next.getHours() + 1);
      buckets.push({
        start: new Date(cursor),
        end: next,
        label: formatHourLabel(cursor),
      });
      cursor = next;
    }
    return buckets;
  }

  if (granularity === "day") {
    let cursor = startOfDay(gte);
    const lastDay = startOfDay(rangeEnd);
    const single = cursor.getTime() === lastDay.getTime();
    while (cursor <= lastDay) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + 1);
      buckets.push({
        start: new Date(cursor),
        end: next,
        label: formatDayLabel(cursor, single),
      });
      cursor = next;
    }
    return buckets;
  }

  if (granularity === "week") {
    // Rolling 7-day windows from range start (not calendar Mon–Sun).
    let cursor = startOfDay(gte);
    const lastDay = startOfDay(rangeEnd);
    while (cursor <= lastDay) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + 7);
      const end =
        next.getTime() > rangeEnd.getTime() + 1
          ? new Date(rangeEnd.getTime() + 1)
          : next;
      buckets.push({
        start: new Date(cursor),
        end,
        label: formatWeekLabel(cursor),
      });
      cursor = next;
    }
    return buckets;
  }

  // month — calendar months covering the range
  let cursor = new Date(gte.getFullYear(), gte.getMonth(), 1);
  const lastMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
  while (cursor <= lastMonth) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    buckets.push({
      start: new Date(cursor),
      end: next,
      label: formatMonthLabel(cursor),
    });
    cursor = next;
  }
  return buckets;
}

function inRange(iso: string, gte: Date | undefined, lte: Date): boolean {
  const t = new Date(iso).getTime();
  if (gte && t < gte.getTime()) return false;
  return t <= lte.getTime();
}

export type AdminDashboardRawLead = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  leadType: string;
  leadTypeLabel: string;
  status: string;
  receivedAt: string;
  partnerName: string | null;
};

export type AdminDashboardRawDelivery = {
  deliveredAt: string;
  channel: string;
};

export type AdminDashboardRawData = {
  lookbackDays: number;
  windowStart: string;
  windowEnd: string;
  leads: AdminDashboardRawLead[];
  deliveries: AdminDashboardRawDelivery[];
  activePartners: number;
  unmatchedLeads: number;
};

export type FetchAdminDashboardRawOptions = {
  now?: Date;
  /**
   * Load this receivedAt/deliveredAt window instead of the default 90-day
   * lookback. Omit `gte` for all-time (no lower bound).
   */
  range?: { gte?: Date; lte: Date };
};

export async function fetchAdminDashboardRawData(
  options: FetchAdminDashboardRawOptions = {},
): Promise<AdminDashboardRawData> {
  const now = options.now ?? new Date();
  const window = options.range
    ? { gte: options.range.gte, lte: options.range.lte }
    : resolveAdminDashboardLookbackWindow(now);

  const receivedAtFilter = window.gte
    ? { gte: window.gte, lte: window.lte }
    : { lte: window.lte };
  const deliveredAtFilter = window.gte
    ? { gte: window.gte, lte: window.lte }
    : { lte: window.lte };

  const [leadRows, deliveryRows, activePartners, unmatchedLeads, categories] =
    await Promise.all([
      prisma.lead.findMany({
        where: {
          receivedAt: receivedAtFilter,
        },
        orderBy: { receivedAt: "desc" },
        include: {
          leadDeliveries: {
            include: { partner: true },
            orderBy: { deliveredAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.leadDelivery.findMany({
        where: {
          deliveredAt: deliveredAtFilter,
        },
        select: { deliveredAt: true, channel: true },
      }),
      prisma.partner.count({ where: { status: PartnerStatus.active } }),
      prisma.lead.count({
        where: { status: "unmatched", available: true },
      }),
      loadEnabledCategoryLabels(),
    ]);

  const lookbackDays = options.range
    ? window.gte
      ? inclusiveCalendarDays(window.gte, window.lte)
      : 0
    : ADMIN_DASHBOARD_CLIENT_FILTER_LOOKBACK_DAYS;

  const windowStart =
    window.gte?.toISOString() ??
    leadRows.reduce<string | null>((min, lead) => {
      const iso = lead.receivedAt.toISOString();
      return min == null || iso < min ? iso : min;
    }, null) ??
    startOfDay(now).toISOString();

  return {
    lookbackDays,
    windowStart,
    windowEnd: window.lte.toISOString(),
    leads: leadRows.map((lead) => {
      const delivery = lead.leadDeliveries[0];
      return {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        state: lead.state,
        leadType: lead.leadType ?? "",
        leadTypeLabel: resolveLeadTypeDisplay({
          leadType: lead.leadType,
          categoryResolution: lead.categoryResolution,
          categoryCandidateTypes: lead.categoryCandidateTypes,
          categories,
        }).label,
        status: lead.status,
        receivedAt: lead.receivedAt.toISOString(),
        partnerName: delivery
          ? `${delivery.partner.firstName} ${delivery.partner.lastName}`
          : null,
      };
    }),
    deliveries: deliveryRows.map((d) => ({
      deliveredAt: d.deliveredAt.toISOString(),
      channel: d.channel,
    })),
    activePartners,
    unmatchedLeads,
  };
}

/** Concrete chart bounds when period has no lower bound (all time). */
export function resolveDashboardChartRange(
  range: { gte?: Date; lte: Date },
  raw: Pick<AdminDashboardRawData, "leads" | "deliveries" | "windowStart">,
): { gte: Date; lte: Date } {
  if (range.gte) return { gte: range.gte, lte: range.lte };

  let earliest = Number.POSITIVE_INFINITY;
  for (const l of raw.leads) {
    earliest = Math.min(earliest, new Date(l.receivedAt).getTime());
  }
  for (const d of raw.deliveries) {
    earliest = Math.min(earliest, new Date(d.deliveredAt).getTime());
  }
  if (!Number.isFinite(earliest)) {
    earliest = new Date(raw.windowStart).getTime();
  }
  if (!Number.isFinite(earliest)) {
    earliest = startOfDay(range.lte).getTime();
  }
  return { gte: startOfDay(new Date(earliest)), lte: range.lte };
}

export function computeAdminDashboardChartData(
  leads: AdminDashboardRawLead[],
  /** @deprecated Unused for chart series; kept for call-site compatibility. */
  _deliveries: AdminDashboardRawDelivery[],
  range: { gte: Date; lte: Date },
) {
  const granularity = resolveChartGranularity(range.gte, range.lte);
  const buckets = buildBuckets(range.gte, range.lte, granularity);
  const periodLeads = leads.filter((l) =>
    inRange(l.receivedAt, range.gte, range.lte),
  );

  const intakeByDay: Array<{ label: string; leads: number }> = [];
  const sparkByDay: Array<{ value: number }> = [];

  for (const bucket of buckets) {
    const count = periodLeads.filter((l) => {
      const t = new Date(l.receivedAt).getTime();
      return t >= bucket.start.getTime() && t < bucket.end.getTime();
    }).length;

    intakeByDay.push({ label: bucket.label, leads: count });
    sparkByDay.push({ value: count });
  }

  // Delivery rate among leads that entered in the period (lead status, not
  // delivery events — so delivered/entered stays ≤ 100%).
  const enteredCount = periodLeads.length;
  const deliveredCount = periodLeads.filter(
    (l) => l.status === "delivered",
  ).length;
  const notDeliveredCount = enteredCount - deliveredCount;

  const deliveringDonut =
    enteredCount === 0
      ? []
      : [
          ...(deliveredCount > 0
            ? [{ name: "Delivered", value: deliveredCount }]
            : []),
          ...(notDeliveredCount > 0
            ? [{ name: "Not delivered", value: notDeliveredCount }]
            : []),
        ];

  const deliveryRatePercent =
    enteredCount === 0
      ? null
      : Math.round((deliveredCount / enteredCount) * 100);

  return {
    intakeByDay,
    sparkByDay,
    deliveringDonut,
    deliveryRatePercent,
    granularity,
    volumeLabel: chartVolumeLabel(granularity),
  };
}

export function computeAdminDashboardView(
  raw: AdminDashboardRawData,
  range: { gte?: Date; lte: Date },
) {
  const chartRange = resolveDashboardChartRange(range, raw);

  const leadsInPeriod = raw.leads.filter((l) =>
    inRange(l.receivedAt, range.gte, range.lte),
  ).length;
  const deliveriesInPeriod = raw.deliveries.filter((d) =>
    inRange(d.deliveredAt, range.gte, range.lte),
  ).length;

  const chartData = computeAdminDashboardChartData(
    raw.leads,
    raw.deliveries,
    chartRange,
  );

  const recentLeads = raw.leads
    .filter((l) => inRange(l.receivedAt, range.gte, range.lte))
    .slice(0, 8);

  return {
    chartData,
    kpis: {
      leadsInPeriod,
      deliveriesInPeriod,
      activePartners: raw.activePartners,
      unmatchedLeads: raw.unmatchedLeads,
    },
    recentLeads,
  };
}

/** @deprecated Prefer fetchAdminDashboardRawData + computeAdminDashboardView */
export async function getAdminDashboardChartData(range: {
  gte: Date;
  lte: Date;
}) {
  const window = resolveAdminDashboardLookbackWindow();
  const raw = await fetchAdminDashboardRawData();
  if (range.gte < window.gte) {
    return computeAdminDashboardChartData([], [], range);
  }
  return computeAdminDashboardChartData(raw.leads, raw.deliveries, range);
}
