import type { ScholarPlanspielScenario } from "./types";

/**
 * Planspiel: "In-Orbit Cyber/Anomaly Incident — NIS2 24h/72h/30d Reporting (EU)".
 *
 * A KA-SAT-style AcidRain wiper bricks tens of thousands of user modems and
 * degrades an EU satcom broadband service. The student plays the OPERATOR
 * working the NIS2 Art. 23 reporting clock; the AI plays the national competent
 * authority (BSI) verifying each deadline + content and firing the deficiency.
 *
 * The timeline IS the legal instrument — highest learning value for cyber /
 * incident law in the slate.
 *
 * CHEAP FALLBACK (per spec §2.2): Phase 2 is rendered as the EXISTING
 * `application_form` artifact kind (its fields are already boolean/select; the
 * timing selects score via the data-driven `notification_timing` answer-key
 * rule). No new artifact kind, no renderer work — the only thing lost is the
 * countdown chrome.
 *
 * Cited corpus ids are REAL frozen-corpus entries (verified by scenarios.test.ts
 * and confirmed resolvable via getLegalSourceById / getCaseById in this worktree):
 *   - Sources EU-NIS2-2022, DE-BSIG-NIS2, EU-CRA-2024, INT-ENISA-SPACE-2023,
 *             EU-SPACE-ACT, INT-NIST-IR-8270
 *   - Case    CASE-VIASAT-KA-SAT-CYBERATTACK-2022
 *
 * Authority records (BSI, BNetzA, ENISA, ASI) are NAME-ONLY: they live in
 * AUTHORITIES_* arrays which getLegalSourceById does NOT search, so they appear
 * ONLY as select OPTION strings + in brief prose — never in citedSourceIds.
 */
