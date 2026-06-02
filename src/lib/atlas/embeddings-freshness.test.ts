/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for computeEmbeddingGap — pure set-diff logic.
 */

import { describe, it, expect } from "vitest";
import { computeEmbeddingGap } from "./embeddings-freshness";

describe("computeEmbeddingGap", () => {
  it("returns zero missing when all expected ids are embedded", () => {
    const expected = ["source:A", "authority:B", "profile:DE"];
    const embedded = ["source:A", "authority:B", "profile:DE", "extra:X"];
    const gap = computeEmbeddingGap(expected, embedded);
    expect(gap.total).toBe(3);
    expect(gap.embedded).toBe(3);
    expect(gap.missing).toBe(0);
    expect(gap.missingIds).toEqual([]);
  });

  it("returns correct counts when some ids are missing", () => {
    const expected = ["source:A", "source:B", "authority:C", "profile:DE"];
    const embedded = ["source:A", "authority:C"];
    const gap = computeEmbeddingGap(expected, embedded);
    expect(gap.total).toBe(4);
    expect(gap.embedded).toBe(2);
    expect(gap.missing).toBe(2);
    expect(gap.missingIds).toContain("source:B");
    expect(gap.missingIds).toContain("profile:DE");
  });

  it("returns all missing when embedded is empty", () => {
    const expected = ["source:X", "authority:Y"];
    const gap = computeEmbeddingGap(expected, []);
    expect(gap.total).toBe(2);
    expect(gap.embedded).toBe(0);
    expect(gap.missing).toBe(2);
    expect(gap.missingIds).toHaveLength(2);
  });

  it("returns total=0 and missing=0 when both inputs are empty", () => {
    const gap = computeEmbeddingGap([], []);
    expect(gap.total).toBe(0);
    expect(gap.embedded).toBe(0);
    expect(gap.missing).toBe(0);
    expect(gap.missingIds).toEqual([]);
  });

  it("deduplicates expected ids before counting", () => {
    const expected = ["source:A", "source:A", "source:B"];
    const embedded = ["source:A"];
    const gap = computeEmbeddingGap(expected, embedded);
    expect(gap.total).toBe(2); // deduplicated: source:A + source:B
    expect(gap.embedded).toBe(1);
    expect(gap.missing).toBe(1);
    expect(gap.missingIds).toEqual(["source:B"]);
  });

  it("deduplicates embedded ids before comparison", () => {
    const expected = ["source:A", "source:B"];
    const embedded = ["source:A", "source:A", "source:A"]; // lots of dupes
    const gap = computeEmbeddingGap(expected, embedded);
    expect(gap.total).toBe(2);
    expect(gap.embedded).toBe(1);
    expect(gap.missing).toBe(1);
  });

  it("caps missingIds at 50 when there are many missing", () => {
    const expected = Array.from({ length: 200 }, (_, i) => `source:${i}`);
    const gap = computeEmbeddingGap(expected, []);
    expect(gap.total).toBe(200);
    expect(gap.missing).toBe(200);
    expect(gap.missingIds).toHaveLength(50); // capped
  });

  it("returns missingIds sorted for stability", () => {
    const expected = ["source:Z", "source:A", "source:M"];
    const gap = computeEmbeddingGap(expected, []);
    expect(gap.missingIds).toEqual(["source:A", "source:M", "source:Z"]);
  });

  it("ignores extra ids in embedded that are not in expected", () => {
    const expected = ["source:A"];
    const embedded = ["source:A", "stale:OLD1", "stale:OLD2"];
    const gap = computeEmbeddingGap(expected, embedded);
    expect(gap.total).toBe(1);
    expect(gap.embedded).toBe(1);
    expect(gap.missing).toBe(0);
  });

  it("correctly handles total = embedded + missing invariant", () => {
    const expected = ["a", "b", "c", "d", "e"];
    const embedded = ["a", "c", "e"];
    const gap = computeEmbeddingGap(expected, embedded);
    expect(gap.embedded + gap.missing).toBe(gap.total);
  });
});
