/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the GDPR-safe UTM + referrer capture (./utm.ts).
 *
 * The decisive property under test: NO raw query string, full URL, or free prose
 * ever survives — every produced value passes SLUG_REGEX, and junk/empty/same-
 * origin inputs are dropped rather than recorded.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { SLUG_REGEX } from "./events";
import {
  normalizeUtmValue,
  parseUtmParams,
  referrerToSlug,
  captureAcquisition,
} from "./utm";

describe("normalizeUtmValue", () => {
  it("lowercases and slugifies a normal campaign value", () => {
    expect(normalizeUtmValue("Spring_Launch")).toBe("spring_launch");
  });

  it("replaces spaces / illegal chars with hyphens", () => {
    expect(normalizeUtmValue("Black Friday 2026!")).toBe("black-friday-2026-");
  });

  it("drops empty / whitespace-only input", () => {
    expect(normalizeUtmValue("")).toBeUndefined();
    expect(normalizeUtmValue("   ")).toBeUndefined();
    expect(normalizeUtmValue(null)).toBeUndefined();
    expect(normalizeUtmValue(undefined)).toBeUndefined();
  });

  it("drops id-shaped sentinels (never records :id placeholder)", () => {
    // A pure-numeric value slugifies to the ":id" sentinel → suppressed.
    expect(normalizeUtmValue("123456")).toBeUndefined();
  });

  it("caps an overly long (non-id) value to a valid slug (<=64 chars)", () => {
    // Use a non-hex letter run so segmentToSlug's id heuristics don't collapse
    // it (a-f runs look like a hex objectId and are intentionally dropped).
    const out = normalizeUtmValue("z".repeat(200));
    expect(out).toBeDefined();
    expect(out!.length).toBeLessThanOrEqual(64);
    expect(SLUG_REGEX.test(out!)).toBe(true);
  });

  it("drops a long hex-shaped value as an id (no opaque token recorded)", () => {
    // A long run of hex chars is treated as an objectId/hash by segmentToSlug →
    // ":id" sentinel → suppressed (we never record an opaque id as a campaign).
    expect(normalizeUtmValue("a".repeat(200))).toBeUndefined();
    expect(normalizeUtmValue("deadbeefdeadbeefdeadbeef")).toBeUndefined();
  });

  it("every non-undefined output passes SLUG_REGEX", () => {
    for (const raw of [
      "google",
      "CPC",
      "newsletter/Q2",
      "ünïcödé-camp",
      "<script>alert(1)</script>",
      "John Doe <john@example.com>",
    ]) {
      const out = normalizeUtmValue(raw);
      if (out !== undefined) expect(SLUG_REGEX.test(out)).toBe(true);
    }
  });

  it("cannot smuggle an email address through as-is", () => {
    const out = normalizeUtmValue("john@example.com");
    // Must not equal the raw PII string; if anything survives it is a slug.
    expect(out).not.toBe("john@example.com");
    if (out !== undefined) expect(SLUG_REGEX.test(out)).toBe(true);
  });
});

describe("parseUtmParams", () => {
  it("extracts all five UTM dimensions as slugs", () => {
    const q =
      "?utm_source=Google&utm_medium=CPC&utm_campaign=Spring_Launch&utm_content=Hero_A&utm_term=space_law";
    expect(parseUtmParams(q)).toEqual({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "spring_launch",
      utmContent: "hero_a",
      utmTerm: "space_law",
    });
  });

  it("tolerates a missing leading '?'", () => {
    expect(parseUtmParams("utm_source=LinkedIn")).toEqual({
      utmSource: "linkedin",
    });
  });

  it("returns {} for empty / missing query", () => {
    expect(parseUtmParams("")).toEqual({});
    expect(parseUtmParams("?")).toEqual({});
    expect(parseUtmParams(null)).toEqual({});
    expect(parseUtmParams(undefined)).toEqual({});
  });

  it("only includes keys that are present and valid", () => {
    const out = parseUtmParams("?utm_source=Reddit&utm_campaign=&foo=bar");
    expect(out).toEqual({ utmSource: "reddit" });
    expect("utmCampaign" in out).toBe(false);
  });

  it("ignores non-UTM query params entirely (no PII passthrough)", () => {
    const out = parseUtmParams(
      "?email=secret@x.com&token=abc123&utm_medium=email",
    );
    expect(out).toEqual({ utmMedium: "email" });
  });

  it("never lets a raw query value survive un-slugged", () => {
    const out = parseUtmParams(
      "?utm_campaign=Pay%20Per%20Click%20%E2%82%AC500",
    );
    expect(out.utmCampaign).toBeDefined();
    expect(SLUG_REGEX.test(out.utmCampaign!)).toBe(true);
  });
});

