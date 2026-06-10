/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tracker import mapping — Ultimate Assessment rebuild (Task 3.5).
 *
 * THE DUAL-DATASET KILL: the dashboard's ArticleStatus rows are derived from
 * the VERDICT SNAPSHOT's own engine module statuses (`spaceActModules` on
 * ObligationMapResult) — the engine result the user actually saw. This module
 * deliberately imports NOTHING from `@/data/articles`: applicability is never
 * recomputed from a second, drift-prone dataset (a unit test asserts the
 * import absence). The article CATALOG (which tracker ids exist and which
 * module each belongs to) is injected by the caller — it is an ID directory,
 * not an applicability source.
 *
 * Mapping rule (conservative):
 *  - module status "required" or "simplified"  → its articles are applicable
 *    (`not_started`).
 *  - "recommended" → advisory in the verdict; the tracker does NOT mark the
 *    articles applicable (we never claim a duty the verdict labeled advisory)
 *    — they fall through to `not_applicable` unless another applicable module
 *    also covers them.
 *  - everything else / unknown module ids → `not_applicable`.
 *
 * Pure + dependency-free (no server-only, no prisma) for testability.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Injected shapes ─────────────────────────────────────────────────────────

/** One tracker catalog entry: the id directory only (NEVER appliesTo). */
export interface TrackerCatalogEntry {
  id: string; // e.g. "art-24"
  module: string; // the ComplianceModule the entry belongs to
}

/** The snapshot's engine module statuses (ObligationMapResult.spaceActModules). */
export interface SnapshotModuleStatus {
  id: string;
  status: string; // "required" | "simplified" | "recommended" | "not_applicable"
}

export interface ArticleRow {
  articleId: string;
  status: "not_started" | "not_applicable";
}

const APPLICABLE_STATUSES: ReadonlySet<string> = new Set([
  "required",
  "simplified",
]);

/**
 * Derive the tracker rows for every catalog entry from the snapshot's module
 * statuses. Returns one row per catalog entry (the tracker UI expects the
 * full directory, mirroring the legacy import's applicable/not_applicable
 * split).
 */
export function deriveArticleRows(
  catalog: readonly TrackerCatalogEntry[],
  modules: readonly SnapshotModuleStatus[] | undefined | null,
): ArticleRow[] {
  const applicable = new Set<string>();
  for (const m of modules ?? []) {
    if (APPLICABLE_STATUSES.has(m.status)) applicable.add(m.id);
  }
  return catalog.map((entry) => ({
    articleId: entry.id,
    status: applicable.has(entry.module) ? "not_started" : "not_applicable",
  }));
}

/** Convenience counts for the route response / audit log. */
export function countRows(rows: readonly ArticleRow[]): {
  applicable: number;
  notApplicable: number;
} {
  let applicable = 0;
  for (const r of rows) if (r.status === "not_started") applicable += 1;
  return { applicable, notApplicable: rows.length - applicable };
}
