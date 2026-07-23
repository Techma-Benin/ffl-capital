/**
 * Resolve the dev API base URL for verify scripts and seed helpers.
 * Prefer API_BASE_URL; on Replit default to port 5000 (Run workflow); locally 3000.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, "../..");

/** Load `.env` into process.env when keys are not already set (Node scripts do not auto-load). */
export function loadDotEnv() {
  const envPath = join(repoRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export function resolveApiBase() {
  loadDotEnv();
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, "");
  }
  const onReplit = Boolean(process.env.REPL_ID ?? process.env.REPL_SLUG);
  const port = process.env.PORT ?? (onReplit ? "5000" : "3000");
  return `http://127.0.0.1:${port}`;
}

export function resolveCronSecret() {
  loadDotEnv();
  return process.env.CRON_SECRET ?? "dev-cron-secret";
}
