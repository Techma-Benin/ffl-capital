#!/usr/bin/env node
/**
 * One-off bootstrap: mark an existing admin as the super admin.
 *
 * The in-app "Make super admin" action requires an existing super admin to
 * grant the title, so the very first super admin has to be designated
 * out-of-band via the Clerk backend API. Run this once; afterwards, use the
 * Administrators page to transfer the title.
 *
 * Usage:
 *   pnpm run make-super-admin -- --email admin@example.com
 *
 * Requires CLERK_SECRET_KEY in the environment (.env loaded via dotenv if present).
 */
import { createClerkClient } from "@clerk/backend";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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
  }
  return args;
}

loadEnv();

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("CLERK_SECRET_KEY is required.");
  process.exit(1);
}

const { email } = parseArgs(process.argv.slice(2));

if (!email) {
  console.error(
    "Usage: pnpm run make-super-admin -- --email you@example.com",
  );
  process.exit(1);
}

const clerk = createClerkClient({ secretKey });

try {
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  if (existing.data.length === 0) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  const user = existing.data[0];
  const metadata = user.publicMetadata ?? {};
  if (metadata.role !== "admin") {
    console.error(
      `${email} is not an admin. Promote them to admin first (e.g. via create-admin) before making them super admin.`,
    );
    process.exit(1);
  }

  // Enforce "exactly one super admin": strip the flag from anyone else who
  // currently holds it before granting it here.
  const allAdmins = await clerk.users.getUserList({ limit: 100 });
  for (const other of allAdmins.data) {
    if (
      other.id !== user.id &&
      other.publicMetadata?.role === "admin" &&
      other.publicMetadata?.isSuperAdmin === true
    ) {
      await clerk.users.updateUserMetadata(other.id, {
        publicMetadata: { ...other.publicMetadata, isSuperAdmin: false },
      });
      console.log(
        JSON.stringify({ action: "revoked", email: other.emailAddresses[0]?.emailAddress, userId: other.id }),
      );
    }
  }

  await clerk.users.updateUserMetadata(user.id, {
    publicMetadata: { ...metadata, role: "admin", isSuperAdmin: true },
  });

  console.log(
    JSON.stringify({
      action: "granted",
      email,
      userId: user.id,
    }),
  );
} catch (error) {
  console.error("Failed:", error.errors ?? error.message ?? error);
  process.exit(1);
}
