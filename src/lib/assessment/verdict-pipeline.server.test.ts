/**
 * Verdict pipeline tests (plan Task 1.9) — codify the §5/§7 pipeline contract:
 *
 *   - ordering: NIS2 gateway runs BEFORE the Space Act engine (injected spies);
 *     the cyber routing finding ALWAYS carries the cyberArchitecture flux flag.
 *   - empty answers → SubmissionInvalidError NAMING the missing questions
 *     (invariant 3 — never a verdict).
 *   - defense-only → out-of-scope with ZERO cluster findings + cited gate finding.
 *   - multi-role → calculateCompliance per role, merged via the EXISTING merger.
 *   - no fabricated findings: no overlaps → [] + noneIdentifiedOverlaps:true.
 *   - launching-State advisory unconditional on Q4.8 facts (Q8.3 cut).
 *   - cislunar advisory (OST Art IX / COSPAR / UN NPS Principles).
 *   - brightness advisory: verified:false, NO "Art 72"/"magnitude 7" strings.
 *   - heterogeneous fleet → aggregationDisclosures names most-restrictive merge.
 *   - national incident duties FR/UK ONLY on jurisdiction nexus (§7.2).
 *   - evidenceExamples on DETERMINED/PROBABLE, never on INDETERMINATE (§6 (2)).
 *   - UK engine failure → VISIBLE fidelity flag, never silent full confidence.
 *   - result JSON has NO key matching /score/i; rulebookVersion everywhere.
 *   - every finding passes isFindingComplete.
 *
 * Tests inject a synthetic question graph (the pipeline's graph dep) so this
 * suite is independent of the parallel dataset lane (Tasks 1.5/1.6); the ids
 * and option values used are the plan-pinned graph contract.
 *
 * NOT executed here — the orchestrator runs the suite centrally.
 */

import { describe, it, expect, vi } from "vitest";

import {
  runVerdictPipeline,
  SubmissionInvalidError,
  ContradictionError,
  CLUSTER_EVIDENCE_EXAMPLES,
  type ObligationMapResult,
  type VerdictPipelineDeps,
  type JurisdictionFindingValue,
} from "./verdict-pipeline.server";
import type { AnswerMap, TriStateAnswer } from "./answers";
import type { AssessmentFinding } from "./finding";
import {
  classifyNIS2Gateway,
  gatewayInputFromAnswers,
} from "./nis2-gateway.server";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
} from "@/lib/engine.server";
import { mergeMultiActivityResults } from "@/lib/unified-engine-merger.server";
import type { calculateSpaceLawCompliance } from "@/lib/space-law-engine.server";
import type { getApplicableSpectrumRequirements } from "@/lib/spectrum-engine.server";
import { RULEBOOK, CONTESTED_POSITIONS } from "@/data/assessment/rulebook";
import type { QuestionNode } from "@/data/assessment/question-graph-types";

// ─── Synthetic question graph (plan-pinned ids + option values) ──────────────

const CITE = [
  {
    label: "EU Space Act proposal — Commission text",
    citation: "COM(2025) 335",
    asOf: "2025-06-25",
    verified: true,
  },
];

function node(
  partial: Partial<QuestionNode> & Pick<QuestionNode, "id" | "kind">,
): QuestionNode {
  return {
    section: "identity_role",
    tier: "both",
    title: partial.id,
    why: `why ${partial.id}`,
    citation: CITE,
    unsureMode: "option",
    ...partial,
  } as QuestionNode;
}

const SCO_ONLY = {
  q: "q1_1_roles",
  op: "includes",
  value: "spacecraft_operator",
} as const;

