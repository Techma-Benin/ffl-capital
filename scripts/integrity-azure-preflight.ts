#!/usr/bin/env tsx
/**
 * Safe operator preflight for Azure IsAcceptingCampaign credentials.
 * Reads secrets from env only; never prints secret values.
 *
 * Usage:
 *   INTEGRITY_REALTIME_PING_URL=... INTEGRITY_PING_VENDOR_ID=... \
 *   INTEGRITY_PING_FUNCTIONS_KEY=... pnpm exec tsx scripts/integrity-azure-preflight.ts
 */

import { redactSecrets } from "../src/lib/integrity/redact-secrets";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const url = requiredEnv("INTEGRITY_REALTIME_PING_URL");
  const vendorId = requiredEnv("INTEGRITY_PING_VENDOR_ID");
  const functionKey = requiredEnv("INTEGRITY_PING_FUNCTIONS_KEY");

  const payload = {
    state: process.env.INTEGRITY_TEST_STATE?.trim() ?? "TX",
    postal_code: process.env.INTEGRITY_TEST_POSTAL_CODE?.trim() ?? "78701",
    lead_type_thom:
      process.env.INTEGRITY_TEST_LEAD_TYPE?.trim() ??
      "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
  };

  console.log(
    JSON.stringify(
      redactSecrets({
        action: "integrity_azure_preflight_start",
        urlHost: new URL(url).host,
        payload,
      }),
      null,
      2,
    ),
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      VendorId: vendorId,
      "x-functions-key": functionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = (await response.text()).trim();
  const normalized = raw.replace(/^"|"$/g, "").toLowerCase();

  const summary = redactSecrets({
    action: "integrity_azure_preflight_result",
    httpStatus: response.status,
    ok: response.ok,
    campaignResponse: normalized || raw.slice(0, 120),
    shapeValid: normalized === "true" || normalized === "false",
  });

  console.log(JSON.stringify(summary, null, 2));

  if (!response.ok) {
    process.exit(2);
  }

  if (normalized !== "true" && normalized !== "false") {
    process.exit(3);
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify(
      redactSecrets({
        action: "integrity_azure_preflight_error",
        message: err instanceof Error ? err.message : String(err),
      }),
    ),
  );
  process.exit(1);
});
