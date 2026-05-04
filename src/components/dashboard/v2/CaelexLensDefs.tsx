/**
 * CaelexLensDefs — Sprint 12 Liquid Glass refraction filter
 *
 * Apple's WWDC 2025 §219 distinguishes Liquid Glass from prior
 * "glassmorphism" by lensing — light is bent through the surface,
 * not just blurred. On the web, that effect is reproducible via
 * `backdrop-filter: url(#caelex-lens) blur(...)` where the URL
 * points to an SVG displacement-map filter.
 *
 * Browser support is asymmetric:
 *   - Chromium (Chrome, Edge, Opera, Brave): supports
 *     `backdrop-filter: url(...)` → real refraction renders.
 *   - Safari: supports `backdrop-filter` but not URL filters in it.
 *   - Firefox: same as Safari.
 *
 * The CSS feature-query in globals.css gates the URL filter behind
 * `@supports (backdrop-filter: url(#caelex-lens))`, so non-Chromium
 * browsers automatically fall through to the flat-blur version.
 *
 * # Why a single shared <defs> at the shell root
 *
 * SVG filters are referenced by id; rendering a fresh <svg><defs>
 * tree per glass surface duplicates work and bloats the DOM. This
 * component lives once at the V2Shell root and the filter id
 * `caelex-lens` is referenced from every glass surface in CSS.
 *
 * # Why a radial-gradient displacement map
 *
 * The displacement map drives `<feDisplacementMap>` — a radial
 * gradient produces a centre-bulged refraction (like a spherical
 * lens) which matches the look Apple ships in macOS Tahoe more
 * closely than a uniform map. Scale=12 is a calibrated middle
 * ground: high enough to read as glass, low enough to keep text
 * underneath legible (per the WebKit team's "use sparingly" guidance).
 */
export function CaelexLensDefs() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter
          id="caelex-lens"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* Radial-gradient image used as the displacement map. The
              gradient runs from full-bright (centre, max
              displacement) to mid-grey (edges, no displacement). */}
          <feImage
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="displacement-map"
            href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><radialGradient id='g' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='rgb(255,255,255)'/><stop offset='100%25' stop-color='rgb(127,127,127)'/></radialGradient></defs><rect x='0' y='0' width='100' height='100' fill='url(%23g)'/></svg>"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacement-map"
            scale="12"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