const GRAPH: readonly QuestionNode[] = [
  node({
    id: "q1_1_roles",
    kind: "multi",
    options: [
      { value: "spacecraft_operator", label: "Spacecraft operator" },
      { value: "launch_operator", label: "Launch operator" },
      { value: "launch_site_operator", label: "Launch-site operator" },
      { value: "isos_provider", label: "In-space service provider" },
      { value: "collision_avoidance_provider", label: "CA/SSA provider" },
      { value: "primary_data_provider", label: "Primary data provider" },
      { value: "ground_segment_operator", label: "Ground-segment operator" },
      { value: "hosted_payload_owner", label: "Hosted-payload owner" },
      { value: "reseller_distributor", label: "Reseller-distributor" },
      { value: "component_supplier", label: "Component supplier" },
    ],
  }),
  node({
    id: "q1_2_establishment",
    kind: "single",
    options: [
      { value: "eu", label: "EU" },
      { value: "uk", label: "UK" },
      { value: "us", label: "US" },
      { value: "other", label: "Other" },
    ],
  }),
  node({
    id: "q1_4_org_type",
    kind: "single",
    options: [
      { value: "commercial", label: "Commercial company" },
      { value: "research_edu", label: "Research or educational institution" },
      { value: "public_body", label: "Public body / agency" },
      { value: "igo", label: "IGO" },
    ],
  }),
  node({
    id: "q1_5_headcount",
    kind: "bands",
    screenGroup: "q1_5_size",
    options: [
      { value: "h_1_9", label: "1–9" },
      { value: "h_10_49", label: "10–49" },
      { value: "h_50_249", label: "50–249" },
      { value: "h_250_plus", label: "250 or more" },
    ],
  }),
  node({
    id: "q1_5_turnover",
    kind: "bands",
    screenGroup: "q1_5_size",
    options: [
      { value: "t_lt_2m", label: "Under €2M" },
      { value: "t_2_10m", label: "€2–10M" },
      { value: "t_10_50m", label: "€10–50M" },
      { value: "t_gt_50m", label: "Over €50M" },
    ],
  }),
  node({
    id: "q1_6_balance_sheet",
    kind: "bands",
    tier: "full",
    options: [
      { value: "bs_le_10m", label: "≤€10M" },
      { value: "bs_le_43m", label: "≤€43M" },
      { value: "bs_gt_43m", label: ">€43M" },
    ],
  }),
  node({
    id: "q1_7_group",
    kind: "single",
    tier: "full",
    options: [
      { value: "yes", label: "Part of a group / linked enterprises" },
      { value: "no", label: "Independent" },
    ],
  }),
  node({
    id: "q1_9_defense_exclusivity",
    kind: "single",
    options: [
      {
        value: "exclusively_defense",
        label: "Yes — exclusively defence / national security",
      },
      {
        value: "dual_use",
        label: "Partially — dual-use or mixed civil/defence",
      },
      { value: "no", label: "No — civil / commercial" },
    ],
  }),
  node({
    id: "q2_1_spacecraft_count",
    kind: "bands",
    showIf: SCO_ONLY,
    options: [
      { value: "c_1", label: "1" },
      { value: "c_2_9", label: "2–9" },
      { value: "c_10_99", label: "10–99" },
      { value: "c_100_999", label: "100–999" },
      { value: "c_1000_plus", label: "1000+" },
    ],
  }),
  node({
    id: "q3_1_orbital_regimes",
    kind: "multi",
    showIf: SCO_ONLY,
    options: [
      { value: "leo", label: "LEO" },
      { value: "meo", label: "MEO" },
      { value: "geo", label: "GEO" },
      { value: "heo_sso", label: "HEO-SSO" },
      { value: "cislunar_beyond", label: "Cislunar / beyond" },
    ],
  }),
  node({
    id: "q3_6_launch_timing",
    kind: "single",
    options: [
      {
        value: "all_before",
        label: "All assets launch before the application date",
      },
      { value: "some_or_all_after", label: "Some or all launch after it" },
    ],
  }),
  node({
    id: "q4_1_eu_nexus",
    kind: "single",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  }),
  node({
    id: "q4_3_ground_segment",
    kind: "single",
    options: [
      { value: "own", label: "Own ground stations" },
      { value: "outsourced", label: "Third-party GSaaS" },
      { value: "none", label: "None" },
    ],
  }),
  node({
    id: "q4_3b_ground_countries",
    kind: "country_multi",
    tier: "full",
    showIf: {
      q: "q4_3_ground_segment",
      op: "in",
      value: ["own", "outsourced"],
    },
  }),
  node({
    id: "q4_4_licenses_held",
    kind: "multi",
    options: [
      { value: "none", label: "None" },
      { value: "fr_los", label: "FR (LOS)" },
      { value: "uk_sia_osa", label: "UK (SIA-OSA)" },
      { value: "it_law_89_2025", label: "IT (Law 89/2025)" },
      { value: "lu", label: "LU" },
      { value: "nl", label: "NL" },
    ],
  }),
  node({
    id: "q4_5_considered_jurisdictions",
    kind: "country_multi",
    tier: "full",
  }),
  node({
    id: "q6_1_public_ecn",
    kind: "single",
    tier: "full",
    showIf: { q: "q4_3_ground_segment", op: "eq", value: "own" },
    options: [
      { value: "yes", label: "Yes — public ECN provider" },
      { value: "no", label: "No" },
    ],
  }),
  node({
    id: "q4_8_launching_state",
    kind: "text",
    tier: "full",
    showIf: SCO_ONLY,
  }),
  node({
    id: "q4_9_un_registration",
    kind: "single",
    tier: "full",
    showIf: SCO_ONLY,
    options: [
      { value: "registered", label: "Registered" },
      { value: "pending", label: "Pending" },
      { value: "not_registered", label: "Not registered" },
    ],
  }),
  node({
    id: "q4_10_transfer_change_of_control",
    kind: "single",
    tier: "full",
    showIf: SCO_ONLY,
    options: [
      { value: "transfer_out", label: "Sale / transfer planned" },
      { value: "acquisition", label: "Acquisition planned" },
      { value: "change_of_control", label: "Change of control planned" },
      { value: "no", label: "No" },
    ],
  }),
  node({
    id: "q9_1_rf_spectrum",
    kind: "single",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  }),
  node({
    id: "q9_2_itu_filing",
    kind: "single",
    tier: "full",
    showIf: { q: "q9_1_rf_spectrum", op: "eq", value: "yes" },
    options: [
      { value: "none", label: "None" },
      { value: "advance_publication", label: "Advance publication" },
      { value: "coordination", label: "Coordination" },
      { value: "notified", label: "Notified" },
      { value: "recorded_mifr", label: "Recorded in MIFR" },
    ],
  }),
  node({
    id: "q9_4_us_origin",
    kind: "single",
    tier: "full",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  }),
  node({
    id: "q9_7_sanctions_screening",
    kind: "single",
    tier: "full",
    options: [
      { value: "screening_in_place", label: "Systematic screening in place" },
      { value: "partial", label: "Partial" },
      { value: "none", label: "No screening" },
    ],
  }),
];

