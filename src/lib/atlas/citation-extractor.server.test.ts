import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — citation-extractor pure-function tests (T0.3).
 *
 * The extractor was hardened multiple times (AUDIT-FIX H6 for code-
 * region blanking, BUG-T1-3 for concurrency-safe matchAll, AUDIT-FIX
 * L6 for path-traversal-safe regex). Each of these guarantees needs
 * test coverage so a future refactor doesn't silently regress.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

/* Mock validity-tools so the extractor doesn't depend on the live
 * corpus. Each citation gets a deterministic "valid" check back.
 * That keeps the test focused on EXTRACTION behaviour rather than
 * validity-derivation. */
vi.mock("./validity-tools.server", () => ({
  checkValidity: (citation: string) => ({
    sourceId: citation,
    citation,
    badge: "in_force",
    title: `Stub for ${citation}`,
    status: "in_force",
    lastVerified: "2026-01-01",
    staleDays: 30,
    amendedBy: null,
    supersededBy: null,
    sourceUrl: null,
  }),
}));

import { extractCitations } from "./citation-extractor.server";

describe("extractCitations", () => {
  it("returns empty array for empty or whitespace-only input", () => {
    expect(extractCitations("")).toEqual([]);
    expect(extractCitations("   \n\t  ")).toEqual([]);
  });

  it("returns empty array when no citations present", () => {
    const text = "This text has no Atlas references at all.";
    expect(extractCitations(text)).toEqual([]);
  });

  it("extracts a single citation with index=1, occurrences=1", () => {
    const text = "Per [ATLAS:DE-WeltraumG] § 5, the operator must...";
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("DE-WeltraumG");
    expect(result[0].index).toBe(1);
    expect(result[0].occurrences).toBe(1);
  });

  it("extracts multiple distinct citations in order of first appearance", () => {
    const text =
      "First [ATLAS:EU-NIS2-Art.21], then [ATLAS:DE-WeltraumG], finally [ATLAS:INT-OST-1967].";
    const result = extractCitations(text);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.sourceId)).toEqual([
      "EU-NIS2-Art.21",
      "DE-WeltraumG",
      "INT-OST-1967",
    ]);
    expect(result.map((c) => c.index)).toEqual([1, 2, 3]);
  });

  it("deduplicates: same id appearing N times → 1 entry, occurrences=N", () => {
    const text =
      "[ATLAS:DE-WeltraumG] applies. See also [ATLAS:DE-WeltraumG] and again [ATLAS:DE-WeltraumG].";
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("DE-WeltraumG");
    expect(result[0].occurrences).toBe(3);
  });

  it("strips citations inside fenced code blocks (```...```)", () => {
    const text = `
Use the citation format:

\`\`\`
[ATLAS:EU-NIS2-Art.21] — example only
\`\`\`

But [ATLAS:DE-WeltraumG] in prose IS a real citation.`;
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("DE-WeltraumG");
  });

  it("strips citations inside inline code spans (`...`)", () => {
    const text =
      "Format pills as `[ATLAS:EU-NIS2]` in markdown. The real source is [ATLAS:DE-WeltraumG].";
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("DE-WeltraumG");
  });

  it("rejects path-traversal patterns (AUDIT-FIX L6)", () => {
    const text =
      "[ATLAS:../../etc/passwd] is malicious. [ATLAS:foo/bar] has a slash. [ATLAS:DE-Real] is legit.";
    const result = extractCitations(text);
    /* Tight regex requires uppercase-prefix only. Lowercase + slash +
       dots-in-path are rejected. Only DE-Real should resolve. */
    const ids = result.map((c) => c.sourceId);
    expect(ids).toEqual(["DE-Real"]);
  });

  it("preserves § and Art. suffixes per the regex's allowance", () => {
    const text =
      "Cites: [ATLAS:DE-WELTRAUMG-§1], [ATLAS:EU-NIS2-Art.21], [ATLAS:INT-OST-1967].";
    const result = extractCitations(text);
    expect(result.map((c) => c.sourceId).sort()).toEqual([
      "DE-WELTRAUMG-§1",
      "EU-NIS2-Art.21",
      "INT-OST-1967",
    ]);
  });

  it("rejects lowercase-leading citations (regex requires uppercase prefix)", () => {
    const text =
      "[ATLAS:lowercase-id] vs [ATLAS:Mixed-Case] vs [ATLAS:UPPER-OK].";
    const result = extractCitations(text);
    /* Only fully-uppercase prefix resolves. */
    expect(result.map((c) => c.sourceId)).toEqual(["UPPER-OK"]);
  });

  it("decorates each citation with the validity-check result", () => {
    const text = "[ATLAS:DE-WeltraumG]";
    const result = extractCitations(text);
    expect(result[0]).toMatchObject({
      sourceId: "DE-WeltraumG",
      badge: "in_force",
      status: "in_force",
      title: expect.stringContaining("Stub"),
    });
  });

  it("handles mixed code + prose + duplicate citations correctly", () => {
    const text = `
[ATLAS:DE-WeltraumG] is in force.

Example pill syntax: \`[ATLAS:EU-NIS2-Art.21]\`

But really [ATLAS:EU-NIS2-Art.21] is also in force.

Then [ATLAS:DE-WeltraumG] reappears.
`;
    const result = extractCitations(text);
    expect(result).toHaveLength(2);
    /* DE-WeltraumG appears first, EU-NIS2-Art.21 second (the
       in-code occurrence was stripped, so the first PROSE occurrence
       of EU-NIS2 is the one in "But really..."). */
    expect(result[0].sourceId).toBe("DE-WeltraumG");
    expect(result[0].occurrences).toBe(2);
    expect(result[1].sourceId).toBe("EU-NIS2-Art.21");
    expect(result[1].occurrences).toBe(1);
  });

  it("is concurrency-safe — matchAll-based, no shared mutable lastIndex (BUG-T1-3)", () => {
    /* Smoke-test for the matchAll fix. Run the extractor 50 times
       concurrently with the same input; every result must be
       identical. Pre-fix, the shared `g`-flag regex's lastIndex
       could be stomped by interleaved calls. */
    const text =
      "[ATLAS:DE-A], [ATLAS:DE-B], [ATLAS:DE-C], [ATLAS:DE-D], [ATLAS:DE-E].";
    const calls = Array.from({ length: 50 }, () => extractCitations(text));
    for (const r of calls) {
      expect(r).toHaveLength(5);
      expect(r.map((c) => c.sourceId)).toEqual([
        "DE-A",
        "DE-B",
        "DE-C",
        "DE-D",
        "DE-E",
      ]);
    }
  });
});
