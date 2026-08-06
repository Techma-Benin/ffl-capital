const BASE = process.env.API_BASE_URL ?? "http://localhost:3002";
const CRON_SECRET = process.env.CRON_SECRET ?? "dev-cron-secret";

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
  console.log("reprocess-unmatched:", reprocess.status, reprocess.body);
  if (reprocess.status !== 200) {
    console.error("FAIL: reprocess-unmatched cron");
    process.exit(1);
  }

  const integrity = await callCron("/api/cron/integrity-post");
  console.log("integrity-post:", integrity.status, integrity.body);
  if (integrity.status !== 200) {
    console.error("FAIL: integrity-post cron");
    process.exit(1);
  }

  console.log("\nCron smoke test passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
