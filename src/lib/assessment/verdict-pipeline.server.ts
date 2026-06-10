/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SERVER-ONLY Verdict Pipeline — the spine of the ultimate operator assessment
 * (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 1.9).
 *
 * Composes the Phase-1 foundation modules into ONE verdict path:
 *
 *   (1) validateSubmission + detectContradictions  → throw, never a verdict
 *       (honesty invariant 3: an empty/partial payload is a 422 naming the
 *        missing questions).
 *   (2) evaluateApplicabilityGates — hard out-of-scope short-circuits with
 *       the cited gate finding; the soft launch-timing gate short-circuits
 *       but keeps the contested-date flux scenario visible.
 *   (3) classifyNIS2Gateway FIRST (§5 stage 2) — before the Space Act engine.
 *       The cyber-cluster ROUTING finding always carries the
 *       `cyberArchitecture` flux flag (§7.1 #2 — the routing itself is
 *       contested, never a silent default).
 *   (4) determineLightRegime (real Art 10 eligibility, Task 1.8).
 *   (5) per-role `calculateCompliance()` → `mergeMultiActivityResults()` —
 *       the EXISTING engines, kept and composed, never forked.
 *   (6) national space-law engines for HELD (Q4.4) + CONSIDERED (Q4.5)
 *       jurisdictions; a UK-engine delegation failure becomes a VISIBLE
 *       fidelity flag (`degraded_generic_fallback`) on the UK jurisdiction
 *       finding — never a silent catch-and-fallback (§3 [d]).
 *   (7) cluster mapping — module statuses → clusters PLUS the new clusters:
 *       incident-reporting (NIS2 24h/72h/1-month chain + Space Act occurrence
 *       notification + ITU harmful interference + NATIONAL incident duties
 *       FR/UK on jurisdiction nexus, §7.2), transfer (Q4.10), UN registration
 *       (Q4.9), spectrum (Q9.1–Q9.3 — finally invoking the spectrum engine),
 *       export-control/sanctions (Q9.4–Q9.7), insurance (named national
 *       minimums only — NO fabricated "Art 48 TPL calculation").
 *       DETERMINED/PROBABLE findings get `evidenceExamples` from
 *       `CLUSTER_EVIDENCE_EXAMPLES` (per CLUSTER, not per question, §6 (2)).
 *   (8) unknowns extraction from every `unsure` + gateway clarification.
 *
 * HONESTY INVARIANTS (cross-cutting; unit-tested in verdict-pipeline.server.test.ts):
 *   - Tri-state answers; `{state:"unsure"}` is THE unsure storage (Task 1.3).
 *   - Unknown rounds UP — an unsure can only widen obligations / lower
 *     confidence, never produce a cleaner verdict.
 *   - NO fabricated findings: empty lookups yield "none identified"
 *     (`noneIdentifiedOverlaps`), never hardcoded fallbacks.
 *   - Every finding cites legal basis + the rulebook semver.
 *   - NO overall score: no key in `ObligationMapResult` matches /score/i.
 *
 * QUESTION-ID CONTRACT: ids the plan pins verbatim (q1_9_defense_exclusivity,
 * q3_6_launch_timing, q4_3_ground_segment, q4_10_transfer_change_of_control,
 * q9_7_sanctions_screening, …) are referenced exactly. For §4 catalog numbers
 * whose full id suffix the plan does NOT pin (Q2.1, Q3.1, Q4.8, Q4.9,
 * Q9.1–Q9.6), the catalog NUMBER is the stable contract: lookups prefer the
 * canonical id chosen here and fall back to the unique answer key carrying
 * the `qN_M_` prefix — so a dataset-lane suffix variation cannot silently
 * drop a duty (documented; see findCatalogAnswer).
 */

import "server-only";

