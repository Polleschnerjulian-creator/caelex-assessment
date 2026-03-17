/**
 * COPUOS Long-Term Sustainability Guidelines (2019)
 *
 * Guidelines for the Long-term Sustainability of Outer Space Activities,
 * adopted by the UN Committee on the Peaceful Uses of Outer Space (COPUOS)
 * at its 62nd session in June 2019 and endorsed by the UN General Assembly
 * in its report A/74/20 (2019).
 *
 * The LTS Guidelines are a set of 21 voluntary, non-binding guidelines
 * organised into four groups:
 *   A. Policy and regulatory framework for space activities (A.1–A.7)
 *   B. Safety of space operations (B.1–B.10)
 *   C. International cooperation, capacity-building and awareness (C.1–C.2)
 *   D. Scientific and technical research and development (D.1–D.2)
 *
 * These guidelines represent the highest-level international consensus on
 * sustainable space operations and are increasingly referenced in national
 * licensing requirements and the EU Space Act proposal.
 *
 * Source: "Report of the Committee on the Peaceful Uses of Outer Space,
 *         Sixty-second session" (A/74/20), Annex II, 2019
 *
 * LEGAL DISCLAIMER: This data references a published UN document. Guideline
 * descriptions are based on the official UN document. This does not
 * constitute legal advice.
 */

import type { EnactedRequirement } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const COPUOS_CITATION =
  "Guidelines for the Long-term Sustainability of Outer Space Activities, A/74/20, 2019";

const LAST_VERIFIED = "2026-03-17";

const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. Article numbers may change." as const;

// ─── COPUOS LTS Guidelines — Enacted Requirements ──────────────────────────

