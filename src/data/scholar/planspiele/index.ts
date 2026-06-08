import type { ScholarPlanspielScenario } from "./types";
import { ASI_REENTRY } from "./asi-reentry";
import { DE_LEO_EO } from "./de-leo-eo";
import { NIS2_INCIDENT } from "./nis2-orbit-cyber-incident";
import { INSURANCE_PLACEMENT_CLAIM } from "./insurance-placement-claim";
import { DE_BAFA_DUALUSE } from "./de-bafa-dualuse-export";
import { TCO_EQUIVALENCE } from "./tco-equivalence-eu";
import { ITU_COORDINATION } from "./itu-leo-coordination";

const SCENARIOS: ScholarPlanspielScenario[] = [
  ASI_REENTRY,
  DE_LEO_EO,
  NIS2_INCIDENT,
  INSURANCE_PLACEMENT_CLAIM,
  DE_BAFA_DUALUSE,
  TCO_EQUIVALENCE,
  ITU_COORDINATION,
];

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
