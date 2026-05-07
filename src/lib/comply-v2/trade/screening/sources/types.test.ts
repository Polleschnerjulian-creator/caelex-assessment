/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for canonicalizeName() — the function MUST be deterministic
 * and identical-everywhere because TradeParty.canonicalName and
 * sanctions-entry names are compared directly. Any divergence breaks
 * fuzzy matching.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { canonicalizeName } from "./types";

describe("canonicalizeName", () => {
  describe("basic normalization", () => {
    it("lowercases input", () => {
      expect(canonicalizeName("ICEYE")).toBe("iceye");
    });

    it("trims whitespace", () => {
      expect(canonicalizeName("  iceye  ")).toBe("iceye");
    });

    it("collapses multiple whitespace characters", () => {
      expect(canonicalizeName("iceye    polska")).toBe("iceye polska");
    });

    it("returns empty string for empty/null/undefined", () => {
      expect(canonicalizeName("")).toBe("");
      // @ts-expect-error — testing defensive null handling
      expect(canonicalizeName(null)).toBe("");
      // @ts-expect-error — testing defensive undefined handling
      expect(canonicalizeName(undefined)).toBe("");
    });
  });

  describe("diacritic stripping", () => {
    it("strips German umlauts", () => {
      expect(canonicalizeName("Müller GmbH")).toBe("muller");
    });

    it("strips French accents", () => {
      expect(canonicalizeName("Société Générale")).toBe("societe generale");
    });

    it("strips Polish diacritics", () => {
      expect(canonicalizeName("Łódź")).toBe("łodz");
      // Note: Polish ł has no NFD decomposition; this stays as-is.
      // For full Polish support we'd need a custom map — tracked for A5.
    });
  });

  describe("business suffix stripping", () => {
    it("strips GmbH", () => {
      expect(canonicalizeName("Bosch GmbH")).toBe("bosch");
    });

    it("strips LLC", () => {
      expect(canonicalizeName("Apple LLC")).toBe("apple");
    });

    it("strips Inc.", () => {
      expect(canonicalizeName("Apple Inc.")).toBe("apple");
    });

    it("strips Ltd", () => {
      expect(canonicalizeName("BAE Systems Ltd")).toBe("bae systems");
    });

    it("strips Polish sp. z o.o.", () => {
      expect(canonicalizeName("ICEYE Polska sp. z o.o.")).toBe("iceye polska");
    });

    it("strips multiple stacked suffixes", () => {
      expect(canonicalizeName("XYZ Holdings, Inc., LLC")).toBe("xyz holdings");
    });

    it("does not strip suffixes inside the name", () => {
      // "Inc" inside the name (not as suffix) stays
      expect(canonicalizeName("Incentive Marketing Group")).toBe(
        "incentive marketing group",
      );
    });
  });

  describe("punctuation handling", () => {
    it("replaces commas with spaces", () => {
      expect(canonicalizeName("Smith, John")).toBe("smith john");
    });

    it("strips parentheses", () => {
      expect(canonicalizeName("Acme (Holdings) Ltd")).toBe("acme holdings");
    });

    it("preserves alphanumerics including digits in body", () => {
      // "Company" is NOT in our suffix list (intentional — fuzzy match
      // in A5 handles this); it stays in the canonical form.
      expect(canonicalizeName("3M Company")).toBe("3m company");
    });
  });

  describe("real-world sanctions name examples", () => {
    it("normalizes a typical OFAC SDN entry", () => {
      // Real-style OFAC name with apostrophe — punctuation → space
      expect(canonicalizeName("AL-QA'IDA")).toBe("al qa ida");
    });

    it("normalizes a Russian state-owned company", () => {
      expect(canonicalizeName("Sberbank Rossii OAO")).toBe("sberbank rossii");
    });

    it("normalizes BIS Entity-listed entity (LTD stripped, CO retained)", () => {
      // "Co." is intentionally retained — only "Co. Ltd" combined is
      // stripped. Standalone "Co" stays. Fuzzy match handles the rest.
      expect(canonicalizeName("HUAWEI TECHNOLOGIES CO., LTD.")).toBe(
        "huawei technologies co",
      );
    });
  });

  describe("idempotency (canonicalize ∘ canonicalize = canonicalize)", () => {
    const samples = [
      "ICEYE Polska sp. z o.o.",
      "Müller GmbH",
      "BAE Systems Ltd",
      "AL-QA'IDA",
    ];
    it.each(samples)("canonicalizing %s twice yields the same result", (s) => {
      const once = canonicalizeName(s);
      const twice = canonicalizeName(once);
      expect(twice).toBe(once);
    });
  });
});
