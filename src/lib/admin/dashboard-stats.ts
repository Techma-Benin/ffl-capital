import { prisma } from "@/lib/db";
import { PartnerStatus } from "@prisma/client";
import type { AdminDatePeriod } from "@/lib/leads/list-view-schema";
import { resolveAdminDashboardLookbackWindow } from "@/lib/admin/admin-date-period";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayBuckets(gte: Date, lte: Date): Date[] {
  const start = startOfDay(gte);
  const end = startOfDay(lte);
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function inRange(iso: string, gte: Date, lte: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= gte.getTime() && t <= lte.getTime();
}

export type AdminDashboardRawLead = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  leadType: string;
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

export async function fetchAdminDashboardRawData(
  now: Date = new Date(),
): Promise<AdminDashboardRawData> {
  const window = resolveAdminDashboardLookbackWindow(now);

  const [leadRows, deliveryRows, activePartners, unmatchedLeads] =
    await Promise.all([
      prisma.lead.findMany({
        where: {
          receivedAt: { gte: window.gte, lte: window.lte },
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
          deliveredAt: { gte: window.gte, lte: window.lte },
        },
        select: { deliveredAt: true, channel: true },
      }),
      prisma.partner.count({ where: { status: PartnerStatus.active } }),
      prisma.lead.count({
        where: { status: "unmatched", available: true },
      }),
    ]);

  const { ADMIN_DASHBOARD_CLIENT_FILTER_LOOKBACK_DAYS } = await import(
    "@/lib/admin/admin-date-period"
  );

  return {
    lookbackDays: ADMIN_DASHBOARD_CLIENT_FILTER_LOOKBACK_DAYS,
    windowStart: window.gte.toISOString(),
    windowEnd: window.lte.toISOString(),
    leads: leadRows.map((lead) => {
      const delivery = lead.leadDeliveries[0];
      return {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        state: lead.state,
        leadType: lead.leadType,
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

export function computeAdminDashboardChartData(
  leads: AdminDashboardRawLead[],
  deliveries: AdminDashboardRawDelivery[],
  range: { gte: Date; lte: Date },
) {
  const buckets = dayBuckets(range.gte, range.lte);
  const periodLeads = leads.filter((l) =>
    inRange(l.receivedAt, range.gte, range.lte),
  );
  const periodDeliveries = deliveries.filter((d) =>
    inRange(d.deliveredAt, range.gte, range.lte),
  );

  const intakeByDay: Array<{ label: string; leads: number }> = [];
  const sparkByDay: Array<{ value: number }> = [];

  for (const day of buckets) {
    const next = new Date(day);
    next.setDate(day.getDate() + 1);

    const count = periodLeads.filter((l) => {
      const t = new Date(l.receivedAt);
      return t >= day && t < next;
    }).length;

    const label =
      buckets.length === 1
        ? day.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })
        : day.toLocaleDateString("en-US", { weekday: "short" });

    intakeByDay.push({ label, leads: count });
    sparkByDay.push({ value: count });
  }

  const channelMap = new Map<string, number>();
  for (const d of periodDeliveries) {
    const key = d.channel === "realtime" ? "Real-time" : "Aged";
    channelMap.set(key, (channelMap.get(key) ?? 0) + 1);
  }

  const deliveringChannelOrder = ["Real-time", "Aged"] as const;
  const deliveringDonut = [
    ...deliveringChannelOrder
      .filter((name) => channelMap.has(name))
      .map((name) => ({ name, value: channelMap.get(name)! })),
    ...Array.from(channelMap.entries())
      .filter(
        ([name]) =>
          !deliveringChannelOrder.includes(name as "Real-time" | "Aged"),
      )
      .map(([name, value]) => ({ name, value })),
  ];

  return { intakeByDay, sparkByDay, deliveringDonut };
}

export function computeAdminDashboardView(
  raw: AdminDashboardRawData,
  range: { gte: Date; lte: Date },
  periodLabel: string,
  datePeriod: AdminDatePeriod,
) {
  const leadsInPeriod = raw.leads.filter((l) =>
    inRange(l.receivedAt, range.gte, range.lte),
  ).length;
  const deliveriesInPeriod = raw.deliveries.filter((d) =>
    inRange(d.deliveredAt, range.gte, range.lte),
  ).length;

  const chartData = computeAdminDashboardChartData(
    raw.leads,
    raw.deliveries,
    range,
  );

  const recentLeads = raw.leads
    .filter((l) => inRange(l.receivedAt, range.gte, range.lte))
    .slice(0, 8);

  const intakeTitle =
    datePeriod === "last_7_days"
      ? "Lead Intake (7 days)"
      : `Lead Intake (${periodLabel})`;

  return {
    chartData,
    intakeTitle,
    kpis: {
      leadsInPeriod,
      deliveriesInPeriod,
      activePartners: raw.activePartners,
      unmatchedLeads: raw.unmatchedLeads,
      leadsLabel: `Leads (${periodLabel})`,
      deliveriesLabel: `Deliveries (${periodLabel})`,
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
