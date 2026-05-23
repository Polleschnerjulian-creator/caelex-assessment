/**
 * Sprint Z33 (Tier 6) — Training-Corpus tests.
 *
 * Contract enforced:
 *
 *   1. Dataset integrity (BAFA + DDTC)
 *      - No duplicate ids.
 *      - Required fields are non-empty.
 *      - decisionDate values are ISO YYYY-MM-DD and fall inside the
 *        documented coverage window.
 *      - destination is a two-letter alpha-2 code.
 *      - citation strings are non-empty.
 *
 *   2. Outcome distribution
 *      - BAFA corpus contains at least one entry of each AzGDecision.
 *      - DDTC corpus contains at least one entry of each CjOutcome.
 *
 *   3. Filter helpers
 *      - filterByDecision returns subsets that mirror dataset counts.
 *      - filterByEccnPrefix is case-sensitive + prefix-matched.
 *      - filterByDestination is exact-match.
 *
 *   4. Similarity ranking
 *      - Known input (ECCN "9A515.b" + destination "JP") returns the
 *        DDTC star-tracker case (ddtc-cj-2024-001) at rank 1.
 *      - Known input (ECCN "XV(e)(13)" + destination "LU") returns
 *        the DDTC Hall-effect thruster case (ddtc-cj-2024-003) at
 *        rank 1.
 *      - Jurisdiction filter narrows the pool correctly.
 *
 *   5. Coverage metadata sanity.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  BAFA_AZG_CORPUS,
  BAFA_AZG_CORPUS_COVERAGE,
  filterBafaByDecision,
  filterBafaByDestination,
  filterBafaByEccnPrefix,
  findBafaEntry,
} from "./bafa-azg";
import {
  DDTC_CJ_CORPUS,
  DDTC_CJ_CORPUS_COVERAGE,
  filterDdtcByDecision,
  filterDdtcByEccnPrefix,
  findDdtcEntry,
} from "./ddtc-cj";
import { UNIFIED_CORPUS, corpusSize, rankSimilarCases } from "./index";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALPHA2 = /^[A-Z]{2}$/;

// ─── 1. Dataset integrity ──────────────────────────────────────────

describe("Z33 — dataset integrity (BAFA)", () => {
  it("BAFA corpus has ≥ 20 entries", () => {
    expect(BAFA_AZG_CORPUS.length).toBeGreaterThanOrEqual(20);
  });

  it("BAFA ids are unique", () => {
    const ids = BAFA_AZG_CORPUS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every BAFA entry has the required fields populated", () => {
    for (const e of BAFA_AZG_CORPUS) {
      expect(
        e.id.length,
        `entry without id: ${JSON.stringify(e).slice(0, 60)}`,
      ).toBeGreaterThan(0);
      expect(
        ISO_DATE.test(e.decisionDate),
        `bad date ${e.decisionDate} on ${e.id}`,
      ).toBe(true);
      expect(e.itemDescription.length).toBeGreaterThan(0);
      expect(
        ALPHA2.test(e.destination),
        `bad destination ${e.destination} on ${e.id}`,
      ).toBe(true);
      expect(e.rationale.length).toBeGreaterThan(0);
      expect(e.citation.length).toBeGreaterThan(0);
      expect(Array.isArray(e.tags)).toBe(true);
    }
  });

  it("every BAFA decisionDate is inside the documented coverage window", () => {
    const { decisionWindowStart, decisionWindowEnd } = BAFA_AZG_CORPUS_COVERAGE;
    for (const e of BAFA_AZG_CORPUS) {
      expect(
        e.decisionDate >= decisionWindowStart,
        `${e.id} earlier than window start`,
      ).toBe(true);
      expect(
        e.decisionDate <= decisionWindowEnd,
        `${e.id} later than window end`,
      ).toBe(true);
    }
  });
});

describe("Z33 — dataset integrity (DDTC)", () => {
  it("DDTC corpus has ≥ 20 entries", () => {
    expect(DDTC_CJ_CORPUS.length).toBeGreaterThanOrEqual(20);
  });

  it("DDTC ids are unique", () => {
    const ids = DDTC_CJ_CORPUS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every DDTC entry has the required fields populated", () => {
    for (const e of DDTC_CJ_CORPUS) {
      expect(e.id.length).toBeGreaterThan(0);
      expect(
        ISO_DATE.test(e.decisionDate),
        `bad date ${e.decisionDate} on ${e.id}`,
      ).toBe(true);
      expect(e.itemDescription.length).toBeGreaterThan(0);
      expect(
        e.eccnOrUsmlGuess.length,
        `${e.id} eccnOrUsmlGuess is empty`,
      ).toBeGreaterThan(0);
      expect(
        ALPHA2.test(e.destination),
        `bad destination ${e.destination} on ${e.id}`,
      ).toBe(true);
      expect(e.rationale.length).toBeGreaterThan(0);
      expect(e.citation.length).toBeGreaterThan(0);
      expect(Array.isArray(e.tags)).toBe(true);
    }
  });

  it("every DDTC decisionDate is inside the documented coverage window", () => {
    const { decisionWindowStart, decisionWindowEnd } = DDTC_CJ_CORPUS_COVERAGE;
    for (const e of DDTC_CJ_CORPUS) {
      expect(
        e.decisionDate >= decisionWindowStart,
        `${e.id} earlier than window start`,
      ).toBe(true);
      expect(
        e.decisionDate <= decisionWindowEnd,
        `${e.id} later than window end`,
      ).toBe(true);
    }
  });
});

// ─── 2. Outcome distribution ───────────────────────────────────────

describe("Z33 — outcome distribution", () => {
  it("BAFA corpus covers all three AzG outcomes", () => {
    expect(BAFA_AZG_CORPUS.some((e) => e.decision === "LICENSE_REQUIRED")).toBe(
      true,
    );
    expect(
      BAFA_AZG_CORPUS.some((e) => e.decision === "NO_LICENSE_REQUIRED"),
    ).toBe(true);
    expect(
      BAFA_AZG_CORPUS.some((e) => e.decision === "CATCH_ALL_TRIGGERED"),
    ).toBe(true);
  });

  it("DDTC corpus covers all three CJ outcomes", () => {
    expect(DDTC_CJ_CORPUS.some((e) => e.decision === "USML")).toBe(true);
    expect(DDTC_CJ_CORPUS.some((e) => e.decision === "EAR")).toBe(true);
    expect(DDTC_CJ_CORPUS.some((e) => e.decision === "SPLIT")).toBe(true);
  });
});

// ─── 3. Filter helpers ─────────────────────────────────────────────

describe("Z33 — filter helpers (BAFA)", () => {
  it("filterBafaByDecision returns a non-empty subset for each bucket", () => {
    const licReq = filterBafaByDecision("LICENSE_REQUIRED");
    const noLic = filterBafaByDecision("NO_LICENSE_REQUIRED");
    const catchAll = filterBafaByDecision("CATCH_ALL_TRIGGERED");
    expect(licReq.length + noLic.length + catchAll.length).toBe(
      BAFA_AZG_CORPUS.length,
    );
    expect(licReq.length).toBeGreaterThan(0);
    expect(noLic.length).toBeGreaterThan(0);
    expect(catchAll.length).toBeGreaterThan(0);
  });

  it("filterBafaByEccnPrefix is prefix-match + skips null guesses", () => {
    const ninesA = filterBafaByEccnPrefix("9A");
    expect(ninesA.length).toBeGreaterThan(0);
    for (const e of ninesA) {
      expect(e.eccnOrUsmlGuess?.startsWith("9A")).toBe(true);
    }
    // null-guess entries (Art. 4 catch-alls without classification)
    // must not appear in any prefix filter.
    const allByAnyChar = filterBafaByEccnPrefix("");
    for (const e of allByAnyChar) {
      expect(e.eccnOrUsmlGuess).not.toBeNull();
    }
  });

  it("filterBafaByDestination is exact-match alpha-2", () => {
    const ru = filterBafaByDestination("RU");
    expect(ru.length).toBeGreaterThan(0);
    for (const e of ru) {
      expect(e.destination).toBe("RU");
    }
  });

  it("findBafaEntry returns matching entry or null", () => {
    const known = BAFA_AZG_CORPUS[0]!.id;
    expect(findBafaEntry(known)?.id).toBe(known);
    expect(findBafaEntry("does-not-exist")).toBeNull();
  });
});

describe("Z33 — filter helpers (DDTC)", () => {
  it("filterDdtcByDecision partitions the corpus", () => {
    const usml = filterDdtcByDecision("USML");
    const ear = filterDdtcByDecision("EAR");
    const split = filterDdtcByDecision("SPLIT");
    expect(usml.length + ear.length + split.length).toBe(DDTC_CJ_CORPUS.length);
  });

  it("filterDdtcByEccnPrefix matches both ECCN and USML prefixes", () => {
    const usmlXv = filterDdtcByEccnPrefix("XV");
    expect(usmlXv.length).toBeGreaterThan(0);
    for (const e of usmlXv) {
      expect(e.eccnOrUsmlGuess.startsWith("XV")).toBe(true);
    }
    const eccn9A = filterDdtcByEccnPrefix("9A");
    expect(eccn9A.length).toBeGreaterThan(0);
    for (const e of eccn9A) {
      expect(e.eccnOrUsmlGuess.startsWith("9A")).toBe(true);
    }
  });

  it("findDdtcEntry returns matching entry or null", () => {
    const known = DDTC_CJ_CORPUS[0]!.id;
    expect(findDdtcEntry(known)?.id).toBe(known);
    expect(findDdtcEntry("does-not-exist")).toBeNull();
  });
});

// ─── 4. Similarity ranking ─────────────────────────────────────────

describe("Z33 — similarity ranking", () => {
  it("ranks DDTC 9A515.b/JP star-tracker first for matching query", () => {
    const ranked = rankSimilarCases({
      eccnOrUsml: "9A515.b",
      destination: "JP",
    });
    expect(ranked.length).toBeGreaterThan(0);
    // Top hit must be the synthetic DDTC star-tracker decision for
    // 9A515.b -> JP. Score must include the ECCN exact + destination
    // exact bonuses.
    const top = ranked[0]!;
    expect(top.entry.jurisdiction).toBe("DDTC");
    expect(top.entry.entry.id).toBe("ddtc-cj-2024-001");
    expect(top.reasons.eccnScore).toBe(0.6);
    expect(top.reasons.destinationScore).toBe(0.3);
  });

  it("ranks DDTC Hall-effect thruster first for XV(e)(13)/LU query (most recent on tie)", () => {
    const ranked = rankSimilarCases({
      eccnOrUsml: "XV(e)(13)",
      destination: "LU",
    });
    const top = ranked[0]!;
    expect(top.entry.jurisdiction).toBe("DDTC");
    // Two corpus entries share XV(e)(13) + LU (2024 + 2025); the date-desc
    // tie-break sends the 2025 case to rank 1.
    expect(top.entry.entry.id).toBe("ddtc-cj-2025-019");
    expect(top.reasons.eccnScore).toBe(0.6);
    expect(top.reasons.destinationScore).toBe(0.3);
    // The 2024 sibling must also appear in the top 3.
    expect(
      ranked.slice(0, 3).some((r) => r.entry.entry.id === "ddtc-cj-2024-003"),
    ).toBe(true);
  });

  it("jurisdiction filter narrows the pool to one corpus", () => {
    const onlyBafa = rankSimilarCases(
      { eccnOrUsml: "9A011", destination: "JP", jurisdiction: "BAFA" },
      100,
    );
    for (const r of onlyBafa) {
      expect(r.entry.jurisdiction).toBe("BAFA");
    }

    const onlyDdtc = rankSimilarCases(
      { eccnOrUsml: "9A515.b", destination: "JP", jurisdiction: "DDTC" },
      100,
    );
    for (const r of onlyDdtc) {
      expect(r.entry.jurisdiction).toBe("DDTC");
    }
  });

  it("results are sorted by score descending, decisionDate desc on tie", () => {
    const ranked = rankSimilarCases({
      eccnOrUsml: "9A515.b",
      destination: "ZZ", // no destination match — only ECCN scoring contributes
    });
    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1]!;
      const curr = ranked[i]!;
      if (prev.score === curr.score) {
        // Date descending tie-break.
        expect(
          prev.entry.entry.decisionDate >= curr.entry.entry.decisionDate,
        ).toBe(true);
      } else {
        expect(prev.score).toBeGreaterThan(curr.score);
      }
    }
  });

  it("limit parameter caps result count", () => {
    const five = rankSimilarCases(
      { eccnOrUsml: "9A515.b", destination: "JP" },
      5,
    );
    expect(five.length).toBeLessThanOrEqual(5);
  });
});

// ─── 5. Coverage + unified shape ──────────────────────────────────

describe("Z33 — coverage metadata + unified shape", () => {
  it("BAFA + DDTC coverage entryCount matches dataset length", () => {
    expect(BAFA_AZG_CORPUS_COVERAGE.entryCount).toBe(BAFA_AZG_CORPUS.length);
    expect(DDTC_CJ_CORPUS_COVERAGE.entryCount).toBe(DDTC_CJ_CORPUS.length);
  });

  it("UNIFIED_CORPUS preserves order: BAFA first, DDTC second", () => {
    const firstBafaIdx = UNIFIED_CORPUS.findIndex(
      (c) => c.jurisdiction === "BAFA",
    );
    const firstDdtcIdx = UNIFIED_CORPUS.findIndex(
      (c) => c.jurisdiction === "DDTC",
    );
    expect(firstBafaIdx).toBeLessThan(firstDdtcIdx);
    expect(UNIFIED_CORPUS.length).toBe(
      BAFA_AZG_CORPUS.length + DDTC_CJ_CORPUS.length,
    );
  });

  it("corpusSize totals match dataset lengths", () => {
    const sz = corpusSize();
    expect(sz.bafa).toBe(BAFA_AZG_CORPUS.length);
    expect(sz.ddtc).toBe(DDTC_CJ_CORPUS.length);
    expect(sz.total).toBe(sz.bafa + sz.ddtc);
  });
});
