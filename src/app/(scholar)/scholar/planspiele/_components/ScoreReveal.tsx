"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  animate,
} from "framer-motion";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";

/**
 * ScoreReveal — the payoff number. Animated count-up of a 0..100 score with a
 * monochrome fill bar beneath it.
 *
 * CLIENT island. The count-up uses framer-motion's `animate()` driving a
 * `useMotionValue`; a subscription mirrors the rounded value into React state
 * for the visible digits, and the bar width tweens in parallel.
 *
 * Reduced-motion: when the user opts out (`useReducedMotion()`), the number and
 * bar render at their final value instantly — no tween, no flash.
 *
 * STRICTLY MONOCHROME: gray-900 fill on a gray-200 track; digits gray-900.
 * Status/quality is conveyed by the fill length + the number, never by hue.
 *
 * Accessibility:
 *   • The number is wrapped in a `role="img"` element with an aria-label of the
 *     final value (+ optional label), so AT announces the result once, not every
 *     animation frame. The animated digits themselves are aria-hidden.
 *   • The bar is aria-hidden decoration (the labelled number carries the value).
 */
export function ScoreReveal({
  value,
  label,
  /** Animation duration in seconds (count-up + bar). Ignored under reduced motion. */
  durationSeconds = 0.9,
}: {
  value: number;
  label?: string;
  durationSeconds?: number;
}) {
  const reduce = useReducedMotion();
  // Clamp + round to a clean 0..100 integer for display.
  const target = Math.max(0, Math.min(100, Math.round(value)));

  const mv = useMotionValue(reduce ? target : 0);
  const [display, setDisplay] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      mv.set(target);
      setDisplay(target);
      return;
    }
    const unsubscribe = mv.on("change", (v) => setDisplay(Math.round(v)));
    const controls = animate(mv, target, {
      duration: durationSeconds,
      ease: "easeOut",
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
    // Re-run if the target changes (e.g. recomputed score).
  }, [target, reduce, durationSeconds, mv]);

  const ariaValue = label ? `${label}: ${target}` : `${target}`;

  return (
    <div>
      <div
        className="flex items-baseline gap-1"
        role="img"
        aria-label={ariaValue}
      >
        <span
          className="text-display-sm font-semibold tabular-nums tracking-tight text-gray-900"
          aria-hidden={true}
        >
          {display}
        </span>
        <span
          className="text-title font-medium text-gray-500"
          aria-hidden={true}
        >
          / 100
        </span>
      </div>

      {label && <p className={`mt-0.5 ${SCHOLAR_TYPE.meta}`}>{label}</p>}

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
        aria-hidden={true}
      >
        <motion.div
          className="h-1.5 rounded-full bg-gray-900"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${target}%` }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: durationSeconds, ease: "easeOut" }
          }
        />
      </div>
    </div>
  );
}
