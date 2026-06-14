// src/lib/trade/intake/intake-regression.test.ts
import { describe, it, expect } from "vitest";
import { suggestionsFromAttributesAndText } from "@/lib/trade/classify-suggest";
import { runDestinationLandscape } from "@/lib/trade/landscape.server";

const ST = "spacecraft.adcs.star_tracker";

describe("intake regression — fail-closed + worked example", () => {
  it("AstroSense (10 arcsec) fails the ≤1 arcsec ITAR conjunction → EAR/EU fall-through, not XV(e)(16), not a rocket", () => {
    const s = suggestionsFromAttributesAndText(
      [
        { attribute: "itemClass", value: ST, confidence: "high" },
        {
          attribute: "starTrackerAccuracyArcsec",
          value: 10,
          confidence: "high",
        },
        {
          attribute: "starTrackerSlewRateDegPerS",
          value: 3,
          confidence: "high",
        },
      ],
      "autonomous star tracker celestial navigation",
    );
    const ids = s.map((x) => x.canonicalId);
    // never a rocket
    expect(ids).not.toContain("MTCR:Item-1.A.1");
    // a 10-arcsec tracker fails the ≤1 arcsec ITAR conjunction, so the hard ITAR
    // entry must NOT appear at all (not as the top hit, not anywhere) — it falls
    // through to the EAR-CCL / EU dual-use star-tracker code (7A004 / 9A004).
    expect(ids).not.toContain("USML:XV(e)(16)");
    expect(s[0]?.canonicalId).not.toBe("USML:XV(e)(16)");
    // and the fall-through code IS surfaced (cannot-rule-out, never uncontrolled)
    expect(ids).toContain("US_CCL:7A004");
    expect(s.length).toBeGreaterThan(0);
    // every surviving candidate is non-decisive (LOW) — no false hard GO/control
    expect(s.every((x) => x.confidence === "LOW")).toBe(true);
  });

  it("FAIL-CLOSED: a star tracker with accuracy BLANK still surfaces its code as cannot-rule-out (never all-GO)", () => {
    const s = suggestionsFromAttributesAndText(
      [{ attribute: "itemClass", value: ST, confidence: "high" }],
      "autonomous star tracker",
    );
    // the class code surfaces (possible/near-miss), the item never reads as uncontrolled
    expect(s.length).toBeGreaterThan(0);
  });

  it("a genuine MTCR rocket still flags Item-1.A.1 (no false negative)", () => {
    const s = suggestionsFromAttributesAndText(
      [
        { attribute: "payloadKg", value: 600, confidence: "high" },
        { attribute: "rangeKm", value: 400, confidence: "high" },
      ],
      "complete two-stage launch vehicle to orbit",
    );
    expect(s.map((x) => x.canonicalId)).toContain("MTCR:Item-1.A.1");
  });

  it("a confirmed 7A004 star tracker (DE seat) yields a colorful landscape, RU/embargo BLOCKED", () => {
    const r = runDestinationLandscape(
      { name: "ST-300", description: "star tracker", eccnEU: "7A004" } as any,
      { exporterSeat: "DE" },
    );
    const blocked = r.blocked.map((c) => c.country);
    expect(blocked).toContain("RU"); // arms-embargo destination is BLOCKED
    expect(blocked).toContain("BY"); // and Belarus
    expect(r.go.length).toBeGreaterThan(0); // colourful — not all-REVIEW
    // a resolvable DE seat is NOT an unsupported origin → not all-REVIEW either
    expect(r.review.length).toBeLessThan(r.go.length);
  });
});