// ─── Answer helpers ──────────────────────────────────────────────────────────

const a = (value: string | string[] | boolean | number): TriStateAnswer => ({
  state: "answered",
  value,
});
const unsure: TriStateAnswer = { state: "unsure" };
const notAsked: TriStateAnswer = { state: "not_asked" };

/** Full-tier EU spacecraft operator with every visible question answered —
 *  NIS2 cleanly essential (EU + own ground segment + 250+ headcount). */
function baseAnswers(overrides: AnswerMap = {}): AnswerMap {
  return {
    q1_1_roles: a(["spacecraft_operator"]),
    q1_2_establishment: a("eu"),
    q1_4_org_type: a("commercial"),
    q1_5_headcount: a("h_250_plus"),
    q1_5_turnover: a("t_gt_50m"),
    q1_6_balance_sheet: a("bs_gt_43m"),
    q1_7_group: a("no"),
    q1_9_defense_exclusivity: a("no"),
    q2_1_spacecraft_count: a("c_2_9"),
    q3_1_orbital_regimes: a(["leo"]),
    q3_6_launch_timing: a("some_or_all_after"),
    q4_1_eu_nexus: a("yes"),
    q4_3_ground_segment: a("own"),
    q4_3b_ground_countries: a(["de"]),
    q4_4_licenses_held: a(["none"]),
    q4_5_considered_jurisdictions: a([]),
    q6_1_public_ecn: a("no"),
    q4_8_launching_state: a("US launch provider, French launch site"),
    q4_9_un_registration: a("registered"),
    q4_10_transfer_change_of_control: a("no"),
    q9_1_rf_spectrum: a("yes"),
    q9_2_itu_filing: a("recorded_mifr"),
    q9_4_us_origin: a("no"),
    q9_7_sanctions_screening: a("screening_in_place"),
    ...overrides,
  };
}

/** Launch-operator-only profile: spacecraft-only branch hidden → not_asked. */
function launchOperatorAnswers(overrides: AnswerMap = {}): AnswerMap {
  return baseAnswers({
    q1_1_roles: a(["launch_operator"]),
    q2_1_spacecraft_count: notAsked,
    q3_1_orbital_regimes: notAsked,
    q4_8_launching_state: notAsked,
    q4_9_un_registration: notAsked,
    q4_10_transfer_change_of_control: notAsked,
    ...overrides,
  });
}

// ─── Default deps (synthetic graph + light stubs for the slow externals) ────

