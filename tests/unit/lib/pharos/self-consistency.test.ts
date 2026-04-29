/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Self-Consistency tests — focus on the consensus algorithm correctness.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildConsensus,
  type SampleOutput,
} from "@/lib/pharos/self-consistency";
import { citationContentHash, type Citation } from "@/lib/pharos/citation";

function makeCitation(id: string): Citation {
  // Build Citation directly so the id we pass through is preserved
  // verbatim — bypasses the prefix-prepending of dataRowCitation/etc.
  return {
    id,
    kind: "data-row",
    source: `test-source ${id}`,
    contentHash: citationContentHash({ id }),
    retrievedAt: new Date().toISOString(),
  };
}

function makeSample(text: string, citationIds: string[]): SampleOutput {
  return {
    text,
    citationIds,
    toolCallTrace: [],
    citations: citationIds.map((id) => makeCitation(id)),
  };
}

describe("buildConsensus", () => {
  it("single sample → no disagreement, no abstention", () => {
    const r = buildConsensus([makeSample("hello world", ["DB:T:a"])]);
    expect(r.disagreementScore).toBe(0);
    expect(r.shouldAbstain).toBe(false);
    expect(r.supportingVotes).toBe(1);
  });

  it("identical samples → zero disagreement", () => {
    const samples = Array.from({ length: 5 }, () =>
      makeSample("Same answer with [DB:T:a]", ["DB:T:a"]),
    );
    const r = buildConsensus(samples);
    expect(r.disagreementScore).toBeLessThan(0.05);
    expect(r.shouldAbstain).toBe(false);
    expect(r.supportingVotes).toBe(5);
  });

  it("totally disjoint citation sets → high disagreement, abstain", () => {
    const samples = [
      makeSample("answer one entirely", ["DB:T:a"]),
      makeSample("answer two entirely", ["DB:T:b"]),
      makeSample("answer three entirely", ["DB:T:c"]),
      makeSample("answer four entirely", ["DB:T:d"]),
      makeSample("answer five entirely", ["DB:T:e"]),
    ];
    const r = buildConsensus(samples);
    expect(r.disagreementScore).toBeGreaterThan(0.4);
    expect(r.shouldAbstain).toBe(true);
    expect(r.abstainReason).toMatch(/Disagreement/);
  });

  it("majority cluster wins — outliers ignored", () => {
    // Cluster A: 4 samples with same citation + similar phrasing.
    // Outlier: 1 sample with different citation + different text.
    // The medoid (cluster A) has small mean distance because 4 of 5
    // pairs are near-zero — the lone outlier doesn't dominate.
    const samples = [
      makeSample(
        "Compliance score reaches sixty-five tier alert [COMP:score]",
        ["COMP:score"],
      ),
      makeSample(
        "Compliance score reaches sixty-five tier alert [COMP:score]",
        ["COMP:score"],
      ),
      makeSample(
        "Compliance score reaches sixty-five tier alert [COMP:score]",
        ["COMP:score"],
      ),
      makeSample(
        "Compliance score reaches sixty-five tier alert [COMP:score]",
        ["COMP:score"],
      ),
      makeSample("totally different answer entirely [DB:X:y]", ["DB:X:y"]),
    ];
    const r = buildConsensus(samples);
    expect(r.shouldAbstain).toBe(false);
    expect(r.supportingVotes).toBeGreaterThanOrEqual(4);
    expect(r.consensusCitations.some((c) => c.id === "COMP:score")).toBe(true);
  });

  it("respects custom abstain threshold", () => {
    const samples = [makeSample("a", ["DB:T:1"]), makeSample("b", ["DB:T:2"])];
    const strict = buildConsensus(samples, { abstainThreshold: 0.1 });
    const lenient = buildConsensus(samples, { abstainThreshold: 0.9 });
    expect(strict.shouldAbstain).toBe(true);
    expect(lenient.shouldAbstain).toBe(false);
  });

  it("zero samples → abstain with reason", () => {
    const r = buildConsensus([]);
    expect(r.shouldAbstain).toBe(true);
    expect(r.abstainReason).toBeTruthy();
  });

  it("consensus citations include only IDs appearing in >= half of samples", () => {
    const samples = [
      makeSample("a", ["DB:T:shared", "DB:T:onlyA"]),
      makeSample("b", ["DB:T:shared", "DB:T:onlyB"]),
      makeSample("c", ["DB:T:shared", "DB:T:onlyC"]),
    ];
    const r = buildConsensus(samples);
    const sharedIds = r.consensusCitations.map((c) => c.id);
    expect(sharedIds).toContain("DB:T:shared");
    expect(sharedIds).not.toContain("DB:T:onlyA");
  });
});
