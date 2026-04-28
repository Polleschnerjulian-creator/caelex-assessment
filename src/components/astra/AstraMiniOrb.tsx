/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * AstraMiniOrb — a tiny, CSS-only version of the Atlas / Astra orb.
 *
 * Why CSS instead of a Three.js Canvas: the AI-Mode AtlasEntity is a
 * full WebGL scene which is fine at 200px+ but is overkill (and
 * expensive) when we only need a 12px header dot or a 30px FAB icon.
 * A radial-gradient + box-shadow + breathing keyframe captures the
 * same "luminous white sphere" feel at a fraction of the cost.
 *
 * Visual recipe:
 *   - Core: white-to-translucent radial gradient with a soft inner
 *     highlight to suggest a 3D sphere.
 *   - Glow: outer box-shadow rings, slightly emerald-tinted to match
 *     the brand accent.
 *   - Breathing: 3.2s ease-in-out infinite scale+opacity loop. Subtle
 *     enough not to compete with content, lively enough to feel
 *     "alive" rather than a static icon.
 *   - active=true: faster, more saturated pulse — used when Astra is
 *     thinking / streaming.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import styles from "./astra-mini-orb.module.css";

interface AstraMiniOrbProps {
  /** Diameter in px. Default 14 (header-dot replacement size). */
  size?: number;
  /** When true, the orb pulses faster + tinted emerald for a
   *  "thinking" indicator. Wire this up to the AI streaming state. */
  active?: boolean;
  /** Disable the breathing animation entirely (e.g. for `prefers-
   *  reduced-motion`-respecting parents that want a static dot). */
  static?: boolean;
  /** Extra className for layout — the orb itself is fully styled. */
  className?: string;
  /** Aria-label override; defaults to "Astra". */
  ariaLabel?: string;
}

export function AstraMiniOrb({
  size = 14,
  active = false,
  static: isStatic = false,
  className = "",
  ariaLabel = "Astra",
}: AstraMiniOrbProps) {
  return (
    <span
      className={`${styles.orb} ${active ? styles.active : ""} ${
        isStatic ? styles.staticOrb : ""
      } ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Inner sheen — subtle off-center white highlight to suggest a
          spherical reflection. Position chosen to match the AI-Mode
          AtlasEntity's lighting so the two orbs feel like the same
          object at different scales. */}
      <span className={styles.sheen} aria-hidden />
    </span>
  );
}

export default AstraMiniOrb;
