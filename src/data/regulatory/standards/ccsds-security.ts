/**
 * CCSDS 350.1-G-3 — The Application of Security to CCSDS Protocols
 * Green Book, Issue 3, 2022
 *
 * The Consultative Committee for Space Data Systems (CCSDS) Green Book on
 * security provides a comprehensive threat taxonomy for space systems,
 * covering all mission segments: ground, communication link, space segment,
 * launch, user segment, and cross-cutting concerns such as supply chain,
 * insider threats, and environmental effects.
 *
 * This Green Book is the PRIMARY international reference for classifying
 * and addressing security threats in space mission architectures. It is
 * referenced by ESA, NASA, JAXA, and national cybersecurity authorities
 * when evaluating space system security postures.
 *
 * Source: https://public.ccsds.org/Pubs/350x1g3.pdf
 * Full title: "The Application of Security to CCSDS Protocols"
 * CCSDS 350.1-G-3, Green Book, Issue 3, November 2022
 *
 * LEGAL DISCLAIMER: This data references published international standards
 * and enacted law (NIS2 Directive). CCSDS Green Books are informational
 * references, not binding standards. This does not constitute legal advice.
 * Always consult the original CCSDS publication and qualified counsel.
 */

import type { EnactedRequirement } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const CCSDS_CITATION =
  "CCSDS 350.1-G-3, The Application of Security to CCSDS Protocols, Green Book, Issue 3, 2022";

const LAST_VERIFIED = "2026-03-17";

const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. Article numbers may change." as const;

// ─── CCSDS 350.1-G-3 — Space Security Threat Taxonomy ──────────────────────

const ccsdsRequirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-1 — Ground Segment Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-1",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.2 — Ground Segment Threats",
      title: "Ground segment threats — unauthorized access and SCC compromise",
      fullText:
        "The ground segment encompasses all facilities and systems used to control, " +
        "monitor, and communicate with space assets, including Spacecraft Control " +
        "Centres (SCCs), Telemetry Tracking and Command (TT&C) ground stations, " +
        "mission planning systems, and ground data processing infrastructure. " +
        "Threats include unauthorized physical and logical access to ground stations, " +
        "compromise of SCC command authentication systems, exploitation of ground " +
        "network interconnections, and manipulation of mission planning databases. " +
        "Ground segment compromise can lead to total loss of mission control.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(1); BSI-TR-03184 Section 4.2",
        notes:
          "German NIS2 transposition requires critical infrastructure operators " +
          "(including space ground segment operators) to implement access control " +
          "and physical security measures. BSI-TR-03184 provides sector-specific " +
          "guidance for ground station security assessment.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 3; CNES Security Guidelines",
        notes:
          "ANSSI requires space operators to secure ground segment infrastructure " +
          "under NIS2 transposition. CNES security guidelines mandate multi-factor " +
          "authentication for SCC access.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-2 — Communication Link Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-2",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.3 — Communication Link Threats",
      title:
        "Communication link threats — TT&C interception, command injection, jamming",
      fullText:
        "Communication links between ground and space segments are inherently " +
        "exposed due to the broadcast nature of radio frequency transmissions. " +
        "Threats include interception of telemetry and telecommand (TT&C) data, " +
        "injection of unauthorized commands into the uplink, replay attacks using " +
        "captured command sequences, jamming of uplink and downlink frequencies, " +
        "and spoofing of ground station identities. The CCSDS Space Data Link " +
        "Security Protocol (SDLS, CCSDS 355.0-B-1) and Space Link Extension " +
        "security mechanisms address authentication and encryption for these links.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(2)(d); BSI-TR-03184 Section 5.1",
        notes:
          "German NIS2 transposition mandates encryption and integrity protection " +
          "for critical communication links. BSI-TR-03184 references CCSDS SDLS " +
          "for space link protection.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 7; CNES RT-SEC",
        notes:
          "ANSSI requires cryptographic protection of command links for essential " +
          "entities operating space infrastructure. CNES security regulation mandates " +
          "authenticated and encrypted TT&C.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(1)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-3 — Space Segment Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-3",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.4 — Space Segment Threats",
      title:
        "Space segment threats — on-board software manipulation, sensor spoofing",
      fullText:
        "The space segment includes all on-board systems of spacecraft and orbital " +
        "stages. Threats encompass manipulation of on-board flight software through " +
        "compromised uplink channels, exploitation of firmware vulnerabilities in " +
        "on-board processors, spoofing of attitude determination sensors (star trackers, " +
        "sun sensors, GPS receivers), manipulation of payload data processing, and " +
        "unauthorized activation or deactivation of subsystems. The constrained " +
        "computational environment of space systems limits the applicability of " +
        "conventional cybersecurity defences, requiring space-specific security " +
        "architectures as described in CCSDS 350.0-G-3.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(2)(a); BSI-TR-03184 Section 5.3",
        notes:
          "German NIS2 transposition requires risk analysis covering all information " +
          "systems, including on-board spacecraft systems. BSI-TR-03184 addresses " +
          "on-board software integrity verification.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 5; CNES RT-SEC Art. 4",
        notes:
          "ANSSI requires software integrity measures for essential entity systems. " +
          "CNES security regulation addresses on-board software validation and " +
          "secure boot requirements.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "extends",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-4 — Launch Segment Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-4",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.5 — Launch Segment Threats",
      title:
        "Launch segment threats — launch vehicle software, payload integration security",
      fullText:
        "The launch segment includes launch vehicle systems, payload integration " +
        "facilities, and launch site infrastructure. Threats include compromise of " +
        "launch vehicle flight software and guidance systems, manipulation of " +
        "payload fairing and separation sequences, unauthorized access to payload " +
        "integration clean rooms and test facilities, interception of payload-to- " +
        "launch-vehicle interface data, and sabotage of pre-launch checkout " +
        "procedures. The shared nature of many launch campaigns (rideshare missions) " +
        "introduces additional cross-contamination risks between payloads.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(2)(e); BSI-TR-03184 Section 6.1",
        notes:
          "German NIS2 transposition requires physical and logical security for " +
          "critical infrastructure. BSI-TR-03184 addresses launch campaign security " +
          "and payload integration access controls.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 4; CSG Security Regulations",
        notes:
          "French transposition requires security of launch infrastructure. " +
          "Centre Spatial Guyanais (CSG) enforces strict access control and " +
          "security screening for all launch campaign personnel.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: ["LO", "LSO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-5 — User Segment Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-5",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.6 — User Segment Threats",
      title: "User segment threats — data distribution, user terminal security",
      fullText:
        "The user segment encompasses all end-user systems that receive, process, " +
        "and distribute space-derived data and services, including user terminals, " +
        "data distribution networks, and application interfaces. Threats include " +
        "unauthorized access to distributed mission data, spoofing of data " +
        "distribution channels, compromise of user terminal firmware, man-in-the- " +
        "middle attacks on data feeds, and exploitation of application programming " +
        "interfaces (APIs) used to access space services. User segment security is " +
        "critical for maintaining end-to-end data integrity and confidentiality.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(2)(d); BSI-TR-03184 Section 5.4",
        notes:
          "German NIS2 transposition requires security of data distribution " +
          "channels and user-facing interfaces. BSI-TR-03184 addresses user " +
          "segment security for space data services.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 8",
        notes:
          "ANSSI requires protection of data distribution infrastructure and " +
          "user access controls for essential entity services.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(3)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: ["SCO", "PDP"],
    priority: "recommended",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-6 — Supply Chain Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-6",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.7 — Supply Chain Threats",
      title: "Supply chain threats — COTS components, software dependencies",
      fullText:
        "The space supply chain encompasses hardware component suppliers, software " +
        "vendors, subsystem integrators, and third-party service providers. Threats " +
        "include insertion of malicious hardware or firmware in commercial off-the- " +
        "shelf (COTS) components, compromise of software dependencies and third-party " +
        "libraries used in ground and flight software, counterfeit electronic parts, " +
        "manipulation of software build pipelines and configuration management " +
        "systems, and compromise of subcontractor development environments. The " +
        "extended and often international nature of space supply chains amplifies " +
        "these risks significantly.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(2)(f); BSI-TR-03184 Section 7.1",
        notes:
          "German NIS2 transposition explicitly addresses supply chain security " +
          "requirements including assessment of suppliers and service providers. " +
          "BSI-TR-03184 provides guidance on space component provenance verification.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 10",
        notes:
          "ANSSI NIS2 referential requires supply chain risk management including " +
          "assessment of ICT product and service supplier security postures.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(4)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-7 — Insider Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-7",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.8 — Insider Threats",
      title: "Insider threats — privileged access abuse, social engineering",
      fullText:
        "Insider threats arise from individuals with authorized access to space " +
        "systems and data who intentionally or unintentionally cause harm. Threats " +
        "include abuse of privileged access to spacecraft command systems, " +
        "unauthorized exfiltration of mission-critical data (orbital parameters, " +
        "encryption keys, command procedures), social engineering attacks targeting " +
        "mission operations personnel, introduction of unauthorized software or " +
        "configuration changes, and negligent security practices by personnel with " +
        "elevated access. The small team sizes typical of space missions can " +
        "concentrate critical access among few individuals.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(2)(h); BSI-TR-03184 Section 8.1",
        notes:
          "German NIS2 transposition mandates human resource security measures " +
          "including background checks and security awareness training. BSI-TR-03184 " +
          "addresses role-based access control for space mission operations.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 9; Defence Code Art. L2311-1",
        notes:
          "ANSSI requires personnel security measures including awareness training " +
          "and access management. French Defence Code provisions apply to personnel " +
          "handling classified space system information.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CCSDS-8 — Environmental Threats
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "CCSDS-8",
    source: {
      framework: "CCSDS 350.1-G-3",
      reference: "Section 3.9 — Environmental Threats",
      title:
        "Environmental threats — solar events, radiation effects on electronics",
      fullText:
        "Environmental threats to space systems include natural phenomena that can " +
        "degrade or disrupt system security functions. Solar energetic particle " +
        "events and galactic cosmic rays cause single-event upsets (SEUs) in " +
        "on-board electronics, potentially corrupting cryptographic key material, " +
        "authentication state machines, and access control configurations. " +
        "Geomagnetic storms can disrupt ground-to-space communication links, " +
        "creating windows of vulnerability. Total ionizing dose (TID) degradation " +
        "over mission lifetime can reduce the reliability of security-critical " +
        "hardware. These environmental effects must be factored into the security " +
        "architecture to ensure resilience of protective measures.",
      status: "published",
      citation: CCSDS_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(2)(a); BSI-TR-03184 Section 9.1",
        notes:
          "German NIS2 transposition requires risk analysis to account for " +
          "environmental factors affecting information system security. BSI-TR-03184 " +
          "addresses space environment effects on cryptographic and security systems.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 2; CNES RNC-CNES-Q-HB-80-527",
        notes:
          "ANSSI requires environmental risk factors in security assessments. " +
          "CNES radiation hardness assurance handbook provides guidance on " +
          "protecting security-critical electronics from space radiation effects.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "inferred",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: ["SCO"],
    priority: "recommended",
  },
];

// ─── Accessor Functions ─────────────────────────────────────────────────────

/**
 * Returns all CCSDS 350.1-G-3 space security threat taxonomy requirements.
 */
export function getCCSDSRequirements(): EnactedRequirement[] {
  return ccsdsRequirements;
}

/**
 * Returns a single CCSDS requirement by its ID, or null if not found.
 *
 * @param id - The requirement identifier (e.g., "CCSDS-1")
 */
export function getCCSDSRequirementById(id: string): EnactedRequirement | null {
  return ccsdsRequirements.find((r) => r.id === id) ?? null;
}
