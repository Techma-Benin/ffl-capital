/**
 * Adds leads + deliveries for the admin dashboard charts (last 7 days).
 * Does not delete existing data. Safe to run multiple times.
 *
 * Usage: node scripts/seed-dashboard-charts.mjs
 */
import { PrismaClient, LeadStatus } from "@prisma/client";

const prisma = new PrismaClient();

const TX_STATES = [
  "TX", "OK", "LA", "AR", "NM", "AZ", "CO", "KS", "MO", "IL",
  "IN", "OH", "KY", "TN", "MS", "AL", "GA", "FL", "SC", "NC",
];

function daysAgo(days, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function getOrCreatePartner() {
  const existing = await prisma.partner.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.partner.create({
    data: {
      email: "dashboard-demo@ffl-test.local",
      firstName: "Dashboard",
      lastName: "Demo",
      affiliation: "Demo",
      residenceState: "TX",
      leadType: "high_intent_iul",
      filterStates: TX_STATES,
      priority: 5,
      walletBalance: 1000,
      status: "active",
    },
  });
}

async function main() {
  const partner = await getOrCreatePartner();
  const tag = `dashboard-demo-${Date.now()}`;

  const plan = [
    { dayOffset: 6, channel: "realtime", count: 2 },
    { dayOffset: 5, channel: "realtime", count: 3 },
    { dayOffset: 4, channel: "aged", count: 2 },
    { dayOffset: 3, channel: "realtime", count: 4 },
    { dayOffset: 2, channel: "aged", count: 3 },
    { dayOffset: 1, channel: "realtime", count: 3 },
    { dayOffset: 0, channel: "aged", count: 3 },
  ];

  let createdLeads = 0;
  let createdDeliveries = 0;
  let n = 0;

  for (const { dayOffset, channel, count } of plan) {
    for (let i = 0; i < count; i++) {
      n += 1;
      const receivedAt = daysAgo(dayOffset, 9 + (i % 8));
      const deliveredAt = new Date(receivedAt.getTime() + 15 * 60 * 1000);
      const price = channel === "realtime" ? 25 : 5;

      const lead = await prisma.lead.create({
        data: {
          firstName: "Demo",
          lastName: `Lead${n}`,
          email: `${tag}-${n}@example.com`,
          phone: `555010${String(n).padStart(4, "0").slice(-4)}`,
          state: "TX",
          leadType: "high_intent_iul",
          source: "dashboard_seed",
          status: LeadStatus.delivered,
          receivedAt,
          externalId: `${tag}-${n}`,
        },
      });
      createdLeads += 1;

      await prisma.leadDelivery.create({
        data: {
          leadId: lead.id,
          partnerId: partner.id,
          channel,
          price,
          deliveredAt,
        },
      });
      createdDeliveries += 1;
    }
  }

  console.log("Dashboard chart seed complete:", {
    partnerId: partner.id,
    createdLeads,
    createdDeliveries,
    realtime: plan
      .filter((p) => p.channel === "realtime")
      .reduce((s, p) => s + p.count, 0),
    aged: plan.filter((p) => p.channel === "aged").reduce((s, p) => s + p.count, 0),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