import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";
import {
  determinedFinding,
  indeterminateFinding,
  isFindingComplete,
  deriveConfidence,
  type AssessmentFinding,
  type ClusterId,
  type FindingConfidence,
  type FindingSource,
  type FindingVerdict,
} from "@/lib/assessment/finding";
import {
  validateSubmission,
  detectContradictions,
  type Contradiction,
  type SubmissionError,
} from "@/lib/assessment/graph-evaluator";
import type { QuestionNode } from "@/data/assessment/question-graph-types";
import { RULEBOOK, CONTESTED_POSITIONS } from "@/data/assessment/rulebook";
import { evaluateApplicabilityGates } from "@/lib/assessment/applicability-gates.server";
import {
  classifyNIS2Gateway,
  gatewayInputFromAnswers,
  type NIS2GatewayClassification,
  type NIS2GatewayResult,
} from "@/lib/assessment/nis2-gateway.server";
import {
  determineLightRegime,
  type RegimeResult,
} from "@/lib/assessment/regime-eligibility.server";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
} from "@/lib/engine.server";
import {
  mergeMultiActivityResults,
  type MergedSpaceActResult,
} from "@/lib/unified-engine-merger.server";
import { calculateSpaceLawCompliance } from "@/lib/space-law-engine.server";
// Task 3.2/3.7 wiring — full-tier readiness bands, credit map, dated roadmap.
import {
  computeReadiness,
  readinessUnsureQuestionIds,
  type ClusterReadiness,
} from "@/lib/assessment/readiness.server";
import {
  computeCreditMap,
  type CreditMapping,
} from "@/lib/assessment/credit-map.server";
import {
  computeRoadmap,
  type RoadmapItem,
} from "@/lib/assessment/roadmap.server";
import type {
  SpaceLawAssessmentAnswers,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";
import { getApplicableSpectrumRequirements } from "@/lib/spectrum-engine.server";
import type {
  SpectrumProfile,
  OrbitType as SpectrumOrbitType,
} from "@/data/spectrum-itu-requirements";
import type { ActivityType, AssessmentAnswers } from "@/lib/types";
import { MODULES } from "@/data/modules";

// ─── Public contract (plan Task 1.9 — other lanes implement against this) ───

export interface ObligationCluster {
  id: ClusterId;
  label: string;
  findings: AssessmentFinding[];
  counts: {
    applicable: number;
    conditional: number;
    contested: number;
    advisory: number;
  };
}

export interface UnknownToResolve {
  questionId: string;
  question: string;
  whatAnsweringChanges: string; // §6 (3): prioritized unknowns
  priority: "high" | "medium"; // spectrum-existential unknowns = high (§4 Q9.2)
}

export interface ObligationMapResult {
  rulebookVersion: string;
  computedAt: string;
  tier: "quick" | "full";
  scope: AssessmentFinding[]; // gate verdicts incl. dual-use notes
  nis2Gateway: AssessmentFinding<NIS2GatewayClassification>;
  regime: RegimeResult["finding"];
  clusters: ObligationCluster[];
  crossFrameworkOverlaps: {
    area: string;
    euSpaceActRef: string;
    nis2Ref: string;
  }[];
  noneIdentifiedOverlaps: boolean; // honest "none identified" (invariant 4)
  unknowns: UnknownToResolve[];
  aggregationDisclosures: string[]; // heterogeneous-fleet most-restrictive notes
  contradictions: Contradiction[]; // non-empty blocks the verdict upstream
  // ── Full tier only (Task 3.2 wiring) — per-cluster bands, never a score ──
  readiness?: ClusterReadiness[];
  creditMap?: CreditMapping[];
  roadmap?: RoadmapItem[];
  /** The engine's own per-module statuses (Task 3.5): the SINGLE source the
   *  dashboard import derives ArticleStatus rows from — applicability is
   *  never recomputed from a second dataset. */
  spaceActModules?: {
    id: string;
    status: "required" | "simplified" | "recommended" | "not_applicable";
  }[];
}

export class SubmissionInvalidError extends Error {
  constructor(public errors: SubmissionError[]) {
    super("assessment submission invalid");
    this.name = "SubmissionInvalidError";
  }
}

/** Contradictory answers block the verdict (stage 1) — named pair, never a verdict. */
export class ContradictionError extends Error {
  constructor(public contradictions: Contradiction[]) {
    super("assessment answers contradict each other");
    this.name = "ContradictionError";
  }
}

/** §3 [d]: jurisdiction findings carry their computation fidelity VISIBLY. */
export type JurisdictionFidelity = "full" | "degraded_generic_fallback";

export interface JurisdictionFindingValue {
  jurisdiction: string; // upper-case country code
  nexus: "held_license" | "considered";
  fidelity: JurisdictionFidelity;
}

/**
 * Injectable dependencies (defaults = the real modules). The plan's pipeline
 * tests assert ordering via injected spies; the question graph default is
 * loaded lazily so this module composes cleanly while the dataset lane
 * (Tasks 1.5/1.6) lands in parallel.
 */
export interface VerdictPipelineDeps {
  graph?: readonly QuestionNode[];
  evaluateGates?: typeof evaluateApplicabilityGates;
  gatewayInput?: typeof gatewayInputFromAnswers;
  classifyGateway?: typeof classifyNIS2Gateway;
  determineRegime?: typeof determineLightRegime;
  loadSpaceActData?: typeof loadSpaceActDataFromDisk;
  calculateCompliance?: typeof calculateCompliance;
  mergeResults?: typeof mergeMultiActivityResults;
  calculateSpaceLaw?: typeof calculateSpaceLawCompliance;
  getSpectrumRequirements?: typeof getApplicableSpectrumRequirements;
  /** Probes the UK Space Industry Act engine delegation; a throw marks the UK
   *  jurisdiction finding `degraded_generic_fallback` (§3 [d]). */
  ukProbe?: () => Promise<void>;
}

// ─── Cluster labels + evidence examples (§6 (2): per CLUSTER, ENISA-style) ───

export const CLUSTER_LABELS: Record<ClusterId, string> = {
  authorization_registration: "Authorisation & registration",
  transfer_change_of_control: "Transfer & change of control",
  debris_safety: "Debris mitigation & space safety",
  resilience_cyber: "Resilience & cybersecurity",
  incident_reporting: "Incident reporting",
  environment: "Environment",
  insurance_liability: "Insurance & liability",
  supervision_penalties: "Supervision & penalties",
  spectrum_itu: "Spectrum & ITU",
  export_control_sanctions: "Export control & sanctions",
  un_registration: "UN registration",
};

/** "What a supervisor would accept" — short examples per obligation CLUSTER
 *  (not per question). Attached to DETERMINED/PROBABLE findings only;
 *  INDETERMINATE findings carry none (the gap is explained instead). */
export const CLUSTER_EVIDENCE_EXAMPLES: Record<ClusterId, string[]> = {
  authorization_registration: [
    "National licence or application reference",
    "Registry extract for each registered space object",
    "Authorisation-condition compliance file (correspondence with the NCA)",
  ],
  transfer_change_of_control: [
    "Draft transfer/consent application to the licensing authority",
    "Change-of-control notification correspondence",
    "Transaction document clause conditioning closing on regulatory consent",
  ],
  debris_safety: [
    "Debris-mitigation plan submitted/approved",
    "Casualty-risk assessment",
    "Passivation design evidence",
  ],
  resilience_cyber: [
    "Board-approved risk-management policy",
    "Incident-response runbook covering the 24h/72h/1-month chain",
    "Access-control matrix",
  ],
  incident_reporting: [
    "Incident-notification procedure naming the CSIRT/NCA contact points",
    "24h early-warning / 72h notification / 1-month final-report templates",
    "Post-incident report archive",
  ],
  environment: [
    "Environmental-footprint assessment or launch-site EIA report",
    "Mitigation-measures register",
    "Consultation record with the competent environmental authority",
  ],
  insurance_liability: [
    "Third-party-liability policy schedule split by launch phase vs in-orbit",
    "Broker confirmation against the named national minimum",
    "State-guarantee / indemnification correspondence",
  ],
  supervision_penalties: [
    "Supervision contact register and NCA correspondence file",
    "Compliance-monitoring calendar",
    "Records-retention file evidencing periodic reporting duties",
  ],
  spectrum_itu: [
    "ITU filing reference (API / coordination / notification stage)",
    "National frequency assignments and landing-rights licences per market",
    "Frequency-coordination agreements",
  ],
  export_control_sanctions: [
    "Export-classification matrix (EU dual-use / ITAR / EAR)",
    "End-user and sanctions screening procedure with screening logs",
    "Export licences / authorisations on file",
  ],
  un_registration: [
    "National registry entry extract",
    "UN register submission reference (UNOOSA)",
    "Registration-data change notifications",
  ],
};

// ─── Question-id contract ────────────────────────────────────────────────────

// Plan-pinned ids (exact).
const Q_ROLES = "q1_1_roles";
const Q_ESTABLISHMENT = "q1_2_establishment";
const Q_ORG_TYPE = "q1_4_org_type";
const Q_HEADCOUNT = "q1_5_headcount";
const Q_EU_NEXUS = "q4_1_eu_nexus";
const Q_GROUND_SEGMENT = "q4_3_ground_segment";
const Q_LICENSES_HELD = "q4_4_licenses_held";
const Q_CONSIDERED = "q4_5_considered_jurisdictions";
const Q_TRANSFER = "q4_10_transfer_change_of_control";
const Q_SANCTIONS = "q9_7_sanctions_screening";

// Canonical ids chosen here for §4 catalog numbers the plan does not pin in
// full (the catalog number prefix is the durable contract — see header).
const Q_SPACECRAFT_COUNT = "q2_1_spacecraft_count"; // prefix q2_1
const Q_ORBITS = "q3_1_orbital_regimes"; // prefix q3_1
const Q_LAUNCHING_STATE = "q4_8_launching_state"; // prefix q4_8
const Q_UN_REGISTRATION = "q4_9_un_registration"; // prefix q4_9
const Q_RF_USE = "q9_1_rf_spectrum"; // prefix q9_1
const Q_ITU_FILING = "q9_2_itu_filing"; // prefix q9_2
const Q_LANDING_RIGHTS = "q9_3_landing_rights"; // prefix q9_3
const Q_US_ORIGIN = "q9_4_us_origin"; // prefix q9_4
const Q_DUAL_USE = "q9_5_dual_use"; // prefix q9_5
const Q_DEEMED_EXPORT = "q9_6_deemed_export"; // prefix q9_6

function catalogPrefixOf(canonicalId: string): string {
  // "q2_1_spacecraft_count" → "q2_1"
  const parts = canonicalId.split("_");
  return `${parts[0]}_${parts[1]}`;
}

/** Prefer the canonical id; fall back to the unique key carrying the same
 *  §4 catalog-number prefix. Deterministic: first matching key in map order. */
function findCatalogAnswer(
  answers: AnswerMap,
  canonicalId: string,
): { id: string; answer: TriStateAnswer } | undefined {
  const direct = answers[canonicalId];
  if (direct !== undefined) return { id: canonicalId, answer: direct };
  const prefix = `${catalogPrefixOf(canonicalId)}_`;
  for (const [id, answer] of Object.entries(answers)) {
    if (id.startsWith(prefix)) return { id, answer };
  }
  return undefined;
}

function catalogAnsweredValue(
  answers: AnswerMap,
  canonicalId: string,
): string | string[] | boolean | number | undefined {
  const found = findCatalogAnswer(answers, canonicalId);
  return found?.answer.state === "answered" ? found.answer.value : undefined;
}

function catalogIsUnsure(answers: AnswerMap, canonicalId: string): boolean {
  return findCatalogAnswer(answers, canonicalId)?.answer.state === "unsure";
}

function answerLabel(answers: AnswerMap, id: string): string {
  const a = findCatalogAnswer(answers, id)?.answer;
  if (!a) return "Not answered";
  if (a.state === "unsure") return "I'm not sure";
  if (a.state === "not_asked") return "Not asked";
  return Array.isArray(a.value) ? a.value.join(", ") : String(a.value);
}

function stringValues(
  v: string | string[] | boolean | number | undefined,
): string[] {
  if (v === undefined) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

// ─── Confidence helper (epistemic — Task 1.2 deriveConfidence) ───────────────

function confidenceFor(
  answers: AnswerMap,
  triggerIds: readonly string[],
): Exclude<FindingConfidence, "INDETERMINATE"> {
  const unknowns = triggerIds.filter((id) =>
    catalogIsUnsure(answers, id),
  ).length;
  const band = deriveConfidence({
    unknownsInTriggerChain: unknowns,
    decisiveUnknown: false,
  });
  return band === "DETERMINED" ? "DETERMINED" : "PROBABLE";
}

// ─── Sources ─────────────────────────────────────────────────────────────────

const RB = RULEBOOK.version;

function commissionSource(provision: string): FindingSource {
  return {
    label: "EU Space Act proposal — Commission text",
    citation: `COM(2025) 335 ${provision}`,
    asOf: "2025-06-25",
    verified: true,
  };
}

const NIS2_ART21: FindingSource = {
  label: "NIS2 Directive",
  citation:
    "Directive (EU) 2022/2555 Art. 21 (cybersecurity risk-management measures)",
  asOf: "2022-12-27",
  verified: true,
};

const NIS2_ART23: FindingSource = {
  label: "NIS2 Directive",
  citation:
    "Directive (EU) 2022/2555 Art. 23 (incident reporting: 24h early warning, 72h notification, 1-month final report)",
  asOf: "2022-12-27",
  verified: true,
};

const ITU_RR_ART15: FindingSource = {
  label: "ITU Radio Regulations",
  citation:
    "ITU Radio Regulations (2020 ed., in force 1 Jan 2021), Article 15 — harmful interference",
  asOf: "2021-01-01",
  verified: true,
};

const FR_LOS: FindingSource = {
  label: "French Space Operations Act (LOS)",
  citation: "Loi n° 2008-518 du 3 juin 2008 (FSOA/LOS)",
  asOf: "2008-06-03",
  verified: true,
};

const UK_SIA_OSA: FindingSource = {
  label: "UK Space Industry Act 2018 / Outer Space Act 1986",
  citation: "Space Industry Act 2018 c. 5; Outer Space Act 1986 c. 38",
  asOf: "2018-03-15",
  verified: true,
};

const IT_LAW_89: FindingSource = {
  label: "Italian Space Economy Act",
  citation:
    "Legge 13 giugno 2025, n. 89 — third-party-liability minimum (€100M per claim) with startup/research reductions",
  asOf: "2025-06-11",
  verified: true,
};

const OST_ART_VII: FindingSource = {
  label: "Outer Space Treaty",
  citation: "OST (1967) Art. VII — international liability of launching States",
  asOf: "1967-10-10",
  verified: true,
};

const LIABILITY_CONVENTION: FindingSource = {
  label: "UN Liability Convention",
  citation:
    "Convention on International Liability for Damage Caused by Space Objects (1972)",
  asOf: "1972-09-01",
  verified: true,
};

const OST_ART_VIII: FindingSource = {
  label: "Outer Space Treaty",
  citation: "OST (1967) Art. VIII — jurisdiction and control via registration",
  asOf: "1967-10-10",
  verified: true,
};

const REGISTRATION_CONVENTION: FindingSource = {
  label: "UN Registration Convention",
  citation:
    "Convention on Registration of Objects Launched into Outer Space (1975, in force 15 Sep 1976)",
  asOf: "1976-09-15",
  verified: true,
};

const OST_ART_IX: FindingSource = {
  label: "Outer Space Treaty",
  citation: "OST (1967) Art. IX — harmful contamination / planetary protection",
  asOf: "1967-10-10",
  verified: true,
};

const COSPAR_POLICY: FindingSource = {
  label: "COSPAR Planetary Protection Policy",
  citation: "COSPAR Policy on Planetary Protection (2020 edition, as amended)",
  asOf: "2020-06-17",
  verified: true,
};

const UN_NPS_PRINCIPLES: FindingSource = {
  label: "UN Nuclear Power Source Principles",
  citation:
    "UNGA Res. 47/68 — Principles Relevant to the Use of Nuclear Power Sources in Outer Space",
  asOf: "1992-12-14",
  verified: true,
};

const ITAR_EAR: FindingSource = {
  label: "US export-control regulations (ITAR/EAR)",
  citation:
    "ITAR 22 CFR §§ 120–130; EAR 15 CFR §§ 730–774 (annual CFR codification)",
  asOf: "2025-01-01",
  verified: true,
};

const EU_DUAL_USE: FindingSource = {
  label: "EU Dual-Use Regulation",
  citation: "Regulation (EU) 2021/821 Annex I",
  asOf: "2021-09-09",
  verified: true,
};

const DUAL_USE_2025_UPDATE: FindingSource = {
  label: "Dual-Use Annex I update (spacecraft 'mission equipment' rework)",
  citation: "Delegated Reg. (EU) 2025/2003, OJ 14 Nov 2025",
  asOf: "2025-09-08",
  verified: true,
};

const EU_SANCTIONS_RU: FindingSource = {
  label: "EU restrictive measures (Russia)",
  citation:
    "Council Reg. (EU) 833/2014 as amended — space-sector export restrictions",
  asOf: "2024-12-16",
  verified: true,
};

const EU_SANCTIONS_BY: FindingSource = {
  label: "EU restrictive measures (Belarus)",
  citation: "Council Reg. (EC) 765/2006 as amended",
  asOf: "2024-06-29",
  verified: true,
};

/** §7.1 #2: the contested cyber-architecture flux flag — attached to the
 *  routing finding ALWAYS (the routing is contested, not the silent default). */
function cyberArchitectureFluxFlag() {
  return {
    summary: "contested — conservative reading shown",
    conservativeReading:
      "Both tracks are shown: NIS2 obligations (where the gateway classifies you) AND the Space Act resilience chapter — the conservative reading assumes both apply until the co-legislators settle the architecture.",
    positions: CONTESTED_POSITIONS.cyberArchitecture.map((p) => ({
      source: p.source,
      position: p.position,
    })),
  };
}

// ─── Value matchers (tolerant of dataset-lane band spellings; answered-only) ─

const COUNT_10_PLUS = new Set([
  "c_10_99",
  "c_100_999",
  "c_1000_plus",
  "10_99",
  "100_999",
  "1000_plus",
  "constellation",
  "mega_constellation",
  "giga_constellation",
]);

const COUNT_LOWER_BOUND: Record<string, number> = {
  c_1: 1,
  "1": 1,
  single: 1,
  c_2_9: 2,
  "2_9": 2,
  small_batch: 2,
  c_10_99: 10,
  "10_99": 10,
  constellation: 10,
  c_100_999: 100,
  "100_999": 100,
  mega_constellation: 100,
  c_1000_plus: 1000,
  "1000_plus": 1000,
  giga_constellation: 1000,
};

function isLeoValue(v: string): boolean {
  return v.toLowerCase().startsWith("leo");
}

// ─── Per-role engine adapter ─────────────────────────────────────────────────

/** Q1.1 role value → existing-engine activityType. CAP maps to the engine's
 *  general-articles path (activityType null — engine convention, never a
 *  silent coercion to spacecraft). Non-operator roles (component supplier,
 *  ground segment, hosted payload, reseller) are NOT Space Act engine roles. */
const ROLE_TO_ACTIVITY: Record<string, ActivityType> = {
  spacecraft_operator: "spacecraft",
  launch_operator: "launch_vehicle",
  launch_site_operator: "launch_site",
  isos_provider: "isos",
  in_space_service_provider: "isos",
  collision_avoidance_provider: null,
  // The dataset's q1_1_roles option value is "data_provider"; the
  // "primary_data_provider" spelling stays as a defensive alias. A missing
  // mapping would silently DROP the role from the Space Act engine run —
  // a cleaner verdict than the operator deserves (honesty invariant 2).
  data_provider: "data_provider",
  primary_data_provider: "data_provider",
};

function engineRolesFromAnswers(answers: AnswerMap): string[] {
  const roles = stringValues(catalogAnsweredValue(answers, Q_ROLES));
  return roles.filter((r) => r in ROLE_TO_ACTIVITY);
}

function entitySizeFromAnswers(
  answers: AnswerMap,
): AssessmentAnswers["entitySize"] {
  if (catalogAnsweredValue(answers, Q_ORG_TYPE) === "research_edu")
    return "research";
  const h = catalogAnsweredValue(answers, Q_HEADCOUNT);
  if (h === "h_250_plus") return "large";
  if (h === "h_50_249") return "medium";
  if (h === "h_1_9" || h === "h_10_49") return "small";
  return null; // unsure/missing → engine treats as unknown (never light by default)
}

function orbitFromAnswers(answers: AnswerMap): {
  primaryOrbit: AssessmentAnswers["primaryOrbit"];
  regimes: string[];
} {
  const regimes = stringValues(catalogAnsweredValue(answers, Q_ORBITS));
  // Most-restrictive merge for heterogeneous fleets (§7.2 — disclosed in
  // aggregationDisclosures): LEO (incl. HEO/SSO, conservatively) > MEO > GEO > beyond.
  if (regimes.some(isLeoValue) || regimes.includes("heo_sso")) {
    return { primaryOrbit: "LEO", regimes };
  }
  if (regimes.includes("meo")) return { primaryOrbit: "MEO", regimes };
  if (regimes.includes("geo")) return { primaryOrbit: "GEO", regimes };
  if (regimes.includes("cislunar_beyond"))
    return { primaryOrbit: "beyond", regimes };
  return { primaryOrbit: null, regimes };
}

function spacecraftCount(answers: AnswerMap): number | null {
  const v = catalogAnsweredValue(answers, Q_SPACECRAFT_COUNT);
  if (typeof v === "number") return v;
  if (typeof v === "string") return COUNT_LOWER_BOUND[v] ?? null;
  return null;
}

/** Build the existing-engine AssessmentAnswers for ONE role. Gates have
 *  already run: defense exclusivity and the no-nexus hard-out never reach
 *  here, and "all_before" launch timing short-circuited softly upstream. */
function answersAdapter(role: string, answers: AnswerMap): AssessmentAnswers {
  const establishment = catalogAnsweredValue(answers, Q_ESTABLISHMENT);
  const nexus = catalogAnsweredValue(answers, Q_EU_NEXUS);
  const isEU = establishment === "eu" || establishment === undefined; // unknown → presumed EU (rounds up)
  const count = spacecraftCount(answers);
  const timing = catalogAnsweredValue(answers, "q3_6_launch_timing");

  return {
    activityType: ROLE_TO_ACTIVITY[role] ?? null,
    isDefenseOnly: false, // exclusively-defense short-circuited at the gates
    // "some_or_all_after" → post-application assets exist; unsure → null
    // (the engine rounds null UP to in-scope — never grandfathered on unknown).
    hasPostLaunchAssets: timing === "some_or_all_after" ? true : null,
    // Non-EU always maps to third_country_eu_services here: nexus "no" is
    // unreachable (hard gate fired upstream) and an unsure nexus rounds UP
    // to the in-scope presumption (gate note already emitted).
    establishment: isEU ? "eu" : "third_country_eu_services",
    entitySize: entitySizeFromAnswers(answers),
    operatesConstellation: count !== null ? count >= 10 : null,
    constellationSize: count,
    primaryOrbit: orbitFromAnswers(answers).primaryOrbit,
    offersEUServices: isEU ? true : nexus !== "no",
  };
}

// ─── Jurisdiction nexus (Q4.4 held / Q4.5 considered) ────────────────────────

const KNOWN_SPACE_LAW_CODES: ReadonlySet<string> = new Set([
  "FR",
  "DE",
  "IT",
  "UK",
  "LU",
  "NL",
  "BE",
  "ES",
  "AT",
  "PL",
  "DK",
  "NO",
  "SE",
  "FI",
  "PT",
  "GR",
  "CZ",
  "IE",
  "CH",
  "EE",
]);

function jurisdictionCode(value: string): string | null {
  const head = value.split("_")[0]?.toUpperCase();
  if (head && KNOWN_SPACE_LAW_CODES.has(head)) return head;
  return null;
}

export interface JurisdictionNexus {
  code: string;
  nexus: "held_license" | "considered";
}

function jurisdictionNexuses(answers: AnswerMap): JurisdictionNexus[] {
  const out = new Map<string, JurisdictionNexus>();
  for (const v of stringValues(
    catalogAnsweredValue(answers, Q_LICENSES_HELD),
  )) {
    if (v === "none" || v === "other") continue;
    const code = jurisdictionCode(v);
    if (code) out.set(code, { code, nexus: "held_license" });
  }
  for (const v of stringValues(catalogAnsweredValue(answers, Q_CONSIDERED))) {
    if (v === "not_sure" || v === "not_sure_yet") continue;
    const code = jurisdictionCode(v);
    if (code && !out.has(code)) out.set(code, { code, nexus: "considered" });
  }
  return [...out.values()];
}

// ─── Default UK delegation probe (§3 [d]) ────────────────────────────────────

async function defaultUkProbe(): Promise<void> {
  // Verifies the dedicated UK Space Industry Act engine is loadable and
  // exposes its assessment surface. A throw here is surfaced as a VISIBLE
  // `degraded_generic_fallback` fidelity flag on the UK jurisdiction finding
  // — never swallowed (§3 [d]).
  const mod = await import("@/lib/uk-space-engine.server");
  if (
    typeof mod.validateOperatorProfile !== "function" ||
    typeof mod.performAssessment !== "function"
  ) {
    throw new Error("UK Space Industry Act engine unavailable");
  }
}

// ─── Module-status → cluster mapping ─────────────────────────────────────────

/** Engine module id → obligation cluster. "nis2" is deliberately ABSENT:
 *  the NIS2 gateway (Task 1.7) is the single honest source for NIS2 —
 *  the legacy engine's internal NIS2 module status is not re-emitted. */
const MODULE_TO_CLUSTER: Record<string, ClusterId> = {
  authorization: "authorization_registration",
  registration: "authorization_registration",
  environmental: "environment",
  cybersecurity: "resilience_cyber",
  cra: "resilience_cyber",
  debris: "debris_safety",
  insurance: "insurance_liability",
  supervision: "supervision_penalties",
  regulatory: "supervision_penalties",
};

const MODULE_VERDICT: Record<string, FindingVerdict> = {
  required: "applicable",
  simplified: "conditional",
  recommended: "advisory",
};

// ─── Pipeline ────────────────────────────────────────────────────────────────

async function defaultGraph(): Promise<readonly QuestionNode[]> {
  // Lazy by design: the dataset lane (Tasks 1.5/1.6) lands in parallel; tests
  // inject their own graph and never resolve this import.
  const mod = await import("@/data/assessment/question-graph");
  return mod.QUESTION_GRAPH;
}

export async function runVerdictPipeline(
  input: { answers: AnswerMap; tier: "quick" | "full" },
  deps: VerdictPipelineDeps = {},
): Promise<ObligationMapResult> {
  const { answers, tier } = input;
  const graph = deps.graph ?? (await defaultGraph());
  const gates = deps.evaluateGates ?? evaluateApplicabilityGates;
  const toGatewayInput = deps.gatewayInput ?? gatewayInputFromAnswers;
  const classify = deps.classifyGateway ?? classifyNIS2Gateway;
  const regimeOf = deps.determineRegime ?? determineLightRegime;
  const loadData = deps.loadSpaceActData ?? loadSpaceActDataFromDisk;
  const calc = deps.calculateCompliance ?? calculateCompliance;
  const merge = deps.mergeResults ?? mergeMultiActivityResults;
  const spaceLaw = deps.calculateSpaceLaw ?? calculateSpaceLawCompliance;
  const spectrumReqs =
    deps.getSpectrumRequirements ?? getApplicableSpectrumRequirements;
  const ukProbe = deps.ukProbe ?? defaultUkProbe;

  // ── Stage 1: server-enforced validation (honesty invariant 3) ────────────
  const errors = validateSubmission(graph, tier, answers);
  if (errors.length > 0) throw new SubmissionInvalidError(errors);
  const contradictions = detectContradictions(answers);
  if (contradictions.length > 0) throw new ContradictionError(contradictions);

  const computedAt = new Date().toISOString();

  // ── Stage 2: applicability gates ──────────────────────────────────────────
  const gateOutcome = gates(answers, RB);

  // Regime direction is pure on answers — computed in every path so the
  // envelope contract stays total (its finding states its own conditionality).
  const regime = regimeOf(answers, tier, RB);

  if (
    gateOutcome.kind === "out_of_scope" ||
    gateOutcome.kind === "out_of_scope_likely"
  ) {
    // Short-circuit: the cited gate finding ends the assessment. The NIS2
    // space-sector gateway is NOT evaluated on this path — and that is said
    // explicitly (NIS2 applicability is independent of Space Act
    // grandfathering and needs its own clarification; never silently cleaner).
    const nis2NotEvaluated = indeterminateFinding<NIS2GatewayClassification>({
      value: "needs_clarification",
      verdict: "conditional",
      what: "NIS2 space-sector gateway not evaluated — the assessment ended at the EU Space Act scope gate.",
      why:
        gateOutcome.kind === "out_of_scope_likely"
          ? "The launch-timing gate produced a likely-out-of-scope Space Act reading. NIS2 applicability is INDEPENDENT of Space Act grandfathering — an operator with pre-application assets can still be an essential or important entity today. The gateway was not evaluated on this short-circuit path, so NIS2 status remains an open question, not a clean negative."
          : "A hard EU Space Act scope gate ended the assessment before the NIS2 gateway ran. NIS2 applicability follows its own scope rules (establishment, Annex I attachment, size) and was not determined — this is an open question, not a clean negative.",
      wherefore:
        "Run the full assessment (or clarify the gate answer) to determine NIS2 applicability separately.",
      whyTrace: [],
      sources: [],
      cluster: "resilience_cyber",
      rulebookVersion: RB,
    });

    const scope: AssessmentFinding[] = [gateOutcome.finding];

    return finalize({
      rulebookVersion: RB,
      computedAt,
      tier,
      scope,
      nis2Gateway: nis2NotEvaluated,
      regime: regime.finding,
      clusters: [],
      crossFrameworkOverlaps: [],
      noneIdentifiedOverlaps: true,
      unknowns: extractUnknowns(answers, graph, []),
      aggregationDisclosures: [],
      contradictions: [],
    });
  }

  const scope: AssessmentFinding[] = [...gateOutcome.notes];

  // ── Stage 3: NIS2 gateway FIRST (§5 stage 2) ──────────────────────────────
  const nis2 = classify(toGatewayInput(answers));
  const nis2GatewayFinding = buildNis2GatewayFinding(nis2, answers);

  // ── Stage 5: per-role Space Act engine → existing merger ──────────────────
  const roles = engineRolesFromAnswers(answers);
  const rolesUnsure = catalogIsUnsure(answers, Q_ROLES);
  let merged: MergedSpaceActResult | null = null;
  if (roles.length > 0 || rolesUnsure) {
    const data = loadData();
    const effectiveRoles = roles.length > 0 ? roles : ["__general__"];
    const results = effectiveRoles.map((role) =>
      calc(
        role === "__general__"
          ? {
              ...answersAdapter("collision_avoidance_provider", answers),
              activityType: null,
            }
          : answersAdapter(role, answers),
        data,
      ),
    );
    merged = merge(results);
  }

  // ── Stage 6: national space-law engines (held + considered) ──────────────
  const nexuses = jurisdictionNexuses(answers);
  let ukFidelity: JurisdictionFidelity = "full";
  let spaceLawRan = false;
  if (nexuses.length > 0) {
    const selected = nexuses.map((n) => n.code) as SpaceLawCountryCode[];
    const slAnswers: SpaceLawAssessmentAnswers = {
      selectedJurisdictions: selected,
      activityType: null,
      entityNationality: null,
      entitySize: null,
      primaryOrbit: null,
      constellationSize: spacecraftCount(answers),
      licensingStatus: null,
    };
    await spaceLaw(slAnswers);
    spaceLawRan = true;
    if (nexuses.some((n) => n.code === "UK")) {
      try {
        await ukProbe();
      } catch {
        // §3 [d]: VISIBLE fidelity degradation — never a silent fallback.
        ukFidelity = "degraded_generic_fallback";
      }
    }
  }

  // ── Stage 7: cluster mapping ──────────────────────────────────────────────
  const findings: AssessmentFinding[] = [];

  findings.push(...moduleFindings(merged, answers));
  findings.push(buildCyberRoutingFinding(answers));
  findings.push(...nis2ObligationFindings(nis2, answers));
  findings.push(...incidentClusterFindings(merged, nexuses, answers));
  findings.push(
    ...jurisdictionFindings(nexuses, ukFidelity, spaceLawRan, answers),
  );
  findings.push(...insuranceFindings(nexuses, answers));
  findings.push(...transferFindings(answers));
  findings.push(...unRegistrationFindings(answers));
  findings.push(...spectrumFindings(answers, spectrumReqs));
  findings.push(...exportSanctionsFindings(answers));
  findings.push(...advisoryFindings(answers));

  const clusters = assembleClusters(findings);

  // ── Cross-framework overlaps (computed, never fabricated — invariant 4) ──
  const crossFrameworkOverlaps =
    (nis2.classification === "essential" ||
      nis2.classification === "important") &&
    merged?.applies
      ? [
          {
            area: "Cybersecurity risk management",
            euSpaceActRef: "COM(2025) 335 Arts. 74–95 (resilience chapter)",
            nis2Ref: "Directive (EU) 2022/2555 Art. 21",
          },
          {
            area: "Incident reporting",
            euSpaceActRef:
              "COM(2025) 335 Arts. 74–95 (occurrence notification)",
            nis2Ref: "Directive (EU) 2022/2555 Art. 23",
          },
        ]
      : [];

  // ── Heterogeneous-fleet disclosure (§7.2) ─────────────────────────────────
  const { primaryOrbit, regimes } = orbitFromAnswers(answers);
  const aggregationDisclosures: string[] = [];
  if (regimes.length > 1 && primaryOrbit !== null) {
    aggregationDisclosures.push(
      `Multiple orbital regimes declared (${regimes.join(", ")}). Clusters are assessed against the MOST RESTRICTIVE regime — ${primaryOrbit} — so some findings may overstate duties for assets in less restrictive regimes. Per-mission sub-profiles refine this in the living tier.`,
    );
  }

  // ── Stage 8: unknowns extraction ──────────────────────────────────────────
  const unknowns = extractUnknowns(answers, graph, nis2.clarificationsNeeded);

  // ── Stage 9 (full tier only): readiness bands, credit map, roadmap ────────
  // Per-cluster N-of-M bands — never a score (invariant 6). An unsure
  // readiness input is a gap AND an unknown (§5 stage 5, rounds up).
  let readiness: ClusterReadiness[] | undefined;
  let creditMap: CreditMapping[] | undefined;
  let roadmap: RoadmapItem[] | undefined;
  if (tier === "full") {
    readiness = computeReadiness(
      answers,
      clusters.map((c) => c.id),
    );
    creditMap = computeCreditMap(answers);
    roadmap = computeRoadmap(answers, { computedAt });
    const known = new Set(unknowns.map((u) => u.questionId));
    for (const qid of readinessUnsureQuestionIds(answers)) {
      if (known.has(qid)) continue;
      const node = graph.find((n) => n.id === qid);
      unknowns.push({
        questionId: qid,
        question: node?.title ?? qid,
        whatAnsweringChanges:
          "Turns an uncertain readiness gap into an evidenced or actionable item in the obligation map.",
        priority: "medium",
      });
    }
  }

  return finalize({
    rulebookVersion: RB,
    computedAt,
    tier,
    scope,
    nis2Gateway: nis2GatewayFinding,
    regime: regime.finding,
    clusters,
    crossFrameworkOverlaps,
    noneIdentifiedOverlaps: crossFrameworkOverlaps.length === 0,
    unknowns,
    aggregationDisclosures,
    contradictions: [],
    readiness,
    creditMap,
    roadmap,
    // Task 3.5: the engine's own module statuses ride the snapshot so the
    // dashboard import never consults a second dataset for applicability.
    spaceActModules: merged?.moduleStatuses.map((m) => ({
      id: m.id,
      status: m.status,
    })),
  });
}

// ─── Finding builders ────────────────────────────────────────────────────────

function buildNis2GatewayFinding(
  nis2: NIS2GatewayResult,
  answers: AnswerMap,
): AssessmentFinding<NIS2GatewayClassification> {
  const whyTrace = [
    {
      questionId: Q_ESTABLISHMENT,
      answerLabel: answerLabel(answers, Q_ESTABLISHMENT),
    },
    {
      questionId: Q_GROUND_SEGMENT,
      answerLabel: answerLabel(answers, Q_GROUND_SEGMENT),
    },
    { questionId: Q_HEADCOUNT, answerLabel: answerLabel(answers, Q_HEADCOUNT) },
  ];
  const verifySuffix =
    nis2.verifyNotes.length > 0
      ? ` Verify: ${nis2.verifyNotes.join("; ")}.`
      : "";

  if (nis2.classification === "needs_clarification") {
    return indeterminateFinding<NIS2GatewayClassification>({
      value: nis2.classification,
      verdict: "conditional",
      what: "NIS2 gateway: classification needs clarification.",
      why: `${nis2.reason}${verifySuffix}`,
      wherefore:
        "Resolve the named clarification questions — the classification (and the entire NIS2 obligation set) turns on them.",
      whyTrace,
      sources: nis2.citation,
      cluster: "resilience_cyber",
      rulebookVersion: RB,
    });
  }

  const inScope =
    nis2.classification === "essential" || nis2.classification === "important";
  return determinedFinding<NIS2GatewayClassification>({
    value: nis2.classification,
    verdict: inScope ? "applicable" : "not_applicable",
    what: inScope
      ? `NIS2 gateway: classified ${nis2.classification} (space sector).`
      : "NIS2 gateway: out of scope.",
    why: `${nis2.reason}${verifySuffix}`,
    wherefore: inScope
      ? "NIS2 risk-management (Art. 21) and incident-reporting (Art. 23) obligations attach — see the resilience and incident-reporting clusters."
      : "No NIS2 space-sector obligations identified on the answers given. Re-run on any change to establishment, ground segment or size.",
    whyTrace,
    confidence: nis2.verifyNotes.length > 0 ? "PROBABLE" : "DETERMINED",
    sources: nis2.citation,
    cluster: "resilience_cyber",
    rulebookVersion: RB,
  });
}

/** The cyber-cluster routing finding — ALWAYS carries the cyberArchitecture
 *  flux flag (§7.1 #2): WHICH instrument governs cyber is contested. */
function buildCyberRoutingFinding(
  answers: AnswerMap,
): AssessmentFinding<string> {
  return determinedFinding<string>({
    value: "cyber_regime_routing_contested",
    verdict: "contested",
    what: "Cybersecurity regime routing — which instrument governs your cyber obligations is contested in the legislative process.",
    why: "The Commission text makes the Space Act resilience chapter (Arts 74–95) the lex specialis; the Danish Presidency compromise synchronises it 'without prejudice to NIS2' (Art 75 et seq. only below the NIS2 thresholds and for third-country operators); the EP ITRE draft deletes the chapter and extends NIS2 instead. No reading is settled.",
    wherefore:
      "The conservative reading is shown: treat both the NIS2 findings and the Space Act resilience findings as applicable until the architecture is settled, then re-run against the updated rulebook.",
    whyTrace: [],
    confidence: confidenceFor(answers, [Q_ESTABLISHMENT, Q_GROUND_SEGMENT]),
    sources: [
      commissionSource("Arts. 74–95 (resilience chapter)"),
      {
        label:
          "Danish Presidency compromise text (Council track — no Council position adopted as of June 2026)",
        citation: "synchronisation — 'without prejudice to NIS2'",
        asOf: "2025-12-05",
        verified: true,
      },
      {
        label: "EP ITRE draft report",
        citation: "resilience chapter deleted; NIS2 extended via new Art 117a",
        asOf: "2026-03-03",
        verified: true,
      },
    ],
    cluster: "resilience_cyber",
    fluxFlag: cyberArchitectureFluxFlag(),
    rulebookVersion: RB,
  });
}

function nis2ObligationFindings(
  nis2: NIS2GatewayResult,
  answers: AnswerMap,
): AssessmentFinding[] {
  if (
    nis2.classification !== "essential" &&
    nis2.classification !== "important"
  ) {
    return []; // no fabricated NIS2 duties when the gateway honestly says no/unclear
  }
  const confidence: Exclude<FindingConfidence, "INDETERMINATE"> =
    nis2.verifyNotes.length > 0 ? "PROBABLE" : "DETERMINED";
  const whyTrace = [
    {
      questionId: Q_ESTABLISHMENT,
      answerLabel: answerLabel(answers, Q_ESTABLISHMENT),
    },
    {
      questionId: Q_GROUND_SEGMENT,
      answerLabel: answerLabel(answers, Q_GROUND_SEGMENT),
    },
  ];
  return [
    determinedFinding<string>({
      value: "nis2_risk_management",
      verdict: "applicable",
      what: `NIS2 cybersecurity risk-management measures apply (${nis2.classification} entity).`,
      why: `As a NIS2 ${nis2.classification} entity in the space sector you must implement the Art. 21 risk-management measures: policies on risk analysis, incident handling, business continuity, supply-chain security, secure development, cryptography, access control and training — with management-body approval and oversight (Art. 20).`,
      wherefore:
        "Stand up (or evidence) a board-approved risk-management framework covering the Art. 21(2) measure list.",
      whyTrace,
      confidence,
      sources: [NIS2_ART21, ...nis2.citation],
      cluster: "resilience_cyber",
      rulebookVersion: RB,
    }),
    determinedFinding<string>({
      value: "nis2_incident_chain",
      verdict: "applicable",
      what: "NIS2 incident-reporting chain applies: 24h early warning → 72h incident notification → 1-month final report.",
      why: `As a NIS2 ${nis2.classification} entity you must report significant incidents to the CSIRT/competent authority: an early warning within 24 hours of awareness, an incident notification updating it within 72 hours (initial assessment, severity, indicators of compromise), and a final report no later than one month after the notification (Art. 23).`,
      wherefore:
        "Adopt an incident-response runbook that operationalises the 24h/72h/1-month chain and names the CSIRT contact points.",
      whyTrace,
      confidence,
      sources: [NIS2_ART23],
      cluster: "incident_reporting",
      rulebookVersion: RB,
    }),
  ];
}

function moduleFindings(
  merged: MergedSpaceActResult | null,
  answers: AnswerMap,
): AssessmentFinding[] {
  if (!merged || !merged.applies) return [];
  const out: AssessmentFinding[] = [];
  const confidence = confidenceFor(answers, [
    Q_ROLES,
    Q_ESTABLISHMENT,
    "q3_6_launch_timing",
    Q_EU_NEXUS,
  ]);
  for (const mod of merged.moduleStatuses) {
    const cluster = MODULE_TO_CLUSTER[mod.id];
    const verdict = MODULE_VERDICT[mod.status];
    if (!cluster || !verdict) continue; // not_applicable / unmapped (e.g. nis2 — gateway-owned)
    const meta = MODULES.find((m) => m.id === mod.id);
    out.push(
      determinedFinding<string>({
        value: `module_${mod.id}_${mod.status}`,
        verdict,
        what: `${mod.name}: ${mod.status === "required" ? "applicable" : mod.status} (${mod.articleCount} article${mod.articleCount === 1 ? "" : "s"}).`,
        why: `${mod.summary} Regime: ${merged.regimeLabel} — ${merged.regimeReason}`,
        wherefore:
          mod.status === "required"
            ? `Plan the ${mod.name.toLowerCase()} workstream — it is mandatory for your operator profile.`
            : mod.status === "simplified"
              ? `A simplified (light-regime) variant of ${mod.name.toLowerCase()} applies — verify regime eligibility before relying on it.`
              : `${mod.name} is recommended for your profile, not mandated.`,
        whyTrace: [
          { questionId: Q_ROLES, answerLabel: answerLabel(answers, Q_ROLES) },
        ],
        confidence,
        sources: [
          commissionSource(meta ? meta.articleRange : "(module articles)"),
        ],
        cluster,
        rulebookVersion: RB,
      }),
    );
  }
  return out;
}

/** Incident-reporting cluster beyond NIS2 (§7.2 — the cluster is NOT NIS2-only). */
function incidentClusterFindings(
  merged: MergedSpaceActResult | null,
  nexuses: JurisdictionNexus[],
  answers: AnswerMap,
): AssessmentFinding[] {
  const out: AssessmentFinding[] = [];

  // Space Act occurrence notification — contested chapter, flux flag attached.
  if (merged?.applies) {
    out.push(
      determinedFinding<string>({
        value: "space_act_occurrence_notification",
        verdict: "contested",
        what: "EU Space Act occurrence/incident notification (resilience chapter).",
        why: "The Commission text's resilience chapter (Arts 74–95) carries occurrence/incident notification duties for in-scope operators. The chapter's fate is contested between the co-legislators — the conservative reading keeps the duty visible.",
        wherefore:
          "Track the resilience chapter through trilogue; until settled, plan incident notification against both this chapter and NIS2 Art. 23.",
        whyTrace: [
          { questionId: Q_ROLES, answerLabel: answerLabel(answers, Q_ROLES) },
        ],
        confidence: confidenceFor(answers, [Q_ROLES, Q_ESTABLISHMENT]),
        sources: [
          commissionSource(
            "Arts. 74–95 (resilience chapter — occurrence notification)",
          ),
        ],
        cluster: "incident_reporting",
        fluxFlag: cyberArchitectureFluxFlag(),
        rulebookVersion: RB,
      }),
    );
  }

  // ITU harmful interference — for RF users.
  if (catalogAnsweredValue(answers, Q_RF_USE) === "yes") {
    out.push(
      determinedFinding<string>({
        value: "itu_harmful_interference_reporting",
        verdict: "applicable",
        what: "ITU harmful-interference reporting and resolution duties apply to your RF use.",
        why: "Operators of radio stations must avoid causing harmful interference and cooperate in reporting and eliminating it through their notifying administration (ITU Radio Regulations Art. 15).",
        wherefore:
          "Establish an interference-event procedure routed through your notifying administration.",
        whyTrace: [
          { questionId: Q_RF_USE, answerLabel: answerLabel(answers, Q_RF_USE) },
        ],
        confidence: confidenceFor(answers, [Q_RF_USE, Q_ITU_FILING]),
        sources: [ITU_RR_ART15],
        cluster: "incident_reporting",
        rulebookVersion: RB,
      }),
    );
  }

  // National incident duties — emitted ONLY on that jurisdiction's nexus
  // (no fabricated national duties), flagged per jurisdiction, national act cited.
  for (const nexus of nexuses) {
    if (nexus.code === "FR") {
      out.push(
        determinedFinding<JurisdictionFindingValue>({
          value: { jurisdiction: "FR", nexus: nexus.nexus, fidelity: "full" },
          verdict: "applicable",
          what: "[FR] French Space Operations Act incident notification applies.",
          why: "Under Loi n° 2008-518 (LOS), licensed operators must notify incidents and accidents affecting their space operations to the administrative authority, with CNES exercising technical oversight. This duty exists ALONGSIDE NIS2 and EU Space Act reporting — it is not replaced by them.",
          wherefore:
            nexus.nexus === "held_license"
              ? "Map your French licence conditions' notification triggers into the same incident runbook that covers the NIS2 chain."
              : "Factor the FR LOS notification duty into your jurisdiction comparison before applying.",
          whyTrace: [
            {
              questionId:
                nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
              answerLabel: answerLabel(
                answers,
                nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
              ),
            },
          ],
          confidence: "DETERMINED",
          sources: [FR_LOS],
          cluster: "incident_reporting",
          rulebookVersion: RB,
        }),
      );
    }
    if (nexus.code === "UK") {
      out.push(
        determinedFinding<JurisdictionFindingValue>({
          value: { jurisdiction: "UK", nexus: nexus.nexus, fidelity: "full" },
          verdict: "applicable",
          what: "[UK] Space Industry Act / Outer Space Act occurrence reporting to the CAA applies.",
          why: "UK-licensed spaceflight and orbital activities carry occurrence-reporting duties to the Civil Aviation Authority under the Space Industry Act 2018 framework (with the Outer Space Act 1986 governing legacy licences). This national duty exists alongside any NIS2 or EU Space Act reporting.",
          wherefore:
            nexus.nexus === "held_license"
              ? "Wire CAA occurrence reporting into your incident runbook with its own trigger thresholds — they differ from NIS2's 'significant incident' test."
              : "Factor CAA occurrence reporting into your jurisdiction comparison before applying.",
          whyTrace: [
            {
              questionId:
                nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
              answerLabel: answerLabel(
                answers,
                nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
              ),
            },
          ],
          confidence: "DETERMINED",
          sources: [UK_SIA_OSA],
          cluster: "incident_reporting",
          rulebookVersion: RB,
        }),
      );
    }
  }

  return out;
}

/** Rulebook-grounded national framework sources (verified). Other returned
 *  jurisdictions cite the engine dataset honestly as pending verification. */
const NATIONAL_FRAMEWORK_SOURCES: Record<string, FindingSource> = {
  FR: FR_LOS,
  IT: IT_LAW_89,
  UK: UK_SIA_OSA,
  LU: {
    label: "Luxembourg space legislation",
    citation:
      "Loi du 15 décembre 2020 sur les activités spatiales; Space Resources Act 2017",
    asOf: "2020-12-15",
    verified: true,
  },
  NL: {
    label: "Dutch Space Activities Act",
    citation: "Wet ruimtevaartactiviteiten (Wet van 24 januari 2007)",
    asOf: "2007-01-24",
    verified: true,
  },
  DE: {
    label: "German Satellite Data Security Act (BAFA competent)",
    citation: "SatDSiG (Satellitendatensicherheitsgesetz, 23 Nov 2007)",
    asOf: "2007-11-23",
    verified: true,
  },
};

function jurisdictionFindings(
  nexuses: JurisdictionNexus[],
  ukFidelity: JurisdictionFidelity,
  spaceLawRan: boolean,
  answers: AnswerMap,
): AssessmentFinding[] {
  if (!spaceLawRan) return [];
  return nexuses.map((nexus) => {
    const fidelity: JurisdictionFidelity =
      nexus.code === "UK" ? ukFidelity : "full";
    const source =
      NATIONAL_FRAMEWORK_SOURCES[nexus.code] ??
      ({
        label: `${nexus.code} national space-law framework`,
        citation: "national space-law dataset entry (10-jurisdiction engine)",
        asOf: "2026-06-03",
        verified: false, // rendered "legal basis pending verification"
      } satisfies FindingSource);
    const degraded = fidelity === "degraded_generic_fallback";
    return determinedFinding<JurisdictionFindingValue>({
      value: { jurisdiction: nexus.code, nexus: nexus.nexus, fidelity },
      verdict: "applicable",
      what: `[${nexus.code}] national authorisation framework ${nexus.nexus === "held_license" ? "applies to your held/pending licence" : "applies to your considered authorisation"}.`,
      why:
        `The ${nexus.code} national space-law framework was assessed by the 10-jurisdiction engine for your ${nexus.nexus === "held_license" ? "held or pending licence" : "considered authorisation"}.` +
        (degraded
          ? " CAVEAT — degraded fidelity: the dedicated UK Space Industry Act engine could not be invoked, so this finding rests on the GENERIC jurisdiction dataset only (degraded_generic_fallback). Treat the UK detail as lower-fidelity and verify against the CAA's published licensing requirements."
          : ""),
      wherefore: degraded
        ? "Re-run the assessment once the UK engine is available, or verify the UK requirements directly with the CAA — do not rely on the generic fallback at full confidence."
        : "Review the jurisdiction's requirements in the national-law comparison; existing licences are credited in the roadmap.",
      whyTrace: [
        {
          questionId:
            nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
          answerLabel: answerLabel(
            answers,
            nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
          ),
        },
      ],
      // §3 [d]: degraded fidelity is NEVER presented at full confidence.
      confidence: degraded ? "PROBABLE" : "DETERMINED",
      sources: [source],
      cluster: "authorization_registration",
      rulebookVersion: RB,
    });
  });
}

/** National TPL minimums — NAMED legal basis only (FR/IT/UK); nothing is
 *  fabricated for jurisdictions without a verified named minimum. */
function insuranceFindings(
  nexuses: JurisdictionNexus[],
  answers: AnswerMap,
): AssessmentFinding[] {
  const out: AssessmentFinding[] = [];
  for (const nexus of nexuses) {
    const trace = {
      questionId:
        nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
      answerLabel: answerLabel(
        answers,
        nexus.nexus === "held_license" ? Q_LICENSES_HELD : Q_CONSIDERED,
      ),
    };
    if (nexus.code === "FR") {
      out.push(
        determinedFinding<JurisdictionFindingValue>({
          value: { jurisdiction: "FR", nexus: nexus.nexus, fidelity: "full" },
          verdict: "applicable",
          what: "[FR] third-party-liability cover with the LOS State-guarantee mechanism applies.",
          why: "Loi n° 2008-518 (LOS) requires authorised operators to carry third-party-liability insurance up to a ceiling, above which the French State guarantee applies. Third-party liability remains NATIONAL law — the EU Space Act proposal contains no insurance harmonisation.",
          wherefore:
            "Confirm your policy meets the ceiling set in your authorisation; document the State-guarantee interface.",
          whyTrace: [trace],
          confidence: "DETERMINED",
          sources: [FR_LOS],
          cluster: "insurance_liability",
          rulebookVersion: RB,
        }),
      );
    }
    if (nexus.code === "IT") {
      out.push(
        determinedFinding<JurisdictionFindingValue>({
          value: { jurisdiction: "IT", nexus: nexus.nexus, fidelity: "full" },
          verdict: "applicable",
          what: "[IT] Law 89/2025 third-party-liability minimum (€100M per claim, with reductions) applies.",
          why: "Italy's Law 89/2025 sets a €100M-per-claim third-party-liability minimum for authorised space operators, with reductions available for startups and research operators. TPL remains national law alongside the EU Space Act proposal.",
          wherefore:
            "Check eligibility for the startup/research reduction before procuring at the full minimum.",
          whyTrace: [trace],
          confidence: "DETERMINED",
          sources: [IT_LAW_89],
          cluster: "insurance_liability",
          rulebookVersion: RB,
        }),
      );
    }
    if (nexus.code === "UK") {
      out.push(
        determinedFinding<JurisdictionFindingValue>({
          value: { jurisdiction: "UK", nexus: nexus.nexus, fidelity: "full" },
          verdict: "applicable",
          what: "[UK] per-licence third-party-liability limits set in licence conditions apply.",
          why: "Under the Space Industry Act 2018 framework the regulator sets per-licence liability and insurance requirements in the licence conditions (no single statutory figure is cited here — the amount is licence-specific).",
          wherefore:
            "Obtain the indicative liability limit for your licence class from the CAA before fixing coverage.",
          whyTrace: [trace],
          confidence: "DETERMINED",
          sources: [UK_SIA_OSA],
          cluster: "insurance_liability",
          rulebookVersion: RB,
        }),
      );
    }
  }
  return out;
}

function transferFindings(answers: AnswerMap): AssessmentFinding[] {
  const found = findCatalogAnswer(answers, Q_TRANSFER);
  if (!found) return [];
  const trace = {
    questionId: found.id,
    answerLabel: answerLabel(answers, Q_TRANSFER),
  };
  if (found.answer.state === "unsure") {
    return [
      indeterminateFinding<string>({
        value: "transfer_unclear",
        verdict: "conditional",
        what: "Transfer / change-of-control consent duties may apply — deal status unconfirmed.",
        why: "Whether transfer-authorisation duties attach turns on whether a sale, acquisition or change of control is planned or underway — and that answer was 'I'm not sure'. FR LOS, UK OSA/SIA and NL law require authorisation or consent for transfers of space objects or operator control; an unconfirmed deal cannot be assumed away.",
        wherefore:
          "Confirm with your corporate team whether any transaction touching in-orbit assets or control is in motion.",
        whyTrace: [trace],
        sources: [FR_LOS, UK_SIA_OSA],
        cluster: "transfer_change_of_control",
        rulebookVersion: RB,
      }),
    ];
  }
  const v = found.answer.state === "answered" ? String(found.answer.value) : "";
  if (
    v !== "transfer_out" &&
    v !== "acquisition" &&
    v !== "change_of_control"
  ) {
    return []; // "no" — no fabricated transfer duties
  }
  return [
    determinedFinding<string>({
      value: `transfer_${v}`,
      verdict: "applicable",
      what: "National transfer / change-of-control authorisation or consent duties apply to the pending transaction.",
      why: "FR LOS, the UK OSA/SIA framework and NL law require prior authorisation or consent for transfers of space objects or of operator control; the EU proposal also touches transfer. A pending deal without the consent path mapped is a closing risk.",
      wherefore:
        "Identify the licensing authority's consent procedure for each affected licence BEFORE signing — consent timing drives the transaction timeline.",
      whyTrace: [trace],
      confidence: "DETERMINED",
      sources: [FR_LOS, UK_SIA_OSA],
      cluster: "transfer_change_of_control",
      rulebookVersion: RB,
    }),
  ];
}

function unRegistrationFindings(answers: AnswerMap): AssessmentFinding[] {
  const found = findCatalogAnswer(answers, Q_UN_REGISTRATION);
  // not_asked = the branch never applied (e.g. no spacecraft-operator role) —
  // emitting a registration duty there would be a fabricated finding.
  if (!found || found.answer.state === "not_asked") return [];
  const trace = {
    questionId: found.id,
    answerLabel: answerLabel(answers, Q_UN_REGISTRATION),
  };
  const sources = [
    OST_ART_VIII,
    REGISTRATION_CONVENTION,
    commissionSource(
      "Art. 24 (URSO, EUSPA — an ADDITIONAL register, not a substitute)",
    ),
  ];
  if (found.answer.state !== "answered") {
    return [
      indeterminateFinding<string>({
        value: "un_registration_unclear",
        verdict: "conditional",
        what: "UN / national registration status unconfirmed.",
        why: "Registration status was not answered with certainty. OST Art. VIII ties jurisdiction and control to the State of registry, and the 1975 Registration Convention requires registry entries — an unknown status is treated as a duty to verify, never as registered.",
        wherefore:
          "Check the national registry and the UN register (UNOOSA) for each launched object.",
        whyTrace: [trace],
        sources,
        cluster: "un_registration",
        rulebookVersion: RB,
      }),
    ];
  }
  const v = String(found.answer.value);
  return [
    determinedFinding<string>({
      value: `un_registration_${v}`,
      verdict: "applicable",
      what:
        v === "registered"
          ? "Registration duties are ongoing — keep registry data current."
          : "Space-object registration duties apply — registry entries are missing or pending.",
      why: "OST Art. VIII ties jurisdiction and control to the State of registry; the 1975 Registration Convention requires national registry entries notified to the UN register. The EU proposal's URSO (Art. 24, EUSPA) will be an ADDITIONAL register, not a substitute for these duties.",
      wherefore:
        v === "registered"
          ? "Notify registry-data changes (orbit, status, disposal) as they occur."
          : "Complete the national registry entry and UN submission for every launched object — this is among the cheapest findings to close.",
      whyTrace: [trace],
      confidence: "DETERMINED",
      sources,
      cluster: "un_registration",
      rulebookVersion: RB,
    }),
  ];
}

function spectrumOrbitType(answers: AnswerMap): SpectrumOrbitType {
  const { primaryOrbit } = orbitFromAnswers(answers);
  if (primaryOrbit === "LEO") return "LEO";
  if (primaryOrbit === "MEO") return "MEO";
  if (primaryOrbit === "GEO") return "GEO";
  return "NGSO";
}

function spectrumFindings(
  answers: AnswerMap,
  getReqs: typeof getApplicableSpectrumRequirements,
): AssessmentFinding[] {
  const out: AssessmentFinding[] = [];
  const rf = findCatalogAnswer(answers, Q_RF_USE);
  if (!rf) return out;

  if (rf.answer.state === "unsure") {
    out.push(
      indeterminateFinding<string>({
        value: "rf_use_unclear",
        verdict: "conditional",
        what: "RF spectrum use unconfirmed — the entire ITU/spectrum cluster turns on it.",
        why: "Whether the ITU filing lifecycle, national assignments and landing rights apply turns on whether the mission uses radio-frequency spectrum — and that answer was 'I'm not sure'. Spectrum is existential: an unfiled frequency cannot be insured into existence later.",
        wherefore:
          "Confirm RF use with your payload/comms team as a top-priority unknown.",
        whyTrace: [{ questionId: rf.id, answerLabel: "I'm not sure" }],
        sources: [ITU_RR_ART15],
        cluster: "spectrum_itu",
        rulebookVersion: RB,
      }),
    );
    return out;
  }

  if (rf.answer.state !== "answered" || rf.answer.value !== "yes") return out;

  const count = spacecraftCount(answers);
  const ituFiling = catalogAnsweredValue(answers, Q_ITU_FILING);
  const profile: SpectrumProfile = {
    // Coarse, honest profile: empty service/band lists mean only the
    // UNIVERSALLY-applicable requirements match (the engine's filters require
    // overlap unless the requirement's own lists are empty) — the coarse
    // tier never overclaims band-specific duties.
    serviceTypes: [],
    frequencyBands: [],
    orbitType: spectrumOrbitType(answers),
    numberOfSatellites: count ?? 1,
    isConstellation: (count ?? 0) >= 10,
    primaryJurisdiction: "ITU",
    additionalJurisdictions: [],
    hasExistingFilings: typeof ituFiling === "string" && ituFiling !== "none",
    uplinkBands: [],
    downlinkBands: [],
    intersatelliteLinks: false,
  };
  const confidence = confidenceFor(answers, [
    Q_RF_USE,
    Q_ITU_FILING,
    Q_LANDING_RIGHTS,
  ]);
  for (const req of getReqs(profile).filter((r) => r.isMandatory)) {
    out.push(
      determinedFinding<string>({
        value: `spectrum_${req.id}`,
        verdict: "applicable",
        what: `${req.title} (ITU/spectrum requirement).`,
        why: req.description,
        wherefore:
          req.complianceActions[0] ??
          "Address this spectrum requirement with your notifying administration.",
        whyTrace: [{ questionId: rf.id, answerLabel: "yes" }],
        confidence,
        sources: [
          {
            label: "ITU Radio Regulations / filing framework",
            citation: req.reference,
            asOf: "2021-01-01",
            verified: true,
          },
        ],
        cluster: "spectrum_itu",
        rulebookVersion: RB,
      }),
    );
  }

  const landing = catalogAnsweredValue(answers, Q_LANDING_RIGHTS);
  if (landing === "partial" || landing === "none") {
    out.push(
      determinedFinding<string>({
        value: "landing_rights_gap",
        verdict: "applicable",
        what: "National frequency assignments / landing rights are missing for served markets.",
        why: "Per-country market access (national assignments, landing rights) is separate from the ITU filing — a recorded ITU filing does not authorise service into a market without the national grant.",
        wherefore:
          "List served markets against held assignments and start the missing national processes.",
        whyTrace: [
          {
            questionId: Q_LANDING_RIGHTS,
            answerLabel: answerLabel(answers, Q_LANDING_RIGHTS),
          },
        ],
        confidence: "DETERMINED",
        sources: [ITU_RR_ART15],
        cluster: "spectrum_itu",
        rulebookVersion: RB,
      }),
    );
  }

  return out;
}

function exportSanctionsFindings(answers: AnswerMap): AssessmentFinding[] {
  const out: AssessmentFinding[] = [];

  const usOrigin = findCatalogAnswer(answers, Q_US_ORIGIN);
  if (
    usOrigin?.answer.state === "answered" &&
    usOrigin.answer.value === "yes"
  ) {
    out.push(
      determinedFinding<string>({
        value: "itar_ear_exposure",
        verdict: "applicable",
        what: "US-origin content in the supply chain — ITAR/EAR obligations attach.",
        why: "ITAR and the EAR attach to US-origin content, technology and launch services regardless of which certifications you hold. US-origin components or launch services pull re-export and retransfer controls into your programme.",
        wherefore:
          "Classify each US-origin item (USML category / ECCN) and map the licence or exemption it travels under.",
        whyTrace: [
          {
            questionId: usOrigin.id,
            answerLabel: answerLabel(answers, Q_US_ORIGIN),
          },
        ],
        confidence: "DETERMINED",
        sources: [ITAR_EAR],
        cluster: "export_control_sanctions",
        rulebookVersion: RB,
      }),
    );
  } else if (usOrigin?.answer.state === "unsure") {
    out.push(
      indeterminateFinding<string>({
        value: "export_classification_screening_recommended",
        verdict: "advisory",
        what: "Export-classification screening recommended — US-origin content unconfirmed.",
        why: "Whether ITAR/EAR attach turns on US-origin CONTENT in your supply chain, and that answer was 'I'm not sure'. Unscreened US content is the classic late-stage export surprise; the conservative course is a classification screening, not an assumption of absence.",
        wherefore:
          "Run a supply-chain export-classification screening (USML / ECCN / EU dual-use).",
        whyTrace: [{ questionId: usOrigin.id, answerLabel: "I'm not sure" }],
        sources: [ITAR_EAR],
        cluster: "export_control_sanctions",
        rulebookVersion: RB,
      }),
    );
  }

  const dualUse = findCatalogAnswer(answers, Q_DUAL_USE);
  if (dualUse?.answer.state === "answered" && dualUse.answer.value === "yes") {
    out.push(
      determinedFinding<string>({
        value: "eu_dual_use_authorisation",
        verdict: "applicable",
        what: "EU dual-use export authorisations apply (Reg. 2021/821 Annex I).",
        why: "Items listed in Annex I of the EU Dual-Use Regulation require export authorisation. The September 2025 Annex I update expanded spacecraft 'mission equipment' (on-board computing, inter-satellite links, thermal management) — classifications older than that update may be stale.",
        wherefore:
          "Re-validate classifications against the 2025 Annex I update before the next export.",
        whyTrace: [
          {
            questionId: dualUse.id,
            answerLabel: answerLabel(answers, Q_DUAL_USE),
          },
        ],
        confidence: "DETERMINED",
        sources: [EU_DUAL_USE, DUAL_USE_2025_UPDATE],
        cluster: "export_control_sanctions",
        rulebookVersion: RB,
      }),
    );
  } else if (dualUse?.answer.state === "unsure") {
    out.push(
      indeterminateFinding<string>({
        value: "dual_use_classification_unclear",
        verdict: "advisory",
        what: "Dual-use classification unconfirmed — re-screen against the 2025 Annex I update.",
        why: "Whether Reg. 2021/821 Annex I covers your products was answered 'I'm not sure'. The September 2025 'mission equipment' expansion catches operators who last classified years ago — uncertainty here means the screening is due, not that the regulation is inapplicable.",
        wherefore:
          "Commission a dual-use classification against the post-2025 Annex I.",
        whyTrace: [{ questionId: dualUse.id, answerLabel: "I'm not sure" }],
        sources: [EU_DUAL_USE, DUAL_USE_2025_UPDATE],
        cluster: "export_control_sanctions",
        rulebookVersion: RB,
      }),
    );
  }

  const deemed = findCatalogAnswer(answers, Q_DEEMED_EXPORT);
  if (deemed?.answer.state === "answered" && deemed.answer.value === "yes") {
    out.push(
      determinedFinding<string>({
        value: "deemed_export_exposure",
        verdict: "applicable",
        what: "Deemed-export controls apply — non-US/EU nationals access controlled technical data.",
        why: "Under ITAR, releasing controlled technical data to a foreign person — including your own employees — is a deemed export requiring authorisation. International teams in European space companies are the classic exposure.",
        wherefore:
          "Put a technology-control plan in place (data segregation, access rosters, NDA + licensing).",
        whyTrace: [
          {
            questionId: deemed.id,
            answerLabel: answerLabel(answers, Q_DEEMED_EXPORT),
          },
        ],
        confidence: "DETERMINED",
        sources: [ITAR_EAR],
        cluster: "export_control_sanctions",
        rulebookVersion: RB,
      }),
    );
  }

  const sanctions = findCatalogAnswer(answers, Q_SANCTIONS);
  if (sanctions?.answer.state === "answered") {
    const v = String(sanctions.answer.value);
    out.push(
      determinedFinding<string>({
        value: `sanctions_screening_${v}`,
        verdict: "applicable",
        what:
          v === "screening_in_place"
            ? "EU sanctions / end-user screening duties apply — screening is in place; keep it current."
            : "EU sanctions / end-user screening duties apply — your screening has gaps.",
        why: "EU restrictive measures embargo space-sector items to Russia and Belarus and require end-user screening. In 2026 this is the highest-frequency export risk for European space supply chains — ITAR/EAR and dual-use checks do not cover it.",
        wherefore:
          v === "screening_in_place"
            ? "Keep screening lists current with each amendment of Reg. 833/2014 / 765/2006 and retain screening logs."
            : "Stand up systematic sanctions and end-user screening before the next shipment or service activation.",
        whyTrace: [
          {
            questionId: sanctions.id,
            answerLabel: answerLabel(answers, Q_SANCTIONS),
          },
        ],
        confidence: "DETERMINED",
        sources: [EU_SANCTIONS_RU, EU_SANCTIONS_BY],
        cluster: "export_control_sanctions",
        rulebookVersion: RB,
      }),
    );
  } else if (sanctions?.answer.state === "unsure") {
    out.push(
      indeterminateFinding<string>({
        value: "sanctions_screening_unclear",
        verdict: "conditional",
        what: "EU sanctions screening status unconfirmed.",
        why: "Whether systematic sanctions/end-user screening exists was answered 'I'm not sure'. The Russia/Belarus space-sector embargoes apply regardless — an unknown screening posture is a gap to verify, never a pass.",
        wherefore:
          "Audit your screening process against Reg. 833/2014 and Reg. 765/2006.",
        whyTrace: [{ questionId: sanctions.id, answerLabel: "I'm not sure" }],
        sources: [EU_SANCTIONS_RU, EU_SANCTIONS_BY],
        cluster: "export_control_sanctions",
        rulebookVersion: RB,
      }),
    );
  }

  return out;
}

/** Pipeline-emitted advisories: launching-State indemnification (Q8.3 cut —
 *  emitted unconditionally from Q4.8 facts), cislunar planetary protection
 *  (§7.2), constellation brightness (§7.1 #8 — UNVERIFIED citation, no
 *  "Art 72" / "magnitude 7" claims anywhere). */
function advisoryFindings(answers: AnswerMap): AssessmentFinding[] {
  const out: AssessmentFinding[] = [];

  // Launching-State indemnification advisory — unconditional on Q4.8 facts.
  const launchingState = findCatalogAnswer(answers, Q_LAUNCHING_STATE);
  if (launchingState?.answer.state === "answered") {
    out.push(
      determinedFinding<string>({
        value: "launching_state_indemnification_advisory",
        verdict: "advisory",
        what: "Launching-State liability and indemnification exposure — review the recourse arrangements.",
        why: "Under OST Art. VII and the 1972 Liability Convention the launching State(s) — including the State procuring the launch and the State of the launch site — bear international liability for damage caused by your space objects. States routinely pass this exposure back to operators via indemnification clauses and insurance conditions in national law (e.g. FR LOS extraterritorial reach over French operators launching anywhere).",
        wherefore:
          "Identify every launching State for each object and review the indemnification/recourse terms in the applicable national framework and launch contract.",
        whyTrace: [
          {
            questionId: launchingState.id,
            answerLabel: answerLabel(answers, Q_LAUNCHING_STATE),
          },
        ],
        confidence: "DETERMINED",
        sources: [OST_ART_VII, LIABILITY_CONVENTION],
        cluster: "insurance_liability",
        rulebookVersion: RB,
      }),
    );
  }

  // Cislunar / beyond-Earth-orbit planetary-protection advisory (§7.2).
  const regimes = stringValues(catalogAnsweredValue(answers, Q_ORBITS));
  if (regimes.includes("cislunar_beyond")) {
    out.push(
      determinedFinding<string>({
        value: "planetary_protection_advisory",
        verdict: "advisory",
        what: "Cislunar / beyond-Earth-orbit mission — planetary-protection and nuclear-power-source principles apply as advisory baselines.",
        why: "OST Art. IX obliges States to avoid harmful contamination of celestial bodies; the COSPAR Planetary Protection Policy is the recognised technical baseline, and UNGA Res. 47/68 sets the principles for nuclear power sources in outer space. None of these is an EU Space Act obligation — they attach through your launching/authorising State's international commitments.",
        wherefore:
          "Engage your authorising State early on planetary-protection categorisation (and NPS review if applicable) — these reviews are mission-design-level, not paperwork.",
        whyTrace: [
          { questionId: Q_ORBITS, answerLabel: answerLabel(answers, Q_ORBITS) },
        ],
        confidence: "DETERMINED",
        sources: [OST_ART_IX, COSPAR_POLICY, UN_NPS_PRINCIPLES],
        cluster: "environment",
        rulebookVersion: RB,
      }),
    );
  }

  // Brightness advisory (§7.1 #8): constellation ≥10 + LEO. The exact
  // article/figure is UNVERIFIED — ships as an advisory with verified:false,
  // never as a cited mandate (and never any "Art 72" / "magnitude 7" claim).
  const countValue = catalogAnsweredValue(answers, Q_SPACECRAFT_COUNT);
  const tenPlus =
    (typeof countValue === "string" && COUNT_10_PLUS.has(countValue)) ||
    (typeof countValue === "number" && countValue >= 10);
  if (tenPlus && regimes.some(isLeoValue)) {
    out.push(
      determinedFinding<string>({
        value: "constellation_brightness_advisory",
        verdict: "advisory",
        what: "LEO constellation — plan for dark-and-quiet-skies brightness mitigation.",
        why: "Constellations of 10+ spacecraft in LEO face growing regulatory and scientific pressure to mitigate optical brightness and radio leakage (dark-and-quiet-skies agenda). The EU proposal's exact brightness provision and any numeric threshold could NOT be verified against the primary text — this is therefore an advisory, not a cited mandate.",
        wherefore:
          "Track the brightness provisions through the legislative process and engage with the IAU CPS mitigation guidance at design stage.",
        whyTrace: [
          {
            questionId: Q_SPACECRAFT_COUNT,
            answerLabel: answerLabel(answers, Q_SPACECRAFT_COUNT),
          },
          { questionId: Q_ORBITS, answerLabel: answerLabel(answers, Q_ORBITS) },
        ],
        confidence: "PROBABLE",
        sources: [
          {
            label:
              "dark-and-quiet-skies mitigation — exact article/figure pending verification",
            citation:
              "COM(2025) 335 — brightness-mitigation provision pending verification against the primary text",
            asOf: "2025-06-25",
            verified: false,
          },
        ],
        cluster: "debris_safety",
        rulebookVersion: RB,
      }),
    );
  }

  return out;
}

// ─── Assembly ────────────────────────────────────────────────────────────────

const CLUSTER_ORDER: readonly ClusterId[] = [
  "authorization_registration",
  "transfer_change_of_control",
  "debris_safety",
  "resilience_cyber",
  "incident_reporting",
  "environment",
  "insurance_liability",
  "supervision_penalties",
  "spectrum_itu",
  "export_control_sanctions",
  "un_registration",
];

function assembleClusters(findings: AssessmentFinding[]): ObligationCluster[] {
  const byCluster = new Map<ClusterId, AssessmentFinding[]>();
  for (const f of findings) {
    const withEvidence = attachEvidence(f);
    const list = byCluster.get(withEvidence.cluster) ?? [];
    list.push(withEvidence);
    byCluster.set(withEvidence.cluster, list);
  }
  const clusters: ObligationCluster[] = [];
  for (const id of CLUSTER_ORDER) {
    const list = byCluster.get(id);
    if (!list || list.length === 0) continue; // empty clusters are omitted, not padded
    clusters.push({
      id,
      label: CLUSTER_LABELS[id],
      findings: list,
      counts: {
        applicable: list.filter((f) => f.verdict === "applicable").length,
        conditional: list.filter((f) => f.verdict === "conditional").length,
        contested: list.filter((f) => f.verdict === "contested").length,
        advisory: list.filter((f) => f.verdict === "advisory").length,
      },
    });
  }
  return clusters;
}

/** §6 (2): DETERMINED/PROBABLE findings carry per-CLUSTER evidence examples;
 *  INDETERMINATE findings carry none (the gap is explained, not papered over). */
function attachEvidence(f: AssessmentFinding): AssessmentFinding {
  if (f.confidence === "INDETERMINATE" || f.verdict === "not_applicable") {
    if (f.evidenceExamples === undefined) return f;
    const rest = { ...f };
    delete rest.evidenceExamples;
    return rest;
  }
  if (f.evidenceExamples !== undefined) return f;
  const examples = CLUSTER_EVIDENCE_EXAMPLES[f.cluster];
  return examples && examples.length > 0
    ? { ...f, evidenceExamples: examples }
    : f;
}

/** §6 (3): prioritized unknowns from every unsure answer + gateway clarification. */
const HIGH_PRIORITY_PREFIXES = [
  "q9_2",
  "q1_9",
  "q1_2",
  "q4_1",
  "q3_6",
] as const;

const WHAT_ANSWERING_CHANGES: Record<string, string> = {
  q9_2: "Spectrum is existential — the ITU filing stage decides whether your frequencies exist legally; an unfiled band cannot be recovered later.",
  q1_9: "Decides whether the EU Space Act applies at all (Art. 2(3) defence exclusion).",
  q1_2: "Decides territorial scope under the EU Space Act and NIS2 jurisdiction (establishment).",
  q4_1: "Decides third-country market scope — whether EU obligations attach to your services.",
  q3_6: "Decides grandfathering against the (contested) application date.",
};

function extractUnknowns(
  answers: AnswerMap,
  graph: readonly QuestionNode[],
  clarifications: { questionId: string; whatItWouldChange: string }[],
): UnknownToResolve[] {
  const titleById = new Map(graph.map((n) => [n.id, n.title]));
  const out = new Map<string, UnknownToResolve>();

  for (const c of clarifications) {
    out.set(c.questionId, {
      questionId: c.questionId,
      question: titleById.get(c.questionId) ?? c.questionId,
      whatAnsweringChanges: c.whatItWouldChange,
      priority: "high", // gateway-decisive by construction (Task 1.7)
    });
  }

  for (const [id, answer] of Object.entries(answers)) {
    if (answer.state !== "unsure" || out.has(id)) continue;
    const prefix = HIGH_PRIORITY_PREFIXES.find(
      (p) => id === p || id.startsWith(`${p}_`),
    );
    out.set(id, {
      questionId: id,
      question: titleById.get(id) ?? id,
      whatAnsweringChanges:
        (prefix && WHAT_ANSWERING_CHANGES[prefix]) ??
        "Answering narrows the obligation set and raises confidence for every finding that depends on it.",
      priority: prefix ? "high" : "medium",
    });
  }

  return [...out.values()].sort((a, b) =>
    a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1,
  );
}

/** Final completeness guard — no incomplete envelope ships (invariant #5). */
function finalize(result: ObligationMapResult): ObligationMapResult {
  const all: AssessmentFinding[] = [
    ...result.scope,
    result.nis2Gateway,
    result.regime,
    ...result.clusters.flatMap((c) => c.findings),
  ];
  for (const f of all) {
    const missing = isFindingComplete(f);
    if (missing.length > 0) {
      throw new Error(
        `verdict-pipeline: incomplete finding envelope (missing: ${missing.join(", ")}) — refusing to ship (what="${f.what}").`,
      );
    }
  }
  return result;
}

// ─── Quick-tier projection (plan Task 2.2 — §6b) ─────────────────────────────
//
// The PUBLIC quick tier shows COUNTS + HEADLINES, never full finding bodies:
// scope verdicts + regime direction + NIS2 gateway badge ship as complete
// envelopes (they ARE the quick verdict and the user must be able to read
// why), while every CLUSTER is redacted to its counts and ONE headline.
// The unknowns list is redacted to a COUNT (the full-tier CTA's "your N
// unknowns"). Aggregation disclosures are NEVER dropped — a most-restrictive
// merge must stay visible at every tier (honesty over conversion).
//
// The wire response of /api/assessment/v2/quick is ALWAYS this projection;
// the stored AssessmentVerdictSnapshot keeps the full ObligationMapResult as
// server-side substrate (email-gated quick PDF, Task 2.4).

/** Redacted finding headline — keeps the citation + rulebook pin (invariant 5). */
export interface QuickFindingHeadline {
  what: string;
  verdict: FindingVerdict;
  confidence: FindingConfidence;
  cluster: ClusterId;
  sources: FindingSource[];
  /** Founder §11.4: collapsed chip only — positions/scenario tables are
   *  full-tier / PDF-appendix surfaces, never the public quick wire shape. */
  contested: boolean;
  fluxSummary?: string;
  rulebookVersion: string;
}

export interface QuickClusterSummary {
  id: ClusterId;
  label: string;
  counts: ObligationCluster["counts"];
  findingsCount: number;
  topFinding: QuickFindingHeadline | null;
}

export interface QuickVerdictProjection {
  kind: "quick_projection";
  rulebookVersion: string;
  computedAt: string;
  scope: AssessmentFinding[];
  nis2Gateway: AssessmentFinding<NIS2GatewayClassification>;
  regime: RegimeResult["finding"];
  clusters: QuickClusterSummary[];
  unknownsCount: number;
  aggregationDisclosures: string[];
}

/** Most actionable first: hard obligations beat advisories; certainty beats doubt. */
const QUICK_VERDICT_ORDER: Record<FindingVerdict, number> = {
  applicable: 0,
  contested: 1,
  conditional: 2,
  advisory: 3,
  not_applicable: 4,
};

const QUICK_CONFIDENCE_ORDER: Record<FindingConfidence, number> = {
  DETERMINED: 0,
  PROBABLE: 1,
  INDETERMINATE: 2,
};

/** Full-tier value (`evidenceExamples`, §6 (2)) never ships on the quick wire. */
function stripEvidenceExamples<T>(
  finding: AssessmentFinding<T>,
): AssessmentFinding<T> {
  const { evidenceExamples: _evidenceExamples, ...rest } = finding;
  void _evidenceExamples;
  return rest as AssessmentFinding<T>;
}

function toQuickHeadline(finding: AssessmentFinding): QuickFindingHeadline {
  return {
    what: finding.what,
    verdict: finding.verdict,
    confidence: finding.confidence,
    cluster: finding.cluster,
    sources: finding.sources.map((s) => ({ ...s })),
    contested: finding.fluxFlag !== undefined,
    ...(finding.fluxFlag !== undefined
      ? { fluxSummary: finding.fluxFlag.summary }
      : {}),
    rulebookVersion: finding.rulebookVersion,
  };
}

function topQuickFinding(
  findings: readonly AssessmentFinding[],
): QuickFindingHeadline | null {
  if (findings.length === 0) return null;
  let top = findings[0];
  for (const f of findings.slice(1)) {
    const byVerdict =
      QUICK_VERDICT_ORDER[f.verdict] - QUICK_VERDICT_ORDER[top.verdict];
    if (
      byVerdict < 0 ||
      (byVerdict === 0 &&
        QUICK_CONFIDENCE_ORDER[f.confidence] <
          QUICK_CONFIDENCE_ORDER[top.confidence])
    ) {
      top = f;
    }
  }
  return toQuickHeadline(top);
}

/**
 * Project a full ObligationMapResult onto the public quick-tier wire shape.
 * Pure — recomputes nothing; redaction only. NO key in the projection
 * matches /score/i (invariant 6) and the unknowns ship as a COUNT.
 */
export function buildQuickProjection(
  result: ObligationMapResult,
): QuickVerdictProjection {
  return {
    kind: "quick_projection",
    rulebookVersion: result.rulebookVersion,
    computedAt: result.computedAt,
    scope: result.scope.map(stripEvidenceExamples),
    nis2Gateway: stripEvidenceExamples(result.nis2Gateway),
    regime: stripEvidenceExamples(result.regime),
    clusters: result.clusters.map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      counts: { ...cluster.counts },
      findingsCount: cluster.findings.length,
      topFinding: topQuickFinding(cluster.findings),
    })),
    unknownsCount: result.unknowns.length,
    aggregationDisclosures: [...result.aggregationDisclosures],
  };
}
