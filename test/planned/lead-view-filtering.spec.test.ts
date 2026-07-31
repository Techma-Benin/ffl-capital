import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  LeadCategoryResolution,
  LeadStatus,
} from "@prisma/client";
import {
  buildAdminLeadsWhere,
  legacyStatusToSlice,
} from "../../src/lib/admin/admin-leads-query";
import { buildPartnerLeadsWhere } from "../../src/lib/partner/partner-leads-query";
import {
  MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
  UNCLASSIFIED_TYPE_FILTER,
  parseAdminFilters,
  parsePartnerFilters,
} from "../../src/lib/leads/list-view-schema";
import {
  leadViewDraftsEqual,
  parseLeadViewDraft,
} from "../../src/lib/leads/lead-view-draft";

describe("admin saved-view status slices", () => {
  test("parses review statusSlice", () => {
    assert.deepEqual(parseAdminFilters({ statusSlice: "review" }), {
      statusSlice: "review",
    });
  });

  test("filters leads with review status", async () => {
    const where = await buildAdminLeadsWhere({ statusSlice: "review" });
    assert.equal(where.status, LeadStatus.review);
  });

  test("maps legacy review tab param to statusSlice", () => {
    assert.equal(legacyStatusToSlice("review"), "review");
  });
});

describe("admin saved-view type filters", () => {
  test("migrates legacy resolution and candidate fields into unified types", () => {
    assert.deepEqual(
      parseAdminFilters({
        statusSlice: "all",
        categoryResolution: "multiple_matches",
        categoryCandidateTypes: ["mortgage", "veteran"],
      }),
      {
        statusSlice: "all",
        types: [
          MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
          "mortgage",
          "veteran",
        ],
      },
    );
  });

  test("combines selected type meanings with OR semantics", async () => {
    const where = await buildAdminLeadsWhere({
      types: ["mortgage", UNCLASSIFIED_TYPE_FILTER],
    });

    assert.deepEqual(where.AND, [
      {
        OR: [
          {
            categoryResolution: LeadCategoryResolution.matched,
            leadType: { in: ["mortgage"] },
          },
          {
            categoryResolution: LeadCategoryResolution.multiple_matches,
            categoryCandidateTypes: { hasSome: ["mortgage"] },
          },
          { categoryResolution: LeadCategoryResolution.no_match },
        ],
      },
    ]);
  });

  test("includes every multiple-match lead for the sentinel", async () => {
    const where = await buildAdminLeadsWhere({
      types: [MULTIPLE_CATEGORY_MATCH_TYPE_FILTER],
    });

    assert.deepEqual(where.AND, [
      {
        OR: [
          { categoryResolution: LeadCategoryResolution.multiple_matches },
        ],
      },
    ]);
  });

  test("filters leads by attributed delivery filter set", async () => {
    const filterSetId = "00000000-0000-4000-8000-000000000001";
    const where = await buildAdminLeadsWhere({ filterSetId });

    assert.deepEqual(where.leadDeliveries, {
      some: { filterSetId },
    });
  });
});

describe("partner saved-view delivery periods", () => {
  test("preprocesses legacy custom bounds", () => {
    assert.deepEqual(parsePartnerFilters({ from: "2026-07-01" }), {
      datePeriod: "custom",
      from: "2026-07-01",
    });
  });

  test("applies custom bounds to deliveredAt", async () => {
    const where = await buildPartnerLeadsWhere(
      "00000000-0000-4000-8000-000000000002",
      {
        datePeriod: "custom",
        from: "2026-07-01",
        to: "2026-07-03",
      },
    );

    const range = where.deliveredAt as { gte: Date; lte: Date };
    assert.deepEqual(
      [range.gte.getFullYear(), range.gte.getMonth() + 1, range.gte.getDate()],
      [2026, 7, 1],
    );
    assert.equal(range.lte.getDate(), 3);
    assert.equal(range.lte.getHours(), 23);
    assert.equal(range.lte.getMinutes(), 59);
    assert.equal("receivedAt" in where, false);
  });

  test("parses presets and applies their range to deliveredAt", async () => {
    const parsed = parsePartnerFilters({ datePeriod: "last_month" });
    assert.equal(parsed.datePeriod, "last_month");

    const where = await buildPartnerLeadsWhere(
      "00000000-0000-4000-8000-000000000002",
      parsed,
    );
    assert.ok(where.deliveredAt);
  });
});

describe("lead view draft state", () => {
  const columns = [
    { key: "firstName", visible: true },
    { key: "email", visible: false },
  ];

  test("treats normalized filters as unchanged", () => {
    assert.equal(
      leadViewDraftsEqual(
        "admin",
        {
          name: " All leads ",
          filters: { statusSlice: "all", states: [] },
          columns,
        },
        {
          name: "All leads",
          filters: { statusSlice: "all" },
          columns,
        },
      ),
      true,
    );
  });

  test("detects name, filter, and column changes", () => {
    const saved = {
      name: "All leads",
      filters: { statusSlice: "all" },
      columns,
    };
    assert.equal(
      leadViewDraftsEqual("admin", { ...saved, name: "Reviewed" }, saved),
      false,
    );
    assert.equal(
      leadViewDraftsEqual(
        "admin",
        { ...saved, filters: { statusSlice: "review" } },
        saved,
      ),
      false,
    );
    assert.equal(
      leadViewDraftsEqual(
        "admin",
        {
          ...saved,
          columns: [
            { key: "firstName", visible: false },
            { key: "email", visible: false },
          ],
        },
        saved,
      ),
      false,
    );
  });

  test("rejects malformed URL draft payloads", () => {
    assert.equal(parseLeadViewDraft("partner", "{not json"), null);
    assert.equal(
      parseLeadViewDraft(
        "partner",
        JSON.stringify({
          name: "Partner leads",
          filters: {},
          columns: [{ key: "lead", visible: "yes" }],
        }),
      ),
      null,
    );
  });
});
