import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { csvToRecords, escapeCsv, parseCsv } from "../../src/lib/csv";
import {
  IMPORTABLE_LEAD_FIELDS,
  isProtectedLeadField,
  resolveLeadField,
} from "../../src/lib/leads/field-catalog";
import {
  mapCsvRowToLead,
  normalizeImportedRow,
} from "../../src/lib/migration/map-csv-row-to-lead";

describe("lead CSV contract", () => {
  test("round trips commas, quotes, and embedded newlines", () => {
    const csv = [
      ["name", "notes"],
      ["Jane", 'said "hello", then left\nquietly'],
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    assert.deepEqual(parseCsv(csv), [
      ["name", "notes"],
      ["Jane", 'said "hello", then left\nquietly'],
    ]);
    assert.deepEqual(csvToRecords(csv)[0], {
      name: "Jane",
      notes: 'said "hello", then left\nquietly',
    });
  });

  test("shares aliases and blocks system fields", () => {
    assert.equal(resolveLeadField("First Name"), "firstName");
    assert.equal(resolveLeadField("date-of-birth"), "dob");
    assert.equal(
      resolveLeadField("state_you_currently_live_in"),
      "stateYouCurrentlyLiveIn",
    );
    assert.equal(resolveLeadField("beneficiary_thom"), "beneficiary");
    assert.equal(resolveLeadField("mortgage.loan.amount"), "mortgageLoanAmount");
    assert.equal(isProtectedLeadField("status"), true);
    assert.equal(isProtectedLeadField("trustedform_valid"), true);
    assert.equal(isProtectedLeadField("routing_claimed_at"), true);
    assert.equal(isProtectedLeadField("first_name"), false);
  });

  test("maps every schema business field through the shared import contract", () => {
    const row = normalizeImportedRow({
      first_name: "Jane",
      email: "jane@example.com",
      state_you_currently_live_in: "tx",
      beneficiary_thom: "Jane Doe",
      beneficiary_type_thom: "Spouse",
      history_of_cancer_thom: "No",
      "mortgage.loan.amount": "250000",
    });
    const mapped = mapCsvRowToLead(row, []);

    assert.equal(mapped.stateYouCurrentlyLiveIn, "TX");
    assert.equal(mapped.beneficiary, "Jane Doe");
    assert.equal(mapped.beneficiaryType, "Spouse");
    assert.equal(mapped.historyOfCancer, "No");
    assert.equal(mapped.mortgageLoanAmount, "250000");
    assert.ok(
      ["firstName", "email", "stateYouCurrentlyLiveIn", "beneficiary",
        "beneficiaryType", "historyOfCancer", "mortgageLoanAmount"].every(
        (key) => IMPORTABLE_LEAD_FIELDS.some((field) => field.key === key),
      ),
    );
  });

  test("preserves unknown imported columns without importing protected fields", () => {
    const mapped = mapCsvRowToLead(
      {
        first_name: "Jane",
        email: "jane@example.com",
        state: "tx",
        status: "sold",
        custom_answer: "kept",
      },
      [],
    );

    assert.equal(mapped.status, "review");
    assert.equal(mapped.state, "TX");
    assert.equal((mapped.rawPayload as Record<string, string>).custom_answer, "kept");
    assert.equal((mapped.rawPayload as Record<string, string>).status, undefined);
  });
});
