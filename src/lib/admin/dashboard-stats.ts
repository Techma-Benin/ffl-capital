import { prisma } from "@/lib/db";

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

export async function getAdminDashboardChartData(range: { gte: Date; lte: Date }) {
  const buckets = dayBuckets(range.gte, range.lte);
  const queryStart = buckets[0] ?? startOfDay(range.gte);

  const [leads, deliveries] = await Promise.all([
    prisma.lead.findMany({
      where: { receivedAt: { gte: queryStart, lte: range.lte } },
      select: { receivedAt: true },
    }),
    prisma.leadDelivery.findMany({
      where: { deliveredAt: { gte: queryStart, lte: range.lte } },
      select: { deliveredAt: true, channel: true },
    }),
  ]);

  const intakeByDay: Array<{ label: string; leads: number }> = [];
  const sparkByDay: Array<{ value: number }> = [];

  for (const day of buckets) {
    const next = new Date(day);
    next.setDate(day.getDate() + 1);

    const count = leads.filter(
      (l) => l.receivedAt >= day && l.receivedAt < next,
    ).length;

    const label =
      buckets.length === 1
        ? day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        : day.toLocaleDateString("en-US", { weekday: "short" });

    intakeByDay.push({ label, leads: count });
    sparkByDay.push({ value: count });
  }

  const channelMap = new Map<string, number>();
  for (const d of deliveries) {
    const key = d.channel === "realtime" ? "Real-time" : "Aged";
    channelMap.set(key, (channelMap.get(key) ?? 0) + 1);
  }

  const deliveringChannelOrder = ["Real-time", "Aged"] as const;
  const deliveringDonut = [
    ...deliveringChannelOrder
      .filter((name) => channelMap.has(name))
      .map((name) => ({ name, value: channelMap.get(name)! })),
    ...Array.from(channelMap.entries())
      .filter(([name]) => !deliveringChannelOrder.includes(name as "Real-time" | "Aged"))
      .map(([name, value]) => ({ name, value })),
  ];

  return { intakeByDay, sparkByDay, deliveringDonut };
}
