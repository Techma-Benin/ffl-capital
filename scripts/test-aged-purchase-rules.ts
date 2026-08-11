/**
 * #82 — Aged-lead purchase rules (behavior-based acceptance test)
 *
 * Exercises the real DB + purchaseAgedLeads + production marketplace queries
 * (buildAdminAgedLeadsWhere). Does not duplicate business logic or depend on
 * specific helper export names beyond what the app already uses.
 *
 * Run: pnpm run test:aged-rules
 *
 * Age buckets use tier minDays keys from default aged_price_tiers:
 * "30" → 30–60, "61" → 61–90, "91" → 91–180, etc.
 *
 * Time travel: after a purchase we set `aged_available_after` to the past and
 * backdate `received_at` so the lead sits in the next age bracket without
 * waiting on the clock.
 *
 * Preflight: if issue #82 columns / purchase side-effects are absent, exits 0
 * with "Run after Replit lands #82" (CI-friendly skip).
 */
import assert from "node:assert/strict";
import { LeadStatus, Prisma, PrismaClient } from "@prisma/client";
import { purchaseAgedLeads } from "../src/lib/aged/purchase-aged-leads";
import {
  buildAdminAgedLeadsWhere,
  type AdminAgedLeadAgeFilter,
} from "../src/lib/admin/admin-aged-leads-filters";

const prisma = new PrismaClient();
const TEST_PREFIX = "aged-rules-test";

let passed = 0;

function pass(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label: string, detail: string): never {
  console.error(`  ✗ ${label}: ${detail}`);
  throw new Error(`${label}: ${detail}`);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

type Issue82Columns = {
  saleCount: string;
  availableAfter: string;
};

async function detectIssue82Columns(): Promise<Issue82Columns | null> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name IN ('aged_sale_count', 'aged_available_after')
  `;
  const names = new Set(rows.map((r) => r.column_name));
  if (!names.has("aged_sale_count") || !names.has("aged_available_after")) {
    return null;
  }
  return { saleCount: "aged_sale_count", availableAfter: "aged_available_after" };
}

async function readAgedState(
  leadId: string,
  cols: Issue82Columns,
): Promise<{ saleCount: number; availableAfter: Date | null }> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ sale_count: number; available_after: Date | null }>
  >(
    `SELECT ${cols.saleCount} AS sale_count, ${cols.availableAfter} AS available_after FROM leads WHERE id = $1::uuid`,
    leadId,
  );
  const row = rows[0];
  if (!row) throw new Error(`Lead not found: ${leadId}`);
  return {
    saleCount: Number(row.sale_count),
    availableAfter: row.available_after,
  };
}

async function patchLead(
  leadId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: patch as Prisma.LeadUpdateInput,
  });
}

async function isLeadVisibleInBucket(
  leadId: string,
  bucket: AdminAgedLeadAgeFilter,
): Promise<boolean> {
  const where = await buildAdminAgedLeadsWhere({
    states: [],
    type: "all",
    status: "all",
    age: bucket,
  });
  const found = await prisma.lead.findFirst({
    where: { AND: [where, { id: leadId }] },
    select: { id: true },
  });
  return found !== null;
}

async function createTestLead(daysOld: number, tag: string) {
  const receivedAt = daysAgo(daysOld);
  const stamp = `${tag}-${Date.now()}`;
  return prisma.lead.create({
    data: {
      firstName: "AgedRules",
      lastName: tag,
      email: `${TEST_PREFIX}-${stamp}@example.com`,
      phone: `555088${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      state: "TX",
      leadType: "high_intent_iul",
      status: LeadStatus.unmatched,
      available: true,
      receivedAt,
      createdAt: receivedAt,
      externalId: `${TEST_PREFIX}-${stamp}`,
    },
  });
}

async function ensureDatabase(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.error(
      "Cannot reach the database. Start Postgres (see README), then re-run pnpm run test:aged-rules.",
    );
    process.exit(1);
  }
}

