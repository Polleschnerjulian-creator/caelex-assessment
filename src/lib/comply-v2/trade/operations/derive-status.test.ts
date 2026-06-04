/**
 * Tests for deriveOperationStatus — the pure lifecycle-status derivation that
 * powers Tier 1.7 (verdict/fact-driven operation status auto-advance).
 *
 * The function reflects an operation's *facts* (do its items have control
 * codes? is its counterparty screened CLEAR?) onto the fact-grounded prep band
 *   DRAFT → AWAITING_CLASSIFICATION → SCREENING → AWAITING_LICENSE
 * and NEVER auto-crosses into a human-Freigabe / terminal state
 *   (LICENSED, EXECUTED, BLOCKED, VOLUNTARY_DISCLOSURE_FILED).
 *
 * Pure, no I/O.
 */

import { describe, it, expect } from "vitest";
import type {
  TradeOperationStatus,
  TradeScreeningStatus,
} from "@prisma/client";
import {
  deriveOperationStatus,
  AUTO_MANAGED_STATUSES,
  type OperationStatusFacts,
} from "./derive-status";

// A fully-ready operation: lines present, all classified, counterparty CLEAR.
const readyFacts: OperationStatusFacts = {
  activeLineCount: 2,
  hasUnclassifiedItem: false,
  counterpartyScreening: "CLEAR",
};

const HUMAN_GATED: TradeOperationStatus[] = [
  "LICENSED",
  "EXECUTED",
  "BLOCKED",
  "VOLUNTARY_DISCLOSURE_FILED",
];

const NON_CLEAR: TradeScreeningStatus[] = [
  "NOT_SCREENED",
  "POTENTIAL_MATCH",
  "CONFIRMED_HIT",
  "STALE",
];

describe("deriveOperationStatus — human-gate preservation", () => {
  it("returns null for every human-Freigabe / terminal state (never auto-touch)", () => {
    for (const current of HUMAN_GATED) {
      // Even with facts that would imply a prep state, the engine yields.
      expect(deriveOperationStatus(current, readyFacts)).toBeNull();
      expect(
        deriveOperationStatus(current, {
          activeLineCount: 0,
          hasUnclassifiedItem: false,
          counterpartyScreening: null,
        }),
      ).toBeNull();
    }
  });

  it("AUTO_MANAGED_STATUSES is exactly the four prep-band states", () => {
    expect([...AUTO_MANAGED_STATUSES].sort()).toEqual(
      [
        "AWAITING_CLASSIFICATION",
        "AWAITING_LICENSE",
        "DRAFT",
        "SCREENING",
      ].sort(),
    );
  });
});

describe("deriveOperationStatus — forward derivation from facts", () => {
  it("0 lines → DRAFT (so a just-emptied op regresses to DRAFT)", () => {
    expect(
      deriveOperationStatus("AWAITING_CLASSIFICATION", {
        activeLineCount: 0,
        hasUnclassifiedItem: false,
        counterpartyScreening: "CLEAR",
      }),
    ).toBe("DRAFT");
  });

  it("DRAFT + 0 lines → null (target DRAFT equals current, no-op)", () => {
    expect(
      deriveOperationStatus("DRAFT", {
        activeLineCount: 0,
        hasUnclassifiedItem: false,
        counterpartyScreening: null,
      }),
    ).toBeNull();
  });

  it("lines with an unclassified item → AWAITING_CLASSIFICATION", () => {
    expect(
      deriveOperationStatus("DRAFT", {
        activeLineCount: 1,
        hasUnclassifiedItem: true,
        counterpartyScreening: "CLEAR",
      }),
    ).toBe("AWAITING_CLASSIFICATION");
  });

  it("all classified + counterparty not CLEAR → SCREENING (every non-CLEAR status)", () => {
    for (const screening of NON_CLEAR) {
      expect(
        deriveOperationStatus("DRAFT", {
          activeLineCount: 2,
          hasUnclassifiedItem: false,
          counterpartyScreening: screening,
        }),
      ).toBe("SCREENING");
    }
  });

  it("all classified + NO counterparty → SCREENING (still needs a screened party)", () => {
    expect(
      deriveOperationStatus("DRAFT", {
        activeLineCount: 2,
        hasUnclassifiedItem: false,
        counterpartyScreening: null,
      }),
    ).toBe("SCREENING");
  });

  it("all classified + counterparty CLEAR → AWAITING_LICENSE (top of the band)", () => {
    expect(deriveOperationStatus("DRAFT", readyFacts)).toBe("AWAITING_LICENSE");
  });

  it("does NOT advance past AWAITING_LICENSE — never auto-reaches LICENSED", () => {
    // Even a fully-ready op caps at AWAITING_LICENSE; LICENSED is a human gate.
    expect(deriveOperationStatus("AWAITING_LICENSE", readyFacts)).toBeNull();
    expect(deriveOperationStatus("SCREENING", readyFacts)).toBe(
      "AWAITING_LICENSE",
    );
  });
});

describe("deriveOperationStatus — regression keeps status truthful", () => {
  it("AWAITING_LICENSE + screening went STALE → SCREENING", () => {
    expect(
      deriveOperationStatus("AWAITING_LICENSE", {
        activeLineCount: 2,
        hasUnclassifiedItem: false,
        counterpartyScreening: "STALE",
      }),
    ).toBe("SCREENING");
  });

  it("SCREENING + an item got un-classified → AWAITING_CLASSIFICATION", () => {
    expect(
      deriveOperationStatus("SCREENING", {
        activeLineCount: 2,
        hasUnclassifiedItem: true,
        counterpartyScreening: "CLEAR",
      }),
    ).toBe("AWAITING_CLASSIFICATION");
  });

  it("target equals current → null (no churn when facts are unchanged)", () => {
    expect(
      deriveOperationStatus("SCREENING", {
        activeLineCount: 1,
        hasUnclassifiedItem: false,
        counterpartyScreening: "NOT_SCREENED",
      }),
    ).toBeNull();
  });
});

describe("deriveOperationStatus — band invariant (the safety guarantee)", () => {
  it("never returns a status outside the auto-managed band, for any band input", () => {
    const bandStates: TradeOperationStatus[] = [
      "DRAFT",
      "AWAITING_CLASSIFICATION",
      "SCREENING",
      "AWAITING_LICENSE",
    ];
    const screenings: (TradeScreeningStatus | null)[] = [
      null,
      "NOT_SCREENED",
      "CLEAR",
      "POTENTIAL_MATCH",
      "CONFIRMED_HIT",
      "STALE",
    ];
    for (const current of bandStates) {
      for (const lineCount of [0, 1, 3]) {
        for (const unclassified of [true, false]) {
          for (const screening of screenings) {
            const out = deriveOperationStatus(current, {
              activeLineCount: lineCount,
              hasUnclassifiedItem: unclassified,
              counterpartyScreening: screening,
            });
            if (out !== null) {
              expect(AUTO_MANAGED_STATUSES.has(out)).toBe(true);
            }
          }
        }
      }
    }
  });
});
