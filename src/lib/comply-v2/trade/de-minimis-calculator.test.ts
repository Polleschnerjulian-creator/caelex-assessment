/**
 * Sprint B5 — De-minimis & FDPR Calculator tests.
 *
 * Tests cover:
 *   1. ITAR gate — hasItarContent always returns ITAR_CONTROLLED
 *   2. Embargoed destinations — always EMBARGOED_DESTINATION
 *   3. Standard threshold (25%) — eligible vs exceeded
 *   4. Restricted threshold (10%) — eligible vs exceeded (D:1 countries)
 *   5. FDPR flag — triggers when designedWithUSTech or manufacturedWithUS
 *   6. Special ECCN — requires legal review
 *   7. Risk level mapping
 *   8. getDestinationTier helper
 *   9. formatDeMinimisResultForDisplay — smoke test
 */

import { describe, it, expect } from "vitest";

import {
  calculateDeMinimis,
  getDestinationTier,
  formatDeMinimisResultForDisplay,
  type DeMinimisInput,
} from "./de-minimis-calculator";

// ─── Helpers ──────────────────────────────────────────────────────────

const BASE_INPUT: DeMinimisInput = {
  usControlledContentPercent: 5,
  hasItarContent: false,
  designedWithUSTech: false,
  manufacturedWithUSEquipment: false,
  destinationTier: "STANDARD",
};

function make(overrides: Partial<DeMinimisInput>): DeMinimisInput {
  return { ...BASE_INPUT, ...overrides };
}

// ─── 1. ITAR gate ─────────────────────────────────────────────────────

describe("ITAR gate", () => {
  it("returns ITAR_CONTROLLED when hasItarContent is true", () => {
    const r = calculateDeMinimis(make({ hasItarContent: true }));
    expect(r.outcome).toBe("ITAR_CONTROLLED");
  });

  it("ITAR gate fires regardless of US content percentage", () => {
    const r = calculateDeMinimis(
      make({ hasItarContent: true, usControlledContentPercent: 0 }),
    );
    expect(r.outcome).toBe("ITAR_CONTROLLED");
  });

  it("applied threshold is 0 for ITAR", () => {
    const r = calculateDeMinimis(make({ hasItarContent: true }));
    expect(r.appliedThresholdPercent).toBe(0);
  });

  it("risk level is HIGH for ITAR", () => {
    const r = calculateDeMinimis(make({ hasItarContent: true }));
    expect(r.riskLevel).toBe("HIGH");
  });

  it("reasons mention DDTC and USML", () => {
    const r = calculateDeMinimis(make({ hasItarContent: true }));
    const allText = r.reasons.join(" ");
    expect(allText.toLowerCase()).toContain("itar");
  });
});

// ─── 2. Embargoed destinations ────────────────────────────────────────

describe("embargoed destinations", () => {
  it("returns EMBARGOED_DESTINATION for EMBARGOED tier", () => {
    const r = calculateDeMinimis(make({ destinationTier: "EMBARGOED" }));
    expect(r.outcome).toBe("EMBARGOED_DESTINATION");
  });

  it("returns EMBARGOED_DESTINATION for Iran (IR)", () => {
    const r = calculateDeMinimis(
      make({ destinationCountry: "IR", destinationTier: "STANDARD" }),
    );
    expect(r.outcome).toBe("EMBARGOED_DESTINATION");
  });

  it("returns EMBARGOED_DESTINATION for North Korea (KP)", () => {
    const r = calculateDeMinimis(
      make({ destinationCountry: "KP", destinationTier: "STANDARD" }),
    );
    expect(r.outcome).toBe("EMBARGOED_DESTINATION");
  });

  it("risk level is HIGH for embargoed", () => {
    const r = calculateDeMinimis(make({ destinationTier: "EMBARGOED" }));
    expect(r.riskLevel).toBe("HIGH");
  });
});

// ─── 3. Standard 25% threshold ────────────────────────────────────────