describe("referrerToSlug", () => {
  it("reduces a search-engine referrer to its host label", () => {
    expect(referrerToSlug("https://www.google.com/search?q=secret+stuff")).toBe(
      "google",
    );
  });

  it("strips www. and drops the TLD", () => {
    expect(referrerToSlug("https://www.linkedin.com/feed/")).toBe("linkedin");
    expect(referrerToSlug("https://news.ycombinator.com/item?id=1")).toBe(
      "ycombinator",
    );
  });

  it("returns undefined for empty / direct traffic", () => {
    expect(referrerToSlug("")).toBeUndefined();
    expect(referrerToSlug(null)).toBeUndefined();
    expect(referrerToSlug(undefined)).toBeUndefined();
  });

  it("returns undefined for a non-URL string", () => {
    expect(referrerToSlug("not a url")).toBeUndefined();
  });

  it("treats a same-origin referrer as internal navigation (undefined)", () => {
    expect(
      referrerToSlug("https://caelex.eu/pricing", "https://caelex.eu"),
    ).toBeUndefined();
  });

  it("keeps an external referrer even when a current origin is supplied", () => {
    expect(
      referrerToSlug("https://www.bing.com/search?q=x", "https://caelex.eu"),
    ).toBe("bing");
  });

  it("drops the referrer path + query (no prior-search-term leak)", () => {
    const out = referrerToSlug(
      "https://duckduckgo.com/?q=my+private+search+terms",
    );
    expect(out).toBe("duckduckgo");
    // The search terms must be nowhere in the output.
    expect(out).not.toContain("private");
  });

  it("output (when defined) always passes SLUG_REGEX", () => {
    for (const ref of [
      "https://www.GOOGLE.com",
      "https://t.co/abc",
      "https://sub.domain.example.co.uk/x",
      "android-app://com.example/",
    ]) {
      const out = referrerToSlug(ref);
      if (out !== undefined) expect(SLUG_REGEX.test(out)).toBe(true);
    }
  });
});

describe("captureAcquisition", () => {
  it("bundles UTM slugs + a referrer host", () => {
    const r = captureAcquisition(
      "?utm_source=Google&utm_medium=cpc",
      "https://www.google.com/search?q=x",
      "https://caelex.eu",
    );
    expect(r.utm).toEqual({ utmSource: "google", utmMedium: "cpc" });
    expect(r.referrer).toBe("google");
  });

  it("omits referrer for direct traffic", () => {
    const r = captureAcquisition(
      "?utm_source=newsletter",
      "",
      "https://caelex.eu",
    );
    expect(r.utm).toEqual({ utmSource: "newsletter" });
    expect("referrer" in r).toBe(false);
  });

  it("omits referrer for same-origin navigation", () => {
    const r = captureAcquisition(
      "",
      "https://caelex.eu/blog/post",
      "https://caelex.eu",
    );
    expect(r.utm).toEqual({});
    expect(r.referrer).toBeUndefined();
  });

  it("returns empty bundle when nothing is present", () => {
    const r = captureAcquisition("", "", "https://caelex.eu");
    expect(r).toEqual({ utm: {} });
  });
});
