/**
 * IADC Space Debris Mitigation Guidelines, Revision 2
 * Document: IADC-02-01, Rev.2, March 2020
 *
 * The Inter-Agency Space Debris Coordination Committee (IADC) guidelines
 * are the PRIMARY international debris mitigation standard that National
 * Competent Authorities (NCAs) worldwide evaluate against when licensing
 * space activities.
 *
 * Source: https://www.iadc-home.org/documents_public/
 * Full title: "IADC Space Debris Mitigation Guidelines"
 * Revision 2, IADC-02-01, March 2020
 *
 * These guidelines were adopted by the UN COPUOS Scientific and Technical
 * Subcommittee and form the basis of the UN Space Debris Mitigation
 * Guidelines (A/RES/62/217).
 */

import type { EnactedRequirement } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const IADC_CITATION =
  "IADC Space Debris Mitigation Guidelines, IADC-02-01, Revision 2, March 2020";

const LAST_VERIFIED = "2026-03-17";

const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. Article numbers may change." as const;

// ─── IADC Guidelines Rev.2 — Enacted Requirements ──────────────────────────

export const iadcRequirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Section 5.1 — Limit Debris Released during Normal Operations
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "IADC-5.1",
    source: {
      framework: "IADC",
      reference: "Section 5.1",
      title: "Limit Debris Released during Normal Operations",
      fullText:
        "Space systems shall be designed not to release debris during normal operations. " +
        "If this is not feasible, the effect of any release of debris on the orbital environment " +
        "shall be minimised. Any mission-related objects released must have a limited orbital lifetime.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "LOS Art. 5 / Arrêté du 31 mars 2011, RT Art. 10",
        notes:
          "CNES Technical Regulation requires design measures to limit operational debris release per IADC 5.1.",
      },
      {
        jurisdiction: "UK",
        reference:
          "Outer Space Act 1986 s.5; UK Space Industry Act 2018 s.12; CAA Licence Conditions",
        notes:
          "UK CAA requires operators to demonstrate compliance with IADC debris limitation guidelines.",
      },
      {
        jurisdiction: "DE",
        reference: "Satellitendatensicherheitsgesetz (SatDSiG); DLR guidelines",
        notes:
          "Germany references IADC guidelines in national licensing; DLR applies IADC standards in debris assessment.",
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

  {
    id: "IADC-5.1-a",
    source: {
      framework: "IADC",
      reference: "Section 5.1(a)",
      title: "Design to Prevent Operational Debris Release",
      fullText:
        "Spacecraft and orbital stages shall be designed to avoid the release of mission-related " +
        "objects such as lens caps, separation mechanisms, deployment hardware, and other components " +
        "during normal operations. Where release is unavoidable, objects should have orbital lifetimes of less than 25 years.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 10.1",
        notes:
          "CNES requires detailed analysis of mission-related object releases and their orbital lifetime.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Guidance",
        notes:
          "CAA licence conditions mandate avoidance of operational debris release during all mission phases.",
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
  // Section 5.2 — Minimise the Potential for On-Orbit Break-ups
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "IADC-5.2",
    source: {
      framework: "IADC",
      reference: "Section 5.2",
      title: "Minimise the Potential for On-Orbit Break-ups",
      fullText:
        "In order to limit the risk to other spacecraft and orbital stages from accidental " +
        "break-ups, spacecraft and orbital stages that have terminated their operational phases " +
        "shall be designed and operated to avoid break-ups. This applies to both post-mission and operational phases.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 11",
        notes:
          "CNES Technical Regulation addresses break-up prevention through stored energy passivation requirements.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Industry Act 2018 s.12; CAA Licence Conditions",
        notes:
          "UK CAA requires demonstration of break-up prevention measures in licence applications.",
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

  {
    id: "IADC-5.2.1",
    source: {
      framework: "IADC",
      reference: "Section 5.2.1",
      title: "Minimise Post-Mission Break-ups Resulting from Stored Energy",
      fullText:
        "In order to limit the risk of post-mission break-ups, all on-board sources of stored " +
        "energy shall be depleted or made safe when they are no longer required for mission " +
        "operations or post-mission disposal. This includes residual propellants, pressurant gases, " +
        "batteries, momentum wheels, and other energy sources (passivation).",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 11.1",
        notes:
          "CNES requires a passivation plan for all stored energy sources including propellant, " +
          "pressurant, batteries, and momentum devices.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Guidance on Passivation (CAP 2327)",
        notes:
          "UK CAA requires passivation plans demonstrating safe depletion of all stored energy sources.",
      },
      {
        jurisdiction: "DE",
        reference: "DLR Technical Guidelines for Debris Mitigation",
        notes:
          "DLR requires passivation analysis in debris mitigation plans aligned with IADC 5.2.1.",
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

  {
    id: "IADC-5.2.2",
    source: {
      framework: "IADC",
      reference: "Section 5.2.2",
      title: "Minimise Break-ups during Operational Phases",
      fullText:
        "During the operational phase, spacecraft and orbital stages shall be operated to " +
        "minimise the probability of accidental break-up. If a condition is detected that could " +
        "lead to a break-up, disposal and passivation measures should be planned and executed " +
        "to avoid break-up events.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 11.2",
        notes:
          "CNES requires operators to monitor for conditions that could lead to break-up and take preventive action.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA expects continuous monitoring and contingency plans for potential break-up conditions.",
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

  {
    id: "IADC-5.2.3",
    source: {
      framework: "IADC",
      reference: "Section 5.2.3",
      title:
        "Avoidance of Intentional Destruction and Other Harmful Activities",
      fullText:
        "Intentional destruction of a spacecraft or orbital stage (e.g. self-destruct, intentional " +
        "collision or explosion) shall not be planned or conducted in a manner that generates " +
        "long-lived debris. Any intentional break-up must be conducted at sufficiently low altitude " +
        "that the resulting fragments have short orbital lifetimes.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 11.3",
        notes:
          "CNES prohibits intentional destruction that would generate long-lived debris in protected regions.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Industry Act 2018 s.12; CAA Licence Conditions",
        notes:
          "UK licensing explicitly prohibits intentional destruction of space objects in a manner generating persistent debris.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 70(2)(c)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 5.3 — Post Mission Disposal
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "IADC-5.3",
    source: {
      framework: "IADC",
      reference: "Section 5.3",
      title: "Post Mission Disposal",
      fullText:
        "Spacecraft and orbital stages that have terminated their mission in, or that pass through, " +
        "the LEO or GEO protected regions shall be disposed of in a manner that limits their " +
        "long-term presence in these regions. Specific disposal options depend on the orbital regime.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 12",
        notes:
          "CNES Technical Regulation establishes disposal requirements aligned with IADC 5.3 for all orbital regimes.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA requires a disposal plan meeting IADC post-mission disposal requirements as a licence condition.",
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

  {
    id: "IADC-5.3.1",
    source: {
      framework: "IADC",
      reference: "Section 5.3.1",
      title: "Geosynchronous Region — GEO Protected Region Disposal",
      fullText:
        "Spacecraft in the geosynchronous region shall be manoeuvred to a graveyard/disposal orbit " +
        "above the GEO protected region. The minimum perigee altitude above GEO shall be: " +
        "235 km + (1000 × Cr × A/m) km, which typically results in disposal orbits at least " +
        "300 km above GEO altitude. This prevents re-entry into the GEO protected zone.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 12.1",
        notes:
          "CNES requires GEO spacecraft to achieve a graveyard orbit at least 300 km above GEO, " +
          "with specific calculations based on area-to-mass ratio and solar radiation pressure coefficient.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA GEO disposal requirements",
        notes:
          "UK CAA requires GEO operators to demonstrate capability for disposal to the IADC-recommended graveyard orbit altitude.",
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

  {
    id: "IADC-5.3.2",
    source: {
      framework: "IADC",
      reference: "Section 5.3.2",
      title: "Objects Passing Through LEO Region — 25-Year De-orbit Rule",
      fullText:
        "Spacecraft and orbital stages that have completed their mission in orbits that pass " +
        "through the LEO protected region (below 2,000 km altitude) shall be de-orbited or " +
        "manoeuvred to an orbit where the orbital lifetime is reduced. A spacecraft or orbital " +
        "stage should be left in an orbit in which, using an accepted orbital lifetime prediction " +
        "method, the remaining orbital lifetime is limited to 25 years after end of mission.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 12.2",
        notes:
          "CNES enforces the 25-year rule for LEO spacecraft with an accepted orbital lifetime " +
          "prediction tool (e.g., STELA). French regulation is moving towards a shorter 5-year guideline.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Industry Act 2018 s.12; CAA Licence Conditions",
        notes:
          "UK CAA enforces the 25-year de-orbit rule and encourages operators to aim for 5 years " +
          "in line with evolving best practice.",
      },
      {
        jurisdiction: "DE",
        reference: "DLR Technical Guidelines; German Space Act licensing",
        notes:
          "Germany applies the 25-year de-orbit requirement as a baseline, evaluated through DLR debris analysis.",
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

  {
    id: "IADC-5.3.2-b",
    source: {
      framework: "IADC",
      reference: "Section 5.3.2(b)",
      title: "Direct Retrieval from LEO",
      fullText:
        "As an alternative to natural orbital decay within 25 years, a spacecraft or orbital stage " +
        "in the LEO protected region may be directly retrieved from orbit within the 25-year " +
        "post-mission period. This option requires demonstration of a credible retrieval capability.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 12.2(b)",
        notes:
          "CNES may accept retrieval as an alternative disposal method if a credible plan is demonstrated.",
      },
      {
        jurisdiction: "UK",
        reference: "UK CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA may accept retrieval plans as an alternative if the operator can demonstrate credible retrieval capability.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "recommended",
  },

  {
    id: "IADC-5.3.3",
    source: {
      framework: "IADC",
      reference: "Section 5.3.3",
      title: "Other Orbital Regions — Disposal Outside LEO and GEO",
      fullText:
        "Spacecraft and orbital stages operating in other orbital regions (MEO, HEO, GTO) " +
        "shall be disposed of to avoid long-term interference with the LEO and GEO protected " +
        "regions. Options include manoeuvring to a storage orbit that does not intersect LEO or " +
        "GEO, or direct de-orbit via atmospheric re-entry.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 12.3",
        notes:
          "CNES requires disposal analysis for MEO/HEO/GTO missions ensuring no long-term interference with protected regions.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA evaluates disposal plans for non-LEO/non-GEO missions against IADC 5.3.3 principles.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71(3)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "IADC-5.3-reentry",
    source: {
      framework: "IADC",
      reference: "Section 5.3",
      title: "Controlled Re-entry and Ground Casualty Risk Limitation",
      fullText:
        "When disposal is accomplished through atmospheric re-entry, the risk on ground from " +
        "surviving debris shall be limited. If the spacecraft or orbital stage is likely to survive " +
        "re-entry, a controlled re-entry targeting uninhabited areas (e.g., oceanic zones) should " +
        "be performed. The casualty risk to people on ground shall not exceed 1 in 10,000 per re-entry event.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 12.4",
        notes:
          "CNES applies the 1-in-10,000 casualty risk threshold and requires controlled re-entry analysis " +
          "using validated tools such as DEBRISK for spacecraft that may survive atmospheric re-entry.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Re-entry Safety Assessment",
        notes:
          "UK CAA applies the 1-in-10,000 casualty risk threshold for uncontrolled re-entry and requires " +
          "controlled re-entry planning where objects have significant surviving mass.",
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 5.4 — Prevention of On-Orbit Collisions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "IADC-5.4",
    source: {
      framework: "IADC",
      reference: "Section 5.4",
      title: "Prevention of On-Orbit Collisions",
      fullText:
        "In order to reduce the probability of on-orbit collisions, operators shall assess and, " +
        "if necessary, take action to avoid collisions with known objects during the orbital " +
        "lifetime of their spacecraft or orbital stages. This includes collision avoidance " +
        "manoeuvres based on conjunction assessment data.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 13",
        notes:
          "CNES requires conjunction assessment and collision avoidance capabilities. " +
          "CNES provides conjunction data services to French-licensed operators.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; UK Space Agency Conjunction Assessment",
        notes:
          "UK CAA requires collision avoidance capabilities as a licence condition. " +
          "UK Space Agency provides conjunction data services via the Monitor my Satellite programme.",
      },
      {
        jurisdiction: "DE",
        reference: "DLR Technical Guidelines; ESA SSA services",
        notes:
          "Germany requires collision avoidance assessment for licensed missions, supported by ESA SST services.",
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

  {
    id: "IADC-5.4-a",
    source: {
      framework: "IADC",
      reference: "Section 5.4(a)",
      title: "Collision Avoidance — Conjunction Assessment",
      fullText:
        "Operators shall estimate the probability of collision with known objects for all orbital " +
        "phases, including deployment, operational, and disposal phases. Conjunction data from " +
        "recognised sources (e.g., 18th Space Defense Squadron, ESA SSA) should be utilised " +
        "to identify potential collision events and determine appropriate avoidance actions.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 13.1",
        notes:
          "CNES mandates conjunction assessment using validated data sources throughout the mission lifecycle.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK CAA Orbital Operator Licence Guidance; Monitor my Satellite programme",
        notes:
          "UK CAA expects operators to subscribe to conjunction assessment services and act on warnings.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(1)",
      confidence: "direct",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "IADC-5.4-b",
    source: {
      framework: "IADC",
      reference: "Section 5.4(b)",
      title: "Collision Avoidance — Manoeuvre Capability",
      fullText:
        "Spacecraft with manoeuvre capability shall be prepared to execute collision avoidance " +
        "manoeuvres when the probability of collision with a catalogued object exceeds an " +
        "acceptable threshold. Operators shall maintain sufficient propellant reserves and " +
        "operational readiness for collision avoidance throughout the mission.",
      status: "published",
      citation: IADC_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "RT Art. 13.2",
        notes:
          "CNES requires propellant budget allocation for collision avoidance manoeuvres in mission planning.",
      },
      {
        jurisdiction: "UK",
        reference: "UK CAA Orbital Operator Licence Guidance",
        notes:
          "UK CAA requires operators to demonstrate sufficient fuel reserves and procedures for collision avoidance.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(2)",
      confidence: "direct",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },
];

// ─── Accessor Functions ─────────────────────────────────────────────────────

/**
 * Returns all IADC Space Debris Mitigation Guidelines Rev.2 requirements.
 */
export function getIADCRequirements(): EnactedRequirement[] {
  return iadcRequirements;
}

/**
 * Returns a single IADC requirement by its ID, or null if not found.
 *
 * @param id - The requirement identifier (e.g., "IADC-5.3.2")
 */
export function getIADCRequirementById(id: string): EnactedRequirement | null {
  return iadcRequirements.find((r) => r.id === id) ?? null;
}
