import type { ScholarPlanspielScenario } from "./types";

/**
 * Planspiel: "ITU Spectrum Coordination & Interference Dispute (International)".
 *
 * A two-administration ITU role-play tracking a new non-GSO constellation through
 * API → CR/C (Art. 9) → an interference dispute over EPFD / date-priority
 * (Art. 22 / 11.32A) → Notification & MIFR recording (Art. 11). The student plays
 * the operator's HOME Administration (the "Notifying Administration"); the AI plays
 * a competing-system Administration — re-cast onto the `eu_body` role key, since
 * `ScholarRoleKey` has no dedicated "foreign administration" member. The two
 * parties are distinct role keys (the workflow guard is role-keyed) and BOTH are
 * declared in `roles[]`.
 *
 * Cited corpus ids are REAL frozen-corpus entries (verified by scenarios.test.ts):
 *   - Sources INT-ITU-RR (Radio Regulations), INT-ITU-CONST (ITU Constitution),
 *             INT-ITU-RES-35 (Resolution 35 — NGSO milestone regime),
 *             INT-ITU-WRC-23 (WRC-23 Final Acts)
 *   - Cases   CASE-ITU-RES35-MILESTONE-NGSO-2024, CASE-EUTELSAT-V-SES-28E-2014,
 *             CASE-GALAXY-15-ZOMBIE-2010-2024, CASE-LIGADO-V-INMARSAT-2025
 *
 * Authority/administration labels (ITU-BR, the competing administration, the
 * filing-route option strings) are NAME-ONLY references + select OPTION strings —
 * they are NOT corpus ids and never appear in citedSourceIds.
 */