const STUB_SPECTRUM_REQ = {
  id: "itu-api-filing",
  title: "Advance Publication Information filing",
  description:
    "File API with the notifying administration before bringing into use.",
  source: "ITU",
  category: "filing",
  frequencyBands: [],
  serviceTypes: [],
  orbitTypes: [],
  riskLevel: "high",
  isMandatory: true,
  reference: "ITU RR Art. 9",
  complianceActions: ["File the API via your notifying administration."],
  documentationRequired: [],
};

function makeDeps(overrides: VerdictPipelineDeps = {}): VerdictPipelineDeps {
  return {
    graph: GRAPH,
    calculateSpaceLaw: (async () => ({
      jurisdictions: [],
      comparisonMatrix: {},
      euSpaceActPreview: {},
      recommendations: [],
    })) as unknown as typeof calculateSpaceLawCompliance,
    getSpectrumRequirements: (() => [
      STUB_SPECTRUM_REQ,
    ]) as unknown as typeof getApplicableSpectrumRequirements,
    ukProbe: async () => undefined,
    ...overrides,
  };
}

function allFindings(result: ObligationMapResult): AssessmentFinding[] {
  return [
    ...result.scope,
    result.nis2Gateway,
    result.regime,
    ...result.clusters.flatMap((c) => c.findings),
  ];
}

