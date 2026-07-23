/**
 * Unit tests for CRM outbound helpers (no DB).
 * Run: pnpm run test:outbound
 */
import assert from "node:assert/strict";
import {
  assertAllowedOutboundUrlProtocol,
  isBlockedIpAddress,
  OutboundUrlGuardError,
} from "../src/lib/delivery/outbound-url-guard";
import { buildFlatOutboundPayload } from "../src/lib/delivery/outbound-payload";
import { evaluateSuccessRule } from "../src/lib/delivery/outbound-http";

assert.equal(isBlockedIpAddress("127.0.0.1"), true, "loopback blocked");
assert.equal(isBlockedIpAddress("10.0.0.5"), true, "10.x blocked");
assert.equal(isBlockedIpAddress("192.168.1.1"), true, "192.168 blocked");
assert.equal(isBlockedIpAddress("203.0.113.1"), false, "public OK");

assert.throws(
  () => assertAllowedOutboundUrlProtocol(new URL("file:///tmp/x")),
  OutboundUrlGuardError,
);

const mapped = buildFlatOutboundPayload(
  { firstName: "Ada", lastName: "Lovelace", extra: "x" },
  [
    { source: "firstName", target: "first_name" },
    { source: "lastName", target: "last_name" },
  ],
);
assert.deepEqual(mapped, { first_name: "Ada", last_name: "Lovelace" });

const ringyStyleFail = evaluateSuccessRule(
  200,
  '{"status":"error","message":"duplicate"}',
  { require2xx: true, bodyRegex: '"status"\\s*:\\s*"success"' },
);
assert.equal(ringyStyleFail.ok, false, "200 with error body fails regex rule");

const containsOk = evaluateSuccessRule(200, '{"ok":true}', {
  require2xx: true,
  bodyContains: '"ok":true',
});
assert.equal(containsOk.ok, true);

console.log("test:outbound — all assertions passed");
