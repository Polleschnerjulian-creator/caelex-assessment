import type { ScholarPlanspielScenario } from "./types";
import { ASI_REENTRY } from "./asi-reentry";

const SCENARIOS: ScholarPlanspielScenario[] = [ASI_REENTRY];

export function listScenarios(): ScholarPlanspielScenario[] {
  return SCENARIOS;
}

export function getScenarioById(id: string): ScholarPlanspielScenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}

export type {
  ScholarPlanspielScenario,
  ScholarPlanspielPhase,
  ScholarPlanspielRoleDef,
  ScholarRoleKey,
  ScholarArtifactKind,
  ScholarRubricCriterion,
  ScholarOperatorProfile,
} from "./types";
