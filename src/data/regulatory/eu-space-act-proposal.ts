/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * EU Space Act COM(2025) 335 — Canonical Article Reference
 *
 * This is the SINGLE authoritative source for EU Space Act article data.
 * It replaces the legacy `articles.ts` and resolves all article number
 * inconsistencies. Every entry is marked as LEGISLATIVE_PROPOSAL.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { EUSpaceActArticle } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

const DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal dated 2025-06-25, " +
  "with Council progress update 2025-12-05. Article numbers and content " +
  "may change during trilogue negotiations. This is not enacted law and " +
  "does not constitute legal advice.";

/**
 * Canonical EUR-Lex URL for COM(2025) 335.
 * CELEX identifier: 52025PC0335 (5 = EU prep act; 2025 = year; PC = Commission proposal).
 * EUR-Lex does not expose stable per-article HTML fragments for proposal (PC) documents,
 * so every article references the document-level URL.
 */
const OFFICIAL_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335";

// ─── Article Data ───────────────────────────────────────────────────────────

const EU_SPACE_ACT_ARTICLES: EUSpaceActArticle[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // TITLE I — General Provisions (Art. 1–5)
  // ════════════════════════════════════════════════════════════════════════════

  {
    articleNumber: "1",
    title: "Subject Matter",
    summary:
      "Establishes rules for the internal market of space-based data and space services, " +
      "laying down a common regulatory framework for authorization, registration, safety, " +
      "cybersecurity, and environmental sustainability of space activities.",
    titleNumber: 1,
    chapter: "Title I — General Provisions",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: "all",
  },
  {
    articleNumber: "2",
    title: "Objectives",
    summary:
      "Sets objectives including safety, sustainability, resilience of space activities, " +
      "a level playing field, and alignment with international obligations (OST, Liability Convention).",
    titleNumber: 1,
    chapter: "Title I — General Provisions",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "COPUOS_LTS",
        reference: "Guideline A.1",
        relationship: "codifies",
      },
    ],
    category: "authorization",
    applicableTo: "all",
  },
  {
    articleNumber: "3",
    title: "Definitions",
    summary:
      "Key definitions: Spacecraft Operator (SCO), Launch Operator (LO), Launch Site Operator (LSO), " +
      "In-Space Operations & Services (ISOS), Collision Avoidance Provider (CAP), " +
      "Primary Data Provider (PDP), Third Country Operator (TCO). Also defines 'space debris', " +
      "'space object', 'constellation', 'orbital lifetime', and other critical terms.",
    titleNumber: 1,
    chapter: "Title I — General Provisions",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "IADC", reference: "Section 3", relationship: "codifies" },
      {
        framework: "ISO_24113",
        reference: "Section 3",
        relationship: "codifies",
      },
    ],
    category: "authorization",
    applicableTo: "all",
  },
  {
    articleNumber: "4",
    title: "National Security",
    summary:
      "Preserves Member State competence for national security matters. " +
      "Defence and national security space activities are excluded from the scope of this Regulation.",
    titleNumber: 1,
    chapter: "Title I — General Provisions",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: "all",
  },
  {
    articleNumber: "5",
    title: "Scope",
    summary:
      "Defines who is covered: space operators (SCO, LO, LSO, ISOS), CA providers (CAP), " +
      "data providers (PDP), and third country operators (TCO) providing services in the EU. " +
      "Excludes defence/national security, pre-2030 assets (grandfathering), and certain beyond-GEO activities.",
    titleNumber: 1,
    chapter: "Title I — General Provisions",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: "all",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TITLE II — Authorization Regime (Art. 6–30)
  // ════════════════════════════════════════════════════════════════════════════

  {
    articleNumber: "6",
    title: "Authorization Requirement",
    summary:
      "No space activity without authorization from the National Competent Authority (NCA). " +
      "Core gate-keeping obligation for all operators established in the EU.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "7",
    title: "Application Procedure",
    summary:
      "Detailed procedure for authorization application including technical file requirements, " +
      "content of application dossier, and procedural timeline for NCA review.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "8",
    title: "Application Requirements — General",
    summary:
      "General requirements for authorization applications: operator identity, legal form, " +
      "financial capacity, technical competence, and mission description.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "9",
    title: "Application Requirements — Technical",
    summary:
      "Technical requirements for authorization applications: mission design, orbital parameters, " +
      "debris mitigation plan, cybersecurity plan, and environmental footprint declaration.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "IADC", reference: "Section 5", relationship: "codifies" },
    ],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "10",
    title: "Simplified Regime (Light Authorization)",
    summary:
      "Simplified compliance paths for small enterprises, research missions, educational projects, " +
      "and low-risk space activities. Reduced documentation and shorter processing timelines.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "11",
    title: "Authorization Decision — Granting",
    summary:
      "Timeline and process for NCA to grant authorization. Maximum processing period, " +
      "conditions that may be attached to authorization, and validity period.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "12",
    title: "Authorization Conditions",
    summary:
      "Conditions that may be attached to authorization: ongoing compliance, reporting obligations, " +
      "operational constraints, and insurance requirements.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "13",
    title: "Authorization Modification",
    summary:
      "Procedures for modifying existing authorizations due to mission changes, " +
      "ownership transfer, or regulatory updates.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "14",
    title: "Authorization Suspension and Revocation",
    summary:
      "Grounds and procedures for suspending or revoking authorization: non-compliance, " +
      "safety threats, or failure to meet conditions.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "15",
    title: "Constellation Authorization",
    summary:
      "Simplified authorization for constellation operators covering multiple satellites under " +
      "a single authorization, with incremental update procedures.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "20",
    title: "Third Country Operator Registration",
    summary:
      "TCOs must register with EUSPA before providing space-based services or data in the EU market. " +
      "Requires designation of EU legal representative.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: ["TCO"],
  },
  {
    articleNumber: "25",
    title: "Free Movement of Space Services",
    summary:
      "Ensures authorized operators and registered TCOs can provide services across all Member States " +
      "without additional national authorization (mutual recognition principle).",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: "all",
  },
  {
    articleNumber: "28",
    title: "NCAs: Designation and Powers",
    summary:
      "Each Member State designates a National Competent Authority (NCA) for authorization, " +
      "supervision, and enforcement of space activities.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "30",
    title: "Qualified Technical Bodies (QTBs)",
    summary:
      "QTB designation, requirements, and oversight. QTBs support NCAs in technical assessment " +
      "of authorization applications.",
    titleNumber: 2,
    chapter: "Title II — Authorization Regime",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "authorization",
    applicableTo: "all",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TITLE III — Registration (Art. 31–57)
  // ════════════════════════════════════════════════════════════════════════════

  {
    articleNumber: "33",
    title: "EU Space Registry — Establishment",
    summary:
      "Establishes the Union Register of Space Objects (URSO) managed by EUSPA. " +
      "All authorized space objects must be registered.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "COPUOS_LTS",
        reference: "Registration Convention Art. II",
        relationship: "codifies",
      },
    ],
    category: "registration",
    applicableTo: "all",
  },
  {
    articleNumber: "34",
    title: "EU Space Registry — Content",
    summary:
      "Data fields required for URSO registration: object identity, orbital parameters, " +
      "operator details, launch information, and status.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "COPUOS_LTS",
        reference: "Registration Convention Art. IV",
        relationship: "extends",
      },
    ],
    category: "registration",
    applicableTo: "all",
  },
  {
    articleNumber: "35",
    title: "EU Space Registry — Updates",
    summary:
      "Obligation to update registry entries upon mission changes, ownership transfer, " +
      "end-of-life, or re-entry. Timelines for update notification.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "registration",
    applicableTo: "all",
  },
  {
    articleNumber: "36",
    title: "e-Certificate",
    summary:
      "Electronic certificate issued by EUSPA confirming registration and/or authorization. " +
      "Serves as proof of compliance for market access.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "registration",
    applicableTo: ["TCO", "PDP"],
  },
  {
    articleNumber: "37",
    title: "Data Provider Notifications",
    summary:
      "Primary Data Providers (PDPs) must notify EUSPA of their activities and data sources. " +
      "Includes ongoing reporting obligations.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "registration",
    applicableTo: ["PDP"],
  },
  {
    articleNumber: "38",
    title: "EUSPA Registry Functions",
    summary:
      "EUSPA responsibilities for maintaining the registry, ensuring data quality, " +
      "and providing public access to non-sensitive registry information.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "registration",
    applicableTo: "all",
  },
  {
    articleNumber: "44",
    title: "Insurance Obligation",
    summary:
      "General obligation for space operators to obtain and maintain third-party liability insurance " +
      "or equivalent financial guarantee covering space activities.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "COPUOS_LTS",
        reference: "Liability Convention Art. II",
        relationship: "codifies",
      },
    ],
    category: "insurance",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "45",
    title: "Minimum Insurance Coverage",
    summary:
      "Minimum coverage amounts for third-party liability insurance based on risk profile, " +
      "mission type, and orbital regime. Delegated acts specify thresholds.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "insurance",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "46",
    title: "Environmental Footprint Declaration",
    summary:
      "Mandatory Environmental Footprint Declaration (EFD) required for authorization. " +
      "Operators must calculate and declare the environmental impact of their space activities " +
      "using life-cycle assessment methodology.",
    titleNumber: 3,
    chapter: "Title III — Registration",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "environmental",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TITLE IV — Debris Mitigation (Art. 58–73)
  // ════════════════════════════════════════════════════════════════════════════

  {
    articleNumber: "58",
    title: "General Debris Obligations",
    summary:
      "General obligation to minimize creation of space debris during all phases of " +
      "space activity: design, launch, operations, and end-of-life.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "IADC", reference: "Section 5.1", relationship: "codifies" },
      {
        framework: "ISO_24113",
        reference: "Section 5",
        relationship: "codifies",
      },
      {
        framework: "COPUOS_LTS",
        reference: "Guideline D.2",
        relationship: "codifies",
      },
    ],
    category: "debris",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "59",
    title: "Launch Safety Plan",
    summary:
      "Mandatory launch safety plan including coordination with air and maritime traffic, " +
      "risk assessment for overflight zones, and flight termination provisions.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "IADC", reference: "Section 5.1", relationship: "codifies" },
    ],
    category: "debris",
    applicableTo: ["LO"],
  },
  {
    articleNumber: "60",
    title: "Flight Safety Systems",
    summary:
      "Mandatory flight safety system installation requirements for launch vehicles, " +
      "including flight termination systems and range safety provisions.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "debris",
    applicableTo: ["LO"],
  },
  {
    articleNumber: "61",
    title: "Launch Debris Control",
    summary:
      "Debris control measures during launch including upper stage passivation and disposal, " +
      "minimization of mission-related objects, and debris release prevention.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "IADC",
        reference: "Section 5.2.1",
        relationship: "codifies",
      },
      {
        framework: "ISO_24113",
        reference: "Section 5.2",
        relationship: "codifies",
      },
    ],
    category: "debris",
    applicableTo: ["LO"],
  },
  {
    articleNumber: "62",
    title: "Re-entry Safety (Launchers)",
    summary:
      "Safe re-entry requirements for launcher stages. Controlled re-entry preferred; " +
      "uncontrolled re-entry subject to casualty risk assessment.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "IADC",
        reference: "Section 5.3.1",
        relationship: "codifies",
      },
    ],
    category: "debris",
    applicableTo: ["LO"],
  },
  {
    articleNumber: "63",
    title: "Trackability",
    summary:
      "Spacecraft must be designed to be trackable by Space Situational Awareness (SSA) systems. " +
      "Includes requirements for retroreflectors, radar cross-section, and identification.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "COPUOS_LTS",
        reference: "Guideline B.2",
        relationship: "extends",
      },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "64",
    title: "Collision Avoidance — Subscription",
    summary:
      "Mandatory subscription to a collision avoidance service for all spacecraft operators. " +
      "Must maintain continuous monitoring capability and response procedures.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "IADC",
        reference: "Section 5.2.2",
        relationship: "extends",
      },
      {
        framework: "COPUOS_LTS",
        reference: "Guideline B.3",
        relationship: "extends",
      },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "65",
    title: "Collision Avoidance — Manoeuvre Obligations",
    summary:
      "Obligations to execute collision avoidance manoeuvres when probability of collision " +
      "exceeds defined thresholds. Coordination with other operators and SSA providers.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "IADC",
        reference: "Section 5.2.2",
        relationship: "codifies",
      },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "66",
    title: "Manoeuvrability Requirements",
    summary:
      "Spacecraft manoeuvrability requirements for collision avoidance and end-of-life disposal. " +
      "Minimum propulsion capability based on orbital regime.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "ISO_24113",
        reference: "Section 6.2",
        relationship: "extends",
      },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "67",
    title: "Debris Mitigation Plan",
    summary:
      "Mandatory debris mitigation plan covering full mission lifecycle. Must include passivation, " +
      "end-of-life strategy, collision avoidance, break-up prevention, and casualty risk assessment.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "IADC", reference: "Section 5", relationship: "codifies" },
      {
        framework: "ISO_24113",
        reference: "Section 6",
        relationship: "codifies",
      },
      {
        framework: "COPUOS_LTS",
        reference: "Guideline D.1",
        relationship: "codifies",
      },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "68",
    title: "Light Pollution Mitigation",
    summary:
      "Requirements to minimize light pollution from spacecraft, particularly large constellations. " +
      "Operators must assess and mitigate impact on ground-based astronomy.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "environmental",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "69",
    title: "Radio Frequency Pollution",
    summary:
      "Requirements to minimize radio frequency interference from spacecraft, " +
      "coordination with ITU Radio Regulations and spectrum management authorities.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "ITU_RR", reference: "Art. 22", relationship: "codifies" },
    ],
    category: "environmental",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "70",
    title: "Large Constellation Impact Assessment",
    summary:
      "Additional environmental and debris impact assessment requirements for operators " +
      "with 100+ satellites. Includes cumulative collision risk assessment.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "IADC", reference: "Section 5.1", relationship: "extends" },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "71",
    title: "Re-entry Coordination (Spacecraft)",
    summary:
      "Spacecraft re-entry coordination with authorities. Controlled re-entry for objects " +
      "above casualty risk threshold. Notification and coordination obligations.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "IADC",
        reference: "Section 5.3.1",
        relationship: "codifies",
      },
      {
        framework: "ISO_24113",
        reference: "Section 6.3",
        relationship: "codifies",
      },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "72",
    title: "Orbital Lifetime and Disposal",
    summary:
      "End-of-life disposal requirements. LEO: 25-year orbital lifetime limit (with 5-year target). " +
      "GEO: graveyard orbit disposal at 300+ km above GEO. Casualty risk for uncontrolled " +
      "re-entry must not exceed 1:10,000 per event.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "IADC",
        reference: "Section 5.3.2",
        relationship: "codifies",
      },
      {
        framework: "ISO_24113",
        reference: "Section 6.3.1",
        relationship: "codifies",
      },
      {
        framework: "COPUOS_LTS",
        reference: "Guideline D.2",
        relationship: "codifies",
      },
    ],
    category: "debris",
    applicableTo: ["SCO"],
  },
  {
    articleNumber: "73",
    title: "Supply Chain Compliance",
    summary:
      "Obligations regarding supply chain compliance verification. Operators must ensure " +
      "components and subsystems meet debris mitigation and safety requirements.",
    titleNumber: 4,
    chapter: "Title IV — Debris Mitigation",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "debris",
    applicableTo: ["SCO", "LO"],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TITLE V — Cybersecurity (Art. 74–95)
  // ════════════════════════════════════════════════════════════════════════════

  {
    articleNumber: "74",
    title: "General Cybersecurity Principles",
    summary:
      "General cybersecurity principles for space activities aligned with NIS2 Directive. " +
      "Establishes that space operators are entities within NIS2 scope.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "75",
    title: "Cybersecurity Policy Requirements",
    summary:
      "Operators must establish and maintain a cybersecurity policy covering space and ground " +
      "segments. Policy must be reviewed annually and updated upon material changes.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
      {
        framework: "ISO_27001",
        reference: "Section 5.2",
        relationship: "codifies",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "76",
    title: "Security Governance",
    summary:
      "Requirements for cybersecurity governance structure including designated security officer, " +
      "management accountability, and board-level reporting.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "77",
    title: "Risk Assessment — General",
    summary:
      "Mandatory cybersecurity risk assessment covering space segment, ground segment, " +
      "communication links, and supply chain. Must be conducted pre-authorization and annually.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21(2)", relationship: "extends" },
      {
        framework: "ISO_27001",
        reference: "Section 6.1",
        relationship: "codifies",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "78",
    title: "Risk Assessment — Space-Specific Threats",
    summary:
      "Space-specific threat assessment including jamming, spoofing, signal interception, " +
      "on-orbit cyber-physical attacks, and supply chain compromise of space components.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21(2)", relationship: "extends" },
      {
        framework: "CCSDS",
        reference: "CCSDS 350.1-G-3",
        relationship: "codifies",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "79",
    title: "Access Control",
    summary:
      "Access control requirements for space and ground systems: role-based access, " +
      "multi-factor authentication, privileged access management, and session control.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
      {
        framework: "ISO_27001",
        reference: "Annex A.9",
        relationship: "codifies",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "80",
    title: "Encryption Requirements",
    summary:
      "Cryptographic requirements for telecommand, telemetry, and mission data. " +
      "End-to-end encryption for command and control links. Key management procedures.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
      {
        framework: "CCSDS",
        reference: "CCSDS 352.0-B-2",
        relationship: "codifies",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "81",
    title: "Network Security",
    summary:
      "Network segmentation, firewall, and monitoring requirements for ground station networks " +
      "and satellite communication infrastructure.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "82",
    title: "Software and Firmware Security",
    summary:
      "Secure software development lifecycle, firmware integrity verification, " +
      "secure boot, and update management for space and ground systems.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "83",
    title: "Security Monitoring and Detection",
    summary:
      "Continuous security monitoring and anomaly detection for space and ground segments. " +
      "SOC requirements and threat intelligence integration.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "84",
    title: "Vulnerability Management",
    summary:
      "Vulnerability discovery, assessment, and remediation for space and ground systems. " +
      "Coordinated vulnerability disclosure obligations.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "85",
    title: "Business Continuity Planning",
    summary:
      "Business continuity and disaster recovery plans for space operations. " +
      "Must cover ground station loss, satellite anomaly, and cyber incident scenarios.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 21(2)(c)",
        relationship: "extends",
      },
      {
        framework: "ISO_27001",
        reference: "Annex A.17",
        relationship: "codifies",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "86",
    title: "Backup and Recovery",
    summary:
      "Backup and recovery requirements for mission-critical data and systems. " +
      "Includes ground station redundancy and satellite safe-mode provisions.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 21(2)(c)",
        relationship: "extends",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "87",
    title: "Supply Chain Security",
    summary:
      "Cybersecurity requirements for the space supply chain: vendor assessment, " +
      "component provenance, and third-party risk management.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 21(2)(d)",
        relationship: "extends",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "88",
    title: "Simplified Cybersecurity Regime",
    summary:
      "Simplified cybersecurity requirements for eligible operators: SMEs, research missions, " +
      "and low-risk activities. Proportionate risk management approach.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 21", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "89",
    title: "Incident Reporting — Early Warning",
    summary:
      "24-hour early warning notification requirement for significant cybersecurity incidents " +
      "affecting space operations. Must include initial impact assessment.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 23(4)(a)",
        relationship: "extends",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "90",
    title: "Incident Reporting — Incident Notification",
    summary:
      "72-hour incident notification with detailed assessment: affected systems, " +
      "severity classification, initial root cause, and containment measures taken.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 23(4)(b)",
        relationship: "extends",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "91",
    title: "Incident Reporting — Final Report",
    summary:
      "1-month final incident report with root cause analysis, full impact assessment, " +
      "remediation measures, and lessons learned.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 23(4)(d)",
        relationship: "extends",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "92",
    title: "Incident Response Procedures",
    summary:
      "Incident response plan requirements: classification, escalation, containment, " +
      "eradication, and recovery procedures. Must include space-specific scenarios.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 23", relationship: "extends" },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "93",
    title: "EUSRN — Establishment",
    summary:
      "Establishes the European Union Space Resilience Network (EUSRN) as a " +
      "sector-specific coordination mechanism for space cybersecurity.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 23",
        relationship: "new_obligation",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "94",
    title: "EUSRN — Participation Obligations",
    summary:
      "Mandatory participation in EUSRN for operators above defined thresholds. " +
      "Includes threat intelligence sharing, joint exercises, and coordinated response.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 23",
        relationship: "new_obligation",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "95",
    title: "EUSRN — Information Sharing",
    summary:
      "EUSRN information sharing framework: threat intelligence, indicators of compromise, " +
      "vulnerability advisories, and best practices for space cybersecurity.",
    titleNumber: 5,
    chapter: "Title V — Cybersecurity",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      {
        framework: "NIS2",
        reference: "Art. 23",
        relationship: "new_obligation",
      },
    ],
    category: "cybersecurity",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TITLE VI — Supervision (Art. 96–119)
  // ════════════════════════════════════════════════════════════════════════════

  {
    articleNumber: "96",
    title: "Supervision Framework",
    summary:
      "General supervision framework: NCAs conduct ongoing monitoring of operator compliance, " +
      "including on-site inspections, audits, and information requests.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "100",
    title: "Investigation Powers",
    summary:
      "Powers of investigation including on-site inspections, document requests, " +
      "interviews, and technical assessments by NCAs and QTBs.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "105",
    title: "Corrective Measures",
    summary:
      "Process for findings, corrective measures, and compliance orders. " +
      "NCAs may require remediation, restrict operations, or suspend authorization.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "111",
    title: "Administrative Penalties — General Provisions",
    summary:
      "General framework for administrative penalties. Penalties must be effective, proportionate, " +
      "and dissuasive. Considers severity, duration, intent, and cooperation.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 34", relationship: "codifies" },
    ],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "112",
    title: "Penalties — Authorization Violations",
    summary:
      "Penalties for operating without authorization or violating authorization conditions. " +
      "Up to 1% of worldwide annual turnover or EUR 10 million, whichever is higher.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: ["SCO", "LO", "LSO", "ISOS", "TCO"],
  },
  {
    articleNumber: "113",
    title: "Penalties — Safety and Debris Violations",
    summary:
      "Penalties for non-compliance with debris mitigation, disposal, and safety requirements. " +
      "Up to 1% of worldwide annual turnover or EUR 10 million, whichever is higher.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "114",
    title: "Penalties — Cybersecurity Violations",
    summary:
      "Penalties for non-compliance with cybersecurity requirements including failure to report " +
      "incidents. Up to 1% of worldwide annual turnover or EUR 10 million, whichever is higher.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [
      { framework: "NIS2", reference: "Art. 34", relationship: "codifies" },
    ],
    category: "supervision",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "115",
    title: "Penalties — Environmental Violations",
    summary:
      "Penalties for non-compliance with environmental footprint declaration and " +
      "light/RF pollution requirements.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    articleNumber: "116",
    title: "Periodic Penalty Payments",
    summary:
      "Daily periodic penalty payments for ongoing non-compliance after corrective measures " +
      "deadline has passed. Designed to compel compliance.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "117",
    title: "Delegated and Implementing Acts",
    summary:
      "Commission powers to adopt delegated and implementing acts for detailed technical standards, " +
      "procedures, and thresholds throughout the Regulation.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "118",
    title: "Review",
    summary:
      "Mandatory review of the Regulation 5 years after application date. " +
      "Commission evaluates effectiveness, proportionality, and market impact.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
  {
    articleNumber: "119",
    title: "Entry into Force",
    summary:
      "Regulation enters into force 20 days after publication in the Official Journal. " +
      "Applies from 1 January 2030. Transitional provisions for existing operators.",
    titleNumber: 6,
    chapter: "Title VI — Supervision",
    status: "LEGISLATIVE_PROPOSAL",
    proposalRef: "COM(2025) 335",
    proposalDate: "2025-06-25",
    councilUpdate: "2025-12-05",
    disclaimer: DISCLAIMER,
    officialUrl: OFFICIAL_URL,
    enactedEquivalents: [],
    category: "supervision",
    applicableTo: "all",
  },
];

