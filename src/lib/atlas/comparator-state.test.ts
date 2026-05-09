/**
 * Tests for src/lib/atlas/comparator-state.ts.
 *
 * Locks the URL-state contract: parseStateFromQuery + buildShareableUrl.
 *
 * Surface coverage was identified as a gap by the perf-architecture
 * audit (B.3) — multi-branch URL parsing with no tests means
 * shareable-link regressions go silent. These tests are golden
 * fixtures for the most common share-link patterns.
 */

import { describe, it, expect } from "vitest";
import {
  COMPARATOR_MAX_COUNTRIES,
  DEFAULT_COUNTRIES,
  VALID_COUNTRIES,
  VALID_DIMENSIONS,
  buildShareableUrl,
  parseStateFromQuery,
} from "./comparator-state";

describe("parseStateFromQuery — countries (`?j=`)", () => {
  it("returns null for an empty string", () => {
    const r = parseStateFromQuery(new URLSearchParams(""));
    expect(r.countries).toBeNull();
  });

  it("parses a comma-separated list", () => {
    const r = parseStateFromQuery(new URLSearchParams("j=FR,DE,UK"));
    expect(r.countries).toEqual(["FR", "DE", "UK"]);
  });

  it("uppercases lower-case codes", () => {
    const r = parseStateFromQuery(new URLSearchParams("j=fr,de,uk"));
    expect(r.countries).toEqual(["FR", "DE", "UK"]);
  });

  it("strips whitespace around codes", () => {
    const r = parseStateFromQuery(new URLSearchParams("j= FR , DE , UK "));
    expect(r.countries).toEqual(["FR", "DE", "UK"]);
  });

  it("filters out unknown codes", () => {
    const r = parseStateFromQuery(new URLSearchParams("j=FR,XX,DE,YY,UK"));
    expect(r.countries).toEqual(["FR", "DE", "UK"]);
  });

  it("returns null when every entry is invalid", () => {
    const r = parseStateFromQuery(new URLSearchParams("j=ZZ,YY,XX"));
    expect(r.countries).toBeNull();
  });

  it("caps at COMPARATOR_MAX_COUNTRIES", () => {
    const long = Array.from({ length: 20 }, () => "FR").join(",");
    const r = parseStateFromQuery(new URLSearchParams(`j=${long}`));
    expect(r.countries).toHaveLength(COMPARATOR_MAX_COUNTRIES);
  });
});

describe("parseStateFromQuery — dimension (`?dim=`)", () => {
  it("returns null when dim is missing", () => {
    const r = parseStateFromQuery(new URLSearchParams(""));
    expect(r.dimension).toBeNull();
  });

  it("accepts every valid dimension", () => {
    for (const dim of VALID_DIMENSIONS) {
      const r = parseStateFromQuery(new URLSearchParams(`dim=${dim}`));
      expect(r.dimension).toBe(dim);
    }
  });

  it("BUG-A4: dim=Liability is normalised to lowercase (case-insensitive)", () => {
    const r = parseStateFromQuery(new URLSearchParams("dim=Liability"));
    expect(r.dimension).toBe("liability");
  });

  it("BUG-A4: dim=DEBRIS works too", () => {
    const r = parseStateFromQuery(new URLSearchParams("dim=DEBRIS"));
    expect(r.dimension).toBe("debris");
  });

  it("returns null for an unknown dimension", () => {
    const r = parseStateFromQuery(new URLSearchParams("dim=mystery"));
    expect(r.dimension).toBeNull();
  });
});

describe("parseStateFromQuery — differences-only (`?diff=`)", () => {
  it("defaults to false when missing", () => {
    const r = parseStateFromQuery(new URLSearchParams(""));
    expect(r.differencesOnly).toBe(false);
  });

  it("is true when ?diff=1", () => {
    const r = parseStateFromQuery(new URLSearchParams("diff=1"));
    expect(r.differencesOnly).toBe(true);
  });

  it("is false for any other value", () => {
    expect(
      parseStateFromQuery(new URLSearchParams("diff=true")).differencesOnly,
    ).toBe(false);
    expect(
      parseStateFromQuery(new URLSearchParams("diff=on")).differencesOnly,
    ).toBe(false);
    expect(
      parseStateFromQuery(new URLSearchParams("diff=0")).differencesOnly,
    ).toBe(false);
  });
});

