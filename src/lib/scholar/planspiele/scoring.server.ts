import "server-only";
import type {
  ScholarPlanspielScenario,
  ScholarPlanspielPhase,
} from "@/data/scholar/planspiele/types";

/**
 * Shared rubric-line shape emitted by BOTH scoring tracks (engine + AI coach),
 * mirroring the Academy scorer's {category, weight, earned, correct, note} shape
 * so the monochrome results UI renders one table regardless of track.
 */
export interface RubricLine {
  category: string;
  weight: number;
  earned: number; // 0..weight
  correct: boolean;
  note: string; // i18n key (resolved in the UI) or a literal note
}

/**
 * The model answer key per scenario. Track-1 grades objective artifacts against
 * this deterministically (free, reproducible). Extend one entry per scenario.
 *
 * NOTE: for the MVP the answer key is declarative. Sprint 8 additionally wires the
 * real EU Space Act engine (calculateCompliance, READ-ONLY) into the cockpit's live
 * completeness readout; the unit-tested scorer here stays pure + DB-free.
 */
const ANSWER_KEY: Record<string, Record<string, unknown>> = {
  "asi-reentry-it": {
    authority: "ASI",
    mandatoryModules: ["insurance", "debrisPlan", "disposalPlan"],
    casualtyRisk: "<1e-4",
  },
};

/**
 * Track-1 — deterministic engine/answer-key scoring for a phase's objective
 * (track === "engine") rubric criteria. Free, reproducible, no external cost.
 */
export function scorePhaseEngine(
  scenario: ScholarPlanspielScenario,
  phase: ScholarPlanspielPhase,
  answer: Record<string, unknown>,
): RubricLine[] {
  const key = ANSWER_KEY[scenario.id] ?? {};
  const lines: RubricLine[] = [];

  for (const crit of phase.rubric) {
    if (crit.track !== "engine") continue;

    if (crit.key === "authority_correct") {
      const correct = answer.authority === key.authority;
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: correct ? crit.weight : 0,
        correct,
        note: correct ? "asi.fb.authority.ok" : "asi.fb.authority.wrong",
      });
    } else if (crit.key === "mandatory_modules") {
      const required = (key.mandatoryModules as string[]) ?? [];
      const present = required.filter((m) => answer[m] === true).length;
      const ratio = required.length ? present / required.length : 0;
      const earned = Math.round(ratio * crit.weight);
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned,
        correct: required.length > 0 && present === required.length,
        note:
          present === required.length
            ? "asi.fb.modules.ok"
            : "asi.fb.modules.partial",
      });
    } else if (crit.key === "casualty_threshold") {
      const correct = answer.casualtyRisk === key.casualtyRisk;
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: correct ? crit.weight : 0,
        correct,
        note: correct ? "asi.fb.casualty.ok" : "asi.fb.casualty.wrong",
      });
    } else {
      // Unknown engine criterion — score 0 but never crash (defensive).
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: 0,
        correct: false,
        note: "",
      });
    }
  }
  return lines;
}

/** Convenience: total earned / total weight across a set of rubric lines (0..1). */
export function rubricRatio(lines: RubricLine[]): number {
  const total = lines.reduce((a, l) => a + l.weight, 0);
  if (!total) return 0;
  const earned = lines.reduce((a, l) => a + l.earned, 0);
  return earned / total;
}
