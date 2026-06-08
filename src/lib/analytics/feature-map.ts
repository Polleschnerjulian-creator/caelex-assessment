/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — derive a BOUNDED feature descriptor + a normalised route
 * pattern from a (product, pathname) pair.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Two pure functions feed the cross-product analytics rollups:
 *
 *   1. `deriveFeature(product, pathname)` → the `{ featureId, featureName,
 *      moduleCategory }` triple the feature-usage rollup groups on. `featureId`
 *      is the GROUP KEY — so it MUST be LOW-cardinality and slug-safe. We key it
 *      off the product + the FIRST path segment after the product root (the
 *      "area"), never a record id, so the number of distinct features stays
 *      bounded by the app's route map rather than by user data. The one
 *      exception is Comply `/dashboard/modules/<m>`, where the module id IS the
 *      meaningful feature and is itself a bounded enum, so we keep that
 *      granularity (`comply:module:<m>`).
 *
 *   2. `normalizePath(pathname)` → a route PATTERN (e.g. `/atlas/cases/:id`) for
 *      the path-edge (Sankey) rollup. Raw paths carry record ids that would
 *      explode edge cardinality (and could be an opaque identifier), so every
 *      id-looking segment collapses to `:id`. This keeps the edge dimension
 *      bounded by routes and PII-free.
 *
 * ── WHY product is an ARGUMENT, not re-derived here ──────────────────────────
 * Callers already hold the product — either from `productFromPath(path)` at
 * capture time, or from the persisted `AnalyticsEvent.product` column at rollup
 * time (which may be a legacy-null row the caller has already defaulted). We
 * TRUST that argument to decide which root prefix to strip, but we still PARSE
 * the path ourselves to extract the area, so a product/path mismatch can never
 * make us read the wrong segment.
 *
 * ── WHY this is a PURE module ────────────────────────────────────────────────
 * No React, no Prisma, no `server-only` — it is imported by the client provider
 * (to stamp feature on an event), the ingestion route, AND the server rollups.
 * It must therefore never throw on a live URL. Both functions are TOTAL.
 *
 * Unit-tested in feature-map.test.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { SLUG_REGEX, type Product } from "./events";

/** The bounded feature descriptor the feature-usage rollup groups on. */
export interface DerivedFeature {
  /** Low-cardinality, slug-safe group key (`<product>:<area>`). */
  featureId: string;
  /** Human-readable display name for dashboards. */
  featureName: string;
  /** Coarse bucket (`compliance` | `dashboard` | `assure` | … | `<product>`). */
  moduleCategory: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static asset / non-page extensions. A request that ENDS in one of these is a
 * file fetch, not a feature view — we reject it so assets never create phantom
 * features. Kept as a Set for O(1) membership.
 */
const STATIC_ASSET_EXTS: ReadonlySet<string> = new Set([
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".ico",
  ".map",
  ".woff",
  ".woff2",
  ".txt",
  ".xml",
  ".json",
]);

/**
 * Known module-id → display-name overrides for Comply `/dashboard/modules/<m>`.
 * The module set is a bounded enum, so the high-cardinality concern does not
 * apply; we keep per-module granularity and give the common ones a polished
 * label. Any module not listed falls through to {@link titleizeSlug}.
 */
const COMPLY_MODULE_NAMES: Readonly<Record<string, string>> = {
  authorization: "Authorization",
  registration: "Registration",
  cybersecurity: "Cybersecurity",
  debris: "Debris Management",
  environmental: "Environmental",
  insurance: "Insurance",
  nis2: "NIS2",
  supervision: "Supervision",
};

/** Cap matching SLUG_REGEX's max length (1 head char + 63 tail chars = 64). */
const SLUG_MAX = 64;

/**
 * Strip query string + hash defensively, returning the pathname only. Callers
 * are CONTRACTED to pass a pathname, but a stray `?`/`#` (or a whole URL) must
 * never leak query text — which can carry PII / privileged matter — into a
 * feature id or a route pattern. Never throws; `null`/`undefined`/`""` → "/".
 */
function pathnameOnly(input: string | null | undefined): string {
  if (typeof input !== "string" || input.length === 0) return "/";
  let p = input;
  // Absolute URL → take its pathname (everything from the first "/" after host).
  const schemeIdx = p.indexOf("://");
  if (schemeIdx !== -1) {
    const afterScheme = p.slice(schemeIdx + 3);
    const slashIdx = afterScheme.indexOf("/");
    p = slashIdx === -1 ? "/" : afterScheme.slice(slashIdx);
  }
  // Drop fragment, then query (order matters: a "#" can precede a "?").
  const hashIdx = p.indexOf("#");
  if (hashIdx !== -1) p = p.slice(0, hashIdx);
  const qIdx = p.indexOf("?");
  if (qIdx !== -1) p = p.slice(0, qIdx);
  if (p.length === 0) return "/";
  if (p[0] !== "/") p = "/" + p;
  return p;
}

/**
 * Heuristic: does a raw segment look like a dynamic id rather than a named
 * area? Collapsing these keeps the feature/edge dimension bounded and PII-free.
 * The contract for {@link normalizePath} pins the exact rule set:
 *   - a cuid (`c` + ≥20 lowercase-alnum),
 *   - a uuid (8-4-4-4-12 hex),
 *   - all digits, OR
 *   - any segment ≥ 20 chars (defensive catch-all for opaque tokens).
 */
function looksLikeId(raw: string): boolean {
  if (/^[0-9]+$/.test(raw)) return true; // pure numeric id
  if (/^c[a-z0-9]{20,}$/i.test(raw)) return true; // cuid (`c…`)
  // uuid (8-4-4-4-12 hex with hyphens).
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  ) {
    return true;
  }
  if (raw.length >= 20) return true; // long opaque token (defensive)
  return false;
}

