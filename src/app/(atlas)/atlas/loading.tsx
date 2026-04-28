/**
 * Atlas loading state — intentionally a no-op.
 *
 * Returning `null` (instead of a skeleton or splash) tells Next.js to
 * keep the previously-rendered page visible during navigation. This
 * is a deliberate UX choice for Atlas:
 *
 *   - Dark mode: a generic skeleton-of-grey-blocks reads as a black
 *     "broken loading" screen against the navy/black canvas.
 *   - Light mode: even the skeleton creates a layout-flash the
 *     partner notices on every internal nav.
 *
 * Skipping the suspense fallback keeps the previous Atlas page on
 * screen until the next one paints — quieter, less jittery, and
 * matches how research tools (LexisNexis, Westlaw) handle internal
 * route transitions.
 *
 * If a route is genuinely slow to fetch (server-component data load
 * >300ms), prefer adding a localised inline spinner inside the route
 * itself rather than a full-page skeleton here.
 */
export default function AtlasLoading() {
  return null;
}
