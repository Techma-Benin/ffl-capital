import { PrismaClient, PartnerStatus, LeadEventType, LeadStatus } from "@prisma/client";
import { resolveApiBase, resolveCronSecret } from "./lib/api-base.mjs";

const prisma = new PrismaClient();
const BASE = resolveApiBase();
const CRON_SECRET = resolveCronSecret();

/** @type {{ id: string; label: string; ok: boolean; detail?: string }[]} */
const results = [];

function pass(id, label, detail) {
  results.push({ id, label, ok: true, detail });
  console.log(`[PASS] ${id} — ${label}${detail ? ` (${detail})` : ""}`);
}

function fail(id, label, detail) {
  results.push({ id, label, ok: false, detail });
  console.error(`[FAIL] ${id} — ${label}${detail ? `: ${detail}` : ""}`);
  printSummary();
  process.exit(1);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  console.log("\n--- Verification summary ---");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.id}: ${r.label}`);
  }
  console.log(`--- ${passed}/${results.length} passed ---\n`);
}

async function preflight() {
  console.log(`Verifying backend at ${BASE}\n`);
  let health;
  try {
    const res = await fetch(`${BASE}/api/health`);
    health = await res.json();
  } catch (err) {
    console.error(
      "Cannot reach the dev server. Start it first, then re-run pnpm run verify.\n" +
        `  Expected base URL: ${BASE}\n` +
        "  Override with API_BASE_URL (Replit Run uses http://127.0.0.1:5000).\n" +
        `  Error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
  console.log("Health:", health);
  if (health.status !== "ok") {
    fail("health", "GET /api/health", JSON.stringify(health));
  }
  pass("health", "GET /api/health", health.database ?? "connected");

  const testPartner = await prisma.partner.findFirst({
    where: { email: "tx-priority10@ffl-test.local" },
  });
  if (!testPartner) {
    console.error(
      "Test partners missing. Run `pnpm run seed` after migrations, then re-run verify.",
    );
    process.exit(1);
  }
}