/**
 * Slugify a raw path segment into the `area` token used to build a `featureId`.
 * Lowercases, replaces any out-of-charset char with `-`, trims leading
 * separators (SLUG_REGEX requires a `[a-z0-9]` head), and caps length. Returns
 * `null` for an empty result OR an id-looking segment — the caller then falls
 * back to the `"home"` sentinel so cardinality stays bounded (a record id must
 * never become an `area`).
 */
function areaFromSegment(raw: string): string | null {
  if (!raw) return null;
  if (looksLikeId(raw)) return null; // id → caller uses "home"
  let s = raw.toLowerCase();
  // Strip anything not in the slug charset (a-z 0-9 _ - : .).
  s = s.replace(/[^a-z0-9_.:-]/g, "-");
  // Trim leading separators so the slug starts with [a-z0-9].
  s = s.replace(/^[_.:-]+/, "");
  if (s.length === 0) return null;
  if (s.length > SLUG_MAX) s = s.slice(0, SLUG_MAX);
  return SLUG_REGEX.test(s) ? s : null;
}

/**
 * Turn a slug into a display name: split on `- _ . :`, drop empties, and
 * capitalise each word (`eu-space-act` → "Eu Space Act"). Exported as the small
 * internal title helper the contract asks for. Total: any string in, a string
 * out (empty/sep-only → "").
 */
