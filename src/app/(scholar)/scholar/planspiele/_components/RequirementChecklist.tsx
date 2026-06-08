"use client";

import { Check, Circle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { type ScholarLocale } from "../../_i18n/core";
import { playT } from "../../_i18n/planspiele-play";

/**
 * RequirementChecklist — the live "what this artifact needs" panel.
 *
 * PRESENTATIONAL CLIENT island: the Cockpit computes the rows via
 * `deriveRequirements(phase, answer)` (pure), resolves each `labelKey` through
 * `playT`, and passes the finished `items` here. This component owns only the
 * rendering + the met-tick micro-motion. It never reads scenario data and never
 * decides correctness.
 *
 * STRICTLY MONOCHROME — met-state is glyph + weight, never hue:
 *   • met   → filled gray-900 Check, label gray-900.
 *   • unmet → hollow gray-300 Circle, label gray-500.
 *
 * Motion: a met row's glyph does a subtle scale/opacity pop on mount/flip.
 * Respects prefers-reduced-motion via `useReducedMotion()` → renders the static
 * end-state (no animation) when the user opts out.
 *
 * Accessibility:
 *   • <ul role="list"> with one <li> per requirement.
 *   • The met/unmet state is announced per row via an sr-only label so the
 *     glyph-only cue is not the sole signal.
 *   • Glyphs are aria-hidden (the sr-only text carries the state).
 */
export interface ChecklistItem {
  /** Pre-resolved label (placeholders already filled by the caller). */
  label: string;
  met: boolean;
  /** Optional pre-formatted progress detail, e.g. "1/2". */
  detail?: string;
}

export function RequirementChecklist({
  items,
  locale,
  title,
}: {
  items: ChecklistItem[];
  locale: ScholarLocale;
  /** Optional pre-resolved heading; omit to render the list bare. */
  title?: string;
}) {
  const reduce = useReducedMotion();
  if (items.length === 0) return null;

  const metLabel = playT(locale, "play.met");
  const notMetLabel = playT(locale, "play.notMet");

  return (
    <div>
      {title && <h3 className={SCHOLAR_TYPE.metaLabel}>{title}</h3>}
      <ul className={`${title ? "mt-3" : ""} space-y-2.5`} role="list">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-shrink-0" aria-hidden={true}>
              {item.met ? (
                <motion.span
                  // Pop only when motion is allowed; otherwise static.
                  initial={reduce ? false : { scale: 0.6, opacity: 0.4 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="block"
                >
                  <Check
                    size={16}
                    strokeWidth={2.5}
                    className="text-gray-900"
                  />
                </motion.span>
              ) : (
                <Circle
                  size={16}
                  strokeWidth={1.75}
                  className="text-gray-300"
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className={
                  item.met
                    ? "text-small text-gray-900"
                    : "text-small text-gray-500"
                }
              >
                {item.label}
                {item.detail && (
                  <span className="ml-1.5 tabular-nums text-gray-500">
                    ({item.detail})
                  </span>
                )}
              </span>
              <span className="sr-only">
                {item.met ? metLabel : notMetLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