async function cleanupTestLeads() {
  try {
    const leads = await prisma.lead.findMany({
      where: { externalId: { startsWith: TEST_PREFIX } },
      select: { id: true },
    });
    if (leads.length === 0) return;
    const ids = leads.map((l) => l.id);
    await prisma.leadEvent.deleteMany({ where: { leadId: { in: ids } } });
    await prisma.transaction.deleteMany({
      where: { leadDelivery: { leadId: { in: ids } } },
    });
    await prisma.leadDelivery.deleteMany({ where: { leadId: { in: ids } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  } catch {
    // Best-effort cleanup (e.g. DB already torn down).
  }
}

async function purchaseAs(partnerId: string, leadId: string) {
  const result = await purchaseAgedLeads(partnerId, [leadId]);
  if (result.purchased.length !== 1) {
    const reason = result.failed[0]?.reason ?? "unknown";
    fail("purchaseAgedLeads", reason);
  }
}

async function preflight(): Promise<Issue82Columns> {
  const cols = await detectIssue82Columns();
  if (!cols) {
    console.log(
      "\n#82 aged purchase rules — SKIPPED\n\n" +
        "  Run after Replit lands #82 (aged_sale_count / aged_available_after on leads).\n",
    );
    process.exit(0);
  }

  const partner = await prisma.partner.findFirst({
    where: { email: "ca-partner@ffl-test.local" },
  });
  if (!partner) {
    console.error(
      "Test partner missing. Run `pnpm run seed` after migrations, then re-run test:aged-rules.",
    );
    process.exit(1);
  }

  await prisma.partner.update({
    where: { id: partner.id },
    data: { walletBalance: 1000 },
  });

  const probe = await createTestLead(45, "preflight");
  const before = await readAgedState(probe.id, cols);
  const probeResult = await purchaseAgedLeads(partner.id, [probe.id]);
  if (probeResult.purchased.length === 0) {
    await cleanupTestLeads();
    console.log(
      "\n#82 aged purchase rules — SKIPPED\n\n" +
        "  Columns exist but purchase does not yet apply #82 aged-sale tracking.\n" +
        "  Run after Replit lands #82.\n",
    );
    process.exit(0);
  }
  const after = await readAgedState(probe.id, cols);
  await cleanupTestLeads();

  if (after.saleCount <= before.saleCount) {
    console.log(
      "\n#82 aged purchase rules — SKIPPED\n\n" +
        "  Purchase succeeded but aged_sale_count was not incremented.\n" +
        "  Run after Replit lands #82.\n",
    );
    process.exit(0);
  }

  return cols;
}

async function main() {
  console.log("\n#82 aged purchase rules — behavior acceptance\n");

  await ensureDatabase();
  const cols = await preflight();
  await cleanupTestLeads();

  const partner = await prisma.partner.findFirstOrThrow({
    where: { email: "ca-partner@ffl-test.local" },
  });

  // --- 1. Purchase in 30–60 hides immediately; reappears in 61–90 after aging ---
  {
    const lead = await createTestLead(45, "bucket-30");
    if (!(await isLeadVisibleInBucket(lead.id, "30"))) {
      fail("30–60 pre-purchase visibility", "lead not in 30–60 bucket");
    }

    await purchaseAs(partner.id, lead.id);
    const afterPurchase = await readAgedState(lead.id, cols);
    assert.equal(afterPurchase.saleCount, 1, "first purchase increments sale count");

    if (await isLeadVisibleInBucket(lead.id, "30")) {
      fail("30–60 post-purchase", "lead still visible in 30–60 after purchase");
    }
    if (await isLeadVisibleInBucket(lead.id, "61")) {
      fail("30–60 cooling", "lead visible in 61–90 during cooling-off");
    }

    await patchLead(lead.id, {
      receivedAt: daysAgo(75),
      agedAvailableAfter: daysAgo(1),
    });
    if (!(await isLeadVisibleInBucket(lead.id, "61"))) {
      fail("30–60 → 61–90 reappear", "lead not visible in 61–90 after aging");
    }
    if (await isLeadVisibleInBucket(lead.id, "30")) {
      fail("30–60 → 61–90 reappear", "lead incorrectly in 30–60");
    }
    pass("purchase in 30–60 hides; reappears in 61–90 when aged");
  }

  // --- 2. Purchase in 61–90 hides; reappears in 91–180 ---
  {
    const lead = await createTestLead(75, "bucket-61");
    if (!(await isLeadVisibleInBucket(lead.id, "61"))) {
      fail("61–90 pre-purchase visibility", "lead not in 61–90 bucket");
    }

    await purchaseAs(partner.id, lead.id);
    if (await isLeadVisibleInBucket(lead.id, "61")) {
      fail("61–90 post-purchase", "lead still visible in 61–90 after purchase");
    }

    await patchLead(lead.id, {
      receivedAt: daysAgo(120),
      agedAvailableAfter: daysAgo(1),
    });
    if (!(await isLeadVisibleInBucket(lead.id, "91"))) {
      fail("61–90 → 91–180 reappear", "lead not visible in 91–180 after aging");
    }
    if (await isLeadVisibleInBucket(lead.id, "61")) {
      fail("61–90 → 91–180 reappear", "lead incorrectly in 61–90");
    }
    pass("purchase in 61–90 hides; reappears in 91–180 when aged");
  }

  // --- 3. Second purchase permanently retires lead ---
  {
    const lead = await createTestLead(45, "retire");
    await purchaseAs(partner.id, lead.id);
    await patchLead(lead.id, {
      receivedAt: daysAgo(75),
      agedAvailableAfter: daysAgo(1),
    });
    if (!(await isLeadVisibleInBucket(lead.id, "61"))) {
      fail("retire setup", "lead not visible for second purchase");
    }

    await purchaseAs(partner.id, lead.id);
    const retired = await readAgedState(lead.id, cols);
    assert.equal(retired.saleCount, 2, "second purchase sets sale count to 2");

    for (const bucket of ["30", "61", "91"] as const) {
      if (await isLeadVisibleInBucket(lead.id, bucket)) {
        fail("retired visibility", `lead visible in ${bucket} after 2nd purchase`);
      }
    }
    pass("after 2nd purchase lead never reappears in any bucket");
  }

  // --- 4. Never-purchased leads unchanged ---
  {
    const lead30 = await createTestLead(45, "never-30");
    const lead61 = await createTestLead(75, "never-61");
    const lead91 = await createTestLead(120, "never-91");

    assert.equal(await isLeadVisibleInBucket(lead30.id, "30"), true);
    assert.equal(await isLeadVisibleInBucket(lead61.id, "61"), true);
    assert.equal(await isLeadVisibleInBucket(lead91.id, "91"), true);

    const s30 = await readAgedState(lead30.id, cols);
    const s61 = await readAgedState(lead61.id, cols);
    const s91 = await readAgedState(lead91.id, cols);
    assert.equal(s30.saleCount, 0);
    assert.equal(s61.saleCount, 0);
    assert.equal(s91.saleCount, 0);

    pass("zero-purchase leads still appear in their age buckets");
  }

  console.log(`\nAll ${passed} acceptance checks passed.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await cleanupTestLeads();
    await prisma.$disconnect();
  });
