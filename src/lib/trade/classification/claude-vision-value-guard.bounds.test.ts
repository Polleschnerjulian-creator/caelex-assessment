/**
 * Caelex Trade — guardValue bounds fallback (Task 9b).
 *
 * The vision extractor's local NUMERIC_BOUNDS map predates the six
 * DECISIVE extended attributes added in Task 9 (star-tracker accuracy /
 * slew rate, GNSS max velocity, total impulse, thrust, vacuum Isp). Those
 * attributes gate the highest-signal corpus thresholds (USML XV(e)(16),
 * ECCN 7A005, propulsion cross-walk), and the scoped second vision pass
 * exists specifically to pre-fill exactly those deciding fields.
 *
 * BUT `guardValue` only consulted the local NUMERIC_BOUNDS map, which has
 * no entry for any of the six. A numeric attribute with no documented
 * bound fails closed (correct default), so a perfectly plausible
 * vision-extracted star-tracker accuracy was being DROPPED — defeating the
 * entire scoped pre-fill. The fix wires `guardValue` to fall back to the
 * matcher's `ATTRIBUTE_SANITY_RANGES` (the same physical bounds the
 * corpus matcher already trusts) when an attribute is absent from the
 * local map.
 *
 * These tests pin, for EACH of the six decisive extended attrs, that a
 * plausible in-range value now PASSES the guard (was failing closed) and
 * an absurd out-of-range value still FAILS (the fallback bound is
 * enforced, not bypassed). The pre-fix RED state is the six in-range
 * assertions: with no fallback they all fail closed and return
 * `passedSanity === false`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import { guardValue } from "./claude-vision-extractor.server";
import { ATTRIBUTE_SANITY_RANGES } from "@/lib/comply-v2/trade/classification/parametric-matcher";

// The six decisive extended attrs added in Task 9, each with a plausible
// in-range value and an absurd out-of-range value. The in-range values are
// the cross-walk / golden-set probe points; the out-of-range values sit
// strictly beyond ATTRIBUTE_SANITY_RANGES[attr].max.
const DECISIVE_EXTENDED: ReadonlyArray<{
  attr: string;
  inRange: number;
  outOfRange: number;
}> = [
  // USML XV(e)(16) star-tracker: 1σ accuracy ≤ 1.0 arcsec is decisive.
  // sanity range { min: 0.001, max: 3600 }.
  { attr: "starTrackerAccuracyArcsec", inRange: 0.5, outOfRange: 10_000 },
  // sanity range { min: 0.001, max: 1000 }.
  { attr: "starTrackerSlewRateDegPerS", inRange: 5, outOfRange: 5_000 },
  // ECCN 7A005 GNSS: ≥ 600 m/s is decisive. sanity range { min: 1, max: 50000 }.
  { attr: "gnssMaxVelocityMPerS", inRange: 600, outOfRange: 1_000_000 },
  // Propulsion total impulse. sanity range { min: 1, max: 1e12 }.
  { attr: "totalImpulseNs", inRange: 1.2e6, outOfRange: 1e15 },
  // Propulsion thrust. sanity range { min: 0.0001, max: 1e8 }.
  { attr: "thrustNewtons", inRange: 0.3, outOfRange: 1e12 },
  // Vacuum Isp. sanity range { min: 10, max: 20000 }.
  { attr: "specificImpulseSecondsVacuum", inRange: 3_000, outOfRange: 100_000 },
];

describe("guardValue — ATTRIBUTE_SANITY_RANGES fallback for decisive extended attrs", () => {
  it("ATTRIBUTE_SANITY_RANGES actually contains all six decisive attrs (ground truth)", () => {
    for (const { attr } of DECISIVE_EXTENDED) {
      expect(ATTRIBUTE_SANITY_RANGES[attr]).toBeDefined();
    }
  });

  for (const { attr, inRange, outOfRange } of DECISIVE_EXTENDED) {
    it(`passes a plausible in-range ${attr} via the fallback bound`, () => {
      const r = guardValue(attr as Parameters<typeof guardValue>[0], inRange);
      expect(r.passedSanity).toBe(true);
      expect(r.whyRejected).toBeUndefined();
    });

    it(`rejects an absurd out-of-range ${attr} (fallback bound enforced, not bypassed)`, () => {
      const r = guardValue(
        attr as Parameters<typeof guardValue>[0],
        outOfRange,
      );
      expect(r.passedSanity).toBe(false);
      expect(r.whyRejected).toBeTruthy();
      expect(r.whyRejected).toContain(attr);
    });
  }
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
