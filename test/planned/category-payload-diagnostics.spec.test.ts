import assert from "node:assert/strict";
import { describe, test } from "node:test";

type Category = {
  type: string;
  enabled: boolean;
  criteria: Array<{ field: string; value: string }>;
};

type DiagnosticField = {
  field: string;
  present: boolean;
  value: unknown;
};

type PayloadDiagnosticsFeature = {
  buildCategoryPayloadDiagnostics(
    payload: Record<string, unknown>,
    categories: Category[],
  ): DiagnosticField[];
};

const featureModule =
  "../../src/lib/lead-categories/payload-diagnostics";

async function loadFeature(): Promise<PayloadDiagnosticsFeature> {
  try {
    return (await import(featureModule)) as PayloadDiagnosticsFeature;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Cannot find module") ||
        error.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      assert.fail(
        "Payload diagnostics are not implemented: expected " +
          "src/lib/lead-categories/payload-diagnostics.ts",
      );
    }
    throw error;
  }
}

const categories: Category[] = [
  {
    type: "traditional_iul",
    enabled: true,
    criteria: [
      { field: "SRC", value: "IUL_LeadConduit" },
      { field: "Intent_Type", value: "Standard" },
    ],
  },
  {
    type: "veteran",
    enabled: true,
    criteria: [
      { field: "SRC", value: "Veteran_LeadConduit" },
      { field: "Campaign_Name", value: "Veterans" },
    ],
  },
  {
    type: "disabled",
    enabled: false,
    criteria: [{ field: "Disabled_Field", value: "ignored" }],
  },
];

describe("planned category payload diagnostics", () => {
  test("returns the unique fields used by all enabled categories", async () => {
    const feature = await loadFeature();

    const fields = feature.buildCategoryPayloadDiagnostics(
      { SRC: "unknown", Intent_Type: "Standard" },
      categories,
    );

    assert.deepEqual(
      fields.map((entry) => entry.field),
      ["Campaign_Name", "Intent_Type", "SRC"],
    );
  });

  test("marks present values for highlighting and missing values explicitly", async () => {
    const feature = await loadFeature();

    const fields = feature.buildCategoryPayloadDiagnostics(
      { SRC: "unknown", Intent_Type: "Standard" },
      categories,
    );

    assert.deepEqual(fields, [
      { field: "Campaign_Name", present: false, value: undefined },
      { field: "Intent_Type", present: true, value: "Standard" },
      { field: "SRC", present: true, value: "unknown" },
    ]);
  });

  test("only treats top-level payload keys as present", async () => {
    const feature = await loadFeature();

    const fields = feature.buildCategoryPayloadDiagnostics(
      { metadata: { SRC: "Veteran_LeadConduit" } },
      categories,
    );
    const source = fields.find((entry) => entry.field === "SRC");

    assert.deepEqual(source, {
      field: "SRC",
      present: false,
      value: undefined,
    });
  });
});
