import { PrismaClient, PartnerStatus } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.API_BASE_URL ?? "http://localhost:3002";

async function postLead(state, intent = "High Intent") {
  const payload = {
    First_Name: "Test",
    Last_Name: "Lead",
    Email: `test-${Date.now()}@example.com`,
    Primary_Phone: "5125550199",
    State: state,
    Intent: intent,
    Trusted_Form_URL: "https://cert.trustedform.com/verify-test",
    Unique_Identifier: `verify-${state}-${Date.now()}`,
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

  // PRD §10: Lead TX → partner priorité max
  const tx = await postLead("TX");
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
  console.log("OK: TX matched to tx-priority10");

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
      email: {
        notIn: ["low-balance@ffl-test.local"],
      },
      filterStates: { has: "TX" },
      leadType: "high_intent_iul",
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

  // PRD §10: Partner < 15 états → exclu (only few-states eligible on paper)
  await prisma.partner.updateMany({
    where: {
      email: { not: "few-states@ffl-test.local" },
      filterStates: { has: "TX" },
      leadType: "high_intent_iul",
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

  // PRD §10: FIFO — égalité priorité → created_at ASC
  await prisma.partner.updateMany({
    where: {
      email: {
        notIn: ["fifo-older@ffl-test.local", "fifo-newer@ffl-test.local"],
      },
      filterStates: { has: "TX" },
      leadType: "high_intent_iul",
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

  console.log("\nAll backend verification checks passed (PRD §10 checklist).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
