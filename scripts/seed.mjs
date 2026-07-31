import { PrismaClient, PartnerStatus } from "@prisma/client";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { seedUnmatchedLeads } from "./seed-unmatched-leads.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TX_STATES = [
  "TX", "OK", "LA", "AR", "NM", "AZ", "CO", "KS", "MO", "IL",
  "IN", "OH", "KY", "TN", "MS", "AL", "GA", "FL", "SC", "NC",
];

const CA_STATES = [
  "CA", "NV", "OR", "WA", "AZ", "UT", "ID", "MT", "WY", "CO",
  "NM", "TX", "OK", "KS", "NE", "SD", "ND", "MN", "WI", "MI",
];

const FEW_STATES = ["TX", "CA", "FL", "NY", "IL"];

const APP_SETTING_KEYS = {
  defaultRealtimePrice: "default_realtime_price",
  defaultAgedPrice: "default_aged_price",
  adminApprovalRequired: "admin_approval_required",
  integrationsMode: "integrations_mode",
};

const prisma = new PrismaClient();

function defaultFilterSet(filterStates, leadType, active = true, priority = 5) {
  return {
    create: {
      name: "Default",
      leadType,
      filterStates,
      active,
      priority,
    },
  };
}

async function seedAppSettings() {
  const defaults = [
    { key: APP_SETTING_KEYS.defaultRealtimePrice, value: 25 },
    { key: APP_SETTING_KEYS.defaultAgedPrice, value: 5 },
    { key: APP_SETTING_KEYS.adminApprovalRequired, value: true },
    { key: APP_SETTING_KEYS.integrationsMode, value: "mock" },
  ];

  for (const { key, value } of defaults) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}

async function main() {
  console.log("Seeding app settings…");
  await seedAppSettings();

  console.log("Clearing test data…");
  await prisma.transaction.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.leadDelivery.deleteMany();
  await prisma.resalePosting.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.billingRecurrence.deleteMany();
  await prisma.migrationJob.deleteMany();
  await prisma.partner.deleteMany();

  const baseDate = new Date("2025-01-01T00:00:00Z");

  const fifoOlder = await prisma.partner.create({
    data: {
      email: "fifo-older@ffl-test.local",
      firstName: "FIFO",
      lastName: "Older",
      affiliation: "Test Agency",
      residenceState: "TX",
      filterStates: TX_STATES,
      filterSets: defaultFilterSet(TX_STATES, "high_intent_iul", true, 8),
      priority: 8,
      walletBalance: 500,
      status: PartnerStatus.active,
      createdAt: baseDate,
      // Sample CRM outbound so Partner Settings shows the configured Lead delivery UI.
      crmOutboundConfig: {
        create: {
          enabled: true,
          endpointUrl: "https://crm.example.com/leads",
          httpMethod: "POST",
          authType: "bearer",
          authConfig: { token: "seed-demo-token" },
          fieldMappings: [
            { source: "firstName", target: "first_name" },
            { source: "email", target: "email" },
          ],
          successRule: { require2xx: true },
        },
      },
    },
  });

  const fifoNewer = await prisma.partner.create({
    data: {
      email: "fifo-newer@ffl-test.local",
      firstName: "FIFO",
      lastName: "Newer",
      affiliation: "Test Agency",
      residenceState: "TX",
      filterStates: TX_STATES,
      filterSets: defaultFilterSet(TX_STATES, "high_intent_iul", true, 8),
      priority: 8,
      walletBalance: 500,
      status: PartnerStatus.active,
      createdAt: new Date(baseDate.getTime() + 86400000),
    },
  });

  const txHighPriority = await prisma.partner.create({
    data: {
      email: "tx-priority10@ffl-test.local",
      firstName: "Texas",
      lastName: "Priority10",
      affiliation: "FFL Capital Test",
      residenceState: "TX",
      filterStates: TX_STATES,
      filterSets: defaultFilterSet(TX_STATES, "high_intent_iul", true, 10),
      priority: 10,
      walletBalance: 500,
      status: PartnerStatus.active,
    },
  });

  const caPartner = await prisma.partner.create({
    data: {
      email: "ca-partner@ffl-test.local",
      firstName: "California",
      lastName: "Partner",
      affiliation: "West Coast Agency",
      residenceState: "CA",
      filterStates: CA_STATES,
      filterSets: defaultFilterSet(CA_STATES, "high_intent_iul"),
      priority: 5,
      walletBalance: 500,
      status: PartnerStatus.active,
    },
  });

  const lowBalance = await prisma.partner.create({
    data: {
      email: "low-balance@ffl-test.local",
      firstName: "Low",
      lastName: "Balance",
      affiliation: "Test Agency",
      residenceState: "TX",
      filterStates: TX_STATES,
      filterSets: defaultFilterSet(TX_STATES, "high_intent_iul"),
      priority: 10,
      walletBalance: 5,
      status: PartnerStatus.active,
    },
  });

  const tooFewStates = await prisma.partner.create({
    data: {
      email: "few-states@ffl-test.local",
      firstName: "Few",
      lastName: "States",
      affiliation: "Test Agency",
      residenceState: "TX",
      filterStates: FEW_STATES,
      filterSets: defaultFilterSet(FEW_STATES, "high_intent_iul"),
      priority: 10,
      walletBalance: 500,
      status: PartnerStatus.active,
    },
  });

  const pendingPartner = await prisma.partner.create({
    data: {
      email: "pending@ffl-test.local",
      firstName: "Pending",
      lastName: "Approval",
      affiliation: "Test Agency",
      residenceState: "TX",
      filterStates: TX_STATES,
      filterSets: defaultFilterSet(TX_STATES, "traditional_iul", false),
      priority: 5,
      walletBalance: 500,
      status: PartnerStatus.pending_approval,
    },
  });

  console.log("Seeding unmatched demo leads…");
  const unmatchedLeads = await seedUnmatchedLeads(prisma);

  console.log("Seed complete:", {
    txHighPriority: txHighPriority.id,
    fifoOlder: fifoOlder.id,
    fifoNewer: fifoNewer.id,
    caPartner: caPartner.id,
    lowBalance: lowBalance.id,
    tooFewStates: tooFewStates.id,
    pendingPartner: pendingPartner.id,
    unmatchedLeads: unmatchedLeads.map((l) => ({
      name: l.name,
      state: l.state,
    })),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
