import type { ScholarPlanspielScenario } from "./types";

/**
 * Planspiel: "Launch & In-Orbit Insurance — Placement to Claim (France)".
 *
 * The student plays the OPERATOR's risk manager placing launch + first-year
 * in-orbit cover to satisfy the EU Space Act insurance condition and France's
 * Art. 6 LOS mandatory third-party-liability mandate, then adjudicating a
 * Viasat-3-style partial reflector-deployment loss in a coverage-position
 * letter. The AI plays a London-market underwriter (insurer) who pushes back
 * on exclusions in P3 and holds the line on a proportionate (not total) payout
 * in P4 — pushback delivered as coach prompts inside the phases, exactly as the
 * flagship's AI regulator works.
 *
 * Cited corpus ids are REAL frozen-corpus entries (verified by scenarios.test.ts
 * and the slate spec §0 verified list):
 *   - Source  FR-LOS-2008                  (Loi n° 2008-518 — Law on Space Operations)
 *   - Source  EU-SPACE-ACT                 (EU Space Act — COM(2025) 335)
 *   - Source  INT-LIABILITY-1972           (1972 Liability Convention)
 *   - Case    CASE-AMOS-6-INSURANCE-2017   (Spacecom AMOS-6 pre-launch insurance recovery)
 *   - Case    CASE-VIASAT-3-INSURANCE-2023 (Viasat-3 F1 antenna-deployment settlement)
 *
 * Authority records (e.g. FR-CNES, EU-EUSPA) are NAME-ONLY references — they do
 * NOT resolve via getLegalSourceById and therefore never appear in citedSourceIds.
 */
export const INSURANCE_PLACEMENT_CLAIM: ScholarPlanspielScenario = {
  id: "insurance-placement-claim",
  titleKey: "ins.title",
  summaryKey: "ins.summary",
  difficulty: "ADVANCED",
  estimatedMinutes: 40,
  jurisdiction: "FR",
  module: "insurance",
  studentRole: "operator",
  aiRoles: ["insurer"],
  roles: [
    {
      roleKey: "operator",
      nameKey: "ins.role.operator.name",
      goalKey: "ins.role.operator.goal",
      briefKey: "ins.role.operator.brief",
      privateBriefKey: "ins.role.operator.private",
    },
    {
      roleKey: "insurer",
      nameKey: "ins.role.insurer.name",
      goalKey: "ins.role.insurer.goal",
      briefKey: "ins.role.insurer.brief",
      privateBriefKey: "ins.role.insurer.private",
    },
  ],
  operatorProfile: {
    activityType: "spacecraft",
    entitySize: "medium",
    establishment: "eu",
    primaryOrbit: "GEO",
    operatesConstellation: false,
    hasPostLaunchAssets: true,
    offersEUServices: true,
  },
  answerKey: {
    regime_correct: {
      type: "exactMatch",
      field: "regime",
      expected: "FR-LOS-2008",
      okNote: "ins.fb.regime.ok",
      wrongNote: "ins.fb.regime.wrong",
    },
    mandatory_layers: {
      type: "allOf",
      fields: [
        "tplLiability",
        "inOrbitFirstYear",
        "preLaunch",
        "launchFailure",
      ],
      okNote: "ins.fb.layers.ok",
      partialNote: "ins.fb.layers.partial",
    },
    tpl_minimum_tier: {
      type: "exactMatch",
      field: "tplTier",
      expected: "60M..150M",
      okNote: "ins.fb.tpl.ok",
      wrongNote: "ins.fb.tpl.wrong",
    },
  },
  phases: [
    {
      phaseKey: "authority",
      order: 1,
      titleKey: "ins.p1.title",
      briefKey: "ins.p1.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "regime",
            labelKey: "ins.p1.regime",
            type: "select",
            options: ["FR-LOS-2008", "EU-SPACE-ACT", "INT-LIABILITY-1972"],
          },
          {
            key: "justification",
            labelKey: "ins.p1.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: ["FR-LOS-2008", "EU-SPACE-ACT", "INT-LIABILITY-1972"],
      citedCaseIds: [],
      rubric: [
        {
          key: "regime_correct",
          labelKey: "ins.p1.r.regime",
          weight: 60,
          track: "engine",
        },
        {
          key: "minimum_justification",
          labelKey: "ins.p1.r.justif",
          weight: 40,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "application",
      order: 2,
      titleKey: "ins.p2.title",
      briefKey: "ins.p2.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "application_form",
        fields: [
          { key: "tplLiability", labelKey: "ins.p2.tpl", type: "boolean" },
          {
            key: "inOrbitFirstYear",
            labelKey: "ins.p2.inorbit",
            type: "boolean",
          },
          { key: "preLaunch", labelKey: "ins.p2.prelaunch", type: "boolean" },
          {
            key: "launchFailure",
            labelKey: "ins.p2.launchfail",
            type: "boolean",
          },
          {
            key: "tplTier",
            labelKey: "ins.p2.tpltier",
            type: "select",
            options: ["<60M", "60M..150M", ">150M-state-backed"],
          },
        ],
      },
      citedSourceIds: ["FR-LOS-2008", "EU-SPACE-ACT"],
      citedCaseIds: ["CASE-AMOS-6-INSURANCE-2017"],
      rubric: [
        {
          key: "mandatory_layers",
          labelKey: "ins.p2.r.layers",
          weight: 60,
          track: "engine",
        },
        {
          key: "tpl_minimum_tier",
          labelKey: "ins.p2.r.tpl",
          weight: 40,
          track: "engine",
        },
      ],
    },
    {
      phaseKey: "cover_letter",
      order: 3,
      titleKey: "ins.p3.title",
      briefKey: "ins.p3.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "cover_letter", minCitations: 2 },
      citedSourceIds: ["FR-LOS-2008", "INT-LIABILITY-1972"],
      citedCaseIds: ["CASE-AMOS-6-INSURANCE-2017"],
      rubric: [
        {
          key: "exclusion_reasoning",
          labelKey: "ins.p3.r.exclusion",
          weight: 40,
          track: "ai",
        },
        {
          key: "risk_allocation",
          labelKey: "ins.p3.r.allocation",
          weight: 30,
          track: "ai",
        },
        {
          key: "citation_accuracy",
          labelKey: "ins.p3.r.cites",
          weight: 30,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "deficiency",
      order: 4,
      titleKey: "ins.p4.title",
      briefKey: "ins.p4.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["FR-LOS-2008", "INT-LIABILITY-1972"],
      citedCaseIds: [
        "CASE-VIASAT-3-INSURANCE-2023",
        "CASE-AMOS-6-INSURANCE-2017",
      ],
      rubric: [
        {
          key: "addresses_position",
          labelKey: "ins.p4.r.addresses",
          weight: 40,
          track: "ai",
        },
        {
          key: "payout_reasoning",
          labelKey: "ins.p4.r.payout",
          weight: 35,
          track: "ai",
        },
        {
          key: "adjudication_quality",
          labelKey: "ins.p4.r.quality",
          weight: 25,
          track: "ai",
        },
      ],
    },
  ],
};
