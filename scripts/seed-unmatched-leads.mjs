/**
 * Inserts unmatched, available leads for bulk-reprocess modal testing.
 * Leads match active partner filter sets (state + high_intent_iul) where the
 * partner wallet can cover the default realtime price ($25).
 *
 * Does not delete partners or unrelated data. Re-run replaces rows whose
 * external_id starts with unmatched-demo-.
 *
 * Partner coverage (from scripts/seed.mjs):
 *   TX high_intent_iul → FIFO Older, FIFO Newer, Texas Priority10, California Partner
 *   CA high_intent_iul → California Partner only
 *   FL high_intent_iul → same as TX (FL in both TX_STATES and CA_STATES)
 *
 * Low Balance ($5 wallet) matches filter criteria but is excluded by wallet check
 * at $25 default price. Few States has <15 filter states and is ineligible.
 *
 * Usage: pnpm run seed:unmatched-leads
 * Full reset: pnpm run seed  (partners + these leads)
 */
import { PrismaClient, LeadStatus, LeadCategoryResolution } from "@prisma/client";

export const DEMO_PREFIX = "unmatched-demo";

/** @type {Array<{ firstName: string; lastName: string; state: string; note?: string }>} */
export const UNMATCHED_LEADS_PLAN = [
  {
    firstName: "Mikee",
    lastName: "Jonezz",
    state: "TX",
    note: "Primary bulk-reprocess test case (TX / high_intent_iul)",
  },
  {
    firstName: "Sarah",
    lastName: "Martinez",
    state: "CA",
    note: "Matches California Partner only",
  },
  {
    firstName: "James",
    lastName: "Wilson",
    state: "FL",
    note: "Matches all funded TX + CA partners",
  },
  {
    firstName: "Emma",
    lastName: "Davis",
    state: "OK",
    note: "Secondary TX-region lead for multi-select reprocess",
  },
  {
    firstName: "Robert",
    lastName: "Chen",
    state: "AZ",
    note: "Southwest TX-region lead",
  },
];

function hoursAgo(hours) {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

export async function removeExistingUnmatchedDemoLeads(prisma) {
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

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 */
export async function seedUnmatchedLeads(prisma) {
  const removed = await removeExistingUnmatchedDemoLeads(prisma);
  if (removed > 0) {
    console.log(`  Removed ${removed} previous ${DEMO_PREFIX} lead(s).`);
  }

  const created = [];

  for (let i = 0; i < UNMATCHED_LEADS_PLAN.length; i++) {
    const row = UNMATCHED_LEADS_PLAN[i];
    const n = i + 1;
    const externalId = `${DEMO_PREFIX}-${n}`;
    const receivedAt = hoursAgo(2 + i);

    const lead = await prisma.lead.create({
      data: {
        firstName: row.firstName,
        lastName: row.lastName,
        email: `${externalId}@unmatched-demo.example.com`,
        phone: `555040${String(n).padStart(4, "0").slice(-4)}`,
        address: `${200 + n} Demo Lane`,
        city: row.state === "CA" ? "Los Angeles" : "Austin",
        state: row.state,
        zip: row.state === "CA" ? "90001" : "78701",
        age: String(38 + (n % 12)),
        dob: "1985-06-15",
        leadType: "high_intent_iul",
        categoryResolution: LeadCategoryResolution.matched,
        categoryCandidateTypes: [],
        intent: "High Intent",
        haveIul: "No",
        primaryGoal: "Retirement income",
        stateYouCurrentlyLiveIn: row.state,
        source: "unmatched_demo_seed",
        status: LeadStatus.unmatched,
        available: true,
        refundable: true,
        receivedAt,
        createdAt: receivedAt,
        externalId,
        trustedformCertUrl: `https://cert.trustedform.com/${externalId}`,
      },
    });

    created.push({
      id: lead.id,
      name: `${row.firstName} ${row.lastName}`,
      state: row.state,
      leadType: "high_intent_iul",
      note: row.note,
    });
  }

  return created;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const activePartners = await prisma.partner.count({
      where: { status: "active" },
    });
    if (activePartners === 0) {
      console.error(
        "No active partners found. Run `pnpm run seed` first to create test partners.",
      );
      process.exit(1);
    }

    console.log("Seeding unmatched demo leads…");
    const created = await seedUnmatchedLeads(prisma);

    console.log("Unmatched leads seed complete:", {
      count: created.length,
      leads: created.map(({ name, state, note }) => ({ name, state, note })),
      eligiblePartners:
        "FIFO Older, FIFO Newer, Texas Priority10, California Partner (not Low Balance — $5 wallet)",
    });
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("seed-unmatched-leads.mjs") ||
    process.argv[1].includes("seed-unmatched-leads"));

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
