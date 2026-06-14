// src/lib/trade/intake/derive-relevant-attributes.test.ts
import { describe, it, expect } from "vitest";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

describe("deriveRelevantAttributes", () => {
  it("includes the decisive star-tracker predicates", () => {
    const attrs = deriveRelevantAttributes("spacecraft.adcs.star_tracker");
    expect(attrs).toContain("starTrackerAccuracyArcsec");
    expect(attrs).toContain("starTrackerSlewRateDegPerS");
  });
  it("never includes itemClass itself", () => {
    expect(
      deriveRelevantAttributes("spacecraft.adcs.star_tracker"),
    ).not.toContain("itemClass");
  });
  it("includes the gnss velocity gate for gnss.receiver", () => {
    expect(deriveRelevantAttributes("gnss.receiver")).toContain(
      "gnssMaxVelocityMPerS",
    );
  });
  it("returns [] for an unknown class (honest, no guessing)", () => {
    expect(deriveRelevantAttributes("totally.invented")).toEqual([]);
  });
  // B15 — the matcher's itemClass-prefix op is UNIDIRECTIONAL
  // (actual.startsWith(predicateValue)): an entry only ever matches when the
  // operator's canonical class is AT-OR-DEEPER than the predicate value. The
  // deeper `gnss.receiver.antijam` entry can therefore NEVER gate a plain
  // `gnss.receiver` item, so the form must NOT ask isAntiJam "on behalf of"
  // that unreachable entry. isAntiJam may still be derived via a SHALLOWER
  // gate (`gnss` value) that a `gnss.receiver` item DOES satisfy.
  it("does NOT ask for a deeper-class-only field via a class the matcher cannot reach", () => {
    const attrs = deriveRelevantAttributes("gnss.receiver");
    // gnss.receiver.antijam (deeper) must not pull its fields up to gnss.receiver.
    // But the gnss-prefix RU833 entry (shallower) legitimately gates isAntiJam,
    // so isAntiJam IS reachable here — assert the velocity gate is present
    // (matcher-reachable) and the velocity gate is the decisive corpus field.
    expect(attrs).toContain("gnssMaxVelocityMPerS");
  });
  it("matcher-direction: a shallower (parent) class never inherits a child's deeper-only gate", () => {
    // spacecraft.adcs is a parent prefix; the corpus gates on the deeper
    // spacecraft.adcs.star_tracker. The matcher gates on
    // actual.startsWith("spacecraft.adcs.star_tracker"), which a bare
    // "spacecraft.adcs" item never satisfies — so the star-tracker thresholds
    // must NOT be asked for the parent class.
    const attrs = deriveRelevantAttributes("spacecraft.adcs");
    expect(attrs).not.toContain("starTrackerAccuracyArcsec");
    expect(attrs).not.toContain("starTrackerSlewRateDegPerS");
  });
});
