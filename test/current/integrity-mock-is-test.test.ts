import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import {
  applyIntegrityAutoPostTestFlag,
  encodeIntegrityFormBody,
} from "../../src/lib/integrity/build-payload";
import { submitToIntegrity } from "../../src/lib/integrity/post";

describe("Integrity mock mode auto post is_test flag", () => {
  test("mock mode auto post payload includes is_test=yes", () => {
    const base = {
      first_name: "Mike",
      last_name: "Jones",
      email: "test@example.com",
      lead_type_thom: "Final Expense Facebook (Realtime Lead)",
    };
    const withFlag = applyIntegrityAutoPostTestFlag(base, "mock");
    assert.equal(withFlag.is_test, "yes");
    assert.equal(withFlag.first_name, "Mike");
  });

  test("live mode auto post payload does not force is_test", () => {
    const base = {
      first_name: "Mike",
      last_name: "Jones",
      email: "test@example.com",
    };
    const live = applyIntegrityAutoPostTestFlag(base, "live");
    assert.equal(live.is_test, undefined);
    assert.deepEqual(live, base);
  });

  test("admin test path always sets is_test=yes (independent of mode)", () => {
    // Mirrors prepareManualTestFields / admin test route behavior.
    for (const mode of ["mock", "live"] as const) {
      const auto = applyIntegrityAutoPostTestFlag(
        { first_name: "Mike" },
        mode,
      );
      const adminTest = { ...auto, is_test: "yes" as const };
      assert.equal(adminTest.is_test, "yes");
    }
  });
});

describe("Integrity submitToIntegrity with mocked fetch", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("mock-mode payload with is_test=yes performs a real HTTP POST", async () => {
    const payload = applyIntegrityAutoPostTestFlag(
      {
        first_name: "Mike",
        last_name: "Jones",
        email: "test@example.com",
        phone_1: "5127891111",
        state: "Texas",
        lead_type_thom: "Final Expense Facebook (Realtime Lead)",
      },
      "mock",
    );
    assert.equal(payload.is_test, "yes");

    let fetchCalls = 0;
    let capturedBody: string | undefined;
    let capturedUrl: string | undefined;

    mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls += 1;
      capturedUrl = String(input);
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({ outcome: "success", lead: { id: "lc-test-1" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await submitToIntegrity(
      "https://app.leadconduit.com/flows/test/submit",
      payload,
      { leadId: "lead-1", integrationsMode: "mock", isTest: true },
    );

    assert.equal(fetchCalls, 1);
    assert.ok(capturedUrl?.includes("leadconduit.com"));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.externalLeadId, "lc-test-1");
    }

    const fields = Object.fromEntries(new URLSearchParams(capturedBody).entries());
    assert.equal(fields.is_test, "yes");
    assert.equal(fields.first_name, "Mike");
  });

  test("live-mode payload without is_test still fetches and omits the flag", async () => {
    const payload = applyIntegrityAutoPostTestFlag(
      {
        first_name: "Mike",
        last_name: "Jones",
        email: "test@example.com",
      },
      "live",
    );
    assert.equal(payload.is_test, undefined);

    let fetchCalls = 0;
    let capturedBody: string | undefined;

    mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls += 1;
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({ outcome: "success", lead: { id: "lc-live-1" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await submitToIntegrity(
      "https://app.leadconduit.com/flows/test/submit",
      payload,
      { leadId: "lead-2", integrationsMode: "live", isTest: false },
    );

    assert.equal(fetchCalls, 1);
    assert.equal(result.ok, true);

    const fields = Object.fromEntries(new URLSearchParams(capturedBody).entries());
    assert.equal(fields.is_test, undefined);
    assert.equal(encodeIntegrityFormBody(payload).includes("is_test"), false);
  });
});
