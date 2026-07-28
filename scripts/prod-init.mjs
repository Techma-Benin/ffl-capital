#!/usr/bin/env node
/**
 * Production initialisation script.
 *
 * What it does (in order):
 *   1. Wipes all transactional / user data from the database.
 *      Reference data (lead_categories, app_settings, admin lead_list_views)
 *      is kept intact.
 *   2. Creates or promotes every email listed in the ADMIN_EMAILS env var
 *      as a Clerk admin user.
 *
 * Usage (run once after the first production deploy):
 *   node scripts/prod-init.mjs
 *
 * Safety flag — the script refuses to run without it:
 *   node scripts/prod-init.mjs --confirm
 *
 * Idempotent: safe to re-run; existing admin accounts are promoted rather
 * than recreated, and generated passwords are printed to stdout so they can
 * be retrieved from deployment logs.
 */

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadDotEnv() {
  try {
    const { readFileSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const envPath = join(root, ".env");
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env may not exist in production — that's fine
  }
}

// ── guards ───────────────────────────────────────────────────────────────────

await loadDotEnv();

if (!process.argv.includes("--confirm")) {
  console.error(
    "\nERROR: Safety flag required.\n\n" +
    "  node scripts/prod-init.mjs --confirm\n\n" +
    "This script WIPES all transactional data from the database.\n" +
    "Only run it on a fresh production deployment.\n",
  );
  process.exit(1);
}

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("ERROR: CLERK_SECRET_KEY is not set.");
  process.exit(1);
}

const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (adminEmails.length === 0) {
  console.warn("WARNING: ADMIN_EMAILS is not set — no admin account will be created.");
}

// ── step 1: wipe transactional data ──────────────────────────────────────────

console.log("\n[1/2] Clearing transactional data…");

const prisma = new PrismaClient();

try {
  await prisma.$transaction([
    // Partner-scoped list views (admin defaults are kept)
    prisma.leadListView.deleteMany({ where: { scope: "partner" } }),
    // Admin profiles (rebuilt from Clerk on next sign-in)
    prisma.adminProfile.deleteMany(),
    // Leads (cascades → lead_events, lead_deliveries, resale_postings)
    prisma.lead.deleteMany(),
    // Partners (cascades → filter_sets, crm_configs, transactions,
    //            billing_recurrence, refund_requests, lead_deliveries)
    prisma.partner.deleteMany(),
    // Any orphaned migration job records
    prisma.migrationJob.deleteMany(),
  ]);
  console.log("  ✓ Transactional data cleared.");
} finally {
  await prisma.$disconnect();
}

// ── step 2: provision admin accounts ─────────────────────────────────────────

console.log("\n[2/2] Provisioning admin accounts…");

if (adminEmails.length === 0) {
  console.log("  (skipped — ADMIN_EMAILS not set)");
} else {
  const clerk = createClerkClient({ secretKey });

  for (const email of adminEmails) {
    try {
      const existing = await clerk.users.getUserList({ emailAddress: [email] });

      if (existing.data.length > 0) {
        const user = existing.data[0];
        const alreadyAdmin = user.publicMetadata?.role === "admin";
        if (alreadyAdmin) {
          console.log(`  ✓ ${email} — already admin, no changes needed.`);
        } else {
          await clerk.users.updateUserMetadata(user.id, {
            publicMetadata: { ...(user.publicMetadata ?? {}), role: "admin" },
          });
          console.log(`  ✓ ${email} — existing user promoted to admin.`);
        }
      } else {
        const password = crypto.randomBytes(12).toString("base64url");
        const user = await clerk.users.createUser({
          emailAddress: [email],
          password,
          firstName: "Admin",
          lastName: "",
          publicMetadata: { role: "admin" },
          skipPasswordChecks: true,
        });
        console.log(
          `  ✓ ${email} — created admin account.\n` +
          `    userId:   ${user.id}\n` +
          `    password: ${password}   ← save this now`,
        );
      }
    } catch (err) {
      console.error(`  ✗ ${email} — failed:`, err?.errors ?? err?.message ?? err);
    }
  }
}

console.log("\n✓ Production init complete.\n");
