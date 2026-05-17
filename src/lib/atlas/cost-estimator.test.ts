/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the shared Anthropic cost-estimator (Q11). Pure function,
 * no mocks. Validates that pricing constants + math line up with the
 * Anthropic Sonnet 4.6 pricing spec.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  estimateCostUsd,
  PRICE_INPUT_PER_MTOK,
  PRICE_OUTPUT_PER_MTOK,
  PRICE_CACHE_CREATION_PER_MTOK,
  PRICE_CACHE_READ_PER_MTOK,
} from "./cost-estimator";

describe("estimateCostUsd", () => {
  it("matches Sonnet 4.6 spec pricing (input $3, output $15 per Mtok)", () => {
    expect(PRICE_INPUT_PER_MTOK).toBe(3.0);
    expect(PRICE_OUTPUT_PER_MTOK).toBe(15.0);
  });

  it("computes cache pricing as multiples of input rate", () => {
    expect(PRICE_CACHE_CREATION_PER_MTOK).toBeCloseTo(3.75, 5);
    expect(PRICE_CACHE_READ_PER_MTOK).toBeCloseTo(0.3, 5);
  });

  it("estimates input+output cost correctly", () => {
    // 1M input + 1M output = $3 + $15 = $18
    expect(estimateCostUsd(1_000_000, 1_000_000)).toBeCloseTo(18.0, 6);
  });

  it("estimates a typical chat turn (small numbers)", () => {
    // 1000 in + 500 out = $0.003 + $0.0075 = $0.0105
    expect(estimateCostUsd(1000, 500)).toBeCloseTo(0.0105, 6);
  });

  it("includes cache-creation tokens at 1.25× input rate", () => {
    // 0 in + 0 out + 1M cache-creation = $3.75
    expect(estimateCostUsd(0, 0, 1_000_000, 0)).toBeCloseTo(3.75, 6);
  });

  it("includes cache-read tokens at 0.10× input rate", () => {
    // 0 in + 0 out + 0 cc + 1M cache-read = $0.30
    expect(estimateCostUsd(0, 0, 0, 1_000_000)).toBeCloseTo(0.3, 6);
  });

  it("defaults cache args to 0 (backwards-compat with old call-sites)", () => {
    // Old 2-arg form should still work
    expect(estimateCostUsd(1000, 500)).toBe(estimateCostUsd(1000, 500, 0, 0));
  });

  it("returns 0 for zero usage", () => {
    expect(estimateCostUsd(0, 0)).toBe(0);
  });
});
