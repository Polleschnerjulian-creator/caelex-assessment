import type { ScholarPlanspielScenario } from "./types";

/**
 * Planspiel: "Third-Country Operator — Competent NCA & TCO Equivalence (EU)".
 *
 * The student plays the EU REGULATORY COUNSEL for a UK-incorporated, CAA-licensed
 * LEO broadband operator ("OrbitLink Ltd") that wants to sell into the EU once the
 * EU Space Act applies. The AI plays the EU body (DG DEFIS / EUSPA — uniform
 * application of the third-country-operator regime) and a competing Member-State NCA.
 * Teaching pivot: extraterritorial reach (Art. 20 services-nexus) + competent-forum
 * analysis + equivalence / mutual-recognition of a home-state authorisation against
 * the EU Space Act harmonised requirements.
 *
 * Cited corpus ids are REAL frozen-corpus entries (verified by scenarios.test.ts):
 *   - Sources  EU-SPACE-ACT, FR-LOS-2008, LU-SPACE-ACTIVITIES-2020, UK-SIA-2018
 *   - Cases    CASE-EU-EUTELSAT-ONEWEB-MERGER-2023, CASE-UK-SAXAVORD-LICENCE-2023
 *
 * NOTE (load-bearing, per spec §2.5 corpus correction): the authority records
 * EU-EUSPA, EU-EC, FR-CNES and UK-CAA live in AUTHORITIES_* arrays that ALL_SOURCES
 * does NOT spread — so getLegalSourceById returns undefined for them and they MUST
 * NOT appear in any citedSourceIds. They are referenced by NAME only (brief prose +
 * answer-key notes). The Phase-2 picker options FR_CNES / LU_MECO / UK_CAA / DE_BNetzA
 * are arbitrary select OPTION strings (data, not corpus ids), exactly like the
 * flagship's ["ASI","MIMIT","ENAC","AGCOM"].
 */
export const TCO_EQUIVALENCE: ScholarPlanspielScenario = {
  id: "tco-equivalence-eu",
  titleKey: "tco.title",
  summaryKey: "tco.summary",
  difficulty: "ADVANCED",
  estimatedMinutes: 40,
  jurisdiction: "EU",
  module: "authorization",
  studentRole: "counsel",
  aiRoles: ["eu_body", "regulator"],
  roles: [
    {
      roleKey: "counsel",
      nameKey: "tco.role.counsel.name",
      goalKey: "tco.role.counsel.goal",
      briefKey: "tco.role.counsel.brief",
      privateBriefKey: "tco.role.counsel.private",
    },
    {
      roleKey: "eu_body",
      nameKey: "tco.role.eubody.name",
      goalKey: "tco.role.eubody.goal",
      briefKey: "tco.role.eubody.brief",
      privateBriefKey: "tco.role.eubody.private",
    },
    {
      roleKey: "regulator",
      nameKey: "tco.role.regulator.name",
      goalKey: "tco.role.regulator.goal",
      briefKey: "tco.role.regulator.brief",
      privateBriefKey: "tco.role.regulator.private",
    },
  ],
  operatorProfile: {
    activityType: "spacecraft",
    entitySize: "medium",
    establishment: "third_country_eu_services",
    primaryOrbit: "LEO",
    operatesConstellation: true,
    constellationSize: 120,
    offersEUServices: true,
  },
  answerKey: {
    competent_nca_correct: {
      type: "exactMatch",
      field: "competentNca",
      expected: "FR_CNES",
      okNote: "tco.fb.nca.ok",
      wrongNote: "tco.fb.nca.wrong",
    },
    tco_obligations_present: {
      type: "allOf",
      fields: ["euRepresentative", "nationalRegistration"],
      okNote: "tco.fb.obligations.ok",
      partialNote: "tco.fb.obligations.partial",
    },
    equivalence_determination: {
      type: "exactMatch",
      field: "equivalenceBasis",
      expected: "PARTIAL",
      okNote: "tco.fb.equiv.ok",
      wrongNote: "tco.fb.equiv.wrong",
    },
  },
  phases: [
    {
      phaseKey: "jurisdiction_memo",
      order: 1,
      titleKey: "tco.p1.title",
      briefKey: "tco.p1.brief",
      advanceRequiresRole: "counsel",
      artifact: { kind: "cover_letter", minCitations: 2 },
      citedSourceIds: [
        "EU-SPACE-ACT",
        "FR-LOS-2008",
        "LU-SPACE-ACTIVITIES-2020",
      ],
      citedCaseIds: ["CASE-EU-EUTELSAT-ONEWEB-MERGER-2023"],
      rubric: [
        {
          key: "extraterritorial_basis",
          labelKey: "tco.p1.r.basis",
          weight: 45,
          track: "ai",
        },
        {
          key: "memo_completeness",
          labelKey: "tco.p1.r.complete",
          weight: 30,
          track: "ai",
        },
        {
          key: "citation_accuracy",
          labelKey: "tco.p1.r.cites",
          weight: 25,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "competent_nca",
      order: 2,
      titleKey: "tco.p2.title",
      briefKey: "tco.p2.brief",
      advanceRequiresRole: "counsel",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "competentNca",
            labelKey: "tco.p2.nca",
            type: "select",
            options: ["FR_CNES", "LU_MECO", "UK_CAA", "DE_BNetzA"],
          },
          {
            key: "justification",
            labelKey: "tco.p2.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: [
        "EU-SPACE-ACT",
        "FR-LOS-2008",
        "LU-SPACE-ACTIVITIES-2020",
      ],
      citedCaseIds: ["CASE-UK-SAXAVORD-LICENCE-2023"],
      rubric: [
        {
          key: "competent_nca_correct",
          labelKey: "tco.p2.r.nca",
          weight: 60,
          track: "engine",
        },
        {
          key: "justification_quality",
          labelKey: "tco.p2.r.justif",
          weight: 40,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "tco_equivalence",
      order: 3,
      titleKey: "tco.p3.title",
      briefKey: "tco.p3.brief",
      advanceRequiresRole: "counsel",
      artifact: {
        kind: "application_form",
        fields: [
          {
            key: "euRepresentative",
            labelKey: "tco.p3.eurep",
            type: "boolean",
          },
          {
            key: "nationalRegistration",
            labelKey: "tco.p3.registration",
            type: "boolean",
          },
          {
            key: "equivalenceBasis",
            labelKey: "tco.p3.equiv",
            type: "select",
            options: ["FULL", "PARTIAL", "NONE"],
          },
        ],
      },
      citedSourceIds: ["EU-SPACE-ACT", "UK-SIA-2018"],
      citedCaseIds: ["CASE-UK-SAXAVORD-LICENCE-2023"],
      rubric: [
        {
          key: "tco_obligations_present",
          labelKey: "tco.p3.r.obligations",
          weight: 55,
          track: "engine",
        },
        {
          key: "equivalence_determination",
          labelKey: "tco.p3.r.equiv",
          weight: 45,
          track: "engine",
        },
      ],
    },
    {
      phaseKey: "registration_deficiency",
      order: 4,
      titleKey: "tco.p4.title",
      briefKey: "tco.p4.brief",
      advanceRequiresRole: "counsel",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["EU-SPACE-ACT"],
      citedCaseIds: [],
      rubric: [
        {
          key: "addresses_deficiency",
          labelKey: "tco.p4.r.addresses",
          weight: 60,
          track: "ai",
        },
        {
          key: "revision_quality",
          labelKey: "tco.p4.r.quality",
          weight: 40,
          track: "ai",
        },
      ],
    },
  ],
};
