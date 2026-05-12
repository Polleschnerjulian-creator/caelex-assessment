/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Brand-Wave-Pattern.
 *
 * Horizontal sequence of vertical bars with variable widths — some
 * solid rectangles, some tapered lens shapes, some pure hairlines.
 * Visual reference: pulsar-signal / spectrogram, Mid-Century European
 * modernism (Otl Aicher, Massimo Vignelli, Bauhaus rigor).
 *
 * Two surface modes (driven by the static sequences below):
 *   • watermark — 32-bar full sequence, used as opacity-6% background
 *                 layer on the homepage empty state
 *   • icon      — 7-bar condensed sequence, used as the Atlas brand
 *                 mark in the sidebar (replaces the previous globe +
 *                 orbital-ring icon — same visual family across all
 *                 brand touchpoints)
 *
 * Determinism: the bar sequences are hardcoded const arrays. Same
 * input renders the same output across reloads — no PRNG drift.
 *
 * Style guarantees:
 *   - Inline SVG (no raster, no external asset)
 *   - currentColor inheritance — works in light + dark without theme
 *     branches at the component level
 *   - pointer-events:none, aria-hidden:true on consumer wrappers
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

type Bar =
  | { type: "rect"; w: number }
  | { type: "lens"; w: number }
  | { type: "line" };

/* ── Watermark sequence (32 bars) ─────────────────────────────────────
 * Composed in 3 zones matching the reference image:
 *   [0-7]    left rim:    solid rects + emerging lens taper
 *   [8-19]   center:      dense mix of thin lenses + hairlines
 *   [20-31]  right rim:   resolving lens taper + solid rects
 *
 * Widths are PERCENTAGES of the 100-unit viewBox-width so the same
 * sequence scales identically from 720px hero-watermark down to
 * sidebar-icon size.
 */
const WATERMARK_SEQUENCE: Bar[] = [
  { type: "rect", w: 2.4 },
  { type: "rect", w: 2.4 },
  { type: "rect", w: 2.0 },
  { type: "lens", w: 2.2 },
  { type: "rect", w: 2.2 },
  { type: "lens", w: 1.8 },
  { type: "lens", w: 1.6 },
  { type: "lens", w: 1.4 },
  { type: "lens", w: 1.2 },
  { type: "line" },
  { type: "lens", w: 1.0 },
  { type: "line" },
  { type: "line" },
  { type: "lens", w: 0.8 },
  { type: "line" },
  { type: "line" },
  { type: "lens", w: 1.0 },
  { type: "line" },
  { type: "line" },
  { type: "lens", w: 1.2 },
  { type: "lens", w: 1.6 },
  { type: "lens", w: 1.8 },
  { type: "lens", w: 2.0 },
  { type: "lens", w: 2.2 },
  { type: "rect", w: 2.0 },
  { type: "rect", w: 2.4 },
  { type: "rect", w: 2.4 },
  { type: "rect", w: 2.2 },
  { type: "rect", w: 2.4 },
  { type: "rect", w: 2.4 },
  { type: "rect", w: 2.2 },
  { type: "rect", w: 2.4 },
];

/* ── Icon sequence (7 bars) ───────────────────────────────────────────
 * Hand-crafted (NOT sub-sampled from watermark sequence) because at
 * icon scale the bars need to be RELATIVELY thicker to stay visible.
 * Captures the same visual family: thick rects framing the outside,
 * lens taper transitioning in, hairline at the center.
 */
const ICON_SEQUENCE: Bar[] = [
  { type: "rect", w: 7 },
  { type: "rect", w: 6 },
  { type: "lens", w: 5 },
  { type: "line" },
  { type: "lens", w: 5 },
  { type: "rect", w: 6 },
  { type: "rect", w: 7 },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Sub-sample evenly from a sequence (used when watermark `density`
 *  prop is smaller than the full 32-bar sequence). Endpoints are
 *  always preserved so the visual rhythm stays recognisable. */
function subSample<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return arr;
  if (n <= 1) return [arr[0]];
  const out: T[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

/** Lens SVG path — two opposing quadratic curves forming an
 *  eye/lens shape. Tip at top (cx, 0), tip at bottom (cx, h),
 *  max width `w` at the vertical midpoint. */
function lensPath(cx: number, w: number, h: number): string {
  const half = w / 2;
  const mid = h / 2;
  return `M ${cx},0 Q ${cx + half},${mid} ${cx},${h} Q ${cx - half},${mid} ${cx},0 Z`;
}

/* ── Public component ────────────────────────────────────────────────── */

export interface WavePatternProps {
  /** Output width in CSS px. Default 800. */
  width?: number;
  /** Output height in CSS px. Default 240 (3.33:1 aspect, matches
   *  the watermark viewBox natively). */
  height?: number;
  /** Opacity 0-1. Default 0.06 (= 6 %) for watermark use; pass 1
   *  for icon use where the consumer wants full visibility. */
  opacity?: number;
  /** Fill colour. Default "currentColor" so the consumer can drive
   *  it via Tailwind text-* classes on the wrapping element. */
  color?: string;
  /** Bar count for the watermark sequence. Clamped 4-32. Reducing
   *  density sub-samples evenly from the full sequence — the visual
   *  character (thick-thin-thick rhythm) survives.
   *  Ignored when `variant === "icon"`. */
  density?: number;
  /** Which sequence to render. Default "watermark". */
  variant?: "watermark" | "icon";
  /** Optional className for positioning (absolute + transform, etc). */
  className?: string;
}

export function WavePattern({
  width = 800,
  height = 240,
  opacity = 0.06,
  color = "currentColor",
  density = 32,
  variant = "watermark",
  className,
}: WavePatternProps) {
  const source = variant === "icon" ? ICON_SEQUENCE : WATERMARK_SEQUENCE;
  const bars =
    variant === "icon"
      ? source
      : subSample(source, Math.max(4, Math.min(32, density)));

  /* viewBox: 100 units wide × 30 units tall = 3.33:1 aspect. The
     sequence widths are designed against this 100-unit baseline so
     they scale predictably regardless of rendered px size. */
  const VB_W = 100;
  const VB_H = 30;
  const slotWidth = VB_W / bars.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      fill={color}
      aria-hidden="true"
      style={{ opacity }}
      className={className}
    >
      {bars.map((bar, i) => {
        const cx = (i + 0.5) * slotWidth;
        if (bar.type === "rect") {
          return (
            <rect
              key={i}
              x={cx - bar.w / 2}
              y={0}
              width={bar.w}
              height={VB_H}
            />
          );
        }
        if (bar.type === "lens") {
          return <path key={i} d={lensPath(cx, bar.w, VB_H)} />;
        }
        /* line — a hairline rect 0.4 viewBox-units wide. At
           watermark size (800px output) that resolves to ~3px;
           at icon size (40px output) it's ~0.16px which the
           browser renders as a sharp 1-device-pixel line. */
        return <rect key={i} x={cx - 0.2} y={0} width={0.4} height={VB_H} />;
      })}
    </svg>
  );
}