describe("standard 25% threshold (STANDARD tier)", () => {
  it("returns DE_MINIMIS_ELIGIBLE when content < 25%", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 20, destinationTier: "STANDARD" }),
    );
    expect(r.outcome).toBe("DE_MINIMIS_ELIGIBLE");
  });

  it("returns DE_MINIMIS_ELIGIBLE at exactly 25%", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 25, destinationTier: "STANDARD" }),
    );
    expect(r.outcome).toBe("DE_MINIMIS_ELIGIBLE");
  });

  it("returns DE_MINIMIS_EXCEEDED when content > 25%", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 26, destinationTier: "STANDARD" }),
    );
    expect(r.outcome).toBe("DE_MINIMIS_EXCEEDED");
  });

  it("applied threshold is 25 for STANDARD", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 10, destinationTier: "STANDARD" }),
    );
    expect(r.appliedThresholdPercent).toBe(25);
  });

  it("risk level is LOW when eligible", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 5, destinationTier: "STANDARD" }),
    );
    expect(r.riskLevel).toBe("LOW");
  });

  it("risk level is MEDIUM when exceeded", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 30, destinationTier: "STANDARD" }),
    );
    expect(r.riskLevel).toBe("MEDIUM");
  });
});

// ─── 4. Restricted 10% threshold (D:1 countries) ─────────────────────

describe("restricted 10% threshold (RESTRICTED tier / D:1)", () => {
  it("returns DE_MINIMIS_ELIGIBLE when content ≤ 10%", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 10, destinationTier: "RESTRICTED" }),
    );
    expect(r.outcome).toBe("DE_MINIMIS_ELIGIBLE");
  });

  it("returns DE_MINIMIS_EXCEEDED when content > 10%", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 11, destinationTier: "RESTRICTED" }),
    );
    expect(r.outcome).toBe("DE_MINIMIS_EXCEEDED");
  });

  it("returns DE_MINIMIS_EXCEEDED for China (CN) at 12%", () => {
    const r = calculateDeMinimis(
      make({
        usControlledContentPercent: 12,
        destinationTier: "RESTRICTED",
        destinationCountry: "CN",
      }),
    );
    expect(r.outcome).toBe("DE_MINIMIS_EXCEEDED");
  });

  it("applied threshold is 10 for RESTRICTED", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 5, destinationTier: "RESTRICTED" }),
    );
    expect(r.appliedThresholdPercent).toBe(10);
  });

  it("item eligible at 20% for STANDARD but exceeded for RESTRICTED", () => {
    const pct = 20;
    const standard = calculateDeMinimis(
      make({ usControlledContentPercent: pct, destinationTier: "STANDARD" }),
    );
    const restricted = calculateDeMinimis(
      make({ usControlledContentPercent: pct, destinationTier: "RESTRICTED" }),
    );
    expect(standard.outcome).toBe("DE_MINIMIS_ELIGIBLE");
    expect(restricted.outcome).toBe("DE_MINIMIS_EXCEEDED");
  });
});

// ─── 5. FDPR flag ─────────────────────────────────────────────────────

describe("FDPR flag", () => {
  it("fdprFlag is true when designedWithUSTech is true", () => {
    const r = calculateDeMinimis(make({ designedWithUSTech: true }));
    expect(r.fdprFlag).toBe(true);
  });

  it("fdprFlag is true when manufacturedWithUSEquipment is true", () => {
    const r = calculateDeMinimis(make({ manufacturedWithUSEquipment: true }));
    expect(r.fdprFlag).toBe(true);
  });

  it("outcome is FDPR_TRIGGERED even when de-minimis met, if FDPR set", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 5, designedWithUSTech: true }),
    );
    expect(r.outcome).toBe("FDPR_TRIGGERED");
    expect(r.fdprFlag).toBe(true);
  });

  it("FDPR_TRIGGERED is HIGH risk when de-minimis threshold exceeded", () => {
    const r = calculateDeMinimis(
      make({
        usControlledContentPercent: 30,
        designedWithUSTech: true,
        destinationTier: "STANDARD",
      }),
    );
    expect(r.outcome).toBe("FDPR_TRIGGERED");
    expect(r.riskLevel).toBe("HIGH");
  });

  it("FDPR_TRIGGERED is MEDIUM risk when de-minimis threshold met", () => {
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 5, designedWithUSTech: true }),
    );
    expect(r.outcome).toBe("FDPR_TRIGGERED");
    expect(r.riskLevel).toBe("MEDIUM");
  });

  it("fdprFlag is false when no US tech flags set", () => {
    const r = calculateDeMinimis(BASE_INPUT);
    expect(r.fdprFlag).toBe(false);
  });
});

