/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for token-set name similarity used in sanctions screening.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { tokenSetRatio } from "./token-set";

describe("tokenSetRatio", () => {
  it("scores word-order swap (rosneft) >= 0.95", () => {
    expect(
      tokenSetRatio("rosneft oil company", "oil company rosneft"),
    ).toBeGreaterThanOrEqual(0.95);
  });

  it("scores word-order swap (zhang wei) >= 0.95", () => {
    expect(tokenSetRatio("zhang wei", "wei zhang")).toBeGreaterThanOrEqual(
      0.95,
    );
  });

  it("scores completely different names < 0.5", () => {
    expect(tokenSetRatio("spire global", "planet labs")).toBeLessThan(0.5);
  });

  it("scores partial match > 0.5 and < 0.95 for subset/superset name", () => {
    // The upper bound is 0.95 (not 0.85) because a superset/holding-suffix name
    // (e.g. "spire global" vs "spire global systems holding", ≈0.86) intentionally
    // reaches the POTENTIAL_MATCH human-review band in sanctions screening.
    // Conservative is correct: a missed sanctioned party is the catastrophic error,
    // so we never cap the score to suppress human review.
    const score = tokenSetRatio("spire global", "spire global systems holding");
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(0.95);
  });

  it("returns 0 when first argument is empty", () => {
    expect(tokenSetRatio("", "spire")).toBe(0);
  });

  it("returns 0 when second argument is empty", () => {
    expect(tokenSetRatio("spire", "")).toBe(0);
  });

  it("collapses multiple whitespace runs and scores >= 0.95", () => {
    expect(
      tokenSetRatio("spire global", "spire   global"),
    ).toBeGreaterThanOrEqual(0.95);
  });

  it("single-token identity scores exactly 1.0", () => {
    // Both Jaccard and token-sort JW are 1.0 for identical single tokens.
    expect(tokenSetRatio("rosneft", "rosneft")).toBe(1.0);
  });

  it("both-empty inputs score 0 (zero-token guard)", () => {
    // tokenize("") yields [], triggering the early-exit guard.
    expect(tokenSetRatio("", "")).toBe(0);
  });

  it("multi-token identity scores exactly 1.0", () => {
    // Sanity check: identical multi-token strings should always round-trip to 1.
    expect(tokenSetRatio("spire global", "spire global")).toBe(1.0);
  });
});