describe("parseStateFromQuery — date (`?t=`)", () => {
  it("returns null when t is missing", () => {
    const r = parseStateFromQuery(new URLSearchParams(""));
    expect(r.date).toBeNull();
  });

  it("parses an ISO date", () => {
    const r = parseStateFromQuery(new URLSearchParams("t=2027-04-01"));
    expect(r.date).toBeInstanceOf(Date);
    expect(r.date?.toISOString().slice(0, 10)).toBe("2027-04-01");
  });

  it("returns null for a malformed date", () => {
    const r = parseStateFromQuery(new URLSearchParams("t=not-a-date"));
    expect(r.date).toBeNull();
  });
});

describe("buildShareableUrl", () => {
  /* Lock now to mid-2026 so the date-drift threshold tests are
     deterministic. */
  const NOW = new Date("2026-05-09T12:00:00Z").getTime();

  it("emits j= when there are countries", () => {
    const url = buildShareableUrl(["FR", "DE"], "all", new Date(NOW), {}, NOW);
    expect(url).toBe("/atlas/comparator?j=FR%2CDE");
  });

  it("omits j= when there are no countries", () => {
    const url = buildShareableUrl([], "all", new Date(NOW), {}, NOW);
    expect(url).toBe("/atlas/comparator");
  });

  it("omits dim= when dimension is the default 'all'", () => {
    const url = buildShareableUrl(["FR"], "all", new Date(NOW), {}, NOW);
    expect(url).not.toContain("dim=");
  });

  it("emits dim= for non-default dimensions", () => {
    const url = buildShareableUrl(["FR"], "liability", new Date(NOW), {}, NOW);
    expect(url).toContain("dim=liability");
  });

  it("omits t= for dates within ±24 h of now", () => {
    /* 12 hours later — under the 24 h drift threshold. */
    const near = NOW + 12 * 60 * 60 * 1000;
    const url = buildShareableUrl(["FR"], "all", new Date(near), {}, NOW);
    expect(url).not.toContain("t=");
  });

  it("emits t= for dates >24 h away", () => {
    /* 30 days later. */
    const far = NOW + 30 * 24 * 60 * 60 * 1000;
    const url = buildShareableUrl(["FR"], "all", new Date(far), {}, NOW);
    expect(url).toContain("t=");
  });

  it("emits an absolute URL when origin is provided", () => {
    const url = buildShareableUrl(
      ["FR"],
      "all",
      new Date(NOW),
      { origin: "https://atlas.caelex.eu" },
      NOW,
    );
    expect(url).toBe("https://atlas.caelex.eu/atlas/comparator?j=FR");
  });

  it("emits a relative URL when origin is omitted (SSR-safe)", () => {
    const url = buildShareableUrl(["FR"], "all", new Date(NOW), {}, NOW);
    expect(url).toBe("/atlas/comparator?j=FR");
  });

  it("D1: emits diff=1 when differencesOnly is true", () => {
    const url = buildShareableUrl(
      ["FR", "DE"],
      "all",
      new Date(NOW),
      {},
      NOW,
      true,
    );
    expect(url).toContain("diff=1");
  });

  it("D1: omits diff= when differencesOnly is false (default)", () => {
    const url = buildShareableUrl(["FR", "DE"], "all", new Date(NOW), {}, NOW);
    expect(url).not.toContain("diff=");
  });

  it("round-trips: build → parse yields equivalent state", () => {
    const codes = ["FR", "DE", "UK"] as const;
    const dim = "liability";
    const future = new Date(NOW + 30 * 24 * 60 * 60 * 1000);
    const url = buildShareableUrl([...codes], dim, future, {}, NOW);
    const search = url.includes("?") ? url.split("?")[1]! : "";
    const parsed = parseStateFromQuery(new URLSearchParams(search));
    expect(parsed.countries).toEqual([...codes]);
    expect(parsed.dimension).toBe(dim);
    expect(parsed.date?.toISOString().slice(0, 10)).toBe(
      future.toISOString().slice(0, 10),
    );
  });
});

describe("Module constants", () => {
  it("DEFAULT_COUNTRIES is non-empty and entries are in VALID_COUNTRIES", () => {
    expect(DEFAULT_COUNTRIES.length).toBeGreaterThan(0);
    for (const c of DEFAULT_COUNTRIES)
      expect(VALID_COUNTRIES.has(c)).toBe(true);
  });

  it("VALID_DIMENSIONS includes 'all' as the default", () => {
    expect(VALID_DIMENSIONS.has("all")).toBe(true);
  });

  it("COMPARATOR_MAX_COUNTRIES matches the CountrySelector cap", () => {
    /* If this drifts, a deep-link with 8 countries would be silently
       truncated. Guard against drift. */
    expect(COMPARATOR_MAX_COUNTRIES).toBe(8);
  });
});
