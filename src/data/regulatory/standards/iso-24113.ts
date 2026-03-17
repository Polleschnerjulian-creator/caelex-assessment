/**
 * ISO 24113:2019 — Space systems, Space debris mitigation requirements
 *
 * ISO 24113 is the primary international standard for space debris mitigation,
 * published by ISO/TC 20/SC 14 (Space systems and operations). It translates
 * the IADC Space Debris Mitigation Guidelines into a formal standardisation
 * framework that can be referenced in contracts, licensing conditions, and
 * national legislation.
 *
 * First published: 2011 (ISO 24113:2011)
 * Current edition: ISO 24113:2019 (second edition, 2019-07)
 *
 * Section 6 contains the core normative requirements, structured around:
 * - Limitation of debris released during normal operations
 * - Minimization of break-up potential
 * - Post-mission disposal
 * - Collision avoidance
 * - Re-entry safety
 *
 * Source: https://www.iso.org/standard/72383.html
 *
 * LEGAL DISCLAIMER: This data references an enacted ISO standard. Section
 * numbers and topic descriptions are based on the published standard.
 * Exact normative text is available only through ISO purchase. This does
 * not constitute legal advice.
 */

import type { EnactedRequirement } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const ISO24113_CITATION =
  "ISO 24113:2019, Space systems — Space debris mitigation requirements";

const LAST_VERIFIED = "2026-03-17";

const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. Article numbers may change." as const;

// ─── ISO 24113:2019 Section 6 — Core Requirements ──────────────────────────

