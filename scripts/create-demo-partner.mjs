#!/usr/bin/env node
/**
 * Create or refresh the shared demo partner (Clerk + Prisma).
 *
 * Usage:
 *   npm run create-demo-partner
 *   npm run create-demo-partner -- --email you@example.com --password '...'
 *
 * Defaults: DEMO_PARTNER_EMAIL / DEMO_PARTNER_PASSWORD from the environment.
 * Requires CLERK_SECRET_KEY and DATABASE_URL.
 */
import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const TX_STATES = [
  "TX", "OK", "LA", "AR", "NM", "AZ", "CO", "KS", "MO", "IL",
  "IN", "OH", "KY", "TN", "MS", "AL", "GA", "FL", "SC", "NC",
];

function loadEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--email") args.email = argv[++i];
    else if (arg === "--password") args.password = argv[++i];
    else if (arg === "--first-name") args.firstName = argv[++i];
    else if (arg === "--last-name") args.lastName = argv[++i];
  }
  return args;
}

loadEnv();

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("CLERK_SECRET_KEY is required.");
  process.exit(1);
}

const cli = parseArgs(process.argv.slice(2));
const email =
  cli.email ??
  process.env.DEMO_PARTNER_EMAIL ??
  "bill.ahognonvi@techma.ca";
const password = cli.password ?? process.env.DEMO_PARTNER_PASSWORD;
const firstName = cli.firstName ?? "Bill";
const lastName = cli.lastName ?? "Demo Partner";

if (!password) {
  console.error(
    "DEMO_PARTNER_PASSWORD (or --password) is required to create or reset the demo partner.",
  );
  process.exit(1);
}

const clerk = createClerkClient({ secretKey });
const prisma = new PrismaClient();

try {
  let clerkUserId;
  const existingUsers = await clerk.users.getUserList({ emailAddress: [email] });

  if (existingUsers.data.length > 0) {
    const user = existingUsers.data[0];
    clerkUserId = user.id;
    await clerk.users.updateUser(user.id, {
      password,
      firstName,
      lastName,
      skipPasswordChecks: true,
    });
    const { role: _adminRole, ...restMeta } = (user.publicMetadata ?? {});
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: restMeta,
    });
  } else {
    const user = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      skipPasswordChecks: true,
    });
    clerkUserId = user.id;
  }

  let partner = await prisma.partner.findFirst({
    where: { OR: [{ clerkUserId }, { email }] },
    include: { filterSets: true },
  });

  if (!partner) {
    partner = await prisma.partner.create({
      data: {
        clerkUserId,
        email,
        firstName,
        lastName,
        affiliation: "Techma Demo Agency",
        residenceState: "TX",
        leadType: "high_intent_iul",
        filterStates: TX_STATES,
        priority: 8,
        walletBalance: 500,
        status: "active",
        filterSets: {
          create: {
            name: "Default",
            leadType: "high_intent_iul",
            filterStates: TX_STATES,
            active: true,
            filterCriteria: {},
          },
        },
      },
      include: { filterSets: true },
    });
  } else {
    partner = await prisma.partner.update({
      where: { id: partner.id },
      data: {
        clerkUserId,
        email,
        firstName,
        lastName,
        status: "active",
        walletBalance: partner.walletBalance > 0 ? partner.walletBalance : 500,
      },
      include: { filterSets: true },
    });

    if (partner.filterSets.length === 0) {
      await prisma.partnerFilterSet.create({
        data: {
          partnerId: partner.id,
          name: "Default",
          leadType: "high_intent_iul",
          filterStates: TX_STATES,
          active: true,
          filterCriteria: {},
        },
      });
    }
  }

  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { partnerId: partner.id },
  });

  console.log(
    JSON.stringify({
      action: existingUsers.data.length > 0 ? "updated" : "created",
      email,
      partnerId: partner.id,
      clerkUserId,
      signInUrl: "/partner/sign-in",
      note: "Password applied in Clerk; not logged.",
    }),
  );
} catch (error) {
  console.error("Failed:", error.errors ?? error.message ?? error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