export const copuosRequirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Group A — Policy and regulatory framework for space activities
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "COPUOS-A1",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline A.1",
      title:
        "Adopt, revise and amend, as necessary, national regulatory frameworks for outer space activities",
      fullText:
        "States should adopt, revise and amend, as necessary, national " +
        "regulatory frameworks for outer space activities carried out by " +
        "governmental entities and non-governmental entities under their " +
        "jurisdiction, taking into account relevant COPUOS guidelines, " +
        "including applicable instruments of the United Nations, and in " +
        "accordance with the obligations of States under the United Nations " +
        "treaties on outer space. Such frameworks should address authorization " +
        "and continuing supervision of space activities.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Loi n° 2008-518 (LOS); Décrets et Arrêtés d'application",
        notes:
          "France has a comprehensive national space law framework implementing " +
          "Guideline A.1, with the 2008 Space Operations Act and 2011 Technical Regulation.",
      },
      {
        jurisdiction: "UK",
        reference: "Outer Space Act 1986; UK Space Industry Act 2018",
        notes:
          "UK maintains a dual statutory framework with the 1986 Act (general) " +
          "and 2018 Act (commercial launch and return), implementing Guideline A.1.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 4–6",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "authorization",
    applicableTo: "all",
    priority: "recommended",
  },

  {
    id: "COPUOS-A2",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline A.2",
      title:
        "Consider a number of elements when developing, revising or amending, as necessary, national regulatory frameworks for outer space activities",
      fullText:
        "In developing or revising national regulatory frameworks, States should " +
        "consider elements including: conditions for authorization and " +
        "supervision; requirements for space debris mitigation; registration " +
        "practices; liability provisions; insurance or financial guarantee " +
        "requirements; frequency coordination; and protection of the space " +
        "environment. Regulatory frameworks should be proportionate to the " +
        "risks posed by the specific space activity and should not impose " +
        "unnecessary burdens on operators.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "LOS Art. 4–6; Arrêté du 31 mars 2011",
        notes:
          "France addresses all elements listed in Guideline A.2 across its " +
          "statutory and regulatory framework, including debris mitigation, " +
          "insurance, and liability.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Industry Act 2018; SI 2021/792",
        notes:
          "UK Space Industry Act and implementing regulations address authorization, " +
          "insurance, liability, and environmental protection per Guideline A.2.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 7–10",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "authorization",
    applicableTo: "all",
    priority: "recommended",
  },

  {
    id: "COPUOS-A3",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline A.3",
      title: "Supervise national space activities",
      fullText:
        "States should supervise the space activities carried out under their " +
        "jurisdiction, including through the establishment of appropriate " +
        "institutional mechanisms. Supervision should cover the full lifecycle " +
        "of a space activity, from the authorization phase through end-of-life " +
        "operations, and should enable the competent authority to ensure " +
        "continued compliance with the conditions of authorization.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "LOS Art. 7–8; CNES as Technical Authority",
        notes:
          "France assigns continuing supervision to CNES as the technical authority " +
          "under the Space Operations Act, covering the full mission lifecycle.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Industry Act 2018 s.7; CAA as Regulator",
        notes:
          "UK CAA exercises continuing supervision over licensed space activities " +
          "including compliance monitoring and licence condition enforcement.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 14–17",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "supervision",
    applicableTo: "all",
    priority: "recommended",
  },

  {
    id: "COPUOS-A4",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline A.4",
      title:
        "Ensure the equitable, rational and efficient use of the radio frequency spectrum and the various orbital regions used by satellites",
      fullText:
        "States and international organizations should ensure the equitable, " +
        "rational and efficient use of the radio frequency spectrum and the " +
        "various orbital regions used by satellites, in accordance with the " +
        "Constitution and Convention of the International Telecommunication " +
        "Union and the Radio Regulations. This includes proper frequency " +
        "coordination and registration of satellite networks.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "Code des postes et des communications électroniques; ARCEP",
        notes:
          "France ensures spectrum management through ARCEP and ANFR, coordinating " +
          "satellite frequency assignments with the ITU.",
      },
      {
        jurisdiction: "UK",
        reference: "Communications Act 2003; Ofcom Spectrum Management",
        notes:
          "UK manages satellite spectrum through Ofcom, ensuring compliance with " +
          "ITU Radio Regulations and efficient spectrum use.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 85–86",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: "all",
    priority: "recommended",
  },

  {
    id: "COPUOS-A5",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline A.5",
      title: "Enhance the practice of registering space objects",
      fullText:
        "States and international intergovernmental organizations should enhance " +
        "the practice of registering space objects by providing the United " +
        "Nations with registration information as soon as practicable, in " +
        "conformity with the Registration Convention and relevant General " +
        "Assembly resolutions. States should register all objects launched into " +
        "Earth orbit or beyond and update the registration information as " +
        "needed, including orbital status changes and end-of-life disposal.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "LOS Art. 11; Registration Convention",
        notes:
          "France maintains a national space objects registry and submits registration " +
          "information to the UN in accordance with the Registration Convention.",
      },
      {
        jurisdiction: "UK",
        reference:
          "Outer Space Act 1986 s.7; UK Space Registry; Registration Convention",
        notes:
          "UK maintains the UK Space Registry for registering space objects with " +
          "the UN, enhanced following the 2018 Space Industry Act.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59–61",
      confidence: "direct",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "registration",
    applicableTo: "all",
    priority: "recommended",
  },

  {
    id: "COPUOS-A6",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline A.6",
      title:
        "Enhance the sharing of experience related to the long-term sustainability of outer space activities",
      fullText:
        "States, international organizations, and national space agencies should " +
        "share experience and practices related to the long-term sustainability " +
        "of outer space activities, including through COPUOS and its subsidiary " +
        "bodies. The sharing of best practices, lessons learned, and guidance " +
        "documents contributes to capacity-building and harmonization of " +
        "approaches across States.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "CNES international cooperation programmes",
        notes:
          "France actively shares debris mitigation and space sustainability " +
          "expertise through CNES participation in IADC, ISO/TC 20, and COPUOS.",
      },
      {
        jurisdiction: "UK",
        reference: "UK Space Agency international engagement",
        notes:
          "UK Space Agency shares regulatory experience through COPUOS, IADC, " +
          "and bilateral agreements with other space agencies.",
      },
    ],
    euSpaceActProposal: null,
    category: "supervision",
    applicableTo: "all",
    priority: "best_practice",
  },

  {
    id: "COPUOS-A7",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline A.7",
      title:
        "Develop or adapt policies, as appropriate, related to the long-term sustainability of outer space activities",
      fullText:
        "States should develop or adapt policies related to the long-term " +
        "sustainability of outer space activities, taking into account their " +
        "specific national circumstances and capabilities. Such policies should " +
        "be informed by relevant international guidelines and standards and " +
        "should promote the safe and sustainable use of outer space for current " +
        "and future generations.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "French National Space Strategy; LOS implementation decrees",
        notes:
          "France has adopted national space sustainability policies through the " +
          "Space Operations Act and CNES technical regulations.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK National Space Strategy 2021; UK Space Sustainability Plan",
        notes:
          "UK has integrated sustainability into its National Space Strategy and " +
          "CAA licensing requirements.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 1–3",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "authorization",
    applicableTo: "all",
    priority: "recommended",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Group B — Safety of space operations (selected key guidelines)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "COPUOS-B1",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline B.1",
      title:
        "Provide updated contact information and share information on space objects and orbital events",
      fullText:
        "States and international intergovernmental organizations should " +
        "establish and maintain appropriate points of contact and procedures " +
        "for the exchange of information on space objects and orbital events. " +
        "This includes sharing conjunction assessment data, collision avoidance " +
        "information, orbital manoeuvre notifications, and information about " +
        "potential break-up events. Timely sharing of such data enhances the " +
        "safety of space operations for all operators.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "CNES Conjunction Assessment Services; RT Art. 13",
        notes:
          "CNES provides conjunction assessment services and coordinates data " +
          "sharing with international partners including ESA SSA.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Agency Monitor my Satellite programme; CAA Licence Conditions",
        notes:
          "UK Space Agency operates the Monitor my Satellite service for conjunction " +
          "data sharing and operator notifications.",
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
    priority: "recommended",
  },

  {
    id: "COPUOS-B2",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline B.2",
      title:
        "Improve accuracy of orbital data on space objects and enhance the practice and utility of sharing orbital data",
      fullText:
        "States and international organizations should improve the accuracy of " +
        "orbital data on space objects, including through enhanced observation " +
        "and tracking capabilities. Operators should ensure their space objects " +
        "are trackable by ground-based surveillance networks. Where feasible, " +
        "operators should share ephemeris data to improve conjunction assessment " +
        "accuracy. Enhanced tracking and data sharing are particularly important " +
        "for small satellites and constellation operations.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "CNES/GRAVES radar system; Arrêté du 31 mars 2011",
        notes:
          "France operates the GRAVES space surveillance radar and contributes to " +
          "the EU SST consortium for enhanced orbital tracking.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Surveillance and Tracking programme; CAA trackability requirements",
        notes:
          "UK CAA requires operators to ensure trackability of their space objects " +
          "and UK contributes to international SSA through the UK SST programme.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72–73",
      confidence: "direct",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "recommended",
  },

  {
    id: "COPUOS-B3",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline B.3",
      title:
        "Collect, share and make available information on space debris, space weather and space objects",
      fullText:
        "States should promote the collection, archiving and dissemination of " +
        "information on space debris, including orbital parameters, physical " +
        "characteristics, and debris generation events. States should also " +
        "share information on space weather events that could affect space " +
        "operations. This data supports re-entry prediction, collision " +
        "assessment, and long-term orbital environment modelling.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference: "CNES debris cataloguing; French contribution to EU SST",
        notes:
          "France contributes to space debris cataloguing through CNES and provides " +
          "data to the EU SST consortium.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Debris Assessment; Met Office Space Weather service",
        notes:
          "UK supports space debris data sharing through its SST programme and " +
          "provides space weather information via the Met Office.",
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
    priority: "recommended",
  },

  {
    id: "COPUOS-B4",
    source: {
      framework: "COPUOS LTS Guidelines",
      reference: "Guideline B.4",
      title:
        "Perform conjunction assessment during all orbital phases of controlled flight",
      fullText:
        "States and international organizations should perform conjunction " +
        "assessment and develop collision avoidance procedures for all orbital " +
        "phases of controlled flight, including deployment, station-keeping, " +
        "orbit-raising, repositioning, and disposal phases. Operators should " +
        "register with conjunction assessment services and establish operational " +
        "procedures for evaluating and responding to conjunction warnings. " +
        "This guideline reinforces the IADC collision avoidance recommendations.",
      status: "published",
      citation: COPUOS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "FR",
        reference:
          "Arrêté du 31 mars 2011, RT Art. 13; CNES conjunction services",
        notes:
          "CNES mandates conjunction assessment throughout all mission phases and " +
          "provides conjunction data services to licensed operators.",
      },
      {
        jurisdiction: "UK",
        reference:
          "UK Space Industry Act 2018 s.12; CAA Orbital Operator Licence Conditions",
        notes:
          "UK CAA requires conjunction assessment during all orbital phases as a " +
          "licence condition, supported by the Monitor my Satellite programme.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(1)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: "all",
    priority: "recommended",
  },
];

// ─── Accessor Functions ─────────────────────────────────────────────────────

/**
 * Returns all COPUOS Long-Term Sustainability Guidelines requirements.
 */
export function getCOPUOSRequirements(): EnactedRequirement[] {
  return copuosRequirements;
}

/**
 * Returns a single COPUOS LTS requirement by its ID, or null if not found.
 *
 * @param id - The requirement identifier (e.g., "COPUOS-A1" or "COPUOS-B4")
 */
export function getCOPUOSRequirementById(
  id: string,
): EnactedRequirement | null {
  return copuosRequirements.find((r) => r.id === id) ?? null;
}