function clusterById(result: ObligationMapResult, id: string) {
  return result.clusters.find((c) => c.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1 — server-enforced validation (honesty invariant 3)
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — submission validation", () => {
  it("throws SubmissionInvalidError listing the missing questions on an empty payload — never a verdict", async () => {
    await expect(
      runVerdictPipeline({ answers: {}, tier: "full" }, makeDeps()),
    ).rejects.toBeInstanceOf(SubmissionInvalidError);

    const err = await runVerdictPipeline(
      { answers: {}, tier: "full" },
      makeDeps(),
    ).catch((e) => e as SubmissionInvalidError);
    expect(err).toBeInstanceOf(SubmissionInvalidError);
    const missingIds = (err as SubmissionInvalidError).errors
      .filter((e) => e.code === "missing")
      .map((e) => e.questionId);
    expect(missingIds).toContain("q1_1_roles");
    expect(missingIds).toContain("q1_9_defense_exclusivity");
    expect(missingIds).toContain("q3_6_launch_timing");
    // every error names its question
    for (const e of (err as SubmissionInvalidError).errors) {
      expect(e.questionId.length).toBeGreaterThan(0);
      expect(e.message).toContain(e.questionId);
    }
  });

  it("throws SubmissionInvalidError on a PARTIAL payload naming exactly the gap", async () => {
    const answers = baseAnswers();
    delete answers.q9_1_rf_spectrum;
    delete answers.q9_2_itu_filing; // hidden once q9_1 is missing
    const err = await runVerdictPipeline(
      { answers, tier: "full" },
      makeDeps(),
    ).catch((e) => e as SubmissionInvalidError);
    expect(err).toBeInstanceOf(SubmissionInvalidError);
    expect(
      (err as SubmissionInvalidError).errors.map((e) => e.questionId),
    ).toContain("q9_1_rf_spectrum");
  });

  it("throws ContradictionError naming the contradictory pair (blocks the verdict)", async () => {
    const answers = baseAnswers({
      q1_2_establishment: a("us"),
      q4_1_eu_nexus: a("no"),
      q4_3b_ground_countries: a(["de"]), // EU ground segment vs "no EU nexus"
    });
    const err = await runVerdictPipeline(
      { answers, tier: "full" },
      makeDeps(),
    ).catch((e) => e as ContradictionError);
    expect(err).toBeInstanceOf(ContradictionError);
    expect((err as ContradictionError).contradictions[0].questionIds).toContain(
      "q4_1_eu_nexus",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2 — applicability gates (short-circuits)
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — gate short-circuits", () => {
  it("defense-only → out-of-scope result with ZERO cluster findings and the cited gate finding", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({
          q1_9_defense_exclusivity: a("exclusively_defense"),
        }),
        tier: "full",
      },
      makeDeps(),
    );
    expect(result.clusters).toEqual([]);
    expect(result.scope.length).toBeGreaterThan(0);
    const gate = result.scope[0];
    expect(gate.verdict).toBe("not_applicable");
    expect(gate.confidence).toBe("DETERMINED");
    expect(gate.sources.some((s) => s.citation.includes("Art. 2(3)"))).toBe(
      true,
    );
    expect(result.noneIdentifiedOverlaps).toBe(true);
    expect(result.crossFrameworkOverlaps).toEqual([]);
  });

  it("all_before launch timing → SOFT short-circuit keeping the 3-position flux scenario", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q3_6_launch_timing: a("all_before") }),
        tier: "full",
      },
      makeDeps(),
    );
    expect(result.clusters).toEqual([]);
    const gate = result.scope[0];
    expect(gate.confidence).toBe("PROBABLE"); // never an unqualified hard verdict
    expect(gate.fluxFlag).toBeDefined();
    expect(gate.fluxFlag?.positions).toHaveLength(3);
  });

  it("short-circuit paths say explicitly that the NIS2 gateway was NOT evaluated (no silent clean negative)", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q3_6_launch_timing: a("all_before") }),
        tier: "full",
      },
      makeDeps(),
    );
    expect(result.nis2Gateway.confidence).toBe("INDETERMINATE");
    expect(result.nis2Gateway.value).toBe("needs_clarification");
    expect(result.nis2Gateway.why.toLowerCase()).toContain("independent");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stage ordering + engines
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — ordering and engine composition", () => {
  it("runs the NIS2 gateway BEFORE the Space Act engine (§5 stage 2)", async () => {
    const order: string[] = [];
    const gatewaySpy = vi.fn(
      (input: Parameters<typeof classifyNIS2Gateway>[0]) => {
        order.push("gateway");
        return classifyNIS2Gateway(input);
      },
    );
    const calcSpy = vi.fn((...args: Parameters<typeof calculateCompliance>) => {
      order.push("engine");
      return calculateCompliance(...args);
    });
    await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps({
        classifyGateway: gatewaySpy as typeof classifyNIS2Gateway,
        calculateCompliance: calcSpy as typeof calculateCompliance,
      }),
    );
    expect(order[0]).toBe("gateway");
    expect(order.indexOf("gateway")).toBeLessThan(order.indexOf("engine"));
  });

  it("the cyber-cluster routing finding ALWAYS carries the cyberArchitecture flux flag (§7.1 #2)", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    const cyber = clusterById(result, "resilience_cyber");
    expect(cyber).toBeDefined();
    const routing = cyber?.findings.find(
      (f) => f.value === "cyber_regime_routing_contested",
    );
    expect(routing).toBeDefined();
    expect(routing?.verdict).toBe("contested");
    expect(routing?.fluxFlag).toBeDefined();
    expect(routing?.fluxFlag?.positions).toHaveLength(
      CONTESTED_POSITIONS.cyberArchitecture.length,
    );
    expect(routing?.fluxFlag?.summary).toContain("contested");
  });

  it("multi-role: calculateCompliance is invoked per role and merged via the EXISTING merger", async () => {
    const calcSpy = vi.fn((...args: Parameters<typeof calculateCompliance>) =>
      calculateCompliance(...args),
    );
    const mergeSpy = vi.fn(
      (...args: Parameters<typeof mergeMultiActivityResults>) =>
        mergeMultiActivityResults(...args),
    );
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({
          q1_1_roles: a(["spacecraft_operator", "launch_operator"]),
        }),
        tier: "full",
      },
      makeDeps({
        calculateCompliance: calcSpy as typeof calculateCompliance,
        mergeResults: mergeSpy as typeof mergeMultiActivityResults,
      }),
    );
    expect(calcSpy).toHaveBeenCalledTimes(2);
    const activityTypes = calcSpy.mock.calls.map((c) => c[0].activityType);
    expect(activityTypes).toContain("spacecraft");
    expect(activityTypes).toContain("launch_vehicle");
    expect(mergeSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy.mock.calls[0][0]).toHaveLength(2);
    expect(result.clusters.length).toBeGreaterThan(0);
  });

  it("loads the real engine data and produces module findings for an in-scope operator", async () => {
    // sanity: the default data loader works against the repo dataset
    expect(loadSpaceActDataFromDisk().metadata.total_articles).toBeGreaterThan(
      0,
    );
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    const auth = clusterById(result, "authorization_registration");
    expect(auth).toBeDefined();
    expect(auth!.findings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Invariant 4 — no fabricated findings
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — no fabricated findings", () => {
  it("no cross-engine overlaps → crossFrameworkOverlaps [] + noneIdentifiedOverlaps true", async () => {
    // NIS2 honestly out of scope (no ground infrastructure — Annex I Sector 11
    // attaches to ground-infrastructure operators) → no overlap exists.
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({
          q4_3_ground_segment: a("none"),
          q4_3b_ground_countries: notAsked,
          q6_1_public_ecn: notAsked, // hidden once ground segment is "none"
        }),
        tier: "full",
      },
      makeDeps(),
    );
    expect(result.nis2Gateway.value).toBe("out_of_scope");
    expect(result.crossFrameworkOverlaps).toEqual([]);
    expect(result.noneIdentifiedOverlaps).toBe(true);
  });

  it("NIS2 essential + Space Act in scope → computed overlaps, marker false", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    expect(result.crossFrameworkOverlaps.length).toBeGreaterThan(0);
    expect(result.noneIdentifiedOverlaps).toBe(false);
    for (const o of result.crossFrameworkOverlaps) {
      expect(o.euSpaceActRef.length).toBeGreaterThan(0);
      expect(o.nis2Ref.length).toBeGreaterThan(0);
    }
  });

  it("no FR/UK nexus → NO national incident-duty findings (none fabricated)", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" }, // licenses: none, considered: []
      makeDeps(),
    );
    const incident = clusterById(result, "incident_reporting");
    const national = (incident?.findings ?? []).filter((f) => {
      const v = f.value as Partial<JurisdictionFindingValue> | string;
      return typeof v === "object" && v !== null && "jurisdiction" in v;
    });
    expect(national).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// National incident duties (§7.2 — the incident cluster is NOT NIS2-only)
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — national incident duties on jurisdiction nexus", () => {
  it("held FR license → FR LOS incident-notification finding, cited and flagged per jurisdiction", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q4_4_licenses_held: a(["fr_los"]) }),
        tier: "full",
      },
      makeDeps(),
    );
    const incident = clusterById(result, "incident_reporting");
    const fr = incident?.findings.find(
      (f) => (f.value as JurisdictionFindingValue)?.jurisdiction === "FR",
    );
    expect(fr).toBeDefined();
    expect(fr!.sources.some((s) => s.citation.includes("2008-518"))).toBe(true);
    expect((fr!.value as JurisdictionFindingValue).nexus).toBe("held_license");
  });

  it("UK held → UK SIA/OSA occurrence-reporting finding (CAA)", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q4_4_licenses_held: a(["uk_sia_osa"]) }),
        tier: "full",
      },
      makeDeps(),
    );
    const incident = clusterById(result, "incident_reporting");
    const uk = incident?.findings.find(
      (f) => (f.value as JurisdictionFindingValue)?.jurisdiction === "UK",
    );
    expect(uk).toBeDefined();
    expect(
      uk!.sources.some((s) => s.citation.includes("Space Industry Act 2018")),
    ).toBe(true);
    expect(`${uk!.what} ${uk!.why}`).toContain("CAA");
  });

  it("UK merely CONSIDERED (Q4.5) also triggers the UK occurrence-reporting finding", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q4_5_considered_jurisdictions: a(["uk"]) }),
        tier: "full",
      },
      makeDeps(),
    );
    const incident = clusterById(result, "incident_reporting");
    const uk = incident?.findings.find(
      (f) => (f.value as JurisdictionFindingValue)?.jurisdiction === "UK",
    );
    expect(uk).toBeDefined();
    expect((uk!.value as JurisdictionFindingValue).nexus).toBe("considered");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UK fidelity flag (§3 [d])
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — UK engine fidelity", () => {
  it("a UK-engine failure → VISIBLE degraded_generic_fallback fidelity + caveat, never full confidence", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q4_4_licenses_held: a(["uk_sia_osa"]) }),
        tier: "full",
      },
      makeDeps({
        ukProbe: async () => {
          throw new Error("UK engine exploded");
        },
      }),
    );
    const auth = clusterById(result, "authorization_registration");
    const uk = auth?.findings.find(
      (f) => (f.value as JurisdictionFindingValue)?.jurisdiction === "UK",
    );
    expect(uk).toBeDefined();
    expect((uk!.value as JurisdictionFindingValue).fidelity).toBe(
      "degraded_generic_fallback",
    );
    expect(uk!.why.toLowerCase()).toContain("degraded");
    expect(uk!.confidence).not.toBe("DETERMINED"); // never silent full confidence
  });

  it("a healthy UK engine → fidelity 'full'", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q4_4_licenses_held: a(["uk_sia_osa"]) }),
        tier: "full",
      },
      makeDeps(),
    );
    const auth = clusterById(result, "authorization_registration");
    const uk = auth?.findings.find(
      (f) => (f.value as JurisdictionFindingValue)?.jurisdiction === "UK",
    );
    expect((uk!.value as JurisdictionFindingValue).fidelity).toBe("full");
    expect(uk!.confidence).toBe("DETERMINED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline advisories (§7.1 #8, §7.2, Q8.3 cut)
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — advisories", () => {
  it("launching-State indemnification advisory is emitted UNCONDITIONALLY from Q4.8 facts", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    const insurance = clusterById(result, "insurance_liability");
    const advisory = insurance?.findings.find(
      (f) => f.value === "launching_state_indemnification_advisory",
    );
    expect(advisory).toBeDefined();
    expect(advisory!.verdict).toBe("advisory");
    expect(advisory!.sources.some((s) => s.citation.includes("Art. VII"))).toBe(
      true,
    );
  });

  it("Q4.8 not asked → the indemnification advisory is ABSENT", async () => {
    const result = await runVerdictPipeline(
      { answers: launchOperatorAnswers(), tier: "full" },
      makeDeps(),
    );
    const findings = allFindings(result);
    expect(
      findings.find(
        (f) => f.value === "launching_state_indemnification_advisory",
      ),
    ).toBeUndefined();
  });

  it("cislunar_beyond orbit → planetary-protection advisory with OST IX / COSPAR / UN NPS citations", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({
          q3_1_orbital_regimes: a(["leo", "cislunar_beyond"]),
        }),
        tier: "full",
      },
      makeDeps(),
    );
    const env = clusterById(result, "environment");
    const advisory = env?.findings.find(
      (f) => f.value === "planetary_protection_advisory",
    );
    expect(advisory).toBeDefined();
    const citations = advisory!.sources.map((s) => s.citation).join(" | ");
    expect(citations).toContain("Art. IX");
    expect(citations).toContain("COSPAR");
    expect(citations).toContain("47/68");
  });

  it("no cislunar orbit → no planetary-protection advisory (none fabricated)", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    expect(
      allFindings(result).find(
        (f) => f.value === "planetary_protection_advisory",
      ),
    ).toBeUndefined();
  });

  it("brightness advisory (constellation ≥10 + LEO): verified:false citation, NO 'Art 72' / 'magnitude 7'", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q2_1_spacecraft_count: a("c_10_99") }),
        tier: "full",
      },
      makeDeps(),
    );
    const debris = clusterById(result, "debris_safety");
    const advisory = debris?.findings.find(
      (f) => f.value === "constellation_brightness_advisory",
    );
    expect(advisory).toBeDefined();
    expect(advisory!.verdict).toBe("advisory");
    expect(advisory!.sources).toHaveLength(1);
    expect(advisory!.sources[0].verified).toBe(false);
    expect(advisory!.sources[0].label).toContain("pending verification");
    const text = JSON.stringify(advisory);
    expect(text).not.toMatch(/Art\.?\s*72/);
    expect(text).not.toMatch(/magnitude\s*7/i);
    // the unverified figure must not appear ANYWHERE in the result either
    expect(JSON.stringify(result)).not.toMatch(/magnitude\s*7/i);
  });

  it("below the constellation threshold (or non-LEO) → no brightness advisory", async () => {
    const small = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" }, // c_2_9
      makeDeps(),
    );
    expect(
      allFindings(small).find(
        (f) => f.value === "constellation_brightness_advisory",
      ),
    ).toBeUndefined();

    const geo = await runVerdictPipeline(
      {
        answers: baseAnswers({
          q2_1_spacecraft_count: a("c_10_99"),
          q3_1_orbital_regimes: a(["geo"]),
        }),
        tier: "full",
      },
      makeDeps(),
    );
    expect(
      allFindings(geo).find(
        (f) => f.value === "constellation_brightness_advisory",
      ),
    ).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Heterogeneous fleets (§7.2)
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — heterogeneous-fleet disclosure", () => {
  it("multiple orbital regimes → aggregationDisclosures names the most-restrictive merge", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({ q3_1_orbital_regimes: a(["leo", "geo"]) }),
        tier: "full",
      },
      makeDeps(),
    );
    expect(result.aggregationDisclosures.length).toBeGreaterThan(0);
    expect(result.aggregationDisclosures[0]).toMatch(/most restrictive/i);
    expect(result.aggregationDisclosures[0]).toContain("LEO");
  });

  it("a single regime → no aggregation disclosure", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    expect(result.aggregationDisclosures).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Evidence examples (§6 (2))
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — evidence examples", () => {
  it("a DETERMINED applicable finding in resilience_cyber carries non-empty evidenceExamples from CLUSTER_EVIDENCE_EXAMPLES", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    const cyber = clusterById(result, "resilience_cyber");
    const determinedApplicable = cyber?.findings.find(
      (f) => f.confidence === "DETERMINED" && f.verdict === "applicable",
    );
    expect(determinedApplicable).toBeDefined();
    expect(determinedApplicable!.evidenceExamples).toEqual(
      CLUSTER_EVIDENCE_EXAMPLES.resilience_cyber,
    );
    expect(determinedApplicable!.evidenceExamples!.length).toBeGreaterThan(0);
  });

  it("INDETERMINATE findings carry NO evidenceExamples", async () => {
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({
          q9_4_us_origin: unsure, // → INDETERMINATE screening advisory
          q9_2_itu_filing: unsure,
        }),
        tier: "full",
      },
      makeDeps(),
    );
    const indeterminate = allFindings(result).filter(
      (f) => f.confidence === "INDETERMINATE",
    );
    expect(indeterminate.length).toBeGreaterThan(0);
    for (const f of indeterminate) {
      expect(f.evidenceExamples).toBeUndefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unknowns extraction (§6 (3))
// ─────────────────────────────────────────────────────────────────────────────

describe("runVerdictPipeline — unknowns", () => {
  it("an unsure ITU filing (Q9.2) becomes a HIGH-priority unknown (spectrum is existential)", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers({ q9_2_itu_filing: unsure }), tier: "full" },
      makeDeps(),
    );
    const u = result.unknowns.find((x) => x.questionId === "q9_2_itu_filing");
    expect(u).toBeDefined();
    expect(u!.priority).toBe("high");
    expect(u!.whatAnsweringChanges.length).toBeGreaterThan(0);
  });

  it("every unsure answer surfaces as an unknown; clean profiles surface none", async () => {
    const withUnsure = await runVerdictPipeline(
      { answers: baseAnswers({ q9_4_us_origin: unsure }), tier: "full" },
      makeDeps(),
    );
    expect(withUnsure.unknowns.map((u) => u.questionId)).toContain(
      "q9_4_us_origin",
    );

    const clean = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    expect(clean.unknowns).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Envelope integrity + invariant 6 (NO score)
// ─────────────────────────────────────────────────────────────────────────────

function collectKeys(value: unknown, keys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectKeys(v, keys);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      keys.add(k);
      collectKeys(v, keys);
    }
  }
}

