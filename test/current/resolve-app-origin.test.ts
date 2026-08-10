import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import {
  isLoopbackOrigin,
  resolveAppOrigin,
} from "../../src/lib/email/email-layout";

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const ORIGINAL_REPLIT = process.env.REPLIT_DOMAINS;

afterEach(() => {
  if (ORIGINAL_APP_URL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
  if (ORIGINAL_REPLIT === undefined) delete process.env.REPLIT_DOMAINS;
  else process.env.REPLIT_DOMAINS = ORIGINAL_REPLIT;
});

describe("isLoopbackOrigin", () => {
  test("detects localhost and 127.0.0.1", () => {
    assert.equal(isLoopbackOrigin("https://localhost:5000"), true);
    assert.equal(isLoopbackOrigin("http://127.0.0.1:3000"), true);
    assert.equal(isLoopbackOrigin("https://ffl-capital.replit.app"), false);
  });
});

describe("resolveAppOrigin", () => {
  test("prefers public NEXT_PUBLIC_APP_URL over localhost request origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://ffl-capital.replit.app/";
    delete process.env.REPLIT_DOMAINS;

    assert.equal(
      resolveAppOrigin("https://localhost:5000"),
      "https://ffl-capital.replit.app",
    );
  });

  test("falls back to REPLIT_DOMAINS when app URL is loopback", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.REPLIT_DOMAINS = "ffl-capital.replit.app,other.replit.app";

    assert.equal(
      resolveAppOrigin("https://localhost:5000"),
      "https://ffl-capital.replit.app",
    );
  });

  test("uses non-loopback explicit origin when env is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.REPLIT_DOMAINS;

    assert.equal(
      resolveAppOrigin("https://portal.example.com/"),
      "https://portal.example.com",
    );
  });

  test("allows loopback only as local/dev fallback", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.REPLIT_DOMAINS;

    assert.equal(
      resolveAppOrigin("https://localhost:5000"),
      "https://localhost:5000",
    );
    assert.equal(resolveAppOrigin(), "http://localhost:3000");
  });
});
