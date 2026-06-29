import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURE_PATH = join(
  __dirname,
  "..",
  "fixtures/boberdoo_iul_submit_lead.example.json",
);

async function main() {
  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
  const payload = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
  payload.Unique_Identifier = `seed-lead-${Date.now()}`;

  console.log(`POST ${baseUrl}/api/leads/intake`);

  const res = await fetch(`${baseUrl}/api/leads/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log(JSON.stringify(data, null, 2));

  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