describe("runVerdictPipeline — result integrity", () => {
  it("result JSON has NO key matching /score/i (invariant 6) and carries the rulebook version", async () => {
    const result = await runVerdictPipeline(
      { answers: baseAnswers(), tier: "full" },
      makeDeps(),
    );
    const keys = new Set<string>();
    collectKeys(result, keys);
    for (const k of keys) {
      expect(k).not.toMatch(/score/i);
    }
    expect(result.rulebookVersion).toBe(RULEBOOK.version);
    for (const f of allFindings(result)) {
      expect(f.rulebookVersion).toBe(RULEBOOK.version);
    }
  });

  it("every finding in every cluster passes isFindingComplete (no incomplete envelope ships)", async () => {
    const { isFindingComplete } = await import("./finding");
    const result = await runVerdictPipeline(
      {
        answers: baseAnswers({
          q4_4_licenses_held: a(["fr_los", "uk_sia_osa", "it_law_89_2025"]),
          q2_1_spacecraft_count: a("c_10_99"),
          q3_1_orbital_regimes: a(["leo", "cislunar_beyond"]),
          q4_10_transfer_change_of_control: a("change_of_control"),
          q9_4_us_origin: a("yes"),
          q9_7_sanctions_screening: a("partial"),
          q4_9_un_registration: a("not_registered"),
        }),
        tier: "full",
      },
      makeDeps(),
    );
    const findings = allFindings(result);
    expect(findings.length).toBeGreaterThan(5);
    for (const f of findings) {
      expect(isFindingComplete(f)).toEqual([]);
    }
    // counts are consistent with the findings they summarize
    for (const cluster of result.clusters) {
      expect(cluster.counts.applicable).toBe(
        cluster.findings.filter((f) => f.verdict === "applicable").length,
      );
      expect(cluster.counts.advisory).toBe(
        cluster.findings.filter((f) => f.verdict === "advisory").length,
      );
    }
  });

  it("the gateway adapter path matches the real gateway contract (sanity)", () => {
    // belt-and-braces: the pipeline's default adapter + classifier compose
    const input = gatewayInputFromAnswers(baseAnswers());
    const out = classifyNIS2Gateway(input);
    expect(out.classification).toBe("essential");
  });
});
