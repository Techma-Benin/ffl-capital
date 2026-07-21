import { prisma } from "@/lib/db";

export async function getAdminDashboardChartData() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const [leads, deliveries] = await Promise.all([
    prisma.lead.findMany({
      where: { receivedAt: { gte: start } },
      select: { receivedAt: true },
    }),
    prisma.leadDelivery.findMany({
      where: { deliveredAt: { gte: start } },
      select: { deliveredAt: true, channel: true },
    }),
  ]);

  const intakeByDay: Array<{ label: string; leads: number }> = [];
  const sparkByDay: Array<{ value: number }> = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);

    const count = leads.filter(
      (l) => l.receivedAt >= day && l.receivedAt < next,
    ).length;

    intakeByDay.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      leads: count,
    });
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