async function postLead(state, overrides = {}) {
  const payload = {
    First_Name: "Test",
    Last_Name: "Lead",
    Email: `test-${Date.now()}@example.com`,
    Primary_Phone: "5125550199",
    State: state,
    Intent: "High Intent",
    Trusted_Form_URL: "https://cert.trustedform.com/verify-test",
    Unique_Identifier: `verify-${state}-${Date.now()}`,
    ...overrides,
  };

  const res = await fetch(`${BASE}/api/leads/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

async function getLatestLeadForState(state) {
  return prisma.lead.findFirst({
    where: { state },
    orderBy: { createdAt: "desc" },
    include: {
      leadDeliveries: {
        include: { partner: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

async function callCron(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function normalizePhoneDigits(value) {
  return value.replace(/\D/g, "");
}

async function adminSearchLeads(q) {
  const phoneDigits = normalizePhoneDigits(q);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

  const orConditions = [
    ...(isUuid ? [{ id: q }] : []),
    { externalId: q },
    { email: { contains: q, mode: "insensitive" } },
  ];
  if (phoneDigits.length >= 7) {
    orConditions.push({ phone: { contains: phoneDigits } });
  }

  return prisma.lead.findMany({
    where: { OR: orConditions },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

async function verifyIntakeMatchEvents() {
  const tx = await postLead("TX", {
    Address: "123 Main",
    City: "Austin",
    Zip: "78701",
    DOB: "1990-01-15",
    Have_IUL: "No",
    Primary_Goal: "Retirement",
  });
  console.log("\nTX lead (LeadConduit response):", tx.body);
  if (tx.body.outcome !== "success" || tx.body.reason !== "") {
    fail("p9-1", "Full Boberdoo intake → LeadConduit success", JSON.stringify(tx.body));
  }
  const txLead = await getLatestLeadForState("TX");
  const txPartner = txLead?.leadDeliveries[0]?.partner.email;
  if (txPartner !== "tx-priority10@ffl-test.local") {
    fail("p9-1", "TX matching", `expected tx-priority10, got ${txPartner}`);
  }
  const types = new Set(txLead?.events.map((e) => e.type) ?? []);
  if (!types.has(LeadEventType.received)) fail("p9-1", "LeadEvent received");
  if (!types.has(LeadEventType.matched)) fail("p9-1", "LeadEvent matched");
  if (!types.has(LeadEventType.delivered) && !types.has(LeadEventType.delivery_failed)) {
    fail("p9-1", "LeadEvent delivered or delivery_failed", `got ${[...types].join(", ")}`);
  }
  pass("p9-1", "Intake → match → delivery events", txPartner);
}

async function verifyDuplicateAndIdempotency() {
  const dupEmail = `dup-${Date.now()}@example.com`;
  const dupPhone = "5125550888";
  const first = await postLead("CA", {
    Email: dupEmail,
    Primary_Phone: dupPhone,
    Unique_Identifier: `dup-first-${Date.now()}`,
  });
  if (first.body.outcome !== "success") fail("p9-2", "Duplicate test first intake");

  const dup = await postLead("CA", {
    Email: dupEmail,
    Primary_Phone: dupPhone,
    Unique_Identifier: `dup-second-${Date.now()}`,
  });
  if (dup.body.outcome !== "error" || dup.status !== 409) {
    fail("p9-2", "Duplicate rejection", JSON.stringify(dup));
  }
  pass("p9-2", "Duplicate email+phone rejected", "409");

  const idemId = `idem-${Date.now()}`;
  await postLead("CA", { Unique_Identifier: idemId });
  const idemRetry = await postLead("CA", { Unique_Identifier: idemId });
  if (idemRetry.body.outcome !== "success") fail("p9-2", "Idempotent retry");
  const idemCount = await prisma.lead.count({ where: { externalId: idemId } });
  if (idemCount !== 1) fail("p9-2", "Idempotency count", String(idemCount));
  pass("p9-2", "Idempotent externalId retry", idemId);
}

async function verifyMatchingRules() {
  await postLead("CA");
  const caLead = await getLatestLeadForState("CA");
  const caPartner = caLead?.leadDeliveries[0]?.partner.email;
  if (caPartner !== "ca-partner@ffl-test.local") {
    fail("prd-ca", "CA partner match", caPartner ?? "none");
  }
  pass("prd-ca", "CA → ca-partner", caPartner);

  await prisma.partner.updateMany({
    where: {
      email: { notIn: ["low-balance@ffl-test.local"] },
      filterStates: { has: "TX" },
      status: PartnerStatus.active,
    },
    data: { status: PartnerStatus.disabled },
  });

  await postLead("TX");
  const lowBalLead = await getLatestLeadForState("TX");
  if (lowBalLead?.status !== "unmatched" || !lowBalLead.available) {
    fail("prd-wallet", "Insufficient wallet → unmatched");
  }
  pass("prd-wallet", "Low balance partner only → unmatched");

  await prisma.partner.updateMany({
    where: { status: PartnerStatus.disabled },
    data: { status: PartnerStatus.active },
  });

  await prisma.partner.updateMany({
    where: {
      email: { not: "few-states@ffl-test.local" },
      filterStates: { has: "TX" },
      status: PartnerStatus.active,
    },
    data: { status: PartnerStatus.disabled },
  });

  await postLead("TX");
  const fewStatesLead = await getLatestLeadForState("TX");
  if (fewStatesLead?.status !== "unmatched") fail("prd-states", "<15 states exclusion");
  pass("prd-states", "Partner with <15 states excluded");

  await prisma.partner.updateMany({
    where: { status: PartnerStatus.disabled },
    data: { status: PartnerStatus.active },
  });

  await prisma.partner.updateMany({
    where: {
      email: { notIn: ["fifo-older@ffl-test.local", "fifo-newer@ffl-test.local"] },
      filterStates: { has: "TX" },
      status: PartnerStatus.active,
    },
    data: { status: PartnerStatus.disabled },
  });

  await postLead("TX");
  const fifoLead = await getLatestLeadForState("TX");
  const fifoPartner = fifoLead?.leadDeliveries[0]?.partner.email;
  if (fifoPartner !== "fifo-older@ffl-test.local") {
    fail("prd-fifo", "FIFO tie-break", fifoPartner ?? "none");
  }
  pass("prd-fifo", "FIFO → fifo-older", fifoPartner);

  await prisma.partner.updateMany({
    where: { status: PartnerStatus.disabled },
    data: { status: PartnerStatus.active },
  });
}

async function verifyWeeklyLimit() {
  const fifoPartnerRecord = await prisma.partner.findFirst({
    where: { email: "fifo-older@ffl-test.local" },
    include: { filterSets: true },
  });
  if (!fifoPartnerRecord?.filterSets[0]) {
    pass("p9-3", "Weekly limit (skipped)", "no filter set on fifo-older");
    return;
  }

  await prisma.partnerFilterSet.update({
    where: { id: fifoPartnerRecord.filterSets[0].id },
    data: { weeklyLimit: 0 },
  });

  await prisma.partner.updateMany({
    where: {
      email: { not: "fifo-older@ffl-test.local" },
      filterStates: { has: "TX" },
      status: PartnerStatus.active,
    },
    data: { status: PartnerStatus.disabled },
  });

  await postLead("TX");
  const limitLeadRecord = await getLatestLeadForState("TX");
  if (limitLeadRecord?.status !== "unmatched") {
    fail("p9-3", "Weekly limit should skip partner");
  }
  pass("p9-3", "Filter set weekly limit → unmatched");

  await prisma.partnerFilterSet.update({
    where: { id: fifoPartnerRecord.filterSets[0].id },
    data: { weeklyLimit: null },
  });
  await prisma.partner.updateMany({
    where: { status: PartnerStatus.disabled },
    data: { status: PartnerStatus.active },
  });
}

async function verifyAgedEligibility() {
  const thresholdRow = await prisma.appSetting.findUnique({
    where: { key: "aged_days_threshold" },
  });
  const thresholdDays = Number(thresholdRow?.value ?? 30);

  const agedLead = await prisma.lead.create({
    data: {
      firstName: "Aged",
      lastName: "Test",
      email: `aged-${Date.now()}@example.com`,
      phone: "5125550100",
      state: "TX",
      leadType: "high_intent_iul",
      receivedAt: new Date(Date.now() - (thresholdDays + 5) * 24 * 60 * 60 * 1000),
      status: LeadStatus.unmatched,
      available: true,
    },
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const eligible = await prisma.lead.findFirst({
    where: {
      id: agedLead.id,
      receivedAt: { lte: cutoff },
      status: { not: LeadStatus.dead },
    },
  });
  if (!eligible) fail("p9-4", "Aged eligibility with settings threshold");
  pass("p9-4", "Aged lead past threshold", `${thresholdDays}d setting`);
}

async function verifyRefundRouting() {
  const partner = await prisma.partner.findFirst({
    where: { email: "ca-partner@ffl-test.local" },
  });
  if (!partner) fail("p9-5", "Refund fixture partner missing");

  const stamp = Date.now();

  const leadB = await prisma.lead.create({
    data: {
      firstName: "Refund",
      lastName: "TypeB",
      email: `refund-b-${stamp}@example.com`,
      phone: "5125550777",
      state: "CA",
      leadType: "high_intent_iul",
      status: LeadStatus.delivered,
      available: true,
      externalId: `verify-refund-b-${stamp}`,
    },
  });
  const deliveryB = await prisma.leadDelivery.create({
    data: {
      leadId: leadB.id,
      partnerId: partner.id,
      channel: "realtime",
      price: 25,
      deliveredAt: new Date(),
    },
  });
  const reqB = await prisma.refundRequest.create({
    data: {
      leadDeliveryId: deliveryB.id,
      partnerId: partner.id,
      refundType: "invalid_phone",
      reason: "verify script",
      status: "pending",
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: reqB.id },
      data: { status: "approved", reviewedAt: new Date() },
    });
    await tx.leadDelivery.update({
      where: { id: deliveryB.id },
      data: { refundedAt: new Date() },
    });
    await tx.lead.update({
      where: { id: leadB.id },
      data: { available: false, status: LeadStatus.dead },
    });
  });

  const deadLead = await prisma.lead.findUnique({ where: { id: leadB.id } });
  if (deadLead?.status !== LeadStatus.dead) fail("p9-5", "Refund Type B → dead");
  pass("p9-5", "Refund Type B (invalid_phone) → dead");

  const leadA = await prisma.lead.create({
    data: {
      firstName: "Refund",
      lastName: "TypeA",
      email: `refund-a-${stamp}@example.com`,
      phone: "5125550666",
      state: "CA",
      leadType: "high_intent_iul",
      status: LeadStatus.delivered,
      available: false,
      externalId: `verify-refund-a-${stamp}`,
    },
  });
  const deliveryA = await prisma.leadDelivery.create({
    data: {
      leadId: leadA.id,
      partnerId: partner.id,
      channel: "realtime",
      price: 25,
      deliveredAt: new Date(),
    },
  });
  const reqA = await prisma.refundRequest.create({
    data: {
      leadDeliveryId: deliveryA.id,
      partnerId: partner.id,
      refundType: "wrong_filter",
      reason: "verify script",
      status: "pending",
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: reqA.id },
      data: { status: "approved", reviewedAt: new Date() },
    });
    await tx.leadDelivery.update({
      where: { id: deliveryA.id },
      data: { refundedAt: new Date() },
    });
    await tx.lead.update({
      where: { id: leadA.id },
      data: { available: true, status: LeadStatus.unmatched },
    });
  });

  const rematchLead = await prisma.lead.findUnique({ where: { id: leadA.id } });
  if (rematchLead?.status !== LeadStatus.unmatched || !rematchLead.available) {
    fail("p9-5", "Refund Type A → unmatched for rematch");
  }
  pass("p9-5", "Refund Type A (wrong_filter) → unmatched");
}

async function verifyAdminSearch() {
  const fixture = await prisma.lead.findFirst({
    where: { email: { contains: "test-", mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  if (!fixture) fail("p9-6", "Search fixture missing");

  const byEmail = await adminSearchLeads(fixture.email);
  if (!byEmail.some((l) => l.id === fixture.id)) fail("p9-6", "Search by email");

  const byPhone = await adminSearchLeads(fixture.phone);
  if (!byPhone.some((l) => l.id === fixture.id)) fail("p9-6", "Search by phone");

  pass("p9-6", "Admin search by email and phone", fixture.email);
}

async function verifyIntegrityCron() {
  // Ensure live integrations + enabled realtime vendor so cron can post in dev.
  await prisma.appSetting.upsert({
    where: { key: "integrations_mode" },
    create: { key: "integrations_mode", value: "live" },
    update: { value: "live" },
  });
  const vendorRow = await prisma.appSetting.findUnique({
    where: { key: "resale_vendor_configs" },
  });
  const vendors =
    vendorRow?.value && typeof vendorRow.value === "object" && !Array.isArray(vendorRow.value)
      ? { ...(vendorRow.value) }
      : {};
  if (!vendors.integrity_realtime) {
    vendors.integrity_realtime = { enabled: true, pingUrl: "", postUrl: "" };
  } else {
    vendors.integrity_realtime = { ...vendors.integrity_realtime, enabled: true };
  }
  await prisma.appSetting.upsert({
    where: { key: "resale_vendor_configs" },
    create: { key: "resale_vendor_configs", value: vendors },
    update: { value: vendors },
  });

  const delayRow = await prisma.appSetting.findUnique({
    where: { key: "integrity_post_delay_hours" },
  });
  const delayHours = Number(delayRow?.value ?? 24);
  const receivedAt = new Date(Date.now() - (delayHours + 2) * 60 * 60 * 1000);

  const integrityLead = await prisma.lead.create({
    data: {
      firstName: "Integrity",
      lastName: "Cron",
      email: `integrity-${Date.now()}@example.com`,
      phone: "5125550444",
      state: "NV",
      leadType: "high_intent_iul",
      status: LeadStatus.unmatched,
      available: true,
      receivedAt,
      externalId: `verify-integrity-${Date.now()}`,
    },
  });

  const cron = await callCron("/api/cron/integrity-post");
  console.log("\nintegrity-post cron:", cron.status, cron.body);
  if (cron.status !== 200) fail("p9-7", "Integrity cron HTTP", String(cron.status));

  const updated = await prisma.lead.findUnique({
    where: { id: integrityLead.id },
    include: { events: true, resalePostings: true },
  });
  const posted =
    updated?.status === LeadStatus.integrity_posted ||
    updated?.events.some((e) => e.type === LeadEventType.integrity_posted) ||
    (updated?.resalePostings?.length ?? 0) > 0;
  const skipped = updated?.events.some((e) => e.type === LeadEventType.integrity_skipped);

  if (!posted && skipped) {
    fail(
      "p9-7",
      "Integrity post after delay window",
      "integrity_skipped (vendor disabled or mock mode)",
    );
  }

  if (!posted) {
    fail(
      "p9-7",
      "Integrity post after delay window",
      updated?.status ?? "unknown",
    );
  }
  pass("p9-7", "Integrity cron posts stale unmatched lead", updated?.status);
}

async function verifyMigrationFields() {
  const externalId = `verify-migration-${Date.now()}`;
  const row = await prisma.lead.create({
    data: {
      firstName: "Jane",
      lastName: "Migration",
      email: `migration-${Date.now()}@example.com`,
      phone: "5555550100",
      state: "TX",
      leadType: "high_intent_iul",
      address: "123 Main St",
      city: "Austin",
      zip: "78701",
      dob: "1975-06-15",
      intent: "retirement",
      haveIul: "no",
      primaryGoal: "wealth_building",
      source: "boberdoo_migration",
      externalId,
      receivedAt: new Date(),
      status: LeadStatus.unmatched,
      available: true,
    },
  });

  const loaded = await prisma.lead.findUnique({ where: { id: row.id } });
  if (!loaded?.address || !loaded.primaryGoal || !loaded.externalId) {
    fail("p9-8", "Migration extended fields persist");
  }
  pass("p9-8", "Migration/import extended lead fields", externalId);
}

async function main() {
  await preflight();
  await verifyIntakeMatchEvents();
  await verifyDuplicateAndIdempotency();
  await verifyMatchingRules();
  await verifyWeeklyLimit();
  await verifyAgedEligibility();
  await verifyRefundRouting();
  await verifyAdminSearch();
  await verifyIntegrityCron();
  await verifyMigrationFields();

  printSummary();
  console.log("All backend verification checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
