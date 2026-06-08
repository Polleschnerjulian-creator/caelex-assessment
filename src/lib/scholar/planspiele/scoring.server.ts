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
 * Track-1 — deterministic engine/answer-key scoring for a phase's objective
 * (track === "engine") rubric criteria. Free, reproducible, no external cost.
 *
 * Fully DATA-DRIVEN: every grading rule comes from `scenario.answerKey[crit.key]`,
 * so adding a new scenario needs ZERO code here — just data. Three rule types
 * (exactMatch / allOf / timing) cover the whole slate; an unknown/missing entry
 * scores 0 defensively (never throws).
 */
export function scorePhaseEngine(
  scenario: ScholarPlanspielScenario,
  phase: ScholarPlanspielPhase,
  answer: Record<string, unknown>,
): RubricLine[] {
  const ak = scenario.answerKey ?? {};
  const lines: RubricLine[] = [];

  for (const crit of phase.rubric) {
    if (crit.track !== "engine") continue;
    const entry = ak[crit.key];

    if (!entry) {
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: 0,
        correct: false,
        note: "",
      });
      continue;
    }

    if (entry.type === "exactMatch") {
      const correct = answer[entry.field] === entry.expected;
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: correct ? crit.weight : 0,
        correct,
        note: correct ? entry.okNote : entry.wrongNote,
      });
    } else if (entry.type === "allOf") {
      const present = entry.fields.filter((f) => answer[f] === true).length;
      const ratio = entry.fields.length ? present / entry.fields.length : 0;
      const correct =
        entry.fields.length > 0 && present === entry.fields.length;
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: Math.round(ratio * crit.weight),
        correct,
        note: correct ? entry.okNote : entry.partialNote,
      });
    } else {
      // timing: each on-time part contributes an equal share of the weight.
      const share = entry.parts.length ? crit.weight / entry.parts.length : 0;
      let raw = 0;
      let allOk = true;
      for (const p of entry.parts) {
        if (answer[p.field] === p.expected) raw += share;
        else allOk = false;
      }
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: Math.round(raw),
        correct: allOk,
        note: allOk ? entry.okNote : entry.partialNote,
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
