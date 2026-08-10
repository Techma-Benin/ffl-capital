import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ADMIN_LEAD_SORT_KEYS,
  adminLeadPartnerSortKey,
  buildAdminLeadOrderBy,
  buildAdminLeadSortHref,
  pageAdminLeadIdsByPartnerSort,
  parseAdminLeadSort,
} from "@/lib/admin/admin-leads-sort";

describe("parseAdminLeadSort", () => {
  test("accepts partner from URL overrides", () => {
    assert.deepEqual(parseAdminLeadSort(undefined, { sort: "partner", dir: "asc" }), {
      field: "partner",
      direction: "asc",
    });
  });

  test("defaults direction to desc when dir is not asc", () => {
    assert.deepEqual(parseAdminLeadSort(undefined, { sort: "partner" }), {
      field: "partner",
      direction: "desc",
    });
  });

  test("includes partner in ADMIN_LEAD_SORT_KEYS", () => {
    assert.ok(ADMIN_LEAD_SORT_KEYS.includes("partner"));
  });
});

describe("buildAdminLeadSortHref", () => {
  test("toggles partner asc/desc like other columns", () => {
    const asc = buildAdminLeadSortHref(
      "/admin/leads",
      { view: "v1" },
      "partner",
      { field: "receivedAt", direction: "desc" },
    );
    assert.equal(asc, "/admin/leads?view=v1&sort=partner&dir=asc");

    const desc = buildAdminLeadSortHref(
      "/admin/leads",
      { view: "v1", sort: "partner", dir: "asc" },
      "partner",
      { field: "partner", direction: "asc" },
    );
    assert.equal(desc, "/admin/leads?view=v1&sort=partner&dir=desc");
  });
});

describe("adminLeadPartnerSortKey", () => {
  test("uses first word of partner name", () => {
    assert.equal(
      adminLeadPartnerSortKey({
        status: "delivered",
        partnerFirstName: "Jane",
        partnerLastName: "Partner",
      }),
      "jane",
    );
  });

  test("uses Integrity endpoint label first word when sold", () => {
    assert.equal(
      adminLeadPartnerSortKey({
        status: "integrity_posted",
        liveSaleChannel: "integrity_realtime",
      }),
      "realtime",
    );
    assert.equal(
      adminLeadPartnerSortKey({
        status: "integrity_posted",
        liveSaleChannel: "integrity_storefront",
      }),
      "storefront",
    );
  });

  test("falls back to resale mode for Integrity channel", () => {
    assert.equal(
      adminLeadPartnerSortKey({
        status: "integrity_posted",
        liveSaleChannel: null,
        resaleMode: "realtime",
      }),
      "realtime",
    );
  });

  test("empty partner label sorts as empty string", () => {
    assert.equal(
      adminLeadPartnerSortKey({
        status: "unmatched",
        partnerFirstName: null,
      }),
      "",
    );
  });
});

describe("pageAdminLeadIdsByPartnerSort", () => {
  const rows = [
    {
      id: "c",
      status: "delivered",
      liveSaleChannel: null,
      leadDeliveries: [
        { partner: { firstName: "Zoe", lastName: "Z" } },
      ],
      resalePostings: [],
    },
    {
      id: "a",
      status: "delivered",
      liveSaleChannel: null,
      leadDeliveries: [
        { partner: { firstName: "Amy", lastName: "A" } },
      ],
      resalePostings: [],
    },
    {
      id: "b",
      status: "integrity_posted",
      liveSaleChannel: "integrity_realtime",
      leadDeliveries: [],
      resalePostings: [],
    },
    {
      id: "empty",
      status: "unmatched",
      liveSaleChannel: null,
      leadDeliveries: [],
      resalePostings: [],
    },
  ];

  test("sorts asc by first word and paginates", () => {
    // "" < amy < realtime < zoe
    assert.deepEqual(
      pageAdminLeadIdsByPartnerSort(rows, "asc", 0, 2),
      ["empty", "a"],
    );
    assert.deepEqual(
      pageAdminLeadIdsByPartnerSort(rows, "asc", 2, 2),
      ["b", "c"],
    );
  });

  test("sorts desc by first word", () => {
    assert.deepEqual(
      pageAdminLeadIdsByPartnerSort(rows, "desc", 0, 4),
      ["c", "b", "a", "empty"],
    );
  });
});

describe("buildAdminLeadOrderBy", () => {
  test("partner falls back to receivedAt for Prisma callers", () => {
    assert.deepEqual(
      buildAdminLeadOrderBy(undefined, { sort: "partner", dir: "asc" }),
      { receivedAt: "asc" },
    );
  });
});
