import type { ScholarPlanspielScenario } from "./types";

/**
 * Planspiel: "German LEO Earth-Observation Authorization (BAFA / SatDSiG)".
 *
 * The German sibling of the ASI flagship. The student plays the OPERATOR seeking
 * authorization for a sub-metre LEO Earth-observation satellite; the AI plays the
 * German NCA (BAFA under the SatDSiG, with BSI input on IT-conformity) issuing the
 * deficiency notice in phase 4.
 *
 * Teaching pivot (uniquely German): Germany has NO national space law in force and
 * NO single space regulator, so a high-resolution EO satellite is licensed today by
 * an export-control office (BAFA) under a 2007 data-security statute (SatDSiG) — not
 * by a space agency. BAFA / BMFTR / DLR / BNetzA are AUTHORITY NAMES (select options
 * + brief prose), NOT corpus ids, so they never appear in citedSourceIds.
 *
 * Cited corpus ids are REAL frozen-corpus entries (verified by scenarios.test.ts and
 * by resolving each id through getLegalSourceById / getCaseById in this worktree):
 *   - Sources DE-SATDSIG-2007, DE-SATDSIV-2008, DE-RAUG-1990, DE-WRG-ECKPUNKTE-2024,
 *             DE-TKG-2021, DE-NIS2UMSUCG-DRAFT, EU-SPACE-ACT
 *   - Cases   CASE-DE-VG-MUNCHEN-LICENCE-2018, CASE-DE-OVG-SATELLITE-DATA-2020
 */
export const DE_LEO_EO: ScholarPlanspielScenario = {
  id: "de-leo-eo",
  titleKey: "deleo.title",
  summaryKey: "deleo.summary",
  difficulty: "INTERMEDIATE",
  estimatedMinutes: 35,
  jurisdiction: "DE",
  module: "authorization",
  studentRole: "operator",
  aiRoles: ["regulator"],
  roles: [
    {
      roleKey: "operator",
      nameKey: "deleo.role.operator.name",
      goalKey: "deleo.role.operator.goal",
      briefKey: "deleo.role.operator.brief",
      privateBriefKey: "deleo.role.operator.private",
    },
    {
      roleKey: "regulator",
      nameKey: "deleo.role.regulator.name",
      goalKey: "deleo.role.regulator.goal",
      briefKey: "deleo.role.regulator.brief",
      privateBriefKey: "deleo.role.regulator.private",
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
      expected: "BAFA",
      okNote: "deleo.fb.authority.ok",
      wrongNote: "deleo.fb.authority.wrong",
    },
    mandatory_modules: {
      type: "allOf",
      fields: ["dataSecurityConcept", "itConformity", "frequencyAssignment"],
      okNote: "deleo.fb.modules.ok",
      partialNote: "deleo.fb.modules.partial",
    },
    resolution_band: {
      type: "exactMatch",
      field: "resolutionBand",
      expected: "<=2.5m-optical",
      okNote: "deleo.fb.resolution.ok",
      wrongNote: "deleo.fb.resolution.wrong",
    },
  },
  phases: [
    {
      phaseKey: "authority",
      order: 1,
      titleKey: "deleo.p1.title",
      briefKey: "deleo.p1.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "authority",
            labelKey: "deleo.p1.authority",
            type: "select",
            options: ["BAFA", "BMFTR", "DLR", "BNetzA"],
          },
          {
            key: "justification",
            labelKey: "deleo.p1.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: [
        "DE-SATDSIG-2007",
        "DE-RAUG-1990",
        "DE-WRG-ECKPUNKTE-2024",
      ],
      citedCaseIds: ["CASE-DE-VG-MUNCHEN-LICENCE-2018"],
      rubric: [
        {
          key: "authority_correct",
          labelKey: "deleo.p1.r.authority",
          weight: 60,
          track: "engine",
        },
        {
          key: "justification_quality",
          labelKey: "deleo.p1.r.justif",
          weight: 40,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "application",
      order: 2,
      titleKey: "deleo.p2.title",
      briefKey: "deleo.p2.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "application_form",
        fields: [
          {
            key: "dataSecurityConcept",
            labelKey: "deleo.p2.dataSecurity",
            type: "boolean",
          },
          {
            key: "itConformity",
            labelKey: "deleo.p2.itConformity",
            type: "boolean",
          },
          {
            key: "frequencyAssignment",
            labelKey: "deleo.p2.frequency",
            type: "boolean",
          },
          {
            key: "nis2Registration",
            labelKey: "deleo.p2.nis2",
            type: "boolean",
          },
          {
            key: "resolutionBand",
            labelKey: "deleo.p2.resolution",
            type: "select",
            options: ["<=2.5m-optical", ">2.5m..5m", ">5m"],
          },
        ],
      },
      citedSourceIds: [
        "DE-SATDSIG-2007",
        "DE-SATDSIV-2008",
        "DE-TKG-2021",
        "DE-NIS2UMSUCG-DRAFT",
      ],
      citedCaseIds: ["CASE-DE-VG-MUNCHEN-LICENCE-2018"],
      rubric: [
        {
          key: "mandatory_modules",
          labelKey: "deleo.p2.r.modules",
          weight: 70,
          track: "engine",
        },
        {
          key: "resolution_band",
          labelKey: "deleo.p2.r.resolution",
          weight: 30,
          track: "engine",
        },
      ],
    },
    {
      phaseKey: "cover_letter",
      order: 3,
      titleKey: "deleo.p3.title",
      briefKey: "deleo.p3.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "cover_letter", minCitations: 2 },
      citedSourceIds: ["DE-SATDSIG-2007", "DE-SATDSIV-2008", "EU-SPACE-ACT"],
      citedCaseIds: ["CASE-DE-OVG-SATELLITE-DATA-2020"],
      rubric: [
        {
          key: "legal_basis",
          labelKey: "deleo.p3.r.basis",
          weight: 40,
          track: "ai",
        },
        {
          key: "completeness",
          labelKey: "deleo.p3.r.complete",
          weight: 30,
          track: "ai",
        },
        {
          key: "citation_accuracy",
          labelKey: "deleo.p3.r.cites",
          weight: 30,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "deficiency",
      order: 4,
      titleKey: "deleo.p4.title",
      briefKey: "deleo.p4.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["DE-SATDSIG-2007", "DE-NIS2UMSUCG-DRAFT"],
      citedCaseIds: ["CASE-DE-OVG-SATELLITE-DATA-2020"],
      rubric: [
        {
          key: "addresses_deficiency",
          labelKey: "deleo.p4.r.addresses",
          weight: 60,
          track: "ai",
        },
        {
          key: "revision_quality",
          labelKey: "deleo.p4.r.quality",
          weight: 40,
          track: "ai",
        },
      ],
    },
  ],
};