export function titleizeSlug(slug: string): string {
  if (typeof slug !== "string" || slug.length === 0) return "";
  return slug
    .split(/[-_.:]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Split a (already query/hash-stripped) pathname into its non-empty, lowercased
 * segments. `/Dashboard/Modules/` → ["dashboard","modules"].
 */
function segmentsOf(pathname: string): string[] {
  return pathnameOnly(pathname).toLowerCase().split("/").filter(Boolean);
}

/**
 * Resolve the `area` for a product whose root is a single leading segment
 * (`/atlas`, `/trade`, …). `segments[0]` is the product root; `segments[1]` is
 * the area. Missing/id area → `"home"`.
 */
function singleRootArea(segments: string[]): string {
  if (segments.length < 2) return "home";
  return areaFromSegment(segments[1]) ?? "home";
}

// ─────────────────────────────────────────────────────────────────────────────
// deriveFeature
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the bounded {@link DerivedFeature} for a (product, pathname) pair, or
 * `null` for a non-feature path (api / _next / static asset). First match wins.
 *
 * The `product` argument selects which root prefix to strip; the path is then
 * parsed locally to extract the `area`. `featureId` is always `<product>:<area>`
 * (with the documented Comply-module exception), giving a LOW-cardinality,
 * slug-safe group key. TOTAL: never throws, even on `""`, `"//"`, `"/atlas/"`.
 */
export function deriveFeature(
  product: Product,
  pathname: string | null | undefined,
): DerivedFeature | null {
  const path = pathnameOnly(pathname).toLowerCase();

  // ── Reject non-page paths (privacy + no phantom features) ──────────────────
  // API + framework internals are never user-facing features.
  if (path.startsWith("/api/") || path === "/api") return null;
  if (path.startsWith("/_next/") || path === "/_next") return null;
  // A path that ends in a static-asset extension is a file fetch, not a view.
  const lastDot = path.lastIndexOf(".");
  const lastSlash = path.lastIndexOf("/");
  if (lastDot > lastSlash) {
    const ext = path.slice(lastDot);
    if (STATIC_ASSET_EXTS.has(ext)) return null;
  }

  const segments = segmentsOf(path);

  switch (product) {
    case "comply": {
      // Comply spans three runtime roots: /dashboard, /assure, /academy.
      // /dashboard/modules/<m> keeps module granularity (bounded enum).
      if (segments[0] === "dashboard") {
        if (segments[1] === "modules" && segments.length >= 3) {
          const moduleArea = areaFromSegment(segments[2]);
          if (moduleArea) {
            return {
              featureId: `comply:module:${moduleArea}`,
              featureName:
                COMPLY_MODULE_NAMES[moduleArea] ?? titleizeSlug(moduleArea),
              moduleCategory: "compliance",
            };
          }
          // Module slot held an id-looking segment → fall through to the
          // generic dashboard area ("modules") so we never emit `:id`.
        }
        // /dashboard or /dashboard/<area> (incl. bare /dashboard/modules).
        const area =
          segments.length >= 2
            ? (areaFromSegment(segments[1]) ?? "home")
            : "home";
        return {
          featureId: `comply:${area}`,
          featureName: titleizeSlug(area === "home" ? "dashboard" : area),
          moduleCategory: "dashboard",
        };
      }
      if (segments[0] === "assure") {
        const area = singleRootArea(segments);
        return {
          featureId: `comply:assure:${area}`,
          featureName: `Assure ${titleizeSlug(area === "home" ? "home" : area)}`,
          moduleCategory: "assure",
        };
      }
      if (segments[0] === "academy") {
        const area = singleRootArea(segments);
        return {
          featureId: `comply:academy:${area}`,
          featureName: `Academy ${titleizeSlug(area === "home" ? "home" : area)}`,
          moduleCategory: "academy",
        };
      }
      // Comply product but an unrecognised root → treat the root as the area so
      // the descriptor stays well-formed and bounded.
      {
        const area = areaFromSegment(segments[0] ?? "") ?? "home";
        return {
          featureId: `comply:${area}`,
          featureName: titleizeSlug(area === "home" ? "dashboard" : area),
          moduleCategory: "dashboard",
        };
      }
    }

    case "atlas": {
      const area = singleRootArea(segments);
      return {
        featureId: `atlas:${area}`,
        featureName: `Atlas ${titleizeSlug(area === "home" ? "home" : area)}`,
        moduleCategory: "atlas",
      };
    }

    case "trade": {
      const area = singleRootArea(segments);
      return {
        featureId: `trade:${area}`,
        featureName: `Trade ${titleizeSlug(area === "home" ? "home" : area)}`,
        moduleCategory: "trade",
      };
    }

    case "scholar": {
      const area = singleRootArea(segments);
      return {
        featureId: `scholar:${area}`,
        featureName: `Scholar ${titleizeSlug(area === "home" ? "home" : area)}`,
        moduleCategory: "scholar",
      };
    }

    case "pharos": {
      // Pharos claims three runtime roots: /pharos, /legal-network, /network.
      // The area is always the segment AFTER that root, whichever it is.
      const area = singleRootArea(segments);
      return {
        featureId: `pharos:${area}`,
        featureName: `Pharos ${titleizeSlug(area === "home" ? "home" : area)}`,
        moduleCategory: "pharos",
      };
    }

    case "marketing":
    default: {
      // Marketing collapses to the FIRST segment ("/" → home). Top-of-funnel
      // pages (/blog, /pricing, /about) become marketing:<seg>.
      const seg =
        segments.length >= 1
          ? (areaFromSegment(segments[0]) ?? "home")
          : "home";
      return {
        featureId: `marketing:${seg}`,
        featureName: titleizeSlug(seg === "home" ? "home" : seg),
        moduleCategory: "marketing",
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// normalizePath
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a pathname to a bounded ROUTE PATTERN for the path-edge rollup:
 * lowercase, strip query/hash defensively, then replace every id-looking
 * segment (cuid / uuid / all-numeric / ≥20 chars) with `:id`. This caps
 * path-edge cardinality at the route level (not the record level) and keeps
 * record ids — which can be opaque identifiers — out of the analytics store.
 *
 * TOTAL: always returns a string starting with `/`. Empty/"/"/null → "/".
 * Segments are otherwise preserved verbatim (already lowercased) — this is a
 * route pattern, not a slug, so `:id` is the only rewrite.
 */
export function normalizePath(pathname: string | null | undefined): string {
  const path = pathnameOnly(pathname).toLowerCase();
  if (path === "/") return "/";
  const out = path
    .split("/")
    .map((seg) => {
      if (seg.length === 0) return seg; // preserve empty (leading/double slash)
      return looksLikeId(seg) ? ":id" : seg;
    })
    .join("/");
  // pathnameOnly guarantees a leading "/", so `out` already starts with "/".
  return out.length === 0 ? "/" : out;
}
