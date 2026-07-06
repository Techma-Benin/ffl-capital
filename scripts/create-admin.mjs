#!/usr/bin/env node
/**
 * Create or promote a Clerk admin user.
 *
 * Usage:
 *   npm run create-admin -- --email admin@example.com
 *   npm run create-admin -- --email admin@example.com --password 'Secret123!'
 *
 * Requires CLERK_SECRET_KEY in the environment (.env loaded via dotenv if present).
 */
import { createClerkClient } from "@clerk/backend";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

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

const { email, password, firstName = "FFL", lastName = "Admin" } = parseArgs(
  process.argv.slice(2),
);

if (!email) {
  console.error(
    "Usage: npm run create-admin -- --email you@example.com [--password ...]",
  );
  process.exit(1);
}

const clerk = createClerkClient({ secretKey });
const generatedPassword = password ?? crypto.randomBytes(12).toString("base64url");

try {
  const existing = await clerk.users.getUserList({ emailAddress: [email] });

  if (existing.data.length > 0) {
    const user = existing.data[0];
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: { ...(user.publicMetadata ?? {}), role: "admin" },
    });
    console.log(
      JSON.stringify({
        action: "promoted",
        email,
        userId: user.id,
        note: "Existing user promoted to admin. Password unchanged.",
      }),
    );
    process.exit(0);
  }

  const user = await clerk.users.createUser({
    emailAddress: [email],
    password: generatedPassword,
    firstName,
    lastName,
    publicMetadata: { role: "admin" },
    skipPasswordChecks: true,
  });

  console.log(
    JSON.stringify({
      action: "created",
      email,
      password: generatedPassword,
      userId: user.id,
      signInUrl: "/admin/sign-in",
    }),
  );
} catch (error) {
  console.error("Failed:", error.errors ?? error.message ?? error);
  process.exit(1);
}
