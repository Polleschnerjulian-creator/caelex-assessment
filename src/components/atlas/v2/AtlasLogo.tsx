/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Brand mark.
 *
 * The composition: a sphere (the "atlas" — Greek titan carrying the
 * celestial sphere) crossed by a rotated orbital ring (the space-law
 * twist), with a single satellite-dot riding the ring's apex.
 *
 * Mono-line @ 1.5px stroke, `currentColor` so the icon picks up the
 * surrounding text colour — works light/dark/hover without theme
 * branches. Uses `non-scaling-stroke` so the line weight stays
 * readable when the SVG renders at 18px in the sidebar OR at 36px
 * in the about page.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

interface Props {
  size?: number;
  className?: string;
  /** Renders the "Atlas" wordmark in a serif face next to the icon. */
  withWordmark?: boolean;
  /** Optional override for the wordmark text — useful for tenant-
   *  branded deployments later (Kanzlei XY's instance can ship its
   *  own wordmark without forking the icon). */
  wordmark?: string;
}

export function AtlasLogo({
  size = 20,
  className,
  withWordmark = false,
  wordmark = "Atlas",
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      aria-label={withWordmark ? wordmark : "Atlas"}
    >
      <AtlasMark size={size} />
      {withWordmark && (
        <span
          className="text-[15px] font-medium tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]"
          /* Serif chosen to echo the homepage hero "Wie kann ich
             helfen?" — it ties Atlas's branding back to the empty
             state every user sees first. */
        >
          {wordmark}
        </span>
      )}
    </span>
  );
}

/**
 * The icon by itself — exported separately so consumers can compose
 * it into custom layouts (e.g. a centred splash on a loading screen)
 * without inheriting the wordmark + flex container.
 */
export function AtlasMark({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* The sphere — Atlas's celestial globe. Positioned slightly
          inset so the orbital ring has room to breathe at the corners. */}
      <circle
        cx="12"
        cy="12"
        r="7.25"
        stroke="currentColor"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      {/* Equator — a single horizontal latitude line, just enough to
          read the sphere as 3D without going full-globe-grid. */}
      <ellipse
        cx="12"
        cy="12"
        rx="7.25"
        ry="2.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeOpacity="0.55"
        vectorEffect="non-scaling-stroke"
      />
      {/* Orbital ring — rotated ~32° so the ring crosses the sphere
          on a clear diagonal. Slightly oversized so it pokes out top-
          right + bottom-left of the sphere, suggesting "in orbit
          AROUND the celestial body". */}
      <ellipse
        cx="12"
        cy="12"
        rx="10.25"
        ry="3.5"
        transform="rotate(-32 12 12)"
        stroke="currentColor"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      {/* Satellite — a single dot riding the ring's apex (top-right
          quadrant). Positioned along the rotated ellipse path at
          theta ≈ 35°. */}
      <circle cx="20.1" cy="6.6" r="1.15" fill="currentColor" />
    </svg>
  );
}
