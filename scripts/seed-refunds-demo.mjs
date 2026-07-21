/**
 * Sample refund requests for admin /admin/refunds (type chips, pending + history).
 * Idempotent: re-run replaces demo refund rows tied to external_id refund-demo-* leads.
 *
 * Usage: npm run seed:refunds-demo
 */
import { PrismaClient, LeadStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PREFIX = "refund-demo";
const TX_STATES = [
  "TX", "OK", "LA", "AR", "NM", "AZ", "CO", "KS", "MO", "IL",
  "IN", "OH", "KY", "TN", "MS", "AL", "GA", "FL", "SC", "NC",
];

const REFUND_PLAN = [
  { n: 1, status: "pending", refundType: "wrong_filter", reason: "Lead state outside my filter (demo)" },
  { n: 2, status: "pending", refundType: "wrong_filter", reason: "Wrong product type on delivery (demo)" },
  { n: 3, status: "pending", refundType: "invalid_phone", reason: "Number disconnected on first dial (demo)" },
  { n: 4, status: "pending", refundType: "invalid_phone", reason: "Wrong party / not the applicant (demo)" },
  { n: 5, status: "pending", refundType: "wrong_filter", reason: "Duplicate within filter window (demo)" },
  { n: 6, status: "approved", refundType: "wrong_filter", reason: "Approved wrong-filter case (demo)" },
  { n: 7, status: "approved", refundType: "invalid_phone", reason: "Approved invalid-phone case (demo)" },
  { n: 8, status: "approved", refundType: "wrong_filter", reason: "Second approved wrong filter (demo)" },
  { n: 9, status: "rejected", refundType: "invalid_phone", reason: "Rejected — phone verified (demo)" },
  { n: 10, status: "rejected", refundType: "wrong_filter", reason: "Rejected — matched filter set (demo)" },
  { n: 11, status: "pending", refundType: "wrong_filter", reason: "Extra pending wrong filter (demo)" },
  { n: 12, status: "pending", refundType: "invalid_phone", reason: "Extra pending invalid phone (demo)" },
  { n: 13, status: "pending", refundType: "wrong_filter", reason: "Pagination test pending 13 (demo)" },
  { n: 14, status: "pending", refundType: "invalid_phone", reason: "Pagination test pending 14 (demo)" },
  { n: 15, status: "pending", refundType: "wrong_filter", reason: "Pagination test pending 15 (demo)" },
  { n: 16, status: "pending", refundType: "invalid_phone", reason: "Pagination test pending 16 (demo)" },
  { n: 17, status: "approved", refundType: "wrong_filter", reason: "History pagination approved 17 (demo)" },
  { n: 18, status: "approved", refundType: "invalid_phone", reason: "History pagination approved 18 (demo)" },
  { n: 19, status: "rejected", refundType: "wrong_filter", reason: "History pagination rejected 19 (demo)" },
  { n: 20, status: "rejected", refundType: "invalid_phone", reason: "History pagination rejected 20 (demo)" },
  { n: 21, status: "approved", refundType: "wrong_filter", reason: "History pagination approved 21 (demo)" },
  { n: 22, status: "rejected", refundType: "invalid_phone", reason: "History pagination rejected 22 (demo)" },
];

async function getOrCreatePartner() {
  const existing = await prisma.partner.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.partner.create({
    data: {
      email: "refund-demo@ffl-test.local",
      firstName: "Refund",
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

async function getOrCreateDelivery(partner, n) {
  const externalId = `${DEMO_PREFIX}-${n}`;
  let lead = await prisma.lead.findFirst({ where: { externalId } });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        firstName: "Refund",
        lastName: `Demo${n}`,
        email: `${externalId}@example.com`,
        phone: `555020${String(n).padStart(4, "0").slice(-4)}`,
        state: n % 2 === 0 ? "TX" : "FL",
        leadType: "high_intent_iul",
        source: "refund_demo_seed",
        status: LeadStatus.delivered,
        externalId,
        receivedAt: new Date(Date.now() - n * 86400000),
      },
    });
  }

  let delivery = await prisma.leadDelivery.findFirst({
    where: { leadId: lead.id, partnerId: partner.id },
  });

  if (!delivery) {
    delivery = await prisma.leadDelivery.create({
      data: {
        leadId: lead.id,
        partnerId: partner.id,
        channel: n % 3 === 0 ? "aged" : "realtime",
        price: n % 3 === 0 ? 5 : 25,
        deliveredAt: new Date(Date.now() - n * 86400000 + 3600000),
      },
    });
  }

  return delivery;
}

async function main() {
  const partner = await getOrCreatePartner();
  const reviewer = partner;

  const demoLeads = await prisma.lead.findMany({
    where: { externalId: { startsWith: `${DEMO_PREFIX}-` } },
    select: { id: true },
  });
  if (demoLeads.length > 0) {
    const deliveries = await prisma.leadDelivery.findMany({
      where: { leadId: { in: demoLeads.map((l) => l.id) } },
      select: { id: true },
    });
    const deliveryIds = deliveries.map((d) => d.id);
    if (deliveryIds.length > 0) {
      const removed = await prisma.refundRequest.deleteMany({
        where: { leadDeliveryId: { in: deliveryIds } },
      });
      console.log(`Removed ${removed.count} existing demo refund request(s).`);
    }
  }

  const created = [];
  for (const row of REFUND_PLAN) {
    const delivery = await getOrCreateDelivery(partner, row.n);
    const reviewedAt =
      row.status === "pending"
        ? null
        : new Date(Date.now() - row.n * 3600000);

    const refund = await prisma.refundRequest.create({
      data: {
        leadDeliveryId: delivery.id,
        partnerId: partner.id,
        refundType: row.refundType,
        reason: row.reason,
        status: row.status,
        reviewedById: row.status === "pending" ? null : reviewer.id,
        reviewedAt,
        createdAt: new Date(Date.now() - row.n * 7200000),
      },
    });
    created.push({ id: refund.id, ...row });
  }

  const pending = created.filter((r) => r.status === "pending");
  const approved = created.filter((r) => r.status === "approved");
  const rejected = created.filter((r) => r.status === "rejected");
  const wrongFilter = created.filter((r) => r.refundType === "wrong_filter");
  const invalidPhone = created.filter((r) => r.refundType === "invalid_phone");

  console.log("Refund demo seed complete:", {
    total: created.length,
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    wrong_filter: wrongFilter.length,
    invalid_phone: invalidPhone.length,
    partnerId: partner.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
