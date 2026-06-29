import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

async function main() {
  console.log(`Verifying backend at ${BASE}\n`);

  const health = await fetch(`${BASE}/api/health`);
  const healthJson = await health.json();
  console.log("Health:", healthJson);
  if (healthJson.status !== "ok") {
    console.error("FAIL: health check");
    process.exit(1);
  }

  const tx = await postLead("TX");
  console.log("\nTX lead (expect match tx-priority10):", tx.body);
  if (!tx.body.reason?.includes("tx-priority10")) {
    console.error("FAIL: TX matching");
    process.exit(1);
  }

  const ca = await postLead("CA");
  console.log("\nCA lead (expect match ca-partner):", ca.body);
  if (!ca.body.reason?.includes("ca-partner")) {
    console.error("FAIL: CA matching");
    process.exit(1);
  }

  console.log("\nAll backend verification checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
