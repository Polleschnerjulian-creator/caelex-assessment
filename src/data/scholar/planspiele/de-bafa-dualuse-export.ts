import type { ScholarPlanspielScenario } from "./types";

/**
 * Planspiel: "Dual-Use Export Control — Classify, Licence, Comply (BAFA, Germany)".
 *
 * The student plays the EXPORTER'S COUNSEL for a German star-tracker / GNSS-receiver
 * maker shipping a space component to a third country; the AI plays BAFA (the German
 * dual-use licensing + enforcement authority). The arc mirrors the commercial
 * Trade/Passage product — classify → licence/TCP → comply — but is taught entirely
 * Scholar-side, with ZERO coupling to the frozen Trade export-control engine. Grading
 * is answer-key (Track-1) + AI-coach (Track-2) only.
 *
 * Cited corpus ids are REAL frozen-corpus entries (verified by scenarios.test.ts):
 *   - Sources  DE-DUALUSE-2021 (EU Dual-Use Reg 2021/821 incorporation),
 *              DE-AWG-2013 (Außenwirtschaftsgesetz), DE-AWV-2013 (Außenwirtschaftsverordnung),
 *              US-ITAR, US-EAR, US-OFAC-SANCTIONS-PROGRAMS
 *   - Cases    CASE-LORAL-1996, CASE-ITT-ITAR-2007, CASE-BAE-ITAR-2011, CASE-ZTE-EAR-2017
 *
 * NOTE: BAFA / DDTC / BIS are AUTHORITY records (name-only) — they are select OPTION
 * strings + brief-prose references only and DO NOT appear in any citedSourceIds.
 */
export const DE_BAFA_DUALUSE: ScholarPlanspielScenario = {
  id: "de-bafa-dualuse-export",
  titleKey: "dualuse.title",
  summaryKey: "dualuse.summary",
  difficulty: "ADVANCED",
  estimatedMinutes: 40,
  jurisdiction: "DE",
  module: "export-control",
  studentRole: "counsel",
  aiRoles: ["regulator"],
  roles: [
    {
      roleKey: "counsel",
      nameKey: "dualuse.role.counsel.name",
      goalKey: "dualuse.role.counsel.goal",
      briefKey: "dualuse.role.counsel.brief",
      privateBriefKey: "dualuse.role.counsel.private",
    },
    {
      roleKey: "regulator",
      nameKey: "dualuse.role.regulator.name",
      goalKey: "dualuse.role.regulator.goal",
      briefKey: "dualuse.role.regulator.brief",
      privateBriefKey: "dualuse.role.regulator.private",
    },
  ],
  operatorProfile: {
    activityType: "data_provider",
    entitySize: "medium",
    establishment: "eu",
    offersEUServices: false,
  },
  answerKey: {
    lead_authority_correct: {
      type: "exactMatch",
      field: "authority",
      expected: "BAFA",
      okNote: "dualuse.fb.authority.ok",
      wrongNote: "dualuse.fb.authority.wrong",
    },
    eu_control_category: {
      type: "exactMatch",
      field: "euCategory",
      expected: "Cat 7",
      okNote: "dualuse.fb.eucat.ok",
      wrongNote: "dualuse.fb.eucat.wrong",
    },
    us_classification: {
      type: "exactMatch",
      field: "usClass",
      expected: "EAR 9A515",
      okNote: "dualuse.fb.usclass.ok",
      wrongNote: "dualuse.fb.usclass.wrong",
    },
    licence_elements: {
      type: "allOf",
      fields: [
        "bafaLicence",
        "endUserStatement",
        "technicalAssistanceAgreement",
        "technologyControlPlan",
      ],
      okNote: "dualuse.fb.licence.ok",
      partialNote: "dualuse.fb.licence.partial",
    },
  },
  phases: [
    {
      phaseKey: "classify",
      order: 1,
      titleKey: "dualuse.p1.title",
      briefKey: "dualuse.p1.brief",
      advanceRequiresRole: "counsel",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "authority",
            labelKey: "dualuse.p1.authority",
            type: "select",
            options: ["BAFA", "DDTC", "BIS"],
          },
          {
            key: "euCategory",
            labelKey: "dualuse.p1.eucat",
            type: "select",
            options: ["Cat 7", "Cat 9"],
          },
          {
            key: "usClass",
            labelKey: "dualuse.p1.usclass",
            type: "select",
            options: ["EAR 9A515", "ITAR USML XV"],
          },
          {
            key: "justification",
            labelKey: "dualuse.p1.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: ["DE-DUALUSE-2021", "US-ITAR", "US-EAR"],
      citedCaseIds: ["CASE-LORAL-1996"],
      rubric: [
        {
          key: "lead_authority_correct",
          labelKey: "dualuse.p1.r.authority",
          weight: 25,
          track: "engine",
        },
        {
          key: "eu_control_category",
          labelKey: "dualuse.p1.r.eucat",
          weight: 25,
          track: "engine",
        },
        {
          key: "us_classification",
          labelKey: "dualuse.p1.r.usclass",
          weight: 25,
          track: "engine",
        },
        {
          key: "catchall_justification",
          labelKey: "dualuse.p1.r.catchall",
          weight: 25,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "licence_tcp",
      order: 2,
      titleKey: "dualuse.p2.title",
      briefKey: "dualuse.p2.brief",
      advanceRequiresRole: "counsel",
      artifact: {
        kind: "application_form",
        fields: [
          {
            key: "bafaLicence",
            labelKey: "dualuse.p2.bafa",
            type: "boolean",
          },
          {
            key: "endUserStatement",
            labelKey: "dualuse.p2.enduser",
            type: "boolean",
          },
          {
            key: "technicalAssistanceAgreement",
            labelKey: "dualuse.p2.taa",
            type: "boolean",
          },
          {
            key: "technologyControlPlan",
            labelKey: "dualuse.p2.tcp",
            type: "boolean",
          },
        ],
      },
      citedSourceIds: [
        "DE-AWG-2013",
        "DE-AWV-2013",
        "US-EAR",
        "DE-DUALUSE-2021",
      ],
      citedCaseIds: ["CASE-LORAL-1996"],
      rubric: [
        {
          key: "licence_elements",
          labelKey: "dualuse.p2.r.licence",
          weight: 60,
          track: "engine",
        },
        {
          key: "tcp_letter_quality",
          labelKey: "dualuse.p2.r.tcp",
          weight: 40,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "enforcement",
      order: 3,
      titleKey: "dualuse.p3.title",
      briefKey: "dualuse.p3.brief",
      advanceRequiresRole: "counsel",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["US-ITAR", "US-EAR", "US-OFAC-SANCTIONS-PROGRAMS"],
      citedCaseIds: [
        "CASE-ITT-ITAR-2007",
        "CASE-BAE-ITAR-2011",
        "CASE-ZTE-EAR-2017",
        "CASE-LORAL-1996",
      ],
      rubric: [
        {
          key: "identifies_violations",
          labelKey: "dualuse.p3.r.violations",
          weight: 40,
          track: "ai",
        },
        {
          key: "remediation_strategy",
          labelKey: "dualuse.p3.r.remediation",
          weight: 35,
          track: "ai",
        },
        {
          key: "enforcement_grounding",
          labelKey: "dualuse.p3.r.grounding",
          weight: 25,
          track: "ai",
        },
      ],
    },
  ],
};
