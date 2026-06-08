import { Check } from "lucide-react";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t, type ScholarLocale } from "../../_i18n/core";
import { PLANSPIELE_PLAY } from "../../_i18n/planspiele-play";

/**
 * PhaseStepper — named, numbered phase steps for the Planspiele cockpit.
 *
 * Replaces the thin `PhaseProgress` bar with a labelled stepper so the student
 * always sees WHERE they are in the workflow (Authority → Application → …).
 * SERVER component: presentational only, no hooks / no motion (motion lives in
 * the client islands). The caller pre-resolves each step's label + state.
 *
 * STRICTLY MONOCHROME — state is shown by FILL + GLYPH, never hue:
 *   • done     → filled gray-900 disc with a Check glyph (white).
 *   • current  → filled gray-900 disc with the step number (white), ring halo.
 *   • upcoming → outlined gray-300 disc with the step number (gray-500).
 * The connector line fills gray-900 up to the current step, gray-200 after.
 *
 * Accessibility:
 *   • Rendered as an ordered list with `aria-current="step"` on the active item.
 *   • The visible state (done/current/upcoming) is also announced via an
 *     sr-only label per step, so the glyph-only distinction is not the sole cue.
 *   • Decorative discs/connectors are aria-hidden; the <ol> carries the label.
 */
export interface PhaseStep {
  /** Pre-resolved, human-readable step label. */
  label: string;
  state: "done" | "current" | "upcoming";
}

export function PhaseStepper({
  steps,
  locale,
}: {
  steps: PhaseStep[];
  locale: ScholarLocale;
}) {
  if (steps.length === 0) return null;

  const stateLabel = (state: PhaseStep["state"]): string =>
    state === "done"
      ? t(locale, PLANSPIELE_PLAY, "play.step.done")
      : state === "current"
        ? t(locale, PLANSPIELE_PLAY, "play.step.current")
        : t(locale, PLANSPIELE_PLAY, "play.step.upcoming");

  return (
    <ol
      className="flex w-full items-start"
      aria-label={t(locale, PLANSPIELE_PLAY, "play.timeline")}
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const filled = step.state === "done" || step.state === "current";
        return (
          <li
            key={i}
            className={`flex items-start ${isLast ? "" : "flex-1"}`}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {/* Disc + connector */}
            <div className="flex flex-col items-center">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-caption font-semibold tabular-nums",
                  filled
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-500",
                  step.state === "current"
                    ? "ring-2 ring-gray-900 ring-offset-2 ring-offset-[#F7F8FA]"
                    : "",
                ].join(" ")}
                aria-hidden={true}
              >
                {step.state === "done" ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </span>
            </div>

            {/* Label + connector line to the next step */}
            <div className={`ml-2.5 ${isLast ? "" : "flex-1"} pt-0.5`}>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={
                    step.state === "upcoming"
                      ? `${SCHOLAR_TYPE.meta}`
                      : `text-small font-medium text-gray-900`
                  }
                >
                  {step.label}
                </span>
                <span className="sr-only">{stateLabel(step.state)}</span>
              </div>
              {!isLast && (
                <span
                  className={`mt-2 mr-2.5 block h-px ${
                    step.state === "done" ? "bg-gray-900" : "bg-gray-200"
                  }`}
                  aria-hidden={true}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
