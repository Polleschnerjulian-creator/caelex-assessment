import { describe, it, expect } from "vitest";
import { listScenarios } from "@/data/scholar/planspiele/index";
import type {
  ScholarPlanspielScenario,
  ScholarPlanspielPhase,
} from "@/data/scholar/planspiele/types";
import { scorePhaseEngine } from "./scoring.server";

/**
 * Build the "model" (perfect) answer for a phase from the scenario's answerKey,
 * so every engine-track criterion should score full credit. This proves — across
 * EVERY scenario — that each engine criterion has a working answerKey entry (no
 * silent earned:0 fall-through) and that the generic scorer handles every rule type.
 */
function modelAnswer(
  scenario: ScholarPlanspielScenario,
  phase: ScholarPlanspielPhase,
): Record<string, unknown> {
  const ak = scenario.answerKey ?? {};
  const answer: Record<string, unknown> = {};
  for (const crit of phase.rubric) {
    if (crit.track !== "engine") continue;
    const entry = ak[crit.key];
    if (!entry) continue;
    if (entry.type === "exactMatch") {
      answer[entry.field] = entry.expected;
    } else if (entry.type === "allOf") {
      for (const f of entry.fields) answer[f] = true;
    } else {
      for (const p of entry.parts) answer[p.field] = p.expected;
    }
  }
  return answer;
}

describe("slate engine scoring — model answers earn full credit", () => {
  for (const scenario of listScenarios()) {
    it(`${scenario.id}: every engine criterion has a working answerKey + full credit on the model answer`, () => {
      for (const phase of scenario.phases) {
        const engineCrits = phase.rubric.filter((r) => r.track === "engine");
        if (engineCrits.length === 0) continue;
        const lines = scorePhaseEngine(
          scenario,
          phase,
          modelAnswer(scenario, phase),
        );
        // No engine criterion may be missing an answerKey entry.
        expect(
          lines.length,
          `${scenario.id}/${phase.phaseKey}: engine line count`,
        ).toBe(engineCrits.length);
        for (const line of lines) {
          expect(
            line.correct,
            `${scenario.id}/${phase.phaseKey}/${line.category}: correct`,
          ).toBe(true);
          expect(
            line.earned,
            `${scenario.id}/${phase.phaseKey}/${line.category}: full credit`,
          ).toBe(line.weight);
        }
      }
    });
  }
});
