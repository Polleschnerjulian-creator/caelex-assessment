/**
 * Caelex Scholar — Planspiele scenario definition types.
 *
 * Scenarios live in CODE (like src/data/academy/scenarios.ts); only RUNS persist
 * (the Scholar* Prisma models). All human-facing strings are i18n KEYS resolved
 * at render time against the `planspiele-play` namespace via t(locale, NS, key)
 * — so a missing translation degrades to the EN fallback, never a blank.
 *
 * Strictly additive + Scholar-scoped. No frozen-surface coupling.
 */

export type ScholarRoleKey =
  | "operator"
  | "regulator"
  | "counsel"
  | "insurer"
  | "debris_stm"
  | "eu_body"
  | "ngo";

export type ScholarArtifactKind =
  | "authority_choice"
  | "application_form"
  | "cover_letter"
  | "deficiency_response";

/** A structured field on an engine-checkable artifact (P1/P2). */
export interface ScholarArtifactField {
  key: string;
  labelKey: string;
  type: "boolean" | "select" | "text";
  options?: string[];
}

export interface ScholarArtifactSpec {
  kind: ScholarArtifactKind;
  fields?: ScholarArtifactField[];
  /** cover_letter: minimum distinct provisions the student must cite. */
  minCitations?: number;
}

export interface ScholarRubricCriterion {
  key: string;
  labelKey: string;
  /** A phase's rubric weights MUST sum to 100 (enforced by scenarios.test.ts). */
  weight: number;
  /** Which scorer owns this criterion. */
  track: "engine" | "ai";
}

export interface ScholarPlanspielPhase {
  phaseKey: string; // == workflow state id
  order: number;
  titleKey: string;
  briefKey: string;
  artifact: ScholarArtifactSpec;
  citedSourceIds: string[]; // surfaced in the corpus rail (resolved READ-ONLY)
  citedCaseIds: string[];
  rubric: ScholarRubricCriterion[];
  /** Which role fires the phase-advance transition (operator submits, regulator approves). */
  advanceRequiresRole: ScholarRoleKey;
}

export interface ScholarPlanspielRoleDef {
  roleKey: ScholarRoleKey;
  nameKey: string;
  goalKey: string;
  briefKey: string; // public brief
  privateBriefKey: string; // role-private info (asymmetry)
}

/**
 * Operator profile feeding the EU Space Act engine for Track-1 grading.
 * Mirrors the src/data/academy/scenarios.ts operatorProfile shape so the
 * profile→answers mapping in scoring.server.ts matches the engine's contract.
 */
export interface ScholarOperatorProfile {
  activityType:
    | "spacecraft"
    | "launch_vehicle"
    | "launch_site"
    | "isos"
    | "data_provider";
  entitySize: "small" | "research" | "medium" | "large";
  establishment: "eu" | "third_country_eu_services" | "third_country_no_eu";
  primaryOrbit?: "LEO" | "MEO" | "GEO" | "beyond";
  operatesConstellation?: boolean;
  constellationSize?: number;
  isDefenseOnly?: boolean;
  hasPostLaunchAssets?: boolean;
  offersEUServices?: boolean;
}

export interface ScholarPlanspielScenario {
  id: string;
  titleKey: string;
  summaryKey: string;
  difficulty: "INTRO" | "INTERMEDIATE" | "ADVANCED";
  estimatedMinutes: number;
  jurisdiction: string; // ISO-ish code, e.g. "IT"
  module: string; // "debris" | "authorization" | "nis2" | ...
  roles: ScholarPlanspielRoleDef[];
  studentRole: ScholarRoleKey; // role the solo student plays
  aiRoles: ScholarRoleKey[]; // roles the AI plays in solo mode
  phases: ScholarPlanspielPhase[];
  operatorProfile: ScholarOperatorProfile;
}