export const ITU_COORDINATION: ScholarPlanspielScenario = {
  id: "itu-leo-coordination",
  titleKey: "itu.title",
  summaryKey: "itu.summary",
  difficulty: "ADVANCED",
  estimatedMinutes: 40,
  jurisdiction: "INT",
  module: "spectrum",
  studentRole: "regulator",
  aiRoles: ["eu_body"],
  roles: [
    {
      roleKey: "regulator",
      nameKey: "itu.role.regulator.name",
      goalKey: "itu.role.regulator.goal",
      briefKey: "itu.role.regulator.brief",
      privateBriefKey: "itu.role.regulator.private",
    },
    {
      roleKey: "eu_body",
      nameKey: "itu.role.admin.name",
      goalKey: "itu.role.admin.goal",
      briefKey: "itu.role.admin.brief",
      privateBriefKey: "itu.role.admin.private",
    },
  ],
  operatorProfile: {
    activityType: "spacecraft",
    entitySize: "large",
    establishment: "eu",
    primaryOrbit: "LEO",
    operatesConstellation: true,
    constellationSize: 300,
    offersEUServices: true,
  },
  answerKey: {
    administration_correct: {
      type: "exactMatch",
      field: "filingRoute",
      expected: "NATIONAL_ADMIN_TO_ITU",
      okNote: "itu.fb.route.ok",
      wrongNote: "itu.fb.route.wrong",
    },
    filing_act_correct: {
      type: "exactMatch",
      field: "openingAct",
      expected: "API",
      okNote: "itu.fb.act.ok",
      wrongNote: "itu.fb.act.wrong",
    },
    coordination_elements: {
      type: "allOf",
      fields: [
        "frequencyAssignment",
        "epfdEnvelope",
        "biuPlan",
        "milestoneSchedule",
      ],
      okNote: "itu.fb.coord.ok",
      partialNote: "itu.fb.coord.partial",
    },
    epfd_compliant: {
      type: "exactMatch",
      field: "epfdBracket",
      expected: "within_limit",
      okNote: "itu.fb.epfd.ok",
      wrongNote: "itu.fb.epfd.wrong",
    },
  },
  phases: [
    {
      phaseKey: "authority",
      order: 1,
      titleKey: "itu.p1.title",
      briefKey: "itu.p1.brief",
      advanceRequiresRole: "regulator",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "filingRoute",
            labelKey: "itu.p1.route",
            type: "select",
            options: [
              "NATIONAL_ADMIN_TO_ITU",
              "OPERATOR_DIRECT_TO_ITU",
              "ITU_DIRECT_GRANT",
              "NATIONAL_LICENCE_ONLY",
            ],
          },
          {
            key: "openingAct",
            labelKey: "itu.p1.act",
            type: "select",
            options: ["API", "CR_C", "NOTIFICATION", "NATIONAL_LICENCE"],
          },
          {
            key: "justification",
            labelKey: "itu.p1.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: ["INT-ITU-RR", "INT-ITU-CONST"],
      citedCaseIds: ["CASE-ITU-RES35-MILESTONE-NGSO-2024"],
      rubric: [
        {
          key: "administration_correct",
          labelKey: "itu.p1.r.route",
          weight: 35,
          track: "engine",
        },
        {
          key: "filing_act_correct",
          labelKey: "itu.p1.r.act",
          weight: 35,
          track: "engine",
        },
        {
          key: "route_justification",
          labelKey: "itu.p1.r.justif",
          weight: 30,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "application",
      order: 2,
      titleKey: "itu.p2.title",
      briefKey: "itu.p2.brief",
      advanceRequiresRole: "regulator",
      artifact: {
        kind: "application_form",
        fields: [
          {
            key: "frequencyAssignment",
            labelKey: "itu.p2.frequency",
            type: "boolean",
          },
          { key: "epfdEnvelope", labelKey: "itu.p2.epfd", type: "boolean" },
          { key: "biuPlan", labelKey: "itu.p2.biu", type: "boolean" },
          {
            key: "milestoneSchedule",
            labelKey: "itu.p2.milestones",
            type: "boolean",
          },
          {
            key: "affectedNetworks",
            labelKey: "itu.p2.affected",
            type: "boolean",
          },
          {
            key: "epfdBracket",
            labelKey: "itu.p2.epfdbracket",
            type: "select",
            options: ["within_limit", "at_limit_margin", "exceeds_limit"],
          },
        ],
      },
      citedSourceIds: ["INT-ITU-RR", "INT-ITU-RES-35"],
      citedCaseIds: ["CASE-ITU-RES35-MILESTONE-NGSO-2024"],
      rubric: [
        {
          key: "coordination_elements",
          labelKey: "itu.p2.r.coord",
          weight: 60,
          track: "engine",
        },
        {
          key: "epfd_compliant",
          labelKey: "itu.p2.r.epfd",
          weight: 40,
          track: "engine",
        },
      ],
    },
    {
      phaseKey: "interference_dispute",
      order: 3,
      titleKey: "itu.p3.title",
      briefKey: "itu.p3.brief",
      advanceRequiresRole: "regulator",
      artifact: { kind: "cover_letter", minCitations: 2 },
      citedSourceIds: ["INT-ITU-RR", "INT-ITU-WRC-23"],
      citedCaseIds: [
        "CASE-EUTELSAT-V-SES-28E-2014",
        "CASE-GALAXY-15-ZOMBIE-2010-2024",
      ],
      rubric: [
        {
          key: "interference_law",
          labelKey: "itu.p3.r.law",
          weight: 40,
          track: "ai",
        },
        {
          key: "priority_argument",
          labelKey: "itu.p3.r.priority",
          weight: 30,
          track: "ai",
        },
        {
          key: "citation_accuracy",
          labelKey: "itu.p3.r.cites",
          weight: 30,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "notification",
      order: 4,
      titleKey: "itu.p4.title",
      briefKey: "itu.p4.brief",
      advanceRequiresRole: "regulator",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["INT-ITU-RR", "INT-ITU-RES-35"],
      citedCaseIds: ["CASE-LIGADO-V-INMARSAT-2025"],
      rubric: [
        {
          key: "addresses_finding",
          labelKey: "itu.p4.r.addresses",
          weight: 60,
          track: "ai",
        },
        {
          key: "recording_quality",
          labelKey: "itu.p4.r.quality",
          weight: 40,
          track: "ai",
        },
      ],
    },
  ],
};
