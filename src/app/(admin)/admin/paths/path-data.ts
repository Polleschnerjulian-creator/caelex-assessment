/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — PURE data shaping for the Path/Flow list (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The paths/page.tsx renderer is a thin wrapper; the bar-width normalisation
 * (each edge's transitions as a fraction of the busiest edge), the share-of-
 * total, the entry/exit sentinel detection, and the short path label all live
 * HERE as pure functions so they can be unit-tested without React. The page only
 * maps these rows onto JSX.
 *
 * No React, no I/O, no "use client". Inputs come straight from the PathsResponse
 * contract; the API already sorts edges by transitions desc and caps the count.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { PathEdgeView } from "@/lib/admin/analytics-types";

/**
 * The sentinel tokens the path rollup uses for the start/end of a session,
 * mirroring AnalyticsPathEdge's documented domain. fromPath === ENTRY means "the
 * session began on toPath"; toPath === EXIT means "the session ended on
 * fromPath". The UI styles these rows distinctly so an entry/exit reads as a
 * boundary, not a real page.
 */
export const ENTRY_SENTINEL = "(entry)";
export const EXIT_SENTINEL = "(exit)";

/** Whether a path token is the synthetic session-start marker. */
export function isEntry(path: string): boolean {
  return path === ENTRY_SENTINEL;
}

/** Whether a path token is the synthetic session-end marker. */
export function isExit(path: string): boolean {
  return path === EXIT_SENTINEL;
}

/** One transition edge, decorated with the derived display fields the row needs. */
export interface PathEdgeRow {
  fromPath: string;
  toPath: string;
  transitions: number;
  /**
   * Bar width as a 0..1 fraction of the BUSIEST edge's transition count, so the
   * top edge is a full-width bar and the rest scale relative to it. 0 when the
   * max is 0 (no traffic at all).
   */
  widthFrac: number;
  /**
   * This edge's share of ALL transitions in the set, 0..1 (for an optional
   * "% of flow" label). 0 when the total is 0.
   */
  share: number;
  fromIsEntry: boolean;
  toIsExit: boolean;
}

/**
 * Shorten a pathname for display without losing its identity:
 *   - the entry/exit sentinels pass through untouched (they are not paths);
 *   - "/" stays "/" (the root);
 *   - a long path keeps its leading + trailing segments with an ellipsis in the
 *     middle (e.g. "/a/b/c/d/e" → "/a/…/e") so deep routes stay one line.
 * `maxSegments` (default 3) is the threshold above which the middle is elided.
 * Pure + deterministic so the label is testable and SSR/CSR-stable.
 */
export function shortPathLabel(path: string, maxSegments = 3): string {
  if (isEntry(path) || isExit(path)) return path;
  if (path === "/" || path === "") return path === "" ? "/" : path;

  // Split on "/", dropping the empty head from the leading slash. We keep a
  // trailing empty (from a trailing slash) out by filtering falsy segments.
  const segments = path.split("/").filter((s) => s.length > 0);
  if (segments.length <= maxSegments) return path;

  // Elide the middle: first segment + … + last segment, both absolute-rooted.
  const first = segments[0];
  const last = segments[segments.length - 1];
  return `/${first}/…/${last}`;
}

/**
 * Decorate the raw edge list with the bar width + share fields the flow list
 * needs. The width baseline is the MAX transitions across the set (the API
 * pre-sorts desc, but we don't rely on order — we scan for the max). Share is
 * each edge / the SUM of all transitions. Both degrade to 0 when there is no
 * traffic, so an empty/zero set renders flat bars rather than NaN widths.
 *
 * The input is not mutated; a new array of rows is returned in input order
 * (which the API already sorts by transitions desc).
 */
export function buildPathRows(edges: PathEdgeView[]): PathEdgeRow[] {
  // Single pass for both the max (bar baseline) and the sum (share denominator).
  let max = 0;
  let total = 0;
  for (const e of edges) {
    const t = Number.isFinite(e.transitions) ? e.transitions : 0;
    if (t > max) max = t;
    total += t;
  }

  const hasMax = max > 0;
  const hasTotal = total > 0;

  return edges.map((e) => {
    const t = Number.isFinite(e.transitions) ? e.transitions : 0;
    return {
      fromPath: e.fromPath,
      toPath: e.toPath,
      transitions: t,
      widthFrac: hasMax ? t / max : 0,
      share: hasTotal ? t / total : 0,
      fromIsEntry: isEntry(e.fromPath),
      toIsExit: isExit(e.toPath),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW VIZ — source-grouped outflow + worst-exit / top-entry rollups.
// ─────────────────────────────────────────────────────────────────────────────
//
// A full dependency-free Sankey is impractical here: the rollup is a flat bag of
// (fromPath, toPath, transitions) for ONE day, and computing layered node
// coordinates + crossing-minimisation by hand would be heavy, fragile, and easy
// to get subtly wrong. So instead of dressing a list up as a "Sankey", we expose
// three HONEST source→target transforms the UI renders as a real flow:
//
//   1. groupOutflows  — group the edges by their SOURCE node (fromPath). Each
//      group lists where users go FROM that page, with each out-edge sized as a
//      fraction of that source's own outflow — i.e. "of everyone who left /x,
//      this share went to /y". This is the genuine source→target structure a
//      Sankey encodes, just laid out as grouped bars instead of ribbons.
//   2. worstExits     — the analytical headline: which REAL pages bleed the most
//      sessions to (exit). Ranked by absolute exit volume, but each row also
//      carries the exit's share of that source's outflow so a small page that
//      loses 90% of its users is visible, not just the high-traffic ones.
//   3. topEntries     — symmetric: the real landing pages where sessions begin
//      ((entry) → /x), ranked by entry volume.
//
// All three are PURE + total (no mutation, finite-guarded, deterministic order),
// so the page is a thin renderer and the honesty rules are unit-pinned.

/** One out-edge within a source group: a destination + its share of the source. */
export interface OutEdge {
  toPath: string;
  transitions: number;
  /**
   * This destination's share of the SOURCE node's total outflow, 0..1 — i.e.
   * transitions ÷ Σ(transitions leaving this source). 0 when the source has no
   * outflow. Distinct from PathEdgeRow.share (which is share of the WHOLE graph).
   */
  shareOfSource: number;
  /** True when this destination is the session-end sentinel. */
  isExit: boolean;
}

/** A source page with all the transitions that LEAVE it, ranked + sized. */
export interface SourceGroup {
  fromPath: string;
  /** True when this source is the session-start sentinel ("(entry)"). */
  isEntry: boolean;
  /** Σ transitions leaving this source — the group's outflow magnitude. */
  totalOut: number;
  /**
   * This source's outflow as a 0..1 fraction of the BUSIEST source's outflow, so
   * the heaviest source reads as a full-width group header and the rest taper.
   */
  widthFrac: number;
  /** Destinations, busiest first (ties broken by path name for determinism). */
  outEdges: OutEdge[];
}

/**
 * Group the flat edge list by SOURCE node, producing one {@link SourceGroup} per
 * distinct `fromPath` with its out-edges sized relative to that source's own
 * outflow. Groups are sorted by `totalOut` DESC (busiest source first), then by
 * `fromPath` ASC for a stable tie-break; within a group the out-edges are sorted
 * by `transitions` DESC then `toPath` ASC.
 *
 * Pure + total: the input is never mutated, non-finite counts are coerced to 0,
 * and an empty input yields an empty array. `widthFrac` degrades to 0 when the
 * busiest source has no outflow, so a zero-traffic product renders flat headers
 * rather than NaN widths.
 */
export function groupOutflows(edges: PathEdgeView[]): SourceGroup[] {
  // First pass: bucket edges by source and accumulate each source's outflow.
  // A Map preserves insertion order, but we sort explicitly below so order in
  // never leaks into the output.
  interface Acc {
    fromPath: string;
    totalOut: number;
    edges: Array<{ toPath: string; transitions: number }>;
  }
  const bySource = new Map<string, Acc>();
  for (const e of edges) {
    const t = Number.isFinite(e.transitions) ? Math.max(0, e.transitions) : 0;
    let acc = bySource.get(e.fromPath);
    if (!acc) {
      acc = { fromPath: e.fromPath, totalOut: 0, edges: [] };
      bySource.set(e.fromPath, acc);
    }
    acc.totalOut += t;
    acc.edges.push({ toPath: e.toPath, transitions: t });
  }

  // Width baseline = the busiest source's outflow across all groups.
  let maxOut = 0;
  for (const acc of bySource.values()) {
    if (acc.totalOut > maxOut) maxOut = acc.totalOut;
  }
  const hasMax = maxOut > 0;

  const groups: SourceGroup[] = Array.from(bySource.values()).map((acc) => {
    const hasOut = acc.totalOut > 0;
    const outEdges: OutEdge[] = acc.edges
      .map((o) => ({
        toPath: o.toPath,
        transitions: o.transitions,
        shareOfSource: hasOut ? o.transitions / acc.totalOut : 0,
        isExit: isExit(o.toPath),
      }))
      // Busiest destination first; tie-break by name for a deterministic order.
      .sort((a, b) =>
        b.transitions !== a.transitions
          ? b.transitions - a.transitions
          : a.toPath.localeCompare(b.toPath),
      );

    return {
      fromPath: acc.fromPath,
      isEntry: isEntry(acc.fromPath),
      totalOut: acc.totalOut,
      widthFrac: hasMax ? acc.totalOut / maxOut : 0,
      outEdges,
    };
  });

  // Busiest source first; tie-break by source path for determinism.
  groups.sort((a, b) =>
    b.totalOut !== a.totalOut
      ? b.totalOut - a.totalOut
      : a.fromPath.localeCompare(b.fromPath),
  );
  return groups;
}

/** One row of the worst-exits panel: a REAL page that loses sessions to (exit). */
export interface ExitRow {
  /** The real page users left from (never a sentinel). */
  fromPath: string;
  /** Count of from→(exit) transitions that day. */
  transitions: number;
  /**
   * Bar width as a 0..1 fraction of the BIGGEST exit edge, so the worst exit is
   * a full bar. 0 when there are no exits.
   */
  widthFrac: number;
  /**
   * This exit's share of that page's TOTAL outflow, 0..1 — the "drop-off rate"
   * for the page (how much of everyone who left this page left the product
   * entirely). null when the page's outflow can't be determined (it has no
   * non-exit edges AND only this exit — see note below). The UI shows an em-dash
   * for null so an unknowable rate is never printed as a misleading number.
   */
  exitRate: number | null;
}

/**
 * Rank the pages that lose the most sessions to the "(exit)" sentinel. Only
 * edges whose `toPath` is the exit sentinel AND whose `fromPath` is a REAL page
 * (not the entry sentinel — an entry→exit "bounce" edge is a single-page session,
 * which we exclude as it has no page to attribute the drop-off to) are counted.
 *
 * `exitRate` = this exit's transitions ÷ the source page's TOTAL outflow (across
 * ALL its edges, exit and non-exit), computed from the full edge set so the rate
 * is the page's real drop-off proportion, not just its share among exits. It is
 * `null` only when the source's total outflow is 0 (degenerate), which cannot
 * normally happen for a counted exit edge but is guarded for safety.
 *
 * Rows are sorted by `transitions` DESC (worst absolute bleed first), then by
 * `exitRate` DESC, then `fromPath` ASC — all deterministic. `limit` caps the
 * list (default 8) so the panel stays scannable. Pure: input never mutated.
 */
export function worstExits(edges: PathEdgeView[], limit = 8): ExitRow[] {
  // Per-source TOTAL outflow (every edge leaving the source) — the denominator
  // for the drop-off rate. Built from the full edge set so the rate reflects the
  // page's real traffic, not just its exit edges.
  const outflowBySource = new Map<string, number>();
  for (const e of edges) {
    const t = Number.isFinite(e.transitions) ? Math.max(0, e.transitions) : 0;
    outflowBySource.set(e.fromPath, (outflowBySource.get(e.fromPath) ?? 0) + t);
  }

  // Collect the qualifying exit edges (real source → exit sentinel).
  const exits = edges
    .filter((e) => isExit(e.toPath) && !isEntry(e.fromPath))
    .map((e) => {
      const t = Number.isFinite(e.transitions) ? Math.max(0, e.transitions) : 0;
      const totalOut = outflowBySource.get(e.fromPath) ?? 0;
      return {
        fromPath: e.fromPath,
        transitions: t,
        exitRate: totalOut > 0 ? t / totalOut : null,
      };
    });

  // Bar baseline = the biggest single exit edge.
  let maxExit = 0;
  for (const x of exits) if (x.transitions > maxExit) maxExit = x.transitions;
  const hasMax = maxExit > 0;

  return exits
    .map((x) => ({
      fromPath: x.fromPath,
      transitions: x.transitions,
      widthFrac: hasMax ? x.transitions / maxExit : 0,
      exitRate: x.exitRate,
    }))
    .sort((a, b) => {
      if (b.transitions !== a.transitions) return b.transitions - a.transitions;
      // Tie-break by drop-off rate (nulls sort last), then by path name.
      const ar = a.exitRate ?? -1;
      const br = b.exitRate ?? -1;
      if (br !== ar) return br - ar;
      return a.fromPath.localeCompare(b.fromPath);
    })
    .slice(0, Math.max(0, limit));
}

/** One row of the top-entries panel: a REAL landing page where sessions begin. */
export interface EntryRow {
  /** The real page sessions landed on (never a sentinel). */
  toPath: string;
  /** Count of (entry)→page transitions that day. */
  transitions: number;
  /** Bar width as a 0..1 fraction of the biggest entry edge. 0 when no entries. */
  widthFrac: number;
  /** This entry's share of ALL entry transitions, 0..1. 0 when no entries. */
  share: number;
}

/**
 * Rank the real landing pages where sessions START — edges from the "(entry)"
 * sentinel into a real page (an entry→exit bounce is excluded: it has no landing
 * page). `widthFrac` is relative to the biggest entry edge; `share` is each
 * entry's fraction of ALL entry volume. Sorted by `transitions` DESC then
 * `toPath` ASC. `limit` caps the list (default 8). Pure: input never mutated.
 */
export function topEntries(edges: PathEdgeView[], limit = 8): EntryRow[] {
  const entries = edges
    .filter((e) => isEntry(e.fromPath) && !isExit(e.toPath))
    .map((e) => ({
      toPath: e.toPath,
      transitions: Number.isFinite(e.transitions)
        ? Math.max(0, e.transitions)
        : 0,
    }));

  let max = 0;
  let total = 0;
  for (const x of entries) {
    if (x.transitions > max) max = x.transitions;
    total += x.transitions;
  }
  const hasMax = max > 0;
  const hasTotal = total > 0;

  return entries
    .map((x) => ({
      toPath: x.toPath,
      transitions: x.transitions,
      widthFrac: hasMax ? x.transitions / max : 0,
      share: hasTotal ? x.transitions / total : 0,
    }))
    .sort((a, b) =>
      b.transitions !== a.transitions
        ? b.transitions - a.transitions
        : a.toPath.localeCompare(b.toPath),
    )
    .slice(0, Math.max(0, limit));
}

/** The closed set of product codes the Path switcher offers (matches the API). */
export const PATH_PRODUCTS = [
  "comply",
  "trade",
  "atlas",
  "pharos",
  "scholar",
  "marketing",
] as const;

export type PathProduct = (typeof PATH_PRODUCTS)[number];

/** Type guard for a product code coming from UI state / a query param. */
export function isPathProduct(v: unknown): v is PathProduct {
  return (
    typeof v === "string" && (PATH_PRODUCTS as readonly string[]).includes(v)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT — flatten the source-grouped flow to one row per source→target edge.
// ─────────────────────────────────────────────────────────────────────────────

/** One flat CSV cell value (mirrors export-utils' CsvValue without importing it,
 * so this transform module stays free of the component graph). */
type ExportCell = string | number;

/** A flat export row: the column key → value map the ExportButton consumes. */
export type PathExportRow = Record<string, ExportCell>;

/**
 * The fixed CSV column spec for the path export (order + headers). One row per
 * source→destination transition: the source page, that source's total outflow,
 * the destination page, the transition count, and the destination's share of the
 * source's outflow ("of everyone who left <source>, this % went to <dest>").
 * Exported so the page passes the identical spec to ExportButton.
 */
export const PATH_EXPORT_COLUMNS: ReadonlyArray<{
  key: string;
  header: string;
}> = [
  { key: "fromPath", header: "Von Seite" },
  { key: "sourceOutflow", header: "Abgänge der Quellseite" },
  { key: "toPath", header: "Zu Seite" },
  { key: "transitions", header: "Wechsel" },
  { key: "shareOfSource", header: "Anteil an der Quellseite %" },
];

/**
 * Flatten the source-grouped flow into a single row-per-edge CSV table. Reuses
 * the tested {@link groupOutflows} transform so the exported structure + ordering
 * (sources busiest-first, destinations busiest-first within a source) and the
 * share-of-source numbers match the on-screen flow exactly. The "(entry)" /
 * "(exit)" sentinels are emitted as their literal tokens — honest session
 * boundaries, visibly distinct from real routes. `shareOfSource` is a whole-
 * number percent of that source's outflow.
 *
 * Pure + total: never mutates the input; an empty edge list yields [].
 */
export function buildPathExport(edges: PathEdgeView[]): PathExportRow[] {
  const out: PathExportRow[] = [];
  for (const group of groupOutflows(edges)) {
    for (const edge of group.outEdges) {
      out.push({
        fromPath: group.fromPath,
        sourceOutflow: group.totalOut,
        toPath: edge.toPath,
        transitions: edge.transitions,
        shareOfSource: Math.round(edge.shareOfSource * 100),
      });
    }
  }
  return out;
}
