/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — derive the `surface`/`feature` envelope slugs from a path.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The typed envelope (./events.ts) requires `surface` + `feature` to be SLUGS
 * (SLUG_REGEX — lowercase a-z0-9 and `_ - : .`, 1–64 chars). Real route segments
 * are almost always slug-shaped already (`/dashboard/modules/eu-space-act`), but
 * to make envelope validation TOTAL — it must never throw on a live URL — this
 * helper sanitises each segment into a guaranteed-valid slug:
 *   - lowercase;
 *   - any character outside the slug charset → `-`;
 *   - leading separators trimmed (slug must start with [a-z0-9]);
 *   - capped to 64 chars; empty → a stable sentinel ("root" / "index").
 *
 * Dynamic-id segments (cuids, uuids, long hex) would explode `surface`
 * cardinality and risk being an opaque identifier rather than a feature name, so
 * they are collapsed to the sentinel `:id`. This keeps surface/feature as a
 * BOUNDED dimension (the analytics rollups group on it) and PII-free.
 *
 * Pure module — no React / DOM / Prisma. Unit-tested in surface.test.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { SLUG_REGEX, type Product, productFromPath } from "./events";

/** Result of {@link pathToSurfaceFeature}: two guaranteed-valid envelope slugs. */
export interface SurfaceFeature {
  surface: string;
  feature: string;
}

/** Cap matching SLUG_REGEX's max length (1 + 63). */
const SLUG_MAX = 64;

/**
 * Heuristic: does a raw segment look like a dynamic database id rather than a
 * named feature? cuids (`c…` 25 chars), uuids, and long hex/number runs all
 * blow up cardinality, so we collapse them to a sentinel. Conservative: only
 * collapses things that are clearly id-shaped, never short human-named segments.
 *
 * IMPORTANT: this must NOT fire on a merely-LONG human/word segment (e.g. a
 * 200-char run of one letter). Such a segment is not an opaque id — collapsing
 * it would (a) be wrong and (b) emit the `:id` sentinel, which is reserved for
 * genuine ids and is itself clamped to a valid slug at the call site. Overlong
 * non-id segments are instead truncated by {@link segmentToSlug}. So the old
 * blanket `length >= 20 ⇒ id` rule is replaced by PRECISE id shapes plus a
 * "long AND mixed letters+digits" rule (real ids interleave the two; prose and
 * single-character runs do not).
 */
function looksLikeId(raw: string): boolean {
  if (/^[0-9]+$/.test(raw)) return true; // pure numeric id
  if (/^[0-9a-f]{12,}$/i.test(raw)) return true; // long unbroken hex (md5/sha/objectId)
  if (/^c[a-z0-9]{20,}$/i.test(raw)) return true; // cuid (`c…`)
  // uuid (8-4-4-4-12 hex with hyphens).
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  ) {
    return true;
  }
  // Generic long opaque token: ≥20 alphanumerics that MIX letters and digits
  // (so `clx1a2b3c4…`-style ids collapse, but `aaaa…`/`dashboard` do not).
  if (raw.length >= 20 && /^[a-z0-9]+$/i.test(raw) && /[0-9]/.test(raw)) {
    return true;
  }
  return false;
}

/**
 * Sanitise one raw path segment into a valid slug (or the `:id` sentinel for
 * id-shaped segments). Always returns a string that passes SLUG_REGEX.
 */
export function segmentToSlug(raw: string): string {
  if (!raw) return "index";
  if (looksLikeId(raw)) return ":id";
  let s = raw.toLowerCase();
  // Replace any char outside the slug charset with "-".
  s = s.replace(/[^a-z0-9_.:-]/g, "-");
  // Trim leading separators so the slug starts with [a-z0-9] (SLUG_REGEX head).
  s = s.replace(/^[_.:-]+/, "");
  if (s.length === 0) return "index";
  if (s.length > SLUG_MAX) s = s.slice(0, SLUG_MAX);
  // Final guard: if anything still fails the regex (e.g. trailing separators are
  // fine, but be safe), fall back to a stable sentinel.
  return SLUG_REGEX.test(s) ? s : "segment";
}

/**
 * Split a pathname into `surface` (first meaningful segment) + `feature`
 * (second meaningful segment), each a valid slug. Examples:
 *   "/"                                   → { surface: "root",    feature: "index" }
 *   "/dashboard"                          → { surface: "dashboard", feature: "index" }
 *   "/dashboard/modules/eu-space-act"     → { surface: "dashboard", feature: "modules" }
 *   "/atlas/cases/clx123…"                → { surface: "atlas",    feature: "cases" }
 *
 * Note we intentionally use the FIRST TWO segments only — deeper/per-record
 * detail belongs in the per-event `topic`/payload, not the broad surface/feature
 * dimension (which must stay bounded for rollups).
 */
export function pathToSurfaceFeature(pathname: string): SurfaceFeature {
  const clean = (pathname || "/").split(/[?#]/)[0];
  const segments = clean.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { surface: "root", feature: "index" };
  }
  const surface = segmentToSlug(segments[0]);
  const feature = segments.length > 1 ? segmentToSlug(segments[1]) : "index";
  return { surface, feature };
}

/**
 * One-shot helper: derive the full `{ product, surface, feature }` envelope head
 * for a pathname (the three dimensions the provider stamps on a page_view /
 * dwell event). `product` uses the canonical {@link productFromPath}.
 */
export function deriveEnvelopeHead(pathname: string): {
  product: Product;
  surface: string;
  feature: string;
} {
  const { surface, feature } = pathToSurfaceFeature(pathname);
  return { product: productFromPath(pathname), surface, feature };
}
