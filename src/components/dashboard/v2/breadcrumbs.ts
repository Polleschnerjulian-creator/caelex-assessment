/**
 * Breadcrumbs derivation — Sprint 12B
 *
 * Path-segment → human label mapping for the V2TopBar breadcrumb
 * trail. Reads cleanly out of the sidebar nav configuration (one
 * source of truth for "what is /dashboard/foo called?") with a
 * pathname-dependent fallback for dynamic segments not in the nav.
 *
 * # Why a separate file (not inside V2TopBar.tsx)
 *
 * - Pure logic — easier to unit-test without rendering React.
 * - Re-usable from any future pathname-aware surface (e.g. tab
 *   titles, breadcrumb-flavoured Open Graph cards).
 * - Lets V2TopBar stay a thin presentational component.
 *
 * # Why no DB lookup for entity names
 *
 * Resolving `/dashboard/missions/abc123` → "Mission Sentinel-1"
 * means a Prisma round-trip per route change. For the top bar
 * that's overkill — Sprint 12B keeps the segment as a truncated
 * id ("abc123…"), and the page itself is responsible for showing
 * the human name in its `<h1>`. A future sub-sprint can replace
 * this with a server-component breadcrumb that does the lookup.
 */

export interface Breadcrumb {
  label: string;
  /** Path to navigate to. Last (current) breadcrumb's href = full pathname. */
  href: string;
  /** True for the last crumb — UI usually renders it un-linked. */
  isCurrent: boolean;
}

/**
 * Static labels for known dashboard routes. Source of truth lives
 * in V2Sidebar's `mission`/`workflows`/`compliance` arrays — keep
 * this table in sync (manual sync is fine because both files are
 * touched together when a new route ships).
 */
const STATIC_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  // Mission section
  missions: "Missions",
  "ops-console": "Ops Console",
  "mission-control": "Mission Control",
  universe: "Universe",
  ephemeris: "Ephemeris",
  sentinel: "Sentinel",
  // Workflows section
  today: "Today",
  triage: "Triage",
  proposals: "Proposals",
  "astra-v2": "Astra",
  // Compliance section
  posture: "Posture",
  tracker: "Article Tracker",
  incidents: "Incidents",
  "audit-center": "Audit Center",
  "audit-chain": "Audit Chain",
  "health-pulse": "Health Pulse",
  "time-travel": "Time Travel",
  network: "Network",
  graph: "Graph",
  // Items / detail routes
  items: "Items",
  "eu-space-act": "EU Space Act",
  nis2: "NIS2",
  cra: "CRA",
  // Settings
  settings: "Settings",
  ui: "UI",
};

/**
 * Title-case a slug fallback when the segment isn't in the static
 * label table — e.g. "my-dynamic-tab" → "My Dynamic Tab". We don't
 * try to be clever about ALL_CAPS or numeric ids; those are usually
 * entity ids and the caller can pass a `truncateIds` option.
 */
function slugToTitleCase(slug: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

/**
 * Returns true if the segment looks like a dynamic id — cuids,
 * UUIDs, NORAD ids, etc. Heuristic only.
 *
 *   - cuid:   "c" + 24 lowercase alphanumerics
 *   - cuid2:  24 lowercase alphanumerics
 *   - uuid:   contains "-" in 8-4-4-4-12 layout
 *   - nanoid: long string of [A-Za-z0-9_-]+
 *
 * If true, we render the segment as its first 6 chars + "…".
 */
function looksLikeId(segment: string): boolean {
  if (segment.length >= 21 && /^[a-z0-9]+$/i.test(segment)) return true;
  if (/^[0-9a-f-]{36}$/i.test(segment)) return true; // uuid
  return false;
}

function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(0, 6) + "…";
}

/**
 * Derive breadcrumbs from the current pathname.
 *
 * Conventions:
 *   - The leading "Dashboard" crumb is always shown (linked to
 *     `/dashboard`).
 *   - Subsequent segments are looked up in STATIC_LABELS, otherwise
 *     fall back to title-case-from-slug.
 *   - Segments matching `looksLikeId` are truncated.
 *   - Last crumb is marked `isCurrent: true` (UI typically renders
 *     it un-linked + heavier weight).
 *
 * Examples:
 *   "/dashboard"                       → [{Dashboard}]
 *   "/dashboard/posture"               → [Dashboard, Posture]
 *   "/dashboard/missions/abc123def"    → [Dashboard, Missions, abc123…]
 *   "/dashboard/items/eu-space-act/x"  → [Dashboard, Items, EU Space Act, x]
 */
export function breadcrumbsFromPath(pathname: string): Breadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Breadcrumb[] = [];
  let cursor = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    cursor += "/" + seg;

    let label: string;
    if (STATIC_LABELS[seg]) {
      label = STATIC_LABELS[seg];
    } else if (looksLikeId(seg)) {
      label = truncateId(seg);
    } else {
      label = slugToTitleCase(seg);
    }

    crumbs.push({
      label,
      href: cursor,
      isCurrent: i === segments.length - 1,
    });
  }

  return crumbs;
}
