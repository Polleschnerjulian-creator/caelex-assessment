/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * scripts/trade-corpus-freshness.test.ts
 *
 * Invariant test for the quarterly corpus-freshness audit (Spec §4.6 / Plan
 * S7.1). The script is pure TS — no AI, no network — so its output is
 * deterministic and testable: every regime in the normalized corpus union must
 * surface with a parseable oldest `asOfDate`, a non-empty entry count, and a
 * representative source URL.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */
import { describe, expect, it } from "vitest";

import { collectFreshness } from "./trade-corpus-freshness";

describe("trade corpus freshness audit", () => {
  it("lists every CorpusRegime with its oldest asOfDate, count and source", () => {
    const rows = collectFreshness();
    // 19 curated regimes after S0–S6 (US_CCL, USML, MTCR_ANNEX, DE_ANLAGE_AL,
    // USML_XV, WASSENAAR, JP_METI, IN_SCOMET, DE_AUSFUHRLISTE, EU_ANNEX_I, NSG,
    // RU_833, UK_STRATEGIC, EU_CML, CA_ECL, AU_DSGL, KR_STRATEGIC, CH_GKV,
    // NO_LIST). The >= keeps the assertion robust if a future sprint adds one.
    expect(rows.length).toBeGreaterThanOrEqual(19);
    for (const r of rows) {
      expect(r.regime).toBeTruthy();
      expect(r.oldestAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.entryCount).toBeGreaterThan(0);
      expect(r.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("returns rows sorted oldest-first (the audit's review order)", () => {
    const rows = collectFreshness();
    for (let i = 1; i < rows.length; i++) {
      expect(
        rows[i - 1].oldestAsOf.localeCompare(rows[i].oldestAsOf),
      ).toBeLessThanOrEqual(0);
    }
  });

  it("has no duplicate regime rows", () => {
    const rows = collectFreshness();
    const regimes = rows.map((r) => r.regime);
    expect(new Set(regimes).size).toBe(regimes.length);
  });
});
