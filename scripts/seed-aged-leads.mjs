/**
 * Inserts aged leads (received_at older than the aged-days threshold) for admin
 * /admin/aged and partner /partner/aged UI demos. Partner marketplace lists the
 * full aged pool (no filter-set targeting). Does not delete unrelated data.
 * Re-run replaces rows whose external_id starts with aged-demo-.
 *
 * Covers built-in categories: high_intent_iul, traditional_iul,
 * mortgage_protection, final_expense (across several age tiers).
 *
 * Usage: pnpm run seed:aged-leads
 */
import { PrismaClient, LeadStatus, LeadCategoryResolution } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PREFIX = "aged-demo";

/** Category types this seed expects to exist and be enabled. */
const REQUIRED_CATEGORY_TYPES = [
  "high_intent_iul",
  "traditional_iul",
  "mortgage_protection",
  "final_expense",
];

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
  { daysAgo: 36, state: "GA", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 38, state: "NC", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 40, state: "TN", leadType: "high_intent_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 42, state: "AZ", leadType: "high_intent_iul", status: LeadStatus.integrity_posted, available: false },
  { daysAgo: 44, state: "CO", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 48, state: "OK", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 52, state: "LA", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 55, state: "SC", leadType: "high_intent_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 58, state: "AL", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 62, state: "IL", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 65, state: "OH", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 68, state: "IN", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 72, state: "MI", leadType: "traditional_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 75, state: "WI", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 78, state: "MN", leadType: "traditional_iul", status: LeadStatus.integrity_posted, available: false },
  { daysAgo: 82, state: "MO", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 85, state: "PA", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 88, state: "VA", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 92, state: "OR", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 95, state: "KS", leadType: "traditional_iul", status: LeadStatus.delivered, available: false },
  { daysAgo: 100, state: "NE", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 110, state: "TX", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 140, state: "AR", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 165, state: "MS", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  // 181–365 → $2
  { daysAgo: 200, state: "KY", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 240, state: "IA", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 300, state: "NV", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 340, state: "UT", leadType: "traditional_iul", status: LeadStatus.delivered, available: false },
  // 366+ → $1
  { daysAgo: 400, state: "NM", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 450, state: "ID", leadType: "traditional_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 500, state: "MT", leadType: "high_intent_iul", status: LeadStatus.unmatched, available: true },
  { daysAgo: 600, state: "WY", leadType: "traditional_iul", status: LeadStatus.integrity_posted, available: false },

  // Mortgage Protection — ~30–90d, ~180–300d, 366+
  { daysAgo: 33, state: "TX", leadType: "mortgage_protection", status: LeadStatus.unmatched, available: true },
  { daysAgo: 45, state: "FL", leadType: "mortgage_protection", status: LeadStatus.unmatched, available: true },
  { daysAgo: 70, state: "GA", leadType: "mortgage_protection", status: LeadStatus.unmatched, available: true },
  { daysAgo: 90, state: "NC", leadType: "mortgage_protection", status: LeadStatus.delivered, available: false },
  { daysAgo: 190, state: "AZ", leadType: "mortgage_protection", status: LeadStatus.unmatched, available: true },
  { daysAgo: 250, state: "CO", leadType: "mortgage_protection", status: LeadStatus.unmatched, available: true },
  { daysAgo: 320, state: "TN", leadType: "mortgage_protection", status: LeadStatus.integrity_posted, available: false },
  { daysAgo: 380, state: "OK", leadType: "mortgage_protection", status: LeadStatus.unmatched, available: true },

  // Final Expense / Veteran — a few across tiers
  { daysAgo: 35, state: "SC", leadType: "final_expense", status: LeadStatus.unmatched, available: true },
  { daysAgo: 80, state: "AL", leadType: "final_expense", status: LeadStatus.unmatched, available: true },
  { daysAgo: 210, state: "LA", leadType: "final_expense", status: LeadStatus.unmatched, available: true },
  { daysAgo: 410, state: "MS", leadType: "final_expense", status: LeadStatus.unmatched, available: true },
];

function daysAgoDate(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 30, 0, 0);
  return d;
}

function intentForLeadType(leadType) {
  if (leadType === "high_intent_iul") return "High Intent";
  if (leadType === "traditional_iul") return "Traditional";
  if (leadType === "mortgage_protection") return "Mortgage Protection";
  if (leadType === "final_expense") return "Final Expense";
  return null;
}

function primaryGoalForLeadType(leadType, n) {
  if (leadType === "mortgage_protection") {
    return n % 2 === 0 ? "Mortgage protection" : "Pay off mortgage";
  }
  if (leadType === "final_expense") {
    return n % 2 === 0 ? "Burial / final expense" : "Leave money for family";
  }
  return n % 2 === 0 ? "Retirement income" : "Legacy planning";
}

function ageTierBucket(daysAgo) {
  if (daysAgo >= 366) return "366+";
  if (daysAgo >= 181) return "181–365";
  return "30–180";
}

async function ensureRequiredCategories() {
  const rows = await prisma.leadCategory.findMany({
    where: { type: { in: REQUIRED_CATEGORY_TYPES } },
    select: { type: true, enabled: true, label: true },
  });
  const byType = new Map(rows.map((r) => [r.type, r]));
  const missing = REQUIRED_CATEGORY_TYPES.filter((t) => !byType.has(t));
  if (missing.length > 0) {
    throw new Error(
      `Missing lead_categories (run migrations / seed categories first): ${missing.join(", ")}`,
    );
  }

  const disabled = rows.filter((r) => !r.enabled);
  for (const row of disabled) {
    await prisma.leadCategory.update({
      where: { type: row.type },
      data: { enabled: true },
    });
    console.log(`Enabled category ${row.type} (${row.label}).`);
  }
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
  await ensureRequiredCategories();

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
    const isMortgage = row.leadType === "mortgage_protection";
    const isFinalExpense = row.leadType === "final_expense";

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
        categoryResolution: LeadCategoryResolution.matched,
        categoryCandidateTypes: [row.leadType],
        intent: intentForLeadType(row.leadType),
        haveIul: isMortgage || isFinalExpense ? null : n % 3 === 0 ? "Yes" : "No",
        primaryGoal: primaryGoalForLeadType(row.leadType, n),
        mortgageLoanAmount: isMortgage
          ? String(150000 + (n % 10) * 25000)
          : null,
        beneficiary: isFinalExpense || isMortgage ? "Spouse" : null,
        beneficiaryType: isFinalExpense || isMortgage ? "Individual" : null,
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
      tier: ageTierBucket(row.daysAgo),
    });
  }

  const minDays = Math.min(...LEADS_PLAN.map((r) => r.daysAgo));
  const maxDays = Math.max(...LEADS_PLAN.map((r) => r.daysAgo));
  const byStatus = {};
  const byType = {};
  const byTier = {};
  const byTypeTier = {};
  for (const c of created) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byType[c.leadType] = (byType[c.leadType] ?? 0) + 1;
    byTier[c.tier] = (byTier[c.tier] ?? 0) + 1;
    const key = `${c.leadType} / ${c.tier}`;
    byTypeTier[key] = (byTypeTier[key] ?? 0) + 1;
  }

  console.log("Aged leads seed complete:", {
    count: created.length,
    ageRangeDays: `${minDays}–${maxDays}`,
    byType,
    byTier,
    byTypeTier,
    byStatus,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
