"use client";

/**
 * ControlContextWindow — the animated "Warum sehe ich das" panel that
 * sits at the top of an expanded control card.
 *
 * Three beats reveal in sequence, character-by-character, matching the
 * rhythm of the landing-page MissionStatement. Every beat has a tiny
 * label badge so the reader knows which question is being answered.
 *
 * The text itself comes pre-built from `buildControlContext()` so this
 * component stays presentational — no data fetching, no string
 * templating at render time.
 */

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedReveal } from "./AnimatedReveal";

export interface ControlContext {
  wieso: string;
  weshalb: string;
  warum: string;
}

interface ControlContextWindowProps {
  context: ControlContext;
  /** Optional small badge above the window to hint at the trust layer
   *  (e.g. "Deterministic · Regulatory"). Rendered only when provided. */
  originBadge?: React.ReactNode;
  /** Suppresses the leading divider line — use when the window is the
   *  first element inside its container. */
  hideTopRule?: boolean;
}

// Fixed beat delays so each paragraph starts staggered — feels like
// three thoughts instead of one wall of text.
const WIESO_START_DELAY = 0.05;
const WESHALB_START_DELAY = 1.25;
const WARUM_START_DELAY = 2.45;

const LABEL_STYLE =
  "block text-[11px] tracking-wide text-[var(--text-tertiary)] mb-1.5";

const BODY_STYLE =
  "text-[15px] leading-[1.6] text-[var(--text-secondary)] font-normal";

export function ControlContextWindow({
  context,
  originBadge,
  hideTopRule,
}: ControlContextWindowProps) {
  const reduced = useReducedMotion();

  return (
    <motion.section
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }
      }
      // No boxed background, no border — pure editorial text flow.
      // Matches Doc-Generator body aesthetic.
      className={hideTopRule ? "" : "mt-2"}
      aria-label="Control context"
    >
      {originBadge && <div className="mb-5">{originBadge}</div>}

      <div className="space-y-7">
        {/* Beat 1 — WIESO */}
        <div>
          <span className={LABEL_STYLE}>Why does this exist</span>
          <AnimatedReveal
            text={context.wieso}
            startDelay={WIESO_START_DELAY}
            className={BODY_STYLE}
          />
        </div>

        {/* Beat 2 — WESHALB */}
        <div>
          <span className={LABEL_STYLE}>What it protects against</span>
          <AnimatedReveal
            text={context.weshalb}
            startDelay={WESHALB_START_DELAY}
            className={BODY_STYLE}
          />
        </div>

        {/* Beat 3 — WARUM */}
        <div>
          <span className={LABEL_STYLE}>Why it applies to you</span>
          <AnimatedReveal
            text={context.warum}
            startDelay={WARUM_START_DELAY}
            className={BODY_STYLE}
          />
        </div>
      </div>
    </motion.section>
  );
}

export default ControlContextWindow;