export const NIS2_INCIDENT: ScholarPlanspielScenario = {
  id: "nis2-orbit-cyber-incident",
  titleKey: "nis2.title",
  summaryKey: "nis2.summary",
  difficulty: "ADVANCED",
  estimatedMinutes: 40,
  jurisdiction: "EU",
  module: "nis2",
  studentRole: "operator",
  aiRoles: ["regulator"],
  roles: [
    {
      roleKey: "operator",
      nameKey: "nis2.role.operator.name",
      goalKey: "nis2.role.operator.goal",
      briefKey: "nis2.role.operator.brief",
      privateBriefKey: "nis2.role.operator.private",
    },
    {
      roleKey: "regulator",
      nameKey: "nis2.role.regulator.name",
      goalKey: "nis2.role.regulator.goal",
      briefKey: "nis2.role.regulator.brief",
      privateBriefKey: "nis2.role.regulator.private",
    },
  ],
  operatorProfile: {
    activityType: "data_provider",
    entitySize: "large",
    establishment: "eu",
    primaryOrbit: "LEO",
    operatesConstellation: true,
    constellationSize: 120,
    offersEUServices: true,
  },
  answerKey: {
    authority_correct: {
      type: "exactMatch",
      field: "authority",
      expected: "BSI",
      okNote: "nis2.fb.authority.ok",
      wrongNote: "nis2.fb.authority.wrong",
    },
    nis2_classification: {
      type: "exactMatch",
      field: "classification",
      expected: "essential",
      okNote: "nis2.fb.class.ok",
      wrongNote: "nis2.fb.class.wrong",
    },
    notification_timing: {
      type: "timing",
      parts: [
        { field: "earlyWarningFiledH", expected: "<=24h" },
        { field: "notificationFiledH", expected: "<=72h" },
      ],
      okNote: "nis2.fb.timing.ok",
      partialNote: "nis2.fb.timing.partial",
    },
    mandatory_modules: {
      type: "allOf",
      fields: [
        "crossBorderImpact",
        "suspectedUnlawfulCause",
        "severityAssessment",
        "indicatorsOfCompromise",
      ],
      okNote: "nis2.fb.modules.ok",
      partialNote: "nis2.fb.modules.partial",
    },
    cra_parallel_channel: {
      type: "exactMatch",
      field: "triggerCraEnisaChannel",
      expected: true,
      okNote: "nis2.fb.cra.ok",
      wrongNote: "nis2.fb.cra.wrong",
    },
  },
  phases: [
    {
      phaseKey: "authority",
      order: 1,
      titleKey: "nis2.p1.title",
      briefKey: "nis2.p1.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "authority",
            labelKey: "nis2.p1.authority",
            type: "select",
            options: ["BSI", "BNetzA", "ENISA", "ASI"],
          },
          {
            key: "classification",
            labelKey: "nis2.p1.classification",
            type: "select",
            options: ["essential", "important", "out_of_scope"],
          },
          {
            key: "justification",
            labelKey: "nis2.p1.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: ["EU-NIS2-2022", "DE-BSIG-NIS2"],
      citedCaseIds: ["CASE-VIASAT-KA-SAT-CYBERATTACK-2022"],
      rubric: [
        {
          key: "authority_correct",
          labelKey: "nis2.p1.r.authority",
          weight: 50,
          track: "engine",
        },
        {
          key: "nis2_classification",
          labelKey: "nis2.p1.r.class",
          weight: 30,
          track: "engine",
        },
        {
          key: "channel_justification",
          labelKey: "nis2.p1.r.channel",
          weight: 20,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "notification",
      order: 2,
      titleKey: "nis2.p2.title",
      briefKey: "nis2.p2.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "application_form",
        fields: [
          {
            key: "earlyWarningFiledH",
            labelKey: "nis2.p2.earlyWarning",
            type: "select",
            options: ["<=24h", "24-48h", ">48h"],
          },
          {
            key: "notificationFiledH",
            labelKey: "nis2.p2.notification",
            type: "select",
            options: ["<=72h", "72h-7d", ">7d"],
          },
          {
            key: "crossBorderImpact",
            labelKey: "nis2.p2.crossBorder",
            type: "boolean",
          },
          {
            key: "suspectedUnlawfulCause",
            labelKey: "nis2.p2.unlawfulCause",
            type: "boolean",
          },
          {
            key: "severityAssessment",
            labelKey: "nis2.p2.severity",
            type: "boolean",
          },
          {
            key: "indicatorsOfCompromise",
            labelKey: "nis2.p2.indicators",
            type: "boolean",
          },
          {
            key: "triggerCraEnisaChannel",
            labelKey: "nis2.p2.craChannel",
            type: "boolean",
          },
        ],
      },
      citedSourceIds: ["EU-NIS2-2022", "EU-CRA-2024", "INT-ENISA-SPACE-2023"],
      citedCaseIds: ["CASE-VIASAT-KA-SAT-CYBERATTACK-2022"],
      rubric: [
        {
          key: "notification_timing",
          labelKey: "nis2.p2.r.timing",
          weight: 40,
          track: "engine",
        },
        {
          key: "mandatory_modules",
          labelKey: "nis2.p2.r.modules",
          weight: 40,
          track: "engine",
        },
        {
          key: "cra_parallel_channel",
          labelKey: "nis2.p2.r.cra",
          weight: 20,
          track: "engine",
        },
      ],
    },
    {
      phaseKey: "final_report",
      order: 3,
      titleKey: "nis2.p3.title",
      briefKey: "nis2.p3.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "cover_letter", minCitations: 2 },
      citedSourceIds: ["EU-NIS2-2022", "EU-SPACE-ACT", "INT-NIST-IR-8270"],
      citedCaseIds: ["CASE-VIASAT-KA-SAT-CYBERATTACK-2022"],
      rubric: [
        {
          key: "root_cause",
          labelKey: "nis2.p3.r.rootcause",
          weight: 35,
          track: "ai",
        },
        {
          key: "art21_gap_analysis",
          labelKey: "nis2.p3.r.gap",
          weight: 35,
          track: "ai",
        },
        {
          key: "citation_accuracy",
          labelKey: "nis2.p3.r.cites",
          weight: 30,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "deficiency",
      order: 4,
      titleKey: "nis2.p4.title",
      briefKey: "nis2.p4.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["EU-NIS2-2022", "DE-BSIG-NIS2"],
      citedCaseIds: ["CASE-VIASAT-KA-SAT-CYBERATTACK-2022"],
      rubric: [
        {
          key: "addresses_deficiency",
          labelKey: "nis2.p4.r.addresses",
          weight: 60,
          track: "ai",
        },
        {
          key: "revision_quality",
          labelKey: "nis2.p4.r.quality",
          weight: 40,
          track: "ai",
        },
      ],
    },
  ],
};