// ─── 6. Special ECCN ─────────────────────────────────────────────────

describe("special ECCN (REQUIRES_LEGAL_REVIEW)", () => {
  it("returns REQUIRES_LEGAL_REVIEW for 9A515.a content", () => {
    const r = calculateDeMinimis(make({ usContentEccns: ["9A515.a"] }));
    expect(r.outcome).toBe("REQUIRES_LEGAL_REVIEW");
  });

  it("returns REQUIRES_LEGAL_REVIEW for 5E002 content", () => {
    const r = calculateDeMinimis(make({ usContentEccns: ["5E002"] }));
    expect(r.outcome).toBe("REQUIRES_LEGAL_REVIEW");
  });

  it("regular ECCNs do not trigger REQUIRES_LEGAL_REVIEW", () => {
    const r = calculateDeMinimis(
      make({ usContentEccns: ["3A001.a.1", "7A003"] }),
    );
    expect(r.outcome).not.toBe("REQUIRES_LEGAL_REVIEW");
  });

  it("special ECCN check fires before de-minimis calculation", () => {
    // Even at 0% content, special ECCN triggers the review flag
    const r = calculateDeMinimis(
      make({ usControlledContentPercent: 0, usContentEccns: ["9A515.b"] }),
    );
    expect(r.outcome).toBe("REQUIRES_LEGAL_REVIEW");
  });
});

// ─── 7. Reasons and recommendations ──────────────────────────────────

describe("reasons and recommendations", () => {
  it("eligible result has at least one reason and one recommendation", () => {
    const r = calculateDeMinimis(BASE_INPUT);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("all results include a disclaimer", () => {
    const inputs: DeMinimisInput[] = [
      BASE_INPUT,
      make({ hasItarContent: true }),
      make({ destinationTier: "EMBARGOED" }),
      make({ usControlledContentPercent: 30 }),
    ];
    for (const input of inputs) {
      const r = calculateDeMinimis(input);
      expect(r.disclaimer).toBeTruthy();
      expect(r.disclaimer.length).toBeGreaterThan(50);
    }
  });
});

// ─── 8. getDestinationTier ────────────────────────────────────────────

describe("getDestinationTier", () => {
  it("returns EMBARGOED for Iran (IR)", () => {
    expect(getDestinationTier("IR")).toBe("EMBARGOED");
  });

  it("returns EMBARGOED for North Korea (KP)", () => {
    expect(getDestinationTier("KP")).toBe("EMBARGOED");
  });

  it("returns RESTRICTED for China (CN)", () => {
    expect(getDestinationTier("CN")).toBe("RESTRICTED");
  });

  it("returns RESTRICTED for Russia (RU)", () => {
    expect(getDestinationTier("RU")).toBe("RESTRICTED");
  });

  it("returns STANDARD for Germany (DE)", () => {
    expect(getDestinationTier("DE")).toBe("STANDARD");
  });

  it("returns STANDARD for France (FR)", () => {
    expect(getDestinationTier("FR")).toBe("STANDARD");
  });

  it("is case-insensitive", () => {
    expect(getDestinationTier("ir")).toBe("EMBARGOED");
    expect(getDestinationTier("cn")).toBe("RESTRICTED");
    expect(getDestinationTier("de")).toBe("STANDARD");
  });
});

// ─── 9. formatDeMinimisResultForDisplay ──────────────────────────────

describe("formatDeMinimisResultForDisplay", () => {
  it("returns a non-empty string", () => {
    const r = calculateDeMinimis(BASE_INPUT);
    const display = formatDeMinimisResultForDisplay(r);
    expect(typeof display).toBe("string");
    expect(display.length).toBeGreaterThan(100);
  });

  it("contains the outcome label", () => {
    const r = calculateDeMinimis(BASE_INPUT);
    const display = formatDeMinimisResultForDisplay(r);
    expect(display).toContain("eligible");
  });

  it("contains the disclaimer", () => {
    const r = calculateDeMinimis(BASE_INPUT);
    const display = formatDeMinimisResultForDisplay(r);
    expect(display).toContain("legal counsel");
  });

  it("ITAR result mentions ITAR in display", () => {
    const r = calculateDeMinimis(make({ hasItarContent: true }));
    const display = formatDeMinimisResultForDisplay(r);
    expect(display.toLowerCase()).toContain("itar");
  });
});
