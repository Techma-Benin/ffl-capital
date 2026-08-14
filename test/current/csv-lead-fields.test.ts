import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { csvToRecords, escapeCsv, parseCsv } from "../../src/lib/csv";
import {
  IMPORTABLE_LEAD_FIELDS,
  isProtectedLeadField,
  resolveLeadField,
} from "../../src/lib/leads/field-catalog";
import {
  isFullMigrationCsv,
  mapCsvRowToLead,
  mapFullMigrationRow,
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

  test("detects and restores a full migration row exactly", () => {
    const payload = {
      mortgage: { loan: { amount: 250000 } },
      custom_answer: "quoted, value",
    };
    const row = {
      id: "lead-1",
      external_id: "external-1",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      phone: "5555550100",
      state: "TX",
      source: "test",
      received_at: "2026-08-13T10:00:00.000Z",
      created_at: "2026-08-13T10:00:00.000Z",
      updated_at: "2026-08-13T10:00:00.000Z",
      status: "delivered",
      available: "false",
      refundable: "true",
      category_resolution: "matched",
      category_candidate_types: '["traditional_iul"]',
      raw_payload: JSON.stringify(payload),
    };
    assert.equal(isFullMigrationCsv(Object.keys(row)), true);
    const mapped = mapFullMigrationRow(row);
    assert.equal(mapped.id, "lead-1");
    assert.equal(mapped.status, "delivered");
    assert.equal(mapped.available, false);
    assert.deepEqual(mapped.rawPayload, payload);
  });

  test("derives missing system fields when raw_payload is present", () => {
    const mapped = mapFullMigrationRow({
      first_name: "Jane",
      email: "jane@example.com",
      state: "TX",
      raw_payload: JSON.stringify({ custom_answer: "kept" }),
    });
    assert.equal(mapped.id, undefined);
    assert.ok(mapped.status === "unmatched" || mapped.status === "review");
    assert.ok(mapped.receivedAt instanceof Date);
    assert.ok(mapped.createdAt instanceof Date);
    assert.ok(mapped.updatedAt instanceof Date);
    assert.deepEqual(mapped.rawPayload, { custom_answer: "kept" });
  });

  test("requires lead_type when raw_payload is missing", () => {
    assert.throws(
      () =>
        mapFullMigrationRow({
          first_name: "Jane",
          email: "jane@example.com",
          state: "TX",
        }),
      /Missing raw_payload or lead_type/,
    );

    const mapped = mapFullMigrationRow({
      first_name: "Jane",
      email: "jane@example.com",
      state: "TX",
      lead_type: "traditional_iul",
    });
    assert.equal(mapped.leadType, "traditional_iul");
    assert.deepEqual(mapped.rawPayload, { lead_type: "traditional_iul" });
  });

  test("reports malformed full migration payload JSON", () => {
    assert.throws(
      () =>
        mapFullMigrationRow({
          id: "lead-1",
          raw_payload: "{not-json}",
        }),
      /Invalid JSON in raw_payload/,
    );
  });
});
