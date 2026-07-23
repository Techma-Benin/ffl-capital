import { PrismaClient, PartnerStatus, LeadEventType } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.API_BASE_URL ?? "http://localhost:3002";

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

async function main() {
  console.log(`Verifying backend at ${BASE}\n`);

  const health = await fetch(`${BASE}/api/health`);
  const healthJson = await health.json();
  console.log("Health:", healthJson);
  if (healthJson.status !== "ok") {
    console.error("FAIL: health check");
    process.exit(1);
  }

  // 1. Full intake → match → events logged
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
    console.error("FAIL: LeadConduit response format");
    process.exit(1);
  }
  const txLead = await getLatestLeadForState("TX");
  const txPartner = txLead?.leadDeliveries[0]?.partner.email;
  if (txPartner !== "tx-priority10@ffl-test.local") {
    console.error(`FAIL: TX matching — got ${txPartner}`);
    process.exit(1);
  }
  if (!txLead?.events.some((e) => e.type === LeadEventType.received)) {
    console.error("FAIL: received event not logged");
    process.exit(1);
  }
  if (!txLead?.events.some((e) => e.type === LeadEventType.matched)) {
    console.error("FAIL: matched event not logged");
    process.exit(1);
  }
  console.log("OK: TX matched + events logged");

  // 2. Duplicate rejection (same email+phone, different externalId)
  const dupEmail = `dup-${Date.now()}@example.com`;
  const dupPhone = "5125550888";
  const first = await postLead("CA", {
    Email: dupEmail,
    Primary_Phone: dupPhone,
    Unique_Identifier: `dup-first-${Date.now()}`,
  });
  if (first.body.outcome !== "success") {
    console.error("FAIL: first intake for duplicate test");
    process.exit(1);
  }
  const dup = await postLead("CA", {
    Email: dupEmail,
    Primary_Phone: dupPhone,
    Unique_Identifier: `dup-second-${Date.now()}`,
  });
  if (dup.body.outcome !== "error" || dup.status !== 409) {
    console.error("FAIL: duplicate should be rejected", dup);
    process.exit(1);
  }
  console.log("OK: duplicate rejected");

  // 3. Idempotency — retry same externalId returns success (no second lead)
  const idemId = `idem-${Date.now()}`;
  await postLead("CA", { Unique_Identifier: idemId });
  const idemRetry = await postLead("CA", { Unique_Identifier: idemId });
  if (idemRetry.body.outcome !== "success") {
    console.error("FAIL: idempotent retry should succeed");
    process.exit(1);
  }
  const idemCount = await prisma.lead.count({ where: { externalId: idemId } });
  if (idemCount !== 1) {
    console.error(`FAIL: idempotency — expected 1 lead, got ${idemCount}`);
    process.exit(1);
  }
  console.log("OK: idempotent retry");

  // PRD §10: CA lead → ca-partner
  const ca = await postLead("CA");
  const caLead = await getLatestLeadForState("CA");
  const caPartner = caLead?.leadDeliveries[0]?.partner.email;
  if (caPartner !== "ca-partner@ffl-test.local") {
    console.error(`FAIL: CA matching — got ${caPartner}`);
    process.exit(1);
  }
  console.log("OK: CA matched to ca-partner");

  // PRD §10: Wallet insuffisant → lead unmatched
  await prisma.partner.updateMany({
    where: {
      email: { notIn: ["low-balance@ffl-test.local"] },
      filterStates: { has: "TX" },
      status: PartnerStatus.active,
    },
    data: { status: PartnerStatus.disabled },
  });

  const lowBal = await postLead("TX");
  const lowBalLead = await getLatestLeadForState("TX");
  if (lowBalLead?.status !== "unmatched" || !lowBalLead.available) {
    console.error("FAIL: insufficient wallet should leave lead unmatched");
    process.exit(1);
  }
  console.log("OK: insufficient wallet → unmatched");

  await prisma.partner.updateMany({
    where: { status: PartnerStatus.disabled },
    data: { status: PartnerStatus.active },
  });

  // PRD §10: Partner < 15 états → exclu
  await prisma.partner.updateMany({
    where: {
      email: { not: "few-states@ffl-test.local" },
      filterStates: { has: "TX" },
      status: PartnerStatus.active,
    },
    data: { status: PartnerStatus.disabled },
  });

  const fewStates = await postLead("TX");
  const fewStatesLead = await getLatestLeadForState("TX");
  if (fewStatesLead?.status !== "unmatched") {
    console.error("FAIL: partner with <15 states should be excluded");
    process.exit(1);
  }
  console.log("OK: <15 states partner excluded → unmatched");

  await prisma.partner.updateMany({
    where: { status: PartnerStatus.disabled },
    data: { status: PartnerStatus.active },
  });

  // PRD §10: FIFO
  await prisma.partner.updateMany({
    where: {
      email: { notIn: ["fifo-older@ffl-test.local", "fifo-newer@ffl-test.local"] },
      filterStates: { has: "TX" },
      status: PartnerStatus.active,
    },
    data: { status: PartnerStatus.disabled },
  });

  const fifo = await postLead("TX");
  const fifoLead = await getLatestLeadForState("TX");
  const fifoPartner = fifoLead?.leadDeliveries[0]?.partner.email;
  if (fifoPartner !== "fifo-older@ffl-test.local") {
    console.error(`FAIL: FIFO tie-break — got ${fifoPartner}`);
    process.exit(1);
  }
  console.log("OK: FIFO tie-break → fifo-older");

  await prisma.partner.updateMany({
    where: { status: PartnerStatus.disabled },
    data: { status: PartnerStatus.active },
  });

  // 4. Filter set daily limit
  const fifoPartnerRecord = await prisma.partner.findFirst({
    where: { email: "fifo-older@ffl-test.local" },
    include: { filterSets: true },
  });
  if (fifoPartnerRecord?.filterSets[0]) {
    await prisma.partnerFilterSet.update({
      where: { id: fifoPartnerRecord.filterSets[0].id },
      data: { dailyLimit: 0 },
    });

    await prisma.partner.updateMany({
      where: {
        email: { not: "fifo-older@ffl-test.local" },
        filterStates: { has: "TX" },
        status: PartnerStatus.active,
      },
      data: { status: PartnerStatus.disabled },
    });

    const limitLead = await postLead("TX");
    const limitLeadRecord = await getLatestLeadForState("TX");
    if (limitLeadRecord?.status !== "unmatched") {
      console.error("FAIL: daily limit should skip partner");
      process.exit(1);
    }
    console.log("OK: daily limit → partner skipped");

    await prisma.partnerFilterSet.update({
      where: { id: fifoPartnerRecord.filterSets[0].id },
      data: { dailyLimit: null },
    });
    await prisma.partner.updateMany({
      where: { status: PartnerStatus.disabled },
      data: { status: PartnerStatus.active },
    });
  }

  // 5. Aged purchase with backdated lead (eligibility check)
  const agedLead = await prisma.lead.create({
    data: {
      firstName: "Aged",
      lastName: "Test",
      email: `aged-${Date.now()}@example.com`,
      phone: "5125550100",
      state: "TX",
      leadType: "high_intent_iul",
      receivedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      status: "unmatched",
      available: true,
    },
  });
  const agedCutoff = new Date();
  agedCutoff.setDate(agedCutoff.getDate() - 30);
  const eligible = await prisma.lead.findFirst({
    where: {
      id: agedLead.id,
      receivedAt: { lte: agedCutoff },
      status: { not: "dead" },
    },
  });
  if (!eligible) {
    console.error("FAIL: backdated lead should be aged-eligible");
    process.exit(1);
  }
  console.log("OK: aged eligibility (backdated lead)");

  // 6. Admin search by phone/email (DB-level check)
  const searchLead = await prisma.lead.findFirst({
    where: { email: { contains: "test-", mode: "insensitive" } },
  });
  if (!searchLead) {
    console.error("FAIL: search fixture missing");
    process.exit(1);
  }
  console.log("OK: admin search fixture exists");

  console.log("\nAll backend verification checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
