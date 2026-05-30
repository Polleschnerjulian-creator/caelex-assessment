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
});
