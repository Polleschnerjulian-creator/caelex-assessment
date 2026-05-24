/**
 * Tests for OperationStepper helpers (U-HIGH-6).
 *
 * Covers the pure functions `happyPathNext` + `nextActionLabel` that
 * power the "Next: …" primary CTA in OperationLifecyclePanel. The
 * visualization component itself is React; this file only exercises
 * the canonical-path logic where regressions would be invisible until
 * a customer hit them.
 */

import { describe, it, expect } from "vitest";
import {
  happyPathNext,
  nextActionLabel,
  HAPPY_PATH,
  type OperationStatus,
} from "./OperationStepper";

describe("happyPathNext", () => {
  it("returns the canonical forward step for every in-pipeline status", () => {
    expect(happyPathNext("DRAFT")).toBe("AWAITING_CLASSIFICATION");
    expect(happyPathNext("AWAITING_CLASSIFICATION")).toBe("SCREENING");
    expect(happyPathNext("SCREENING")).toBe("AWAITING_LICENSE");
    expect(happyPathNext("AWAITING_LICENSE")).toBe("LICENSED");
    expect(happyPathNext("LICENSED")).toBe("EXECUTED");
  });

  it("returns null for terminal happy-path states", () => {
    expect(happyPathNext("EXECUTED")).toBeNull();
    expect(happyPathNext("VOLUNTARY_DISCLOSURE_FILED")).toBeNull();
  });

  it("returns VOLUNTARY_DISCLOSURE_FILED from BLOCKED (only off-ramp)", () => {
    expect(happyPathNext("BLOCKED")).toBe("VOLUNTARY_DISCLOSURE_FILED");
  });

  it("matches the visual stepper sequence — happy path is a chain", () => {
    // Walk the chain starting from DRAFT and assert we visit every step
    // of HAPPY_PATH in order. This catches accidental loops or skipped
    // states if someone refactors the switch.
    const visited: OperationStatus[] = [];
    let cursor: OperationStatus | null = "DRAFT";
    while (cursor) {
      visited.push(cursor);
      const next: OperationStatus | null = happyPathNext(cursor);
      if (next === "VOLUNTARY_DISCLOSURE_FILED") break;
      cursor = next;
    }
    expect(visited).toEqual([...HAPPY_PATH]);
  });
});

describe("nextActionLabel", () => {
  it("uses a verb + object phrase for every transition target", () => {
    // No bare nouns — the label sits in a "Next: …" button so it must
    // read as an action the user is about to perform.
    expect(nextActionLabel("AWAITING_CLASSIFICATION")).toBe(
      "Submit for classification",
    );
    expect(nextActionLabel("SCREENING")).toBe("Begin sanctions screening");
    expect(nextActionLabel("AWAITING_LICENSE")).toBe("Apply for license");
    expect(nextActionLabel("LICENSED")).toBe("Mark as licensed");
    expect(nextActionLabel("EXECUTED")).toBe("Execute (ship goods)");
    expect(nextActionLabel("VOLUNTARY_DISCLOSURE_FILED")).toBe(
      "File self-disclosure",
    );
    expect(nextActionLabel("BLOCKED")).toBe("Block operation");
    expect(nextActionLabel("DRAFT")).toBe("Return to draft");
  });

  it("returns a non-empty string for every OperationStatus value", () => {
    // Defensive guard: any new status added to the union must come with
    // a label. The default-case fallback ("Continue") keeps the UI
    // sensible during the gap, but this test ensures we add a real
    // mapping before shipping a new state.
    const all: OperationStatus[] = [
      "DRAFT",
      "AWAITING_CLASSIFICATION",
      "SCREENING",
      "AWAITING_LICENSE",
      "LICENSED",
      "EXECUTED",
      "BLOCKED",
      "VOLUNTARY_DISCLOSURE_FILED",
    ];
    for (const status of all) {
      const label = nextActionLabel(status);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe("Continue"); // ensures explicit mapping
    }
  });
});

describe("HAPPY_PATH", () => {
  it("contains exactly the 6 visible pipeline steps in order", () => {
    expect(HAPPY_PATH).toEqual([
      "DRAFT",
      "AWAITING_CLASSIFICATION",
      "SCREENING",
      "AWAITING_LICENSE",
      "LICENSED",
      "EXECUTED",
    ]);
  });

  it("does not include off-pipeline terminal states", () => {
    expect(HAPPY_PATH).not.toContain("BLOCKED");
    expect(HAPPY_PATH).not.toContain("VOLUNTARY_DISCLOSURE_FILED");
  });
});
