import { resolveApiBase, resolveCronSecret } from "./lib/api-base.mjs";

const BASE = resolveApiBase();
const CRON_SECRET = resolveCronSecret();

async function callCron(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log(`Cron smoke test at ${BASE}\n`);

  const reprocess = await callCron("/api/cron/reprocess-unmatched");
  console.log("[PASS] reprocess-unmatched:", reprocess.status, reprocess.body);
  if (reprocess.status !== 200) {
    console.error("FAIL: reprocess-unmatched cron");
    process.exit(1);
  }

  const integrity = await callCron("/api/cron/integrity-post");
  console.log("[PASS] integrity-post:", integrity.status, integrity.body);
  if (integrity.status !== 200) {
    console.error("FAIL: integrity-post cron");
    process.exit(1);
  }

  console.log("\nCron smoke test passed (2/2 routes OK).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
