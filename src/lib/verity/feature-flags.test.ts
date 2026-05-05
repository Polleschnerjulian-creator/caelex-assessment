/**
 * Tests for the VERITY_CRYPTO_VERSION env-var router. Default-v1
 * fallback is the safety floor — every unrecognised input must NOT
 * silently weaken trust.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { vi } from "vitest";
import {
  getDefaultCryptoVersion,
  resolveCommitmentScheme,
} from "./feature-flags";

describe("getDefaultCryptoVersion", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.VERITY_CRYPTO_VERSION;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.VERITY_CRYPTO_VERSION;
    } else {
      process.env.VERITY_CRYPTO_VERSION = original;
    }
  });

  it("defaults to v1 when env var is unset", () => {
    delete process.env.VERITY_CRYPTO_VERSION;
    expect(getDefaultCryptoVersion()).toBe("v1");
  });

  it("returns v2 when env var is exactly 'v2'", () => {
    process.env.VERITY_CRYPTO_VERSION = "v2";
    expect(getDefaultCryptoVersion()).toBe("v2");
  });

  it("returns v3 when env var is exactly 'v3'", () => {
    process.env.VERITY_CRYPTO_VERSION = "v3";
    expect(getDefaultCryptoVersion()).toBe("v3");
  });

  it("normalises whitespace + case", () => {
    process.env.VERITY_CRYPTO_VERSION = "  V3  ";
    expect(getDefaultCryptoVersion()).toBe("v3");
  });

  it("falls back to v1 on garbage input (never silently weakens)", () => {
    process.env.VERITY_CRYPTO_VERSION = "v99-rogue";
    expect(getDefaultCryptoVersion()).toBe("v1");
  });

  it("falls back to v1 on empty string", () => {
    process.env.VERITY_CRYPTO_VERSION = "";
    expect(getDefaultCryptoVersion()).toBe("v1");
  });
});

describe("resolveCommitmentScheme — caller wins, env fallback", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.VERITY_CRYPTO_VERSION;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.VERITY_CRYPTO_VERSION;
    } else {
      process.env.VERITY_CRYPTO_VERSION = original;
    }
  });

  it("explicit v1 wins even when env says v3", () => {
    process.env.VERITY_CRYPTO_VERSION = "v3";
    expect(resolveCommitmentScheme("v1")).toBe("v1");
  });

  it("explicit v2 wins", () => {
    expect(resolveCommitmentScheme("v2")).toBe("v2");
  });

  it("explicit v3 wins", () => {
    expect(resolveCommitmentScheme("v3")).toBe("v3");
  });

  it("undefined falls through to env-var default", () => {
    process.env.VERITY_CRYPTO_VERSION = "v2";
    expect(resolveCommitmentScheme(undefined)).toBe("v2");
  });

  it("null falls through to env-var default", () => {
    delete process.env.VERITY_CRYPTO_VERSION;
    expect(resolveCommitmentScheme(null)).toBe("v1");
  });

  it("garbage caller input falls through to env-var default", () => {
    process.env.VERITY_CRYPTO_VERSION = "v3";
    expect(resolveCommitmentScheme("v99")).toBe("v3");
  });
});
