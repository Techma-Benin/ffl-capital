import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import {
  formatIntegrityEventType,
  formatIntegrityOutcome,
  formatResaleStatusLabel,
} from "../../src/lib/integrity/event-labels";
import {
  isNoCampaignAvailableReason,
  normalizeIntegrityReason,
} from "../../src/lib/integrity/no-campaign";
import { submitToIntegrity } from "../../src/lib/integrity/post";

describe("No Campaign Available detection", () => {
  test("matches LeadConduit reason with escaped quotes", () => {
    assert.equal(normalizeIntegrityReason('"No Campaign Available."'), "No Campaign Available.");
    assert.ok(isNoCampaignAvailableReason('"No Campaign Available."'));
  });

  test("matches unquoted and mixed-case variants", () => {
    assert.ok(isNoCampaignAvailableReason("No Campaign Available."));
    assert.ok(isNoCampaignAvailableReason("no campaign available"));
    assert.ok(isNoCampaignAvailableReason('Lead rejected: "No Campaign Available" for state'));
  });

  test("does not match other rejection reasons", () => {
    assert.equal(isNoCampaignAvailableReason("Missing required field: dob_mmddyyyy_thom"), false);
    assert.equal(isNoCampaignAvailableReason("Rejected: failure"), false);
    assert.equal(isNoCampaignAvailableReason(""), false);
  });
});

describe("Integrity event labels", () => {
  test("uses Title Case integrity tags", () => {
    assert.equal(formatIntegrityEventType("integrity_posted"), "Posted");
    assert.equal(formatIntegrityEventType("integrity_rejected"), "Rejected");
    assert.equal(formatIntegrityEventType("integrity_skipped"), "Skipped");
    assert.equal(formatIntegrityEventType("integrity_no_campaign"), "No Campaign Available");
  });

  test("formats integrity outcomes in Title Case", () => {
    assert.equal(formatIntegrityOutcome("posted"), "Posted");
    assert.equal(formatIntegrityOutcome("rejected"), "Rejected");
    assert.equal(formatIntegrityOutcome("no_campaign_available"), "No Campaign Available");
  });

  test("formats resale status with no-campaign override", () => {
    assert.equal(formatResaleStatusLabel("rejected"), "Rejected");
    assert.equal(
      formatResaleStatusLabel("rejected", "no_campaign_available"),
      "No Campaign Available",
    );
  });
});

describe("submitToIntegrity no-campaign response", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("returns failure for LC no-campaign payload", async () => {
    mock.method(globalThis, "fetch", async () =>
      new Response(
        JSON.stringify({
          lead: { id: "6a7585da9d529ac20b1302ab" },
          price: 0,
          reason: '"No Campaign Available."',
          outcome: "failure",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await submitToIntegrity(
      "https://app.leadconduit.com/flows/test/submit",
      { first_name: "Mike" },
      { leadId: "lead-1" },
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(isNoCampaignAvailableReason(result.reason));
    }
  });
});
