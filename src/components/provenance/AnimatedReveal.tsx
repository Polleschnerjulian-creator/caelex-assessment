"use client";

/**
 * AnimatedReveal — mirrors the landing-page MissionStatement animation.
 *
 * Fades each character from (opacity:0, y:8) → (opacity:1, y:0) with a
 * small per-character delay. Same timing constants as the landing page
 * so the two motion styles feel like one brand.
 *
 * Behaviour:
 *   - Only animates once per mount (children becoming visible)
 *   - Respects prefers-reduced-motion
 *   - Accepts multiple "beats" of text (array) with configurable
 *     delay between beats so you can stagger paragraphs
 *
 * Layout notes:
 *   - Wraps words in non-breaking <span> so line-breaks only happen on
 *     whole-word boundaries (matches the landing pattern)
 *   - No monospace, no tabular-nums — pure display text
 */

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const CHAR_DELAY = 0.01; // seconds per character (slightly slower than
// landing's 0.006 — context windows are
// denser than a single hero sentence).
const BEAT_PAUSE = 0.35; // pause between beats (seconds).

interface AnimatedRevealProps {
  /** A single string, or an array of paragraph strings ("beats").
   *  When an array is passed each beat reveals in sequence with a
   *  short pause. */
  text: string | string[];
  /** Optional starting delay in seconds — useful when revealing
   *  multiple AnimatedReveal blocks in a stack. */
  startDelay?: number;
  /** Tailwind className applied to the outer paragraph block. */
  className?: string;
  /** If true, reveal every time the element enters the viewport.
   *  Default: once. */
  repeat?: boolean;
  /** Visual label for screen readers / fallback — defaults to the
   *  concatenated text. */
  ariaLabel?: string;
}

export function AnimatedReveal({
  text,
  startDelay = 0,
  className = "",
  repeat = false,
  ariaLabel,
}: AnimatedRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: !repeat, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();

  const beats = Array.isArray(text) ? text : [text];
  const fullText = beats.join("  ·  ");

  let globalCharIndex = 0;

  return (
    <p ref={ref} className={className} aria-label={ariaLabel ?? fullText}>
      {beats.map((beat, beatIdx) => {
        const words = beat.split(" ");
        const beatStartDelay = startDelay + beatIdx * BEAT_PAUSE;

        return (
          <span key={`beat-${beatIdx}`} className="inline" aria-hidden="true">
            {words.map((word, wordIdx) => {
              const chars = word.split("");

              const wordSpan = (
                <span
                  key={`w-${beatIdx}-${wordIdx}`}
                  className="inline-block whitespace-nowrap"
                >
                  {chars.map((char, charIdx) => {
                    const idx = globalCharIndex++;
                    const charDelay = beatStartDelay + idx * CHAR_DELAY;
                    return (
                      <motion.span
                        key={`c-${beatIdx}-${wordIdx}-${charIdx}`}
                        className="inline-block"
                        initial={
                          prefersReducedMotion
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0, y: 8 }
                        }
                        animate={
                          isInView
                            ? { opacity: 1, y: 0 }
                            : prefersReducedMotion
                              ? { opacity: 1, y: 0 }
                              : { opacity: 0, y: 8 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : {
                                duration: 0.03,
                                delay: charDelay,
                                ease: "easeOut",
                              }
                        }
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </span>
              );

              // Add a trailing space between words inside the beat.
              if (wordIdx < words.length - 1) {
                const spaceIdx = globalCharIndex++;
                return (
                  <span key={`ws-${beatIdx}-${wordIdx}`}>
                    {wordSpan}
                    <motion.span
                      className="inline-block"
                      initial={
                        prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }
                      }
                      animate={
                        isInView
                          ? { opacity: 1 }
                          : prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: 0 }
                      }
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : {
                              duration: 0.01,
                              delay: beatStartDelay + spaceIdx * CHAR_DELAY,
                            }
                      }
                    >
                      &nbsp;
                    </motion.span>
                  </span>
                );
              }

              return wordSpan;
            })}
            {/* Gap between beats */}
            {beatIdx < beats.length - 1 && <span>&nbsp;&nbsp;</span>}
          </span>
        );
      })}
    </p>
  );
}

export default AnimatedReveal;
