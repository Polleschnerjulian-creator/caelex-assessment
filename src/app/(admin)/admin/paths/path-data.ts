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