// ─── Lookup Functions ───────────────────────────────────────────────────────

/**
 * Get all EU Space Act articles.
 *
 * Every article is marked as LEGISLATIVE_PROPOSAL. This data is based on
 * COM(2025) 335 and may change during trilogue negotiations.
 */
export function getEUSpaceActArticles(): EUSpaceActArticle[] {
  return EU_SPACE_ACT_ARTICLES;
}

/**
 * Get a single EU Space Act article by article number.
 *
 * Accepts both plain numbers ("67") and sub-article references ("72(2)").
 * For sub-article references, matches the base article number.
 */
export function getEUSpaceActArticleByNumber(
  num: string,
): EUSpaceActArticle | null {
  // Strip parenthetical sub-references for matching: "72(2)" → "72"
  const baseNum = num.replace(/\(.*\)/, "").trim();
  return EU_SPACE_ACT_ARTICLES.find((a) => a.articleNumber === baseNum) ?? null;
}

/**
 * Get all EU Space Act articles for a given title number (1–10).
 */
export function getEUSpaceActArticlesByTitle(
  titleNum: number,
): EUSpaceActArticle[] {
  return EU_SPACE_ACT_ARTICLES.filter((a) => a.titleNumber === titleNum);
}

/**
 * Get all EU Space Act articles for a given compliance category.
 *
 * Valid categories: "debris", "cybersecurity", "spectrum", "export_control",
 * "insurance", "environmental", "authorization", "registration", "supervision".
 */
export function getEUSpaceActArticlesByCategory(
  cat: string,
): EUSpaceActArticle[] {
  return EU_SPACE_ACT_ARTICLES.filter((a) => a.category === cat);
}
