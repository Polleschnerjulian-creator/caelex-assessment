import type { ScholarPlanspielScenario } from "./types";

/**
 * Flagship Planspiel: "ASI Re-entry / Debris (Italy)".
 *
 * The student plays the OPERATOR filing a controlled-re-entry / disposal showing
 * under Italy's Space Economy Act (Legge 89/2025); the AI plays the Italian
 * regulator (ASI / MIMIT) issuing the deficiency notice in phase 4.
 *
 * Cited corpus ids are REAL frozen-corpus entries (verified by scenarios.test.ts):
 *   - Source  IT-LEGGE-89-2025               (Law on Space Economy — Legge 89/2025)
 *   - Case    CASE-IT-ASI-REENTRY-MK1-2022   (ASI Reentry Determination — Mk-1)
 */
export const ASI_REENTRY: ScholarPlanspielScenario = {
  id: "asi-reentry-it",
  titleKey: "asi.title",
  summaryKey: "asi.summary",
  difficulty: "INTERMEDIATE",
  estimatedMinutes: 35,
  jurisdiction: "IT",
  module: "debris",
  studentRole: "operator",
  aiRoles: ["regulator"],
  roles: [
    {
      roleKey: "operator",
      nameKey: "asi.role.operator.name",
      goalKey: "asi.role.operator.goal",
      briefKey: "asi.role.operator.brief",
      privateBriefKey: "asi.role.operator.private",
    },
    {
      roleKey: "regulator",
      nameKey: "asi.role.regulator.name",
      goalKey: "asi.role.regulator.goal",
      briefKey: "asi.role.regulator.brief",
      privateBriefKey: "asi.role.regulator.private",
    },
  ],
  operatorProfile: {
    activityType: "spacecraft",
    entitySize: "medium",
    establishment: "eu",
    primaryOrbit: "LEO",
    operatesConstellation: false,
    hasPostLaunchAssets: true,
    offersEUServices: true,
  },
  answerKey: {
    authority_correct: {
      type: "exactMatch",
      field: "authority",
      expected: "ASI",
      okNote: "asi.fb.authority.ok",
      wrongNote: "asi.fb.authority.wrong",
    },
    mandatory_modules: {
      type: "allOf",
      fields: ["insurance", "debrisPlan", "disposalPlan"],
      okNote: "asi.fb.modules.ok",
      partialNote: "asi.fb.modules.partial",
    },
    casualty_threshold: {
      type: "exactMatch",
      field: "casualtyRisk",
      expected: "<1e-4",
      okNote: "asi.fb.casualty.ok",
      wrongNote: "asi.fb.casualty.wrong",
    },
  },
  phases: [
    {
      phaseKey: "authority",
      order: 1,
      titleKey: "asi.p1.title",
      briefKey: "asi.p1.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "authority",
            labelKey: "asi.p1.authority",
            type: "select",
            options: ["ASI", "MIMIT", "ENAC", "AGCOM"],
          },
          {
            key: "justification",
            labelKey: "asi.p1.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: ["IT-LEGGE-89-2025"],
      citedCaseIds: [],
      rubric: [
        {
          key: "authority_correct",
          labelKey: "asi.p1.r.authority",
          weight: 60,
          track: "engine",
        },
        {
          key: "justification_quality",
          labelKey: "asi.p1.r.justif",
          weight: 40,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "application",
      order: 2,
      titleKey: "asi.p2.title",
      briefKey: "asi.p2.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "application_form",
        fields: [
          { key: "insurance", labelKey: "asi.p2.insurance", type: "boolean" },
          { key: "debrisPlan", labelKey: "asi.p2.debris", type: "boolean" },
          { key: "disposalPlan", labelKey: "asi.p2.disposal", type: "boolean" },
          { key: "cybersecurity", labelKey: "asi.p2.cyber", type: "boolean" },
          {
            key: "casualtyRisk",
            labelKey: "asi.p2.casualty",
            type: "select",
            options: ["<1e-4", "1e-4..1e-5", ">1e-5"],
          },
        ],
      },
      citedSourceIds: ["IT-LEGGE-89-2025"],
      citedCaseIds: ["CASE-IT-ASI-REENTRY-MK1-2022"],
      rubric: [
        {
          key: "mandatory_modules",
          labelKey: "asi.p2.r.modules",
          weight: 70,
          track: "engine",
        },
        {
          key: "casualty_threshold",
          labelKey: "asi.p2.r.casualty",
          weight: 30,
          track: "engine",
        },
      ],
    },
    {
      phaseKey: "cover_letter",
      order: 3,
      titleKey: "asi.p3.title",
      briefKey: "asi.p3.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "cover_letter", minCitations: 2 },
      citedSourceIds: ["IT-LEGGE-89-2025"],
      citedCaseIds: ["CASE-IT-ASI-REENTRY-MK1-2022"],
      rubric: [
        {
          key: "legal_basis",
          labelKey: "asi.p3.r.basis",
          weight: 40,
          track: "ai",
        },
        {
          key: "completeness",
          labelKey: "asi.p3.r.complete",
          weight: 30,
          track: "ai",
        },
        {
          key: "citation_accuracy",
          labelKey: "asi.p3.r.cites",
          weight: 30,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "deficiency",
      order: 4,
      titleKey: "asi.p4.title",
      briefKey: "asi.p4.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["IT-LEGGE-89-2025"],
      citedCaseIds: [],
      rubric: [
        {
          key: "addresses_deficiency",
          labelKey: "asi.p4.r.addresses",
          weight: 60,
          track: "ai",
        },
        {
          key: "revision_quality",
          labelKey: "asi.p4.r.quality",
          weight: 40,
          track: "ai",
        },
      ],
    },
  ],
};
