#!/usr/bin/env tsx
/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * scripts/trade-corpus-freshness.ts
 *
 * Quarterly corpus-freshness audit (Spec 2026-06-12 §4.6 / Plan S7.1).
 *
 * Reads the normalized control-list corpus union (read-only import from
 * `src/data/trade/normalized-corpus.ts`), groups every entry by its regime,
 * and reports the OLDEST `asOfDate` per regime — the audit's review order, so
 * the regimes most likely to have drifted from their official source float to
 * the top of the printed table.
 *
 * Pure TS — NO AI, NO network, zero external cost. Deterministic: the only
 * input is the static corpus union, so `collectFreshness()` is unit-testable
 * (see `trade-corpus-freshness.test.ts`).
 *
 * QUARTERLY USE (Spec §4.6 checklist):
 *   1. `npx tsx scripts/trade-corpus-freshness.ts` — print the oldest-first table.
 *   2. For the 3 oldest regimes, check the official source for amendments
 *      (EUR-Lex novellae, Federal Register, gov.uk updates, …).
 *   3. Curate any drift into the per-regime `src/data/trade/*.ts` file
 *      (bump `asOfDate`, add/adjust entries; the W6 verification discipline applies).
 *   4. Update the status boards (this plan §0 + the Trade MASTER plan §4).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */
import {
  NORMALIZED_CORPUS_UNION,
  type CorpusRegime,
  type NormalizedCorpusEntry,
} from "@/data/trade/normalized-corpus";

/** One freshness row — the audit's per-regime summary. */
export interface FreshnessRow {
  /** The corpus regime (US_CCL, EU_ANNEX_I, MTCR_ANNEX, …). */
  regime: CorpusRegime;
  /** Smallest `asOfDate` across the regime's entries (YYYY-MM-DD). */
  oldestAsOf: string;
  /** Number of entries the union carries for this regime. */
  entryCount: number;
  /** One representative `sourceUrl` (taken from the oldest entry). */
  sourceUrl: string;
}

/**
 * Group the normalized corpus union by regime and reduce each group to its
 * oldest `asOfDate`, entry count, and a representative source URL.
 *
 * Returns rows sorted OLDEST-FIRST (ascending `asOfDate`); ties break
 * alphabetically by regime so the order is stable across runs.
 */
export function collectFreshness(
  union: readonly NormalizedCorpusEntry[] = NORMALIZED_CORPUS_UNION,
): FreshnessRow[] {
  const byRegime = new Map<CorpusRegime, FreshnessRow>();

  for (const entry of union) {
    const existing = byRegime.get(entry.regime);
    if (!existing) {
      byRegime.set(entry.regime, {
        regime: entry.regime,
        oldestAsOf: entry.asOfDate,
        entryCount: 1,
        sourceUrl: entry.sourceUrl,
      });
      continue;
    }
    existing.entryCount += 1;
    // Keep the oldest date AND the source URL that belongs to it, so the
    // representative URL points at the stalest slice of the regime.
    if (entry.asOfDate < existing.oldestAsOf) {
      existing.oldestAsOf = entry.asOfDate;
      existing.sourceUrl = entry.sourceUrl;
    }
  }

  return [...byRegime.values()].sort(
    (a, b) =>
      a.oldestAsOf.localeCompare(b.oldestAsOf) ||
      a.regime.localeCompare(b.regime),
  );
}

/** Format the freshness rows as an aligned, oldest-first text table. */
function formatTable(rows: readonly FreshnessRow[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const regimeWidth = Math.max(6, ...rows.map((r) => r.regime.length));
  const lines: string[] = [];
  lines.push("");
  lines.push("====================================================");
  lines.push("  Passage Trade Corpus — Freshness Audit (Spec §4.6)");
  lines.push("====================================================");
  lines.push(`  Run date  : ${today}`);
  lines.push(`  Regimes   : ${rows.length}`);
  lines.push(`  Entries   : ${rows.reduce((sum, r) => sum + r.entryCount, 0)}`);
  lines.push("----------------------------------------------------");
  lines.push(
    `  ${"REGIME".padEnd(regimeWidth)}  OLDEST asOf   ENTRIES  SOURCE`,
  );
  lines.push("----------------------------------------------------");
  // rows are already oldest-first — the 3 most stale regimes lead the table.
  rows.forEach((r, i) => {
    const flag = i < 3 ? " ⚠" : "  ";
    lines.push(
      `${flag}${r.regime.padEnd(regimeWidth)}  ${r.oldestAsOf}    ${String(
        r.entryCount,
      ).padStart(5)}  ${r.sourceUrl}`,
    );
  });
  lines.push("----------------------------------------------------");
  lines.push(
    "  ⚠ = one of the 3 oldest regimes — check its official source for amendments.",
  );
  lines.push("====================================================");
  lines.push("");
  return lines.join("\n");
}

function main(): void {
  const rows = collectFreshness();
  // eslint-disable-next-line no-console
  console.log(formatTable(rows));
}

// Only print when invoked directly (`npx tsx scripts/trade-corpus-freshness.ts`),
// never when imported by the test. `import.meta.url` is the module URL; argv[1]
// is the entrypoint path — compare them defensively.
const invokedPath = process.argv[1] ?? "";
if (
  import.meta.url === `file://${invokedPath}` ||
  invokedPath.endsWith("trade-corpus-freshness.ts")
) {
  main();
}
