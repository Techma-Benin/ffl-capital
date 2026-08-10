import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildTransactionWhere,
  paymentMethodWhere,
  TRANSACTION_AFFILIATION_PARAM,
} from "../../src/lib/admin/transactions-filters";

describe("buildTransactionWhere", () => {
  test("filters by partner affiliation when affiliation param is set", () => {
    const params = new URLSearchParams();
    params.set(TRANSACTION_AFFILIATION_PARAM, "Test Agency");

    const where = buildTransactionWhere(params);

    assert.deepEqual(where, {
      AND: [{ partner: { affiliation: "Test Agency" } }],
    });
  });

  test("ignores blank affiliation param", () => {
    const params = new URLSearchParams();
    params.set(TRANSACTION_AFFILIATION_PARAM, "   ");

    const where = buildTransactionWhere(params);

    assert.deepEqual(where, {});
  });

  test("combines affiliation with partnerId", () => {
    const params = new URLSearchParams();
    params.set("partnerId", "partner_1");
    params.set(TRANSACTION_AFFILIATION_PARAM, "West Coast Agency");

    const where = buildTransactionWhere(params);

    assert.deepEqual(where, {
      AND: [
        { partnerId: "partner_1" },
        { partner: { affiliation: "West Coast Agency" } },
      ],
    });
  });
});

describe("paymentMethodWhere", () => {
  test("stripe filter requires stripe payment intent", () => {
    assert.deepEqual(paymentMethodWhere("stripe"), {
      stripePaymentIntentId: { not: null },
    });
  });

  test("all methods returns empty predicate", () => {
    assert.deepEqual(paymentMethodWhere("all"), {});
    assert.deepEqual(paymentMethodWhere(null), {});
  });
});
