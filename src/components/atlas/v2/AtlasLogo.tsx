/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Brand mark.
 *
 * The icon is a compact 7-bar variant of the WavePattern — same
 * visual language as the homepage watermark, scaled down. Visually
 * reads as a tiny pulsar-signal / barcode-spectrum, ties the
 * brand-mark and the surface decoration into one family.
 *
 * Style references: Mid-Century European modernism (Otl Aicher
 * Lufthansa, Massimo Vignelli NYC Transit, Bauhaus rigor). Anti-
 * glassmorphism, anti-gradient.
 *
 * Mark + wordmark always use `currentColor` so the consumer drives
 * light/dark via the wrapping element's text colour. The wordmark
 * stays serif to echo the homepage hero ("Wie kann ich helfen?").
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { WavePattern } from "./WavePattern";

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
  size = 18,
  className,
  withWordmark = false,
  wordmark = "Atlas",
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
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
 *
 * `size` is the HEIGHT in CSS px. Width is auto-computed at 3 ×
 * height to match the reference image's natural aspect ratio. The
 * full 32-bar WATERMARK_SEQUENCE renders — at small sizes the
 * hairlines become sub-pixel and the browser anti-aliases them into
 * crisp 1-device-pixel lines.
 *
 * Don't try to render this in a square — the pattern's identity is
 * its horizontal sequence. Layouts using AtlasMark must allow the
 * mark to take ~3 × its height in width.
 */
export function AtlasMark({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <WavePattern
      width={size * 3}
      height={size}
      density={32}
      opacity={1}
      className={className}
    />
  );
}
