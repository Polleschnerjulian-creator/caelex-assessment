"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Singularity — the centre-piece of Atlas AI Mode.
 *
 * A morphing, glowing orb that signals the user is talking to an
 * intelligence, not a search box. Purely visual; state comes from
 * the parent — this component has no knowledge of AI, agents, or
 * data. It just renders a mood.
 *
 * States:
 *   idle        — gentle breathing pulse, neutral colour, ambient
 *   listening   — faster pulse, subtle hue shift, "attention"
 *   thinking    — intense glow, radiating rings, "working"
 *   responding  — settled, warm colour, confident
 *
 * Implementation uses SVG + Framer Motion. The "organic" feel comes
 * from pre-computed blob paths cycled on a long loop; the "structural"
 * hint (for the mix of A+B in the design) emerges from AgentConstellation
 * which overlays satellites around this orb when thinking.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { motion, type Transition } from "framer-motion";

export type SingularityState = "idle" | "listening" | "thinking" | "responding";

interface SingularityProps {
  state: SingularityState;
  /** Render size in px. Defaults to 280. */
  size?: number;
}

// Four organic blob paths, all centered on (0,0) with r≈40.
// Cycling through these gives the orb its "alive" morph.
const BLOB_PATHS = [
  "M 38,0 C 38,14 28,36 0,38 C -26,38 -38,22 -38,2 C -38,-18 -22,-40 0,-38 C 22,-38 38,-18 38,0 Z",
  "M 40,-4 C 42,12 30,34 4,38 C -20,40 -40,26 -36,0 C -32,-24 -14,-40 6,-40 C 24,-40 38,-22 40,-4 Z",
  "M 36,6 C 38,22 22,38 -2,40 C -28,40 -40,18 -38,-4 C -36,-28 -16,-38 8,-36 C 26,-34 34,-14 36,6 Z",
  "M 40,2 C 38,20 26,40 2,40 C -24,40 -40,18 -38,-6 C -36,-28 -20,-40 2,-40 C 22,-40 42,-18 40,2 Z",
];

const STATE_COLOR = {
  idle: {
    core: "#10b981", // emerald-500
    halo: "rgba(16, 185, 129, 0.35)",
    inner: "#6ee7b7", // emerald-300
  },
  listening: {
    core: "#14b8a6", // teal-500
    halo: "rgba(20, 184, 166, 0.5)",
    inner: "#99f6e4", // teal-200
  },
  thinking: {
    core: "#8b5cf6", // violet-500
    halo: "rgba(139, 92, 246, 0.55)",
    inner: "#c4b5fd", // violet-300
  },
  responding: {
    core: "#10b981",
    halo: "rgba(16, 185, 129, 0.55)",
    inner: "#a7f3d0",
  },
} as const;

// Separate duration map so we can derive shorter secondary durations
// (inner halo = 0.75× main pulse) without casting Framer's Transition.
const PULSE_DURATION: Record<SingularityState, number> = {
  idle: 4.5,
  listening: 2.2,
  thinking: 1.4,
  responding: 3,
};

const MORPH_DURATION: Record<SingularityState, number> = {
  idle: 10,
  listening: 7,
  thinking: 4,
  responding: 8,
};

function pulseTransition(state: SingularityState): Transition {
  return {
    duration: PULSE_DURATION[state],
    repeat: Infinity,
    ease: "easeInOut",
  };
}

function morphTransition(state: SingularityState): Transition {
  return {
    duration: MORPH_DURATION[state],
    repeat: Infinity,
    ease: "easeInOut",
  };
}

export function Singularity({ state, size = 280 }: SingularityProps) {
  const color = STATE_COLOR[state];

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer ambient glow — CSS-filter blur on a radial gradient.
          Scales with state intensity. */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color.halo} 0%, transparent 70%)`,
          filter: "blur(30px)",
        }}
        animate={{
          scale: state === "thinking" ? [1, 1.3, 1] : [1, 1.15, 1],
          opacity: state === "idle" ? [0.5, 0.8, 0.5] : [0.7, 1, 0.7],
        }}
        transition={pulseTransition(state)}
      />

      {/* Middle halo — sharper rim */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color.halo} 20%, transparent 65%)`,
          filter: "blur(12px)",
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: PULSE_DURATION[state] * 0.75,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Radiating rings during thinking — expand outward, fade out */}
      {state === "thinking" && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: color.halo }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 2, opacity: [0, 0.5, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}

      {/* Main morphing blob — the orb's "body". Uses an SVG gradient
          so the surface has iridescent depth, not flat fill. */}
      <svg
        viewBox="-50 -50 100 100"
        className="absolute inset-0"
        style={{ width: size, height: size }}
      >
        <defs>
          <radialGradient id={`orb-body-${state}`} cx="35%" cy="35%">
            <stop offset="0%" stopColor={color.inner} stopOpacity="0.95" />
            <stop offset="55%" stopColor={color.core} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color.core} stopOpacity="0.55" />
          </radialGradient>
          <radialGradient id={`orb-shine-${state}`} cx="30%" cy="25%">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="40%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        <motion.path
          animate={{ d: BLOB_PATHS }}
          transition={morphTransition(state)}
          fill={`url(#orb-body-${state})`}
          initial={{ d: BLOB_PATHS[0] }}
        />

        {/* Specular highlight so the orb reads as volumetric */}
        <motion.path
          animate={{ d: BLOB_PATHS }}
          transition={morphTransition(state)}
          fill={`url(#orb-shine-${state})`}
          initial={{ d: BLOB_PATHS[0] }}
        />

        {/* Inner pulsing core */}
        <motion.circle
          r="8"
          fill="white"
          opacity="0.7"
          animate={{
            r: state === "thinking" ? [6, 12, 6] : [7, 10, 7],
            opacity: [0.5, 0.9, 0.5],
          }}
          transition={pulseTransition(state)}
        />
      </svg>
    </div>
  );
}
