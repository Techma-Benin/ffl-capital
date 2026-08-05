import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveIntegrationsMode } from "../../src/lib/settings/app-settings";

describe("resolveIntegrationsMode", () => {
  test("DB mock wins in production", () => {
    assert.equal(resolveIntegrationsMode("mock", "live", false), "mock");
  });

  test("DB live wins in production", () => {
    assert.equal(resolveIntegrationsMode("live", "mock", false), "live");
  });

  test("production defaults to live when DB and env unset", () => {
    assert.equal(resolveIntegrationsMode(undefined, undefined, false), "live");
  });

  test("production falls back to INTEGRATIONS_MODE env when DB unset", () => {
    assert.equal(resolveIntegrationsMode(null, "mock", false), "mock");
  });

  test("dev defaults to mock when DB and env unset", () => {
    assert.equal(resolveIntegrationsMode(undefined, undefined, true), "mock");
  });

  test("DB setting wins over env in production", () => {
    assert.equal(resolveIntegrationsMode("mock", "live", false), "mock");
  });
});
