#!/usr/bin/env node
/**
 * Ensure IntegrityCONNECT env defaults after pull (local .env / Replit).
 * Idempotent: never overwrites non-empty values.
 * Never prints secret values — only SET / MISSING / filled key names.
 *
 * Public LeadConduit submit URL defaults come from the Integrity setup.
 *
 * Usage:
 *   pnpm run ensure:integrity-env
 *
 * Replit: Secrets already in process.env win. Writing .env helps local and
 * some Replit setups; still add secrets to the Replit Secrets UI for prod.
 */
import { accessSync, constants, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env");

/** Public defaults only (never overwrite existing). No function keys here. */
const DEFAULTS = {
  INTEGRITY_REALTIME_SUBMIT_URL:
    "https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit",
  INTEGRITY_STOREFRONT_SUBMIT_URL:
    "https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit",
};

const FILLABLE_KEYS = Object.keys(DEFAULTS);

function isNonEmpty(value) {
  return typeof value === "string" && value.trim() !== "";
}

function onReplit() {
  return Boolean(process.env.REPL_ID ?? process.env.REPL_SLUG ?? process.env.REPLIT_DB_URL);
}

function parseEnvFile(content) {
  /** @type {Map<string, string>} */
  const values = new Map();
  for (const line of content.split("\n")) {
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
    values.set(key, value);
  }
  return values;
}

/**
 * Upsert keys into .env text without clobbering non-empty existing values.
 * @param {string} content
 * @param {Record<string, string>} toSet
 * @returns {{ next: string, filled: string[], skipped: string[] }}
 */
function upsertEnvContent(content, toSet) {
  const lines = content.length > 0 ? content.split("\n") : [];
  /** @type {Map<string, number>} */
  const keyLine = new Map();
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    keyLine.set(trimmed.slice(0, eq).trim(), i);
  }

  const filled = [];
  const skipped = [];

  for (const [key, defaultValue] of Object.entries(toSet)) {
    const lineIdx = keyLine.get(key);
    if (lineIdx !== undefined) {
      const line = lines[lineIdx];
      const eq = line.indexOf("=");
      const existing = eq === -1 ? "" : line.slice(eq + 1).trim();
      let bare = existing;
      if (
        (bare.startsWith('"') && bare.endsWith('"')) ||
        (bare.startsWith("'") && bare.endsWith("'"))
      ) {
        bare = bare.slice(1, -1);
      }
      if (isNonEmpty(bare)) {
        skipped.push(key);
        continue;
      }
      lines[lineIdx] = `${key}=${defaultValue}`;
      filled.push(key);
      continue;
    }
    if (lines.length > 0 && lines[lines.length - 1] !== "") {
      lines.push("");
    }
    lines.push(`${key}=${defaultValue}`);
    keyLine.set(key, lines.length - 1);
    filled.push(key);
  }

  let next = lines.join("\n");
  if (next.length > 0 && !next.endsWith("\n")) next += "\n";
  return { next, filled, skipped };
}

function canWriteEnv() {
  try {
    if (existsSync(envPath)) {
      accessSync(envPath, constants.W_OK);
    } else {
      accessSync(root, constants.W_OK);
    }
    return true;
  } catch {
    return false;
  }
}

function main() {
  const replit = onReplit();
  console.log("→ ensure-integrity-env");
  console.log(`  platform: ${replit ? "replit" : "local"}`);

  const fileContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const fileValues = parseEnvFile(fileContent);

  /** @type {string[]} */
  const alreadyProcess = [];
  /** @type {string[]} */
  const alreadyFile = [];
  /** @type {Record<string, string>} */
  const needFill = {};

  for (const key of FILLABLE_KEYS) {
    if (isNonEmpty(process.env[key])) {
      alreadyProcess.push(key);
    } else if (isNonEmpty(fileValues.get(key))) {
      alreadyFile.push(key);
    } else {
      needFill[key] = DEFAULTS[key];
    }
  }

  for (const key of alreadyProcess) {
    console.log(`  ${key}: SET (process.env${replit ? " / Replit Secrets" : ""})`);
  }
  for (const key of alreadyFile) {
    console.log(`  ${key}: SET (.env)`);
  }
  for (const key of Object.keys(needFill)) {
    console.log(`  ${key}: MISSING → will fill default`);
  }

  let filled = [];
  let writeFailed = false;

  if (Object.keys(needFill).length > 0) {
    if (!canWriteEnv()) {
      console.error("  ✗ Cannot write .env (missing or not writable)");
      writeFailed = true;
    } else {
      try {
        const { next, filled: wrote } = upsertEnvContent(fileContent, needFill);
        writeFileSync(envPath, next, "utf8");
        filled = wrote;
        console.log(
          filled.length > 0
            ? `  ✓ Wrote ${filled.length} key(s) to .env: ${filled.join(", ")}`
            : "  · No .env writes needed",
        );
      } catch (err) {
        writeFailed = true;
        console.error(
          `  ✗ Failed to write .env: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } else {
    console.log("  · Nothing to fill (all public defaults already set)");
  }

  // Re-read after write for final status
  const afterFile = existsSync(envPath)
    ? parseEnvFile(readFileSync(envPath, "utf8"))
    : fileValues;

  /** @type {string[]} */
  const stillMissingPublic = [];
  for (const key of FILLABLE_KEYS) {
    const inProcess = isNonEmpty(process.env[key]);
    const inFile = isNonEmpty(afterFile.get(key));
    if (!inProcess && !inFile) stillMissingPublic.push(key);
  }

  if (stillMissingPublic.length > 0 || writeFailed) {
    console.error("");
    if (stillMissingPublic.length > 0) {
      console.error(
        `  ✗ Still MISSING after ensure: ${stillMissingPublic.join(", ")}`,
      );
    }
    process.exit(1);
  }

  console.log("✓ Integrity env ensure complete.");
}

main();
