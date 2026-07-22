/**
 * Inserts aged leads (received_at older than the aged-days threshold) for admin
 * /admin/aged and partner /partner/aged UI demos. Does not delete unrelated data.
 * Re-run replaces rows whose external_id starts with aged-demo-.
 *
 * Usage: npm run seed:aged-leads
 */
import { PrismaClient, LeadStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PREFIX = "aged-demo";

const FIRST_NAMES = [
  "Maria",
  "James",
  "Linda",
  "Robert",
  "Patricia",
  "Michael",
  "Jennifer",
  "David",
  "Susan",
  "William",
  "Karen",
  "Richard",
  "Nancy",
  "Joseph",
  "Betty",
  "Thomas",
  "Dorothy",
  "Charles",
  "Lisa",
  "Daniel",
  "Sandra",
  "Paul",
  "Ashley",
  "Mark",
];

const LAST_NAMES = [
  "Garcia",
  "Martinez",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Miller",
  "Davis",
  "Rodriguez",
  "Wilson",
  "Anderson",
  "Taylor",
  "Thomas",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Thompson",
  "White",
  "Harris",
  "Clark",
  "Lewis",
  "Walker",
  "Hall",
];

/** daysAgo, state, leadType, status, available */
const LEADS_PLAN = [
  { daysAgo: 32, state: "TX", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 34, state: "FL", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 36, state: "GA", leadType: "high_intent_iul", status: LeadStatus.aged_listed, available: true },
  { daysAgo: 38, state: "NC", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 40, state: "TN", leadType: "high_intent_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 42, state: "AZ", leadType: "high_intent_iul", status: LeadStatus.integrity_posted, available: false },
  { daysAgo: 44, state: "CO", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 48, state: "OK", leadType: "high_intent_iul", status: LeadStatus.aged_listed, available: true },
  { daysAgo: 52, state: "LA", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 55, state: "SC", leadType: "high_intent_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 58, state: "AL", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 62, state: "IL", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 65, state: "OH", leadType: "traditional_iul", status: LeadStatus.aged_listed, available: true },
  { daysAgo: 68, state: "IN", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 72, state: "MI", leadType: "traditional_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 75, state: "WI", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 78, state: "MN", leadType: "traditional_iul", status: LeadStatus.integrity_posted, available: false },
  { daysAgo: 82, state: "MO", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 85, state: "PA", leadType: "traditional_iul", status: LeadStatus.aged_listed, available: true },
  { daysAgo: 88, state: "VA", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 92, state: "OR", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 95, state: "KS", leadType: "traditional_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 100, state: "NE", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 110, state: "TX", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
];

function daysAgoDate(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 30, 0, 0);
  return d;
}

async function removeExistingDemoLeads() {
  const demoLeads = await prisma.lead.findMany({
    where: { externalId: { startsWith: `${DEMO_PREFIX}-` } },
    select: { id: true },
  });
  if (demoLeads.length === 0) return 0;

  const ids = demoLeads.map((l) => l.id);
  await prisma.leadEvent.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.leadDelivery.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.resalePosting.deleteMany({ where: { leadId: { in: ids } } });
  const removed = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  return removed.count;
}

async function main() {
  const removed = await removeExistingDemoLeads();
  if (removed > 0) {
    console.log(`Removed ${removed} previous aged-demo lead(s).`);
  }

  const created = [];
  let n = 0;

  for (const row of LEADS_PLAN) {
    n += 1;
    const receivedAt = daysAgoDate(row.daysAgo, 8 + (n % 10));
    const firstName = FIRST_NAMES[(n - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(n - 1) % LAST_NAMES.length];
    const externalId = `${DEMO_PREFIX}-${n}`;

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email: `${externalId}@aged-demo.example.com`,
        phone: `555030${String(n).padStart(4, "0").slice(-4)}`,
        address: `${100 + n} Oak Street`,
        city: "Springfield",
        state: row.state,
        zip: String(75000 + n).slice(0, 5),
        age: String(35 + (n % 25)),
        leadType: row.leadType,
        intent: row.leadType === "high_intent_iul" ? "High Intent" : "Traditional",
        haveIul: n % 3 === 0 ? "Yes" : "No",
        primaryGoal: n % 2 === 0 ? "Retirement income" : "Legacy planning",
        source: "aged_demo_seed",
        status: row.status,
        available: row.available,
        receivedAt,
        createdAt: receivedAt,
        externalId,
        trustedformCertUrl:
          n % 4 === 0 ? `https://cert.trustedform.com/${externalId}` : null,
      },
    });
    created.push({
      id: lead.id,
      daysAgo: row.daysAgo,
      state: row.state,
      leadType: row.leadType,
      status: row.status,
    });
  }

  const minDays = Math.min(...LEADS_PLAN.map((r) => r.daysAgo));
  const maxDays = Math.max(...LEADS_PLAN.map((r) => r.daysAgo));
  const byStatus = {};
  for (const c of created) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }

  console.log("Aged leads seed complete:", {
    count: created.length,
    ageRangeDays: `${minDays}–${maxDays}`,
    byStatus,
    highIntent: created.filter((c) => c.leadType === "high_intent_iul").length,
    traditional: created.filter((c) => c.leadType === "traditional_iul").length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
