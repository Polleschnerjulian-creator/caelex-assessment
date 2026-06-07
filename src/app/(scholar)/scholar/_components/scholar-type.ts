/**
 * scholar-type.ts — central semantic type tokens for Caelex Scholar.
 *
 * Pure constants (no JSX, no hooks, no "use client"). Import the className
 * strings into any Scholar page/component so content stops hand-rolling
 * ad-hoc `text-[Npx]` sizes.
 *
 * Rationale — monochrome + Apple-style tokens:
 *   • STRICTLY MONOCHROME. Every value uses only black / white / gray-*
 *     Tailwind classes — zero other hues. Scholar is a reading surface
 *     (treaties, statutes, case law); colour is reserved for genuine
 *     state, never for decoration. Hierarchy comes from size + weight +
 *     gray-step, the way Apple's reading apps do it.
 *   • Reuse the project's EXISTING semantic font-size tokens from
 *     tailwind.config.ts — text-micro(10) · text-caption(11) ·
 *     text-small(12) · text-body(13) · text-body-lg(14) · text-subtitle(15)
 *     · text-title(16) · text-heading(18) · text-display-sm(24).
 *     Never `text-[Npx]`.
 *
 * Accessibility (light canvas: #F7F8FA page / white cards):
 *   • gray-900 = primary text (≈ 15:1) ✓  WCAG 1.4.3 AA
 *   • gray-700 = secondary / muted body (≈ 8:1) ✓
 *   • gray-600 = tertiary meta, non-body (≈ 5.7:1) ✓
 *   • gray-500 is used ONLY for the small-caps eyebrow (large-enough
 *     weight + tracking, not load-bearing reading text).
 * These tokens carry no borders, glyphs, focus rings, or sr-only labels,
 * so per-component a11y affordances stay intact.
 */

// ─── Scholar type roles → existing semantic tokens (monochrome) ──────────
export const SCHOLAR_TYPE = {
  // Document title — top of a single source/case view.
  docTitle:
    "text-display-sm font-semibold tracking-tight leading-snug text-gray-900",
  // Part / chapter heading inside a long document.
  partHeading:
    "text-heading font-semibold tracking-tight leading-snug text-gray-900",
  // Section heading (e.g. article group, subsection).
  sectionHeading: "text-title font-semibold leading-snug text-gray-900",
  // Provision label — e.g. "Article 5", "§ 12", "Art. 22(1)".
  provisionLabel: "text-body-lg font-semibold text-gray-900",
  // Reading body — 14px owner-approved reading size, relaxed leading.
  body: "text-body-lg font-normal leading-relaxed text-gray-900",
  // Muted body — secondary/explanatory passages.
  bodyMuted: "text-body-lg font-normal leading-relaxed text-gray-700",
  // Meta line — dates, references, jurisdiction codes.
  meta: "text-small text-gray-600",
  // Meta label — the key in a key/value meta pair.
  metaLabel: "text-small font-medium text-gray-700",
  // Eyebrow — small-caps section kicker above a heading.
  eyebrow: "text-micro font-bold uppercase tracking-[0.08em] text-gray-500",
  // Monospace — official references, citations, identifiers.
  mono: "font-mono text-small text-gray-700",
} as const;

export type ScholarTypeRole = keyof typeof SCHOLAR_TYPE;