export const iso24113Requirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.1 — Scope and field of application
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.1",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.1",
      title: "Scope and field of application",
      fullText:
        "This clause defines the scope of the debris mitigation requirements. " +
        "The standard applies to all spacecraft and orbital stages, including " +
        "launch vehicle upper stages, that operate in Earth orbit. Requirements " +
        "cover the complete mission lifecycle from design through end-of-life " +
        "disposal. The standard is applicable regardless of spacecraft mass, " +
        "mission duration, or orbital regime.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "LOS Art. 4; Arrêté du 31 mars 2011 (Technical Regulation)",
        notes:
          "French Space Operations Act and implementing Technical Regulation " +
          "reference ISO 24113 as the applicable debris mitigation standard " +
          "for all licensed space operations.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA references ISO 24113 alongside IADC guidelines as the baseline " +
          "debris mitigation standard for orbital operator licensing.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 70",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.2 — Limitation of debris released during normal operations
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.2",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.2",
      title: "Limitation of debris released during normal operations",
      fullText:
        "Spacecraft and orbital stages shall be designed to not release debris " +
        "during normal operations. The design shall aim for zero debris release. " +
        "Where the release of objects is unavoidable for mission success, the " +
        "number, area, and orbital lifetime of released objects shall be minimised. " +
        "Any mission-related object released shall have an orbital lifetime that " +
        "conforms to the post-mission disposal requirements of this standard. " +
        "This requirement corresponds to IADC Guideline 5.1.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 10",
        notes:
          "CNES Technical Regulation requires design measures to achieve zero " +
          "debris release during nominal operations, aligned with ISO 24113 Section 6.2.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Industry Act 2018 s.12; CAA Licence Conditions",
        notes:
          "UK CAA requires demonstration that the spacecraft design avoids operational " +
          "debris release, referencing ISO 24113 requirements.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 70(1)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.3 — Minimization of break-up potential
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.3",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.3",
      title: "Minimization of break-up potential",
      fullText:
        "Spacecraft and orbital stages shall be designed and operated to minimise " +
        "the probability of accidental break-up. All on-board sources of stored " +
        "energy (including residual propellants, pressurant gases, batteries, " +
        "flywheels, and momentum wheels) shall be passivated — depleted or made " +
        "safe — when no longer required for mission operations or post-mission " +
        "disposal. This requirement applies to both the operational and " +
        "post-mission phases. Corresponds to IADC Guideline 5.2.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 11",
        notes:
          "CNES Technical Regulation mandates passivation of all energy sources and " +
          "requires a detailed passivation plan as part of the debris mitigation plan.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Guidance on Passivation (CAP 2327)",
        notes:
          "UK CAA requires passivation plans demonstrating safe depletion of all " +
          "stored energy sources, referencing ISO 24113 Section 6.3.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 70(2)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.3.1 — On-orbit break-up prevention during operational phase
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.3.1",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.3.1",
      title: "On-orbit break-up prevention during operational phase",
      fullText:
        "During the operational phase, the spacecraft or orbital stage shall be " +
        "operated to avoid conditions that could lead to accidental break-up. " +
        "Operators shall monitor the status of stored energy sources and take " +
        "preventive action if a condition is detected that could result in an " +
        "unintentional break-up event. If an anomaly is detected that could lead " +
        "to break-up, early passivation and/or disposal should be initiated. " +
        "Intentional destruction that generates long-lived debris is prohibited.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 11.2",
        notes:
          "CNES requires operators to monitor for conditions that could lead to " +
          "break-up during operations and to initiate early passivation if necessary.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA expects continuous monitoring and contingency plans for potential " +
          "break-up conditions during the operational phase.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 70(2)(b)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.3.2 — Post-mission break-up prevention (passivation)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.3.2",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.3.2",
      title: "Post-mission break-up prevention (passivation)",
      fullText:
        "Upon completion of the mission, all on-board sources of stored energy " +
        "shall be depleted or made safe (passivation). This includes: depletion " +
        "or venting of residual propellants and pressurant gases; discharge of " +
        "batteries or permanent connection to a discharge circuit; de-spin of " +
        "momentum or reaction wheels; safing of any self-destruct mechanisms; " +
        "and venting of any pressure vessels. Passivation shall occur as soon as " +
        "practicable after end of mission and before post-mission disposal manoeuvres.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 11.1",
        notes:
          "CNES requires a comprehensive passivation plan covering all energy sources, " +
          "including propellant, pressurant, batteries, and momentum devices. The plan " +
          "must be submitted as part of the debris mitigation file.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Guidance on Passivation (CAP 2327)",
        notes:
          "UK CAA requires detailed passivation plans demonstrating safe depletion " +
          "of all stored energy sources post-mission.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 70(2)(a)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.4 — Post-mission disposal
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.4",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.4",
      title: "Post-mission disposal",
      fullText:
        "A spacecraft or orbital stage shall be disposed of in a manner that " +
        "eliminates its long-term presence in the LEO or GEO protected regions. " +
        "Disposal options include controlled or uncontrolled atmospheric re-entry, " +
        "manoeuvre to a graveyard orbit (for GEO), or retrieval. The operator " +
        "shall plan and demonstrate the feasibility of post-mission disposal " +
        "prior to launch. The disposal plan shall account for system reliability " +
        "and fuel budget allocation. Corresponds to IADC Guideline 5.3.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 12",
        notes:
          "CNES Technical Regulation establishes disposal requirements aligned with " +
          "ISO 24113 for all orbital regimes. A disposal plan is mandatory in the " +
          "debris mitigation file.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA requires a disposal plan meeting ISO 24113 requirements as a " +
          "mandatory licence condition.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.4.1 — LEO disposal (25-year orbital lifetime limit)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.4.1",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.4.1",
      title: "LEO post-mission disposal — 25-year orbital lifetime limit",
      fullText:
        "For spacecraft and orbital stages operating in or passing through the " +
        "LEO protected region (altitude below 2,000 km), the remaining orbital " +
        "lifetime after end of mission shall not exceed 25 years. This may be " +
        "achieved through natural orbital decay, a de-orbit manoeuvre, or direct " +
        "retrieval. Orbital lifetime shall be computed using an accepted " +
        "prediction method accounting for atmospheric drag, solar activity " +
        "cycles, and object area-to-mass ratio. Corresponds to IADC Guideline 5.3.2.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 12.2",
        notes:
          "CNES enforces the 25-year rule using validated orbital lifetime prediction " +
          "tools (e.g., STELA). French regulation is moving towards a shorter 5-year " +
          "guideline aligned with evolving best practice.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Industry Act 2018 s.12; CAA Licence Conditions",
        notes:
          "UK CAA enforces the 25-year de-orbit rule and encourages operators to aim " +
          "for 5 years in line with evolving international best practice.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71(2)",
      confidence: "direct",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.4.2 — GEO disposal (graveyard orbit)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.4.2",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.4.2",
      title: "GEO post-mission disposal — graveyard orbit",
      fullText:
        "Spacecraft in the geosynchronous region shall be manoeuvred at end of " +
        "mission to a disposal orbit above the GEO protected region. The minimum " +
        "perigee altitude of the disposal orbit above the geostationary altitude " +
        "shall be computed according to the formula: 235 km + (1000 × Cr × A/m) km, " +
        "where Cr is the solar radiation pressure coefficient and A/m is the " +
        "area-to-mass ratio. This typically results in a disposal orbit at least " +
        "300 km above GEO. Eccentricity shall be minimised. " +
        "Corresponds to IADC Guideline 5.3.1.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 12.1",
        notes:
          "CNES requires GEO spacecraft to achieve a graveyard orbit at least 300 km " +
          "above GEO, with specific calculations based on area-to-mass ratio and " +
          "solar radiation pressure coefficient per ISO 24113.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA GEO disposal requirements",
        notes:
          "UK CAA requires GEO operators to demonstrate capability for disposal to " +
          "the ISO 24113/IADC-recommended graveyard orbit altitude.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71(1)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.5 — Collision avoidance
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.5",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.5",
      title: "Collision avoidance",
      fullText:
        "Operators shall assess and, if necessary, take action to reduce the " +
        "probability of collision with known objects during all orbital phases. " +
        "This includes subscribing to conjunction assessment services, analysing " +
        "conjunction data messages (CDMs), and executing collision avoidance " +
        "manoeuvres when the probability of collision exceeds the operator's " +
        "defined threshold. Spacecraft with manoeuvre capability shall maintain " +
        "sufficient propellant reserves and operational readiness for collision " +
        "avoidance throughout the mission. Corresponds to IADC Guideline 5.4.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 13",
        notes:
          "CNES requires conjunction assessment and collision avoidance capabilities. " +
          "CNES provides conjunction data services to French-licensed operators.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; UK Space Agency Monitor my Satellite programme",
        notes:
          "UK CAA requires collision avoidance capabilities as a licence condition. " +
          "UK Space Agency provides conjunction data services via Monitor my Satellite.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72",
      confidence: "direct",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6.6 — Re-entry safety (casualty risk < 1:10,000)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ISO24113-6.6",
    source: {
      framework: "ISO 24113:2019",
      reference: "Section 6.6",
      title: "Re-entry safety — limitation of ground casualty risk",
      fullText:
        "When disposal is accomplished through atmospheric re-entry, the risk " +
        "on ground from surviving debris shall be limited. The casualty " +
        "expectation from a single re-entry event shall not exceed 1 in 10,000 " +
        "(1 × 10⁻⁴). If the spacecraft or orbital stage cannot meet this " +
        "threshold through uncontrolled re-entry (due to surviving components), " +
        "a controlled re-entry targeting uninhabited areas shall be performed. " +
        "The re-entry risk analysis shall account for all components that may " +
        "survive atmospheric heating, including tanks, structural elements, " +
        "and optical assemblies.",
      status: "published",
      citation: ISO24113_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Arrêté du 31 mars 2011, RT Art. 12.4",
        notes:
          "CNES applies the 1-in-10,000 casualty risk threshold and requires re-entry " +
          "survivability analysis using validated tools such as DEBRISK.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Re-entry Safety Assessment",
        notes:
          "UK CAA applies the 1-in-10,000 casualty risk threshold for uncontrolled " +
          "re-entry and requires controlled re-entry planning where objects have " +
          "significant surviving mass.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71(4)",
      confidence: "partial",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },
];

// ─── Accessor Functions ─────────────────────────────────────────────────────

/**
 * Returns all ISO 24113:2019 Space Debris Mitigation requirements.
 */
export function getISO24113Requirements(): EnactedRequirement[] {
  return iso24113Requirements;
}

/**
 * Returns a single ISO 24113 requirement by its ID, or null if not found.
 *
 * @param id - The requirement identifier (e.g., "ISO24113-6.4.1")
 */
export function getISO24113RequirementById(
  id: string,
): EnactedRequirement | null {
  return iso24113Requirements.find((r) => r.id === id) ?? null;
}
