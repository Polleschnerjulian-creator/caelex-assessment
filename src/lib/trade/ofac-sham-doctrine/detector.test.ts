/**
 * Tests for src/lib/trade/ofac-sham-doctrine/detector.ts — Sprint Z16.
 *
 * Coverage map:
 *
 *   Per red-flag type:
 *     - positive case (firing)
 *     - negative case (clear / under threshold)
 *     - skipped-input case (data absent → goes to skippedChecks)
 *
 *   Aggregation:
 *     - 0-score    → PROCEED, no red flags
 *     - 25-49      → ENHANCED_DUE_DILIGENCE
 *     - 50-74      → ESCALATE
 *     - 75+        → REJECT, score capped at 100
 *     - combinations of multiple flags
 *
 *   Output integrity:
 *     - detectorVersion is stable
 *     - skippedChecks ≠ red flags (don't double-count "no data")
 *     - citations are non-empty for every fired red flag
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  detectShamTransactionRisk,
  recommendationForScore,
  KNOWN_SHELL_JURISDICTIONS,
  type ShamDetectorOperation,
  type ShamDetectorContext,
  type ShamDetectorCounterparty,
  type ReexportHistoryEntry,
  type UBOChainNode,
} from "./detector";

// ─── Builders ───────────────────────────────────────────────────────

function mkCounterparty(
  overrides: Partial<ShamDetectorCounterparty> = {},
): ShamDetectorCounterparty {
  return {
    id: "CP-1",
    legalName: "Acme SpaceTech GmbH",
    countryCode: "DE",
    ...overrides,
  };
}

function mkOperation(
  overrides: Partial<ShamDetectorOperation> = {},
): ShamDetectorOperation {
  return {
    id: "OP-1",
    shipToCountry: "DE",
    endUseCountry: "DE",
    counterparty: mkCounterparty(),
    endUser: {
      name: "Acme SpaceTech GmbH",
      operatingCountry: "DE",
    },
    lines: [
      {
        eccn: "9A515.d",
        unitValue: 100_000,
        quantity: 1,
        currency: "EUR",
      },
    ],
    ...overrides,
  };
}

function ageInMonths(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  // Bump the day down so monthsSince() rounds cleanly.
  d.setDate(Math.min(d.getDate(), 28));
  return d;
}

// ─── 1. INDIRECT_OWNERSHIP_CHAIN ───────────────────────────────────

describe("INDIRECT_OWNERSHIP_CHAIN", () => {
  function chain(depths: number[]): UBOChainNode[] {
    return depths.map((d, i) => ({
      id: `UBO-${i}`,
      name: `Layer ${i}`,
      countryCode: "VG",
      depth: d,
      effectivePercent: 1.0,
    }));
  }

  it("fires when UBO chain exceeds 3 levels (Z9b output supplied)", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({ uboChain: chain([1, 2, 3, 4]) }),
    });
    const result = detectShamTransactionRisk(op);
    const flag = result.redFlags.find(
      (f) => f.type === "INDIRECT_OWNERSHIP_CHAIN",
    );
    expect(flag).toBeDefined();
    expect(flag!.evidence.maxDepth).toBe(4);
    expect(flag!.citations.length).toBeGreaterThan(0);
    expect(flag!.citations.some((c) => c.name.includes("Burisma"))).toBe(true);
  });

  it("does NOT fire when UBO chain is at or below depth 3", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({ uboChain: chain([1, 2, 3]) }),
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.redFlags.find((f) => f.type === "INDIRECT_OWNERSHIP_CHAIN"),
    ).toBeUndefined();
    expect(
      result.skippedChecks.find((s) => s.type === "INDIRECT_OWNERSHIP_CHAIN"),
    ).toBeUndefined();
  });

  it("is skipped (NOT cleared) when no UBO chain supplied — graceful degradation", () => {
    const op = mkOperation(); // no uboChain
    const result = detectShamTransactionRisk(op);
    expect(
      result.skippedChecks.find((s) => s.type === "INDIRECT_OWNERSHIP_CHAIN"),
    ).toBeDefined();
  });

  it("scales severity with chain depth (5+ levels → higher score than 4)", () => {
    const op4 = mkOperation({
      counterparty: mkCounterparty({ uboChain: chain([1, 2, 3, 4]) }),
    });
    const op6 = mkOperation({
      counterparty: mkCounterparty({ uboChain: chain([1, 2, 3, 4, 5, 6]) }),
    });
    const r4 = detectShamTransactionRisk(op4);
    const r6 = detectShamTransactionRisk(op6);
    const sev4 = r4.redFlags.find(
      (f) => f.type === "INDIRECT_OWNERSHIP_CHAIN",
    )!.severity;
    const sev6 = r6.redFlags.find(
      (f) => f.type === "INDIRECT_OWNERSHIP_CHAIN",
    )!.severity;
    expect(sev6).toBeGreaterThan(sev4);
  });
});

// ─── 2. SHELL_COMPANY_MARKERS ──────────────────────────────────────

describe("SHELL_COMPANY_MARKERS", () => {
  it("fires on triple-marker counterparty (BVI + 8 months old + 0 employees)", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({
        countryCode: "VG",
        incorporatedAt: ageInMonths(8),
        employeeCount: 0,
      }),
    });
    const result = detectShamTransactionRisk(op);
    const flag = result.redFlags.find(
      (f) => f.type === "SHELL_COMPANY_MARKERS",
    );
    expect(flag).toBeDefined();
    expect(flag!.evidence.markerCount).toBe(3);
    expect(flag!.title).toMatch(/Triple/i);
    expect(flag!.citations.some((c) => c.name.includes("PILOT"))).toBe(true);
  });

  it("fires single-marker on BVI alone (lower severity than triple)", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({
        countryCode: "KY", // Cayman, in shell-jurisdiction list
        incorporatedAt: ageInMonths(36), // not young
        employeeCount: 50, // staffed
      }),
    });
    const result = detectShamTransactionRisk(op);
    const flag = result.redFlags.find(
      (f) => f.type === "SHELL_COMPANY_MARKERS",
    );
    expect(flag).toBeDefined();
    expect(flag!.evidence.markerCount).toBe(1);
  });

  it("does NOT fire for mature DE counterparty with staff", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({
        countryCode: "DE",
        incorporatedAt: ageInMonths(120),
        employeeCount: 25,
      }),
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.redFlags.find((f) => f.type === "SHELL_COMPANY_MARKERS"),
    ).toBeUndefined();
  });

  it("is skipped when no shell-related data is supplied", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({
        countryCode: "DE", // not in shell list
        // no incorporatedAt, no employeeCount
      }),
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.skippedChecks.find((s) => s.type === "SHELL_COMPANY_MARKERS"),
    ).toBeDefined();
  });

  it("KNOWN_SHELL_JURISDICTIONS includes the canonical Caribbean shell hubs", () => {
    expect(KNOWN_SHELL_JURISDICTIONS.has("VG")).toBe(true); // BVI
    expect(KNOWN_SHELL_JURISDICTIONS.has("KY")).toBe(true); // Cayman
    expect(KNOWN_SHELL_JURISDICTIONS.has("PA")).toBe(true); // Panama
    expect(KNOWN_SHELL_JURISDICTIONS.has("DE")).toBe(false);
    expect(KNOWN_SHELL_JURISDICTIONS.has("US")).toBe(false);
  });
});

// ─── 3. GEOGRAPHY_MISMATCH ─────────────────────────────────────────

describe("GEOGRAPHY_MISMATCH", () => {
  it("fires when ship-to ≠ end-user operating country (and end-use also ≠)", () => {
    const op = mkOperation({
      shipToCountry: "AE",
      endUseCountry: "AE",
      endUser: { name: "End-User Co.", operatingCountry: "RU" },
    });
    const result = detectShamTransactionRisk(op);
    const flag = result.redFlags.find((f) => f.type === "GEOGRAPHY_MISMATCH");
    expect(flag).toBeDefined();
    expect(flag!.evidence.shipToCountry).toBe("AE");
    expect(flag!.evidence.endUserOperatingCountry).toBe("RU");
    expect(flag!.citations.some((c) => c.name.includes("Nordgas"))).toBe(true);
  });

  it("does NOT fire when ship-to matches end-user operating country", () => {
    const op = mkOperation({
      shipToCountry: "DE",
      endUseCountry: "DE",
      endUser: { name: "Acme", operatingCountry: "DE" },
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.redFlags.find((f) => f.type === "GEOGRAPHY_MISMATCH"),
    ).toBeUndefined();
  });

  it("does NOT fire when end-use country (≠ ship-to) matches operating country", () => {
    const op = mkOperation({
      shipToCountry: "NL", // transit hub
      endUseCountry: "DE", // final destination
      endUser: { name: "Acme DE", operatingCountry: "DE" },
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.redFlags.find((f) => f.type === "GEOGRAPHY_MISMATCH"),
    ).toBeUndefined();
  });

  it("is skipped when end-user operating country not declared", () => {
    const op = mkOperation({
      endUser: { name: "Unknown end-user" }, // no operatingCountry
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.skippedChecks.find((s) => s.type === "GEOGRAPHY_MISMATCH"),
    ).toBeDefined();
  });
});

// ─── 4. PAYMENT_ROUTING_DIVERGENCE ─────────────────────────────────

describe("PAYMENT_ROUTING_DIVERGENCE", () => {
  it("fires when bank country diverges from BOTH counterparty AND end-user country", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({
        countryCode: "DE",
        bankCountry: "CY", // bank in Cyprus
      }),
      endUser: { name: "Acme", operatingCountry: "DE" },
    });
    const result = detectShamTransactionRisk(op);
    const flag = result.redFlags.find(
      (f) => f.type === "PAYMENT_ROUTING_DIVERGENCE",
    );
    expect(flag).toBeDefined();
    expect(flag!.evidence.bankCountry).toBe("CY");
    expect(
      flag!.citations.some((c) => c.name.includes("Société Générale")),
    ).toBe(true);
  });

  it("does NOT fire when bank country matches counterparty country", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({ countryCode: "DE", bankCountry: "DE" }),
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.redFlags.find((f) => f.type === "PAYMENT_ROUTING_DIVERGENCE"),
    ).toBeUndefined();
  });

  it("does NOT fire when bank country matches end-user operating country", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({ countryCode: "DE", bankCountry: "AT" }),
      endUser: { name: "End-User", operatingCountry: "AT" },
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.redFlags.find((f) => f.type === "PAYMENT_ROUTING_DIVERGENCE"),
    ).toBeUndefined();
  });

  it("is skipped when bankCountry not supplied", () => {
    const op = mkOperation(); // no bankCountry
    const result = detectShamTransactionRisk(op);
    expect(
      result.skippedChecks.find((s) => s.type === "PAYMENT_ROUTING_DIVERGENCE"),
    ).toBeDefined();
  });
});

// ─── 5. PRICING_ANOMALY ────────────────────────────────────────────

describe("PRICING_ANOMALY", () => {
  it("fires when line invoiced at < 80% of historical median", () => {
    const op = mkOperation({
      shipToCountry: "AE",
      lines: [
        {
          eccn: "9A515.d",
          unitValue: 60_000, // 60% of median
          quantity: 1,
          currency: "EUR",
        },
      ],
    });
    const ctx: ShamDetectorContext = {
      historicalMediansEur: { "9A515.d__AE": 100_000 },
    };
    const result = detectShamTransactionRisk(op, ctx);
    const flag = result.redFlags.find((f) => f.type === "PRICING_ANOMALY");
    expect(flag).toBeDefined();
    expect(flag!.evidence.ratio).toBeLessThan(0.8);
    expect(flag!.citations.some((c) => c.name.includes("Epsilon"))).toBe(true);
  });

  it("does NOT fire when line is at/above 80% of median", () => {
    const op = mkOperation({
      shipToCountry: "AE",
      lines: [
        {
          eccn: "9A515.d",
          unitValue: 85_000, // 85% — within tolerance
          quantity: 1,
          currency: "EUR",
        },
      ],
    });
    const ctx: ShamDetectorContext = {
      historicalMediansEur: { "9A515.d__AE": 100_000 },
    };
    const result = detectShamTransactionRisk(op, ctx);
    expect(
      result.redFlags.find((f) => f.type === "PRICING_ANOMALY"),
    ).toBeUndefined();
  });

  it("uses the worst line when multiple lines have medians", () => {
    const op = mkOperation({
      shipToCountry: "AE",
      lines: [
        {
          eccn: "9A515.d",
          unitValue: 95_000,
          quantity: 1,
          currency: "EUR",
        }, // 95% — clear
        {
          eccn: "9A515.x",
          unitValue: 40_000,
          quantity: 1,
          currency: "EUR",
        }, // 40% — anomalous
      ],
    });
    const ctx: ShamDetectorContext = {
      historicalMediansEur: {
        "9A515.d__AE": 100_000,
        "9A515.x__AE": 100_000,
      },
    };
    const result = detectShamTransactionRisk(op, ctx);
    const flag = result.redFlags.find((f) => f.type === "PRICING_ANOMALY");
    expect(flag).toBeDefined();
    expect(flag!.evidence.eccn).toBe("9A515.x");
  });

  it("is skipped when no medians are supplied", () => {
    const op = mkOperation();
    const result = detectShamTransactionRisk(op); // no context
    expect(
      result.skippedChecks.find((s) => s.type === "PRICING_ANOMALY"),
    ).toBeDefined();
  });
});

// ─── 5b. PRICING_ANOMALY — non-EUR currency handling (T-M15) ──────

describe("PRICING_ANOMALY — non-EUR currency exclusion (T-M15)", () => {
  it("does NOT flag a non-EUR line against a EUR median (false-positive guard)", () => {
    // GBP 50 vs EUR 100 median: the no-op code treated this as ratio=0.5 → flagged.
    // Correct: non-EUR lines must be excluded (skipped kind) since we cannot
    // fabricate an FX rate. With only one non-EUR line and no other lines,
    // the result must be skipped, never flagged.
    const op = mkOperation({
      shipToCountry: "GB",
      lines: [
        {
          eccn: "9A515.d",
          unitValue: 50, // GBP 50 — raw number looks tiny vs EUR 100 median
          quantity: 1,
          currency: "GBP",
        },
      ],
    });
    const ctx: ShamDetectorContext = {
      historicalMediansEur: { "9A515.d__GB": 100 },
    };
    const result = detectShamTransactionRisk(op, ctx);
    // Must NOT produce a PRICING_ANOMALY flag from a non-EUR line.
    const flag = result.redFlags.find((f) => f.type === "PRICING_ANOMALY");
    expect(flag).toBeUndefined();
  });

  it("mixed operation: EUR under-median line flags, non-EUR line is ignored as worst", () => {
    // The EUR line at 40% of median should be the worst; the GBP line at a raw
    // number that would look even worse (e.g. 10 vs 100 → 10%) must be ignored.
    // We only want the EUR-line flag, and the non-EUR line must NOT be worst.
    const op = mkOperation({
      shipToCountry: "AE",
      lines: [
        {
          eccn: "9A515.d",
          unitValue: 40_000, // EUR 40k = 40% of 100k median → should flag
          quantity: 1,
          currency: "EUR",
        },
        {
          eccn: "9A515.x",
          unitValue: 5_000, // USD 5k — raw number looks terrible (5%) but must be excluded
          quantity: 1,
          currency: "USD",
        },
      ],
    });
    const ctx: ShamDetectorContext = {
      historicalMediansEur: {
        "9A515.d__AE": 100_000,
        "9A515.x__AE": 100_000, // median exists, but line is USD → exclude
      },
    };
    const result = detectShamTransactionRisk(op, ctx);
    const flag = result.redFlags.find((f) => f.type === "PRICING_ANOMALY");
    // Must flag (EUR line is genuinely under-median).
    expect(flag).toBeDefined();
    // The worst must be the EUR 9A515.d line, not the USD 9A515.x line.
    expect(flag!.evidence.eccn).toBe("9A515.d");
    // The ratio must reflect the EUR line (40 000 / 100 000 = 0.4), not the USD line.
    expect(flag!.evidence.ratio).toBeCloseTo(0.4, 2);
  });

  it("regression: EUR-only flag/clear behavior unchanged", () => {
    // Mirror of the existing "fires when line invoiced at < 80% of historical median"
    // test to confirm the EUR path is untouched by the fix.
    const op = mkOperation({
      shipToCountry: "AE",
      lines: [
        {
          eccn: "9A515.d",
          unitValue: 70_000, // 70% — below threshold → flag
          quantity: 1,
          currency: "EUR",
        },
      ],
    });
    const ctx: ShamDetectorContext = {
      historicalMediansEur: { "9A515.d__AE": 100_000 },
    };
    const result = detectShamTransactionRisk(op, ctx);
    const flag = result.redFlags.find((f) => f.type === "PRICING_ANOMALY");
    expect(flag).toBeDefined();
    expect(flag!.evidence.ratio).toBeCloseTo(0.7, 2);
  });
});

// ─── 6. REEXPORT_RISK_HISTORY ──────────────────────────────────────

describe("REEXPORT_RISK_HISTORY", () => {
  function hist(
    statuses: ReexportHistoryEntry["status"][],
  ): ReexportHistoryEntry[] {
    return statuses.map((status, i) => ({
      id: `RE-${i}`,
      status,
      filedAt: new Date(),
    }));
  }

  it("fires when end-user has a FLAGGED prior re-export", () => {
    const op = mkOperation({
      endUser: {
        name: "End-User",
        operatingCountry: "DE",
        reexportHistory: hist(["FLAGGED"]),
      },
    });
    const result = detectShamTransactionRisk(op);
    const flag = result.redFlags.find(
      (f) => f.type === "REEXPORT_RISK_HISTORY",
    );
    expect(flag).toBeDefined();
    expect(flag!.evidence.flaggedRecords).toBe(1);
    expect(flag!.evidence.hasViolation).toBe(false);
    expect(flag!.citations.some((c) => c.name.includes("Aban"))).toBe(true);
  });

  it("scales severity higher when a VIOLATION is present (vs. only FLAGGED)", () => {
    const opFlagged = mkOperation({
      endUser: {
        name: "End-User",
        operatingCountry: "DE",
        reexportHistory: hist(["FLAGGED"]),
      },
    });
    const opViolation = mkOperation({
      endUser: {
        name: "End-User",
        operatingCountry: "DE",
        reexportHistory: hist(["VIOLATION"]),
      },
    });
    const sevFlagged = detectShamTransactionRisk(opFlagged).redFlags.find(
      (f) => f.type === "REEXPORT_RISK_HISTORY",
    )!.severity;
    const sevViolation = detectShamTransactionRisk(opViolation).redFlags.find(
      (f) => f.type === "REEXPORT_RISK_HISTORY",
    )!.severity;
    expect(sevViolation).toBeGreaterThan(sevFlagged);
  });

  it("does NOT fire when only APPROVED prior history exists", () => {
    const op = mkOperation({
      endUser: {
        name: "End-User",
        operatingCountry: "DE",
        reexportHistory: hist(["APPROVED", "APPROVED"]),
      },
    });
    const result = detectShamTransactionRisk(op);
    expect(
      result.redFlags.find((f) => f.type === "REEXPORT_RISK_HISTORY"),
    ).toBeUndefined();
  });

  it("is skipped when no re-export history supplied", () => {
    const op = mkOperation();
    const result = detectShamTransactionRisk(op);
    expect(
      result.skippedChecks.find((s) => s.type === "REEXPORT_RISK_HISTORY"),
    ).toBeDefined();
  });
});

// ─── Aggregation + recommendation banding ──────────────────────────

describe("aggregation and recommendation banding", () => {
  it("score 0 → PROCEED with no red flags", () => {
    expect(recommendationForScore(0)).toBe("PROCEED");
    expect(recommendationForScore(24)).toBe("PROCEED");
  });

  it("score 25 → ENHANCED_DUE_DILIGENCE (lower boundary)", () => {
    expect(recommendationForScore(25)).toBe("ENHANCED_DUE_DILIGENCE");
    expect(recommendationForScore(49)).toBe("ENHANCED_DUE_DILIGENCE");
  });

  it("score 50 → ESCALATE (lower boundary)", () => {
    expect(recommendationForScore(50)).toBe("ESCALATE");
    expect(recommendationForScore(74)).toBe("ESCALATE");
  });

  it("score 75 → REJECT (lower boundary)", () => {
    expect(recommendationForScore(75)).toBe("REJECT");
    expect(recommendationForScore(100)).toBe("REJECT");
  });

  it("a fully clean operation produces score 0 / PROCEED (with skipped checks)", () => {
    // Mature DE counterparty, employees, no flags, no history, no medians.
    const op = mkOperation({
      counterparty: mkCounterparty({
        countryCode: "DE",
        incorporatedAt: ageInMonths(60),
        employeeCount: 30,
        bankCountry: "DE",
      }),
    });
    const result = detectShamTransactionRisk(op);
    expect(result.riskScore).toBe(0);
    expect(result.recommendation).toBe("PROCEED");
    expect(result.redFlags).toHaveLength(0);
    // But some checks are skipped (no UBO, no history, no medians) — that's
    // fine, and they should be surfaced separately.
    expect(result.skippedChecks.length).toBeGreaterThan(0);
  });

  it("combines flags into one aggregated score (geography + payment routing)", () => {
    const op = mkOperation({
      shipToCountry: "AE",
      endUseCountry: "AE",
      counterparty: mkCounterparty({
        countryCode: "DE",
        bankCountry: "CY", // payment routing divergence
      }),
      endUser: { name: "End-User", operatingCountry: "RU" }, // geography mismatch
    });
    const result = detectShamTransactionRisk(op);
    // Geography (25) + payment routing (20) = 45 → ENHANCED_DUE_DILIGENCE
    expect(result.riskScore).toBe(45);
    expect(result.recommendation).toBe("ENHANCED_DUE_DILIGENCE");
    expect(result.redFlags.length).toBeGreaterThanOrEqual(2);
  });

  it("score caps at 100 even when raw sum would exceed", () => {
    // Stack 4 flags whose severities sum > 100.
    const op = mkOperation({
      shipToCountry: "AE",
      counterparty: mkCounterparty({
        countryCode: "VG",
        incorporatedAt: ageInMonths(3),
        employeeCount: 0,
        bankCountry: "CY",
        uboChain: [
          {
            id: "U1",
            name: "L1",
            countryCode: "VG",
            depth: 1,
            effectivePercent: 1,
          },
          {
            id: "U2",
            name: "L2",
            countryCode: "VG",
            depth: 2,
            effectivePercent: 1,
          },
          {
            id: "U3",
            name: "L3",
            countryCode: "VG",
            depth: 3,
            effectivePercent: 1,
          },
          {
            id: "U4",
            name: "L4",
            countryCode: "VG",
            depth: 4,
            effectivePercent: 1,
          },
          {
            id: "U5",
            name: "L5",
            countryCode: "VG",
            depth: 5,
            effectivePercent: 1,
          },
        ],
      }),
      endUser: {
        name: "End-User",
        operatingCountry: "RU",
        reexportHistory: [
          { id: "RE-1", status: "VIOLATION", filedAt: new Date() },
          { id: "RE-2", status: "FLAGGED", filedAt: new Date() },
        ],
      },
      lines: [
        {
          eccn: "9A515.d",
          unitValue: 30_000,
          quantity: 1,
          currency: "EUR",
        },
      ],
    });
    const ctx: ShamDetectorContext = {
      historicalMediansEur: { "9A515.d__AE": 100_000 },
    };
    const result = detectShamTransactionRisk(op, ctx);
    expect(result.riskScore).toBe(100);
    expect(result.recommendation).toBe("REJECT");
    expect(result.redFlags.length).toBe(6); // all 6 fire
  });
});

// ─── Output integrity ──────────────────────────────────────────────

describe("output integrity", () => {
  it("returns the stable detector version", () => {
    const result = detectShamTransactionRisk(mkOperation());
    expect(result.detectorVersion).toBe("z16.v1");
  });

  it("never lists a check in BOTH redFlags and skippedChecks", () => {
    const op = mkOperation({
      counterparty: mkCounterparty({
        countryCode: "VG",
        incorporatedAt: ageInMonths(3),
        employeeCount: 0,
      }),
    });
    const result = detectShamTransactionRisk(op);
    const flagTypes = new Set(result.redFlags.map((f) => f.type));
    const skippedTypes = new Set(result.skippedChecks.map((s) => s.type));
    for (const t of flagTypes) expect(skippedTypes.has(t)).toBe(false);
  });

  it("every fired red flag carries at least one OFAC citation", () => {
    const op = mkOperation({
      shipToCountry: "AE",
      counterparty: mkCounterparty({
        countryCode: "VG",
        incorporatedAt: ageInMonths(3),
        employeeCount: 0,
        bankCountry: "CY",
      }),
      endUser: { name: "End-User", operatingCountry: "RU" },
    });
    const result = detectShamTransactionRisk(op);
    for (const flag of result.redFlags) {
      expect(flag.citations.length).toBeGreaterThan(0);
      // every citation has the minimum required metadata
      for (const c of flag.citations) {
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.year).toBeGreaterThan(2000);
        expect(c.penaltyUsd).toBeGreaterThan(0);
        expect(c.factPattern.length).toBeGreaterThan(20);
      }
    }
  });
});
