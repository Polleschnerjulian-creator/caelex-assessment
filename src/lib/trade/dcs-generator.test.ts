/**
 * Tests for src/lib/trade/dcs-generator.ts — Sprint Z30.
 *
 * Covers the § 758.6 generator's two regulatory branches:
 *   - § 758.6(a) — generic DCS for ordinary CCL items
 *   - § 758.6(b) — extended language for 9x515 / 600-series items
 *
 * Plus input validation, multi-ECCN handling, country normalization,
 * cascade-result safety check, and plain-ASCII output guarantee.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  generateDestinationControlStatement,
  isNineX515OrSixHundredSeries,
  DCSGeneratorError,
  type DCSGeneratorInput,
} from "./dcs-generator";
import type { CascadeResult } from "./subject-to-ear/cascade";

// ─── Helpers ────────────────────────────────────────────────────────

function mkCascadeRequiringDcs(): CascadeResult {
  return {
    jurisdiction: "EAR",
    subjectToEar: true,
    gateFired: "DE_MINIMIS_PERCENTAGE_EXCEEDED",
    itarSeeThroughHits: [],
    fdprHits: [],
    fdprNotYetEvaluatedRules: [],
    deMinimisCarveOuts: [],
    appliedThresholdPercent: 25,
    usControlledContentPercent: 30,
    rationale: ["mock rationale"],
    obligations: {
      recordkeepingYears: 5,
      destinationControlStatementRequired: true,
      recordkeepingBasis: "15 CFR § 762.6 + § 758.6",
    },
    disclaimer: "mock disclaimer",
  };
}

function mkCascadeNotRequiringDcs(): CascadeResult {
  return {
    jurisdiction: "NONE",
    subjectToEar: false,
    gateFired: "NONE",
    itarSeeThroughHits: [],
    fdprHits: [],
    fdprNotYetEvaluatedRules: [],
    deMinimisCarveOuts: [],
    appliedThresholdPercent: 25,
    usControlledContentPercent: 5,
    rationale: ["mock rationale"],
    obligations: {
      recordkeepingYears: 5,
      destinationControlStatementRequired: false,
      recordkeepingBasis: "15 CFR § 762.6",
    },
    disclaimer: "mock disclaimer",
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("isNineX515OrSixHundredSeries", () => {
  it("matches all 9x515 letter variants", () => {
    expect(isNineX515OrSixHundredSeries("9A515")).toBe(true);
    expect(isNineX515OrSixHundredSeries("9B515")).toBe(true);
    expect(isNineX515OrSixHundredSeries("9C515")).toBe(true);
    expect(isNineX515OrSixHundredSeries("9D515")).toBe(true);
    expect(isNineX515OrSixHundredSeries("9E515")).toBe(true);
    expect(isNineX515OrSixHundredSeries("9A515.a.1")).toBe(true);
  });

  it("matches 600-series across categories", () => {
    expect(isNineX515OrSixHundredSeries("9A610")).toBe(true);
    expect(isNineX515OrSixHundredSeries("0A606")).toBe(true);
    expect(isNineX515OrSixHundredSeries("1C608")).toBe(true);
    expect(isNineX515OrSixHundredSeries("9D610.a")).toBe(true);
  });

  it("rejects ordinary CCL ECCNs", () => {
    expect(isNineX515OrSixHundredSeries("3A001")).toBe(false);
    expect(isNineX515OrSixHundredSeries("EAR99")).toBe(false);
    expect(isNineX515OrSixHundredSeries("5A002")).toBe(false);
    expect(isNineX515OrSixHundredSeries("4A001")).toBe(false);
  });

  it("normalizes case and whitespace", () => {
    expect(isNineX515OrSixHundredSeries("9a515")).toBe(true);
    expect(isNineX515OrSixHundredSeries("  9A610  ")).toBe(true);
  });
});

describe("generateDestinationControlStatement — § 758.6(a) generic branch", () => {
  it("produces the standard DCS text for an ordinary CCL item", () => {
    const out = generateDestinationControlStatement({
      eccns: ["3A001"],
      destinationCountry: "DE",
      consigneeName: "Acme GmbH",
    });

    expect(out.variant).toBe("generic_758_6_a");
    expect(out.extendedLanguageApplies).toBe(false);
    expect(out.extendedLanguageTriggerEccns).toEqual([]);
    expect(out.normalizedEccns).toEqual(["3A001"]);
    expect(out.normalizedDestinationCountry).toBe("DE");
    // Standard mandatory text is present.
    expect(out.text).toContain(
      "These items are controlled by the U.S. Government",
    );
    expect(out.text).toContain("Diversion contrary to U.S. law is prohibited.");
    expect(out.text).toContain("ECCN: 3A001");
    expect(out.text).toContain("Country of Ultimate Destination: DE");
    expect(out.text).toContain("Ultimate Consignee / End-User: Acme GmbH");
    expect(out.citation).toBe("15 CFR § 758.6 (Destination Control Statement)");
  });

  it("renders the destination as '<name> (<code>)' when a name is supplied", () => {
    const out = generateDestinationControlStatement({
      eccns: ["3A001"],
      destinationCountry: "de",
      destinationCountryName: "Germany",
    });
    expect(out.text).toContain("Country of Ultimate Destination: Germany (DE)");
    expect(out.normalizedDestinationCountry).toBe("DE");
  });

  it("includes shipment-reference footer when supplied", () => {
    const out = generateDestinationControlStatement({
      eccns: ["3A001"],
      destinationCountry: "DE",
      shipmentReference: "PO-2026-0042",
    });
    expect(out.text).toContain("Shipment reference: PO-2026-0042");
  });
});

describe("generateDestinationControlStatement — § 758.6(b) extended branch", () => {
  it("adds extended language for a 9A515 item", () => {
    const out = generateDestinationControlStatement({
      eccns: ["9A515.a.1"],
      destinationCountry: "AU",
      consigneeName: "Aussie Satellites Pty Ltd",
    });
    expect(out.variant).toBe("extended_758_6_b_9x515_600_series");
    expect(out.extendedLanguageApplies).toBe(true);
    expect(out.extendedLanguageTriggerEccns).toEqual(["9A515.A.1"]);
    expect(out.text).toContain(
      "subject to additional controls under 15 CFR § 758.6(b)",
    );
    expect(out.text).toContain("Diversion contrary to U.S. law is prohibited.");
  });

  it("adds extended language for a 600-series item", () => {
    const out = generateDestinationControlStatement({
      eccns: ["9A610"],
      destinationCountry: "GB",
    });
    expect(out.variant).toBe("extended_758_6_b_9x515_600_series");
    expect(out.extendedLanguageTriggerEccns).toEqual(["9A610"]);
  });

  it("triggers extended branch when ANY ECCN in a multi-line shipment is 9x515", () => {
    const out = generateDestinationControlStatement({
      eccns: ["3A001", "5A002", "9D515"],
      destinationCountry: "CA",
    });
    expect(out.variant).toBe("extended_758_6_b_9x515_600_series");
    expect(out.extendedLanguageTriggerEccns).toEqual(["9D515"]);
    // All three ECCNs appear, deduped and sorted.
    expect(out.normalizedEccns).toEqual(["3A001", "5A002", "9D515"]);
    expect(out.text).toContain("ECCN(s): 3A001, 5A002, 9D515");
  });
});

describe("generateDestinationControlStatement — multi-ECCN handling", () => {
  it("dedupes and sorts ECCNs", () => {
    const out = generateDestinationControlStatement({
      eccns: [" 5a002 ", "3A001", "5A002", "3a001"],
      destinationCountry: "DE",
    });
    expect(out.normalizedEccns).toEqual(["3A001", "5A002"]);
    expect(out.text).toContain("ECCN(s): 3A001, 5A002");
  });
});

describe("generateDestinationControlStatement — input validation", () => {
  it("throws when ECCN list is empty", () => {
    expect(() =>
      generateDestinationControlStatement({
        eccns: [],
        destinationCountry: "DE",
      } as DCSGeneratorInput),
    ).toThrow(DCSGeneratorError);
  });

  it("throws when ECCN list contains only blanks", () => {
    expect(() =>
      generateDestinationControlStatement({
        eccns: ["  ", ""],
        destinationCountry: "DE",
      }),
    ).toThrow(DCSGeneratorError);
  });

  it("throws when destination country is missing", () => {
    expect(() =>
      generateDestinationControlStatement({
        eccns: ["3A001"],
        destinationCountry: "",
      }),
    ).toThrow(DCSGeneratorError);
  });

  it("throws when destination country is not a 2-letter code", () => {
    expect(() =>
      generateDestinationControlStatement({
        eccns: ["3A001"],
        destinationCountry: "DEU",
      }),
    ).toThrow(DCSGeneratorError);
  });
});

describe("generateDestinationControlStatement — cascade-result safety", () => {
  it("accepts a cascade that REQUIRES the DCS", () => {
    const out = generateDestinationControlStatement({
      eccns: ["3A001"],
      destinationCountry: "DE",
      cascadeResult: mkCascadeRequiringDcs(),
    });
    expect(out.text.length).toBeGreaterThan(0);
  });

  it("refuses to generate when the cascade says DCS is NOT required", () => {
    expect(() =>
      generateDestinationControlStatement({
        eccns: ["3A001"],
        destinationCountry: "DE",
        cascadeResult: mkCascadeNotRequiringDcs(),
      }),
    ).toThrow(DCSGeneratorError);
  });

  it("permits generation when no cascade result is supplied (operator-asserted)", () => {
    const out = generateDestinationControlStatement({
      eccns: ["3A001"],
      destinationCountry: "DE",
      // cascadeResult intentionally omitted
    });
    expect(out.variant).toBe("generic_758_6_a");
  });
});

describe("generateDestinationControlStatement — plain-text guarantee", () => {
  it("produces output with no markdown or HTML tokens", () => {
    const out = generateDestinationControlStatement({
      eccns: ["9A515.a.1", "3A001"],
      destinationCountry: "AU",
      destinationCountryName: "Australia",
      consigneeName: "Aussie Satellites",
      shipmentReference: "AWB-12345",
    });
    // No HTML tags
    expect(out.text).not.toMatch(/<[a-z][^>]*>/i);
    // No markdown bold / italic / heading markers
    expect(out.text).not.toMatch(/\*\*/);
    expect(out.text).not.toMatch(/^#/m);
    expect(out.text).not.toMatch(/__/);
    // No backticks
    expect(out.text).not.toMatch(/`/);
    // ASCII only (allow the § symbol — it is part of the citation
    // and printable; reject smart quotes and em-dashes that would
    // break some shipping-document encoders).
    expect(out.text).not.toMatch(/[‘’“”—]/);
  });
});
