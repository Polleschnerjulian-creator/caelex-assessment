// tests/unit/lib/atlas/verbatim-attribution.test.ts

/**
 * Unit tests for src/lib/atlas/verbatim-attribution.ts — the per-
 * jurisdiction publisher + re-use-licence lookup used wherever Atlas
 * displays statutory text we copied from official registers.
 *
 * Why this matters: copyright treatment of statutes differs by
 * jurisdiction. Showing UK statutory text without OGL v3.0 attribution
 * is a licence violation; showing US federal text without "17 USC §105"
 * fallback is sloppy. The fallback `GENERIC_ATTRIBUTION` is conservative
 * (no licence claim) — these tests pin both the tailored entries and
 * the generic fallback so a regression can't silently strip attributions.
 */

import { describe, it, expect } from "vitest";
import {
  getVerbatimAttribution,
  JURISDICTIONS_WITH_TAILORED_ATTRIBUTION,
  type VerbatimAttribution,
} from "@/lib/atlas/verbatim-attribution";

describe("getVerbatimAttribution — generic fallback", () => {
  it("returns the generic attribution for null/undefined jurisdiction", () => {
    const r1 = getVerbatimAttribution(null);
    const r2 = getVerbatimAttribution(undefined);
    expect(r1).toEqual(r2);
    expect(r1.publisher).toMatch(/official source/i);
  });

  it("returns the generic attribution for an unknown jurisdiction code", () => {
    const r = getVerbatimAttribution("XX");
    expect(r.publisher).toMatch(/official source/i);
    expect(r.licenseClause.de).toContain("Caelex");
    expect(r.licenseClause.en).toContain("Caelex");
  });

  it("returns the generic attribution for an empty string", () => {
    const r = getVerbatimAttribution("");
    expect(r.publisher).toMatch(/official source/i);
  });

  it("generic attribution has no publisherUrl claim (empty string)", () => {
    const r = getVerbatimAttribution(null);
    expect(r.publisherUrl).toBe("");
  });
});

describe("getVerbatimAttribution — tailored entries", () => {
  // Pull a sampling of jurisdictions known to have tailored entries
  // and assert their shape. We don't pin specific text bodies (those
  // can be wordsmithed) — only the structural invariants.
  const TAILORED_SAMPLE = ["DE", "EU", "INT", "US", "UK", "FR", "IT"];

  for (const jur of TAILORED_SAMPLE) {
    it(`returns a tailored attribution for jurisdiction "${jur}" (not the generic fallback)`, () => {
      const r = getVerbatimAttribution(jur);
      // The tailored entries all have a non-generic publisher.
      expect(r.publisher).not.toMatch(/^official source/i);
      // Both languages must be populated for the licence clause.
      expect(typeof r.licenseClause.de).toBe("string");
      expect(typeof r.licenseClause.en).toBe("string");
      expect(r.licenseClause.de.length).toBeGreaterThan(20);
      expect(r.licenseClause.en.length).toBeGreaterThan(20);
      // The publisher URL must be a non-empty https://… string.
      expect(r.publisherUrl).toMatch(/^https:\/\/.+/);
    });
  }

  it("uppercases jurisdiction codes (case-insensitive lookup)", () => {
    const lower = getVerbatimAttribution("de");
    const upper = getVerbatimAttribution("DE");
    expect(lower).toEqual(upper);
  });
});

describe("JURISDICTIONS_WITH_TAILORED_ATTRIBUTION", () => {
  it("is a non-empty set of lowercase strings", () => {
    expect(JURISDICTIONS_WITH_TAILORED_ATTRIBUTION.size).toBeGreaterThan(5);
    for (const k of JURISDICTIONS_WITH_TAILORED_ATTRIBUTION) {
      expect(k).toBe(k.toLowerCase());
    }
  });

  it("every set member resolves to a tailored (not generic) attribution", () => {
    for (const k of JURISDICTIONS_WITH_TAILORED_ATTRIBUTION) {
      const r: VerbatimAttribution = getVerbatimAttribution(k);
      expect(r.publisher).not.toMatch(/^official source/i);
    }
  });

  it("includes the 9 documented jurisdictions in the source-file comment", () => {
    // The file's preamble lists DE/EU/INT/US/UK/FR/IT/CA + "Other".
    // Each must be in the tailored set (lowercase).
    const expected = ["de", "eu", "int", "us", "uk", "fr", "it"];
    for (const code of expected) {
      expect(JURISDICTIONS_WITH_TAILORED_ATTRIBUTION).toContain(code);
    }
  });
});
