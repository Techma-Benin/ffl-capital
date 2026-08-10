import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  formatAdminLeadPartnerLabel,
  formatIntegrityEndpointPartnerLabel,
  formatLeadStatusLabel,
  resolveIntegrityLiveSaleChannel,
} from "@/lib/leads/lead-status-label";

describe("formatLeadStatusLabel", () => {
  test("Integrity status is a plain tag (endpoint lives under Partner)", () => {
    assert.equal(formatLeadStatusLabel("integrity_posted"), "Integrity");
  });

  test("leaves other statuses unchanged", () => {
    assert.equal(formatLeadStatusLabel("delivered"), "Delivered");
    assert.equal(formatLeadStatusLabel("unmatched"), "Unmatched");
  });
});

describe("formatIntegrityEndpointPartnerLabel", () => {
  test("maps Integrity channels to Partner-column endpoint labels", () => {
    assert.equal(
      formatIntegrityEndpointPartnerLabel("integrity_realtime"),
      "RealTime",
    );
    assert.equal(
      formatIntegrityEndpointPartnerLabel("integrity_storefront"),
      "Storefront",
    );
  });

  test("returns null when not an Integrity channel", () => {
    assert.equal(formatIntegrityEndpointPartnerLabel(null), null);
    assert.equal(formatIntegrityEndpointPartnerLabel("partner"), null);
  });
});

describe("formatAdminLeadPartnerLabel", () => {
  test("shows Integrity endpoint only when status is integrity_posted (sold)", () => {
    assert.equal(
      formatAdminLeadPartnerLabel(
        "integrity_posted",
        "integrity_realtime",
        null,
      ),
      "RealTime",
    );
    assert.equal(
      formatAdminLeadPartnerLabel(
        "integrity_posted",
        "integrity_storefront",
        null,
      ),
      "Storefront",
    );
  });

  test("hides endpoint for non-sold leads and falls back to partner name", () => {
    assert.equal(
      formatAdminLeadPartnerLabel("unmatched", "integrity_realtime", null),
      null,
    );
    assert.equal(
      formatAdminLeadPartnerLabel(
        "unmatched",
        "integrity_realtime",
        "Jane Partner",
      ),
      "Jane Partner",
    );
    assert.equal(
      formatAdminLeadPartnerLabel("delivered", "partner", "Jane Partner"),
      "Jane Partner",
    );
  });
});

describe("resolveIntegrityLiveSaleChannel", () => {
  test("prefers liveSaleChannel when Integrity-specific", () => {
    assert.equal(
      resolveIntegrityLiveSaleChannel("integrity_storefront", "realtime"),
      "integrity_storefront",
    );
  });

  test("falls back to resale posting mode (any status — Posted = done)", () => {
    assert.equal(
      resolveIntegrityLiveSaleChannel(null, "storefront"),
      "integrity_storefront",
    );
    assert.equal(
      resolveIntegrityLiveSaleChannel("partner", "realtime"),
      "integrity_realtime",
    );
  });

  test("returns null when unknown", () => {
    assert.equal(resolveIntegrityLiveSaleChannel(null, null), null);
    assert.equal(resolveIntegrityLiveSaleChannel("partner", null), null);
  });
});
