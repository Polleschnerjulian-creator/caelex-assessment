/**
 * ITU Radio Regulations + WRC-23 Final Acts
 * Satellite-Relevant Spectrum and Frequency Coordination Provisions
 *
 * The International Telecommunication Union (ITU) Radio Regulations are the
 * binding international treaty governing the use of the radio-frequency
 * spectrum and satellite orbital resources. All satellite operators must
 * comply with the ITU frequency coordination, notification, and interference
 * prevention regime as a prerequisite for national spectrum licensing.
 *
 * The World Radiocommunication Conference 2023 (WRC-23), held in Dubai,
 * adopted several outcomes relevant to satellite operations, including
 * alignment with the 5-year deorbit timeline and spectrum allocation updates.
 *
 * Source: ITU Radio Regulations, 2020 Edition (4 volumes)
 * WRC-23 Final Acts: Dubai, 20 November - 15 December 2023
 * Full title: "Radio Regulations, 2020 Edition, as amended by the Final
 * Acts of WRC-23"
 *
 * LEGAL DISCLAIMER: This data references enacted international treaty law
 * (ITU Radio Regulations) and WRC-23 Final Acts. National implementations
 * vary by jurisdiction. This does not constitute legal advice. Always consult
 * the relevant national spectrum authority and qualified legal counsel.
 */

import type { EnactedRequirement } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const ITU_CITATION =
  "ITU Radio Regulations, 2020 Edition, as amended by WRC-23 Final Acts";

const LAST_VERIFIED = "2026-03-17";

const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. Article numbers may change." as const;

// ─── ITU Radio Regulations — Satellite-Relevant Provisions ──────────────────

const ituRequirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-API — Advance Publication Information (RR Art. 9)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-API",
    source: {
      framework: "ITU Radio Regulations",
      reference: "RR Art. 9, Section I (No. 9.1–9.2A)",
      title: "Advance Publication Information requirement",
      fullText:
        "An administration which intends to establish a satellite network shall, " +
        "prior to coordination, send to the Radiocommunication Bureau the advance " +
        "publication information (API) relating to the planned satellite network. " +
        "The API must be submitted not earlier than 7 years and not later than " +
        "2 years before the planned date of bringing into use. The API shall " +
        "include the planned orbital characteristics, frequency bands, service " +
        "area, and technical parameters necessary for other administrations to " +
        "assess potential interference impacts.",
      status: "enacted",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "47 CFR Part 25 (FCC); NTIA Manual of Regulations",
        notes:
          "FCC coordinates ITU API filings for US-licensed satellite systems " +
          "through the International Bureau. NTIA handles government systems.",
      },
      {
        jurisdiction: "DE",
        reference: "BNetzA Frequenzplan; TKG §55",
        notes:
          "Bundesnetzagentur files API information with ITU on behalf of " +
          "German-licensed satellite operators. TKG §55 provides the legal " +
          "basis for frequency assignment coordination.",
      },
      {
        jurisdiction: "UK",
        reference:
          "Ofcom Satellite Filing Guidelines; Wireless Telegraphy Act 2006",
        notes:
          "Ofcom acts as the UK notifying administration for ITU satellite " +
          "filings, managing API submissions for UK-licensed networks.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-COORD — Frequency Coordination (RR Art. 9, Appendix 4)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-COORD",
    source: {
      framework: "ITU Radio Regulations",
      reference: "RR Art. 9, Sections II–III; Appendix 4",
      title: "Frequency coordination with affected administrations",
      fullText:
        "Before a satellite network can be notified for recording in the Master " +
        "International Frequency Register (MIFR), the responsible administration " +
        "must complete coordination with all administrations whose satellite " +
        "networks or terrestrial services may be affected. Coordination is " +
        "triggered when the technical parameters in Appendix 4 indicate potential " +
        "interference. The coordination process requires bilateral or multilateral " +
        "negotiations to agree on technical parameters, power limits, and " +
        "operational constraints that ensure compatible operation.",
      status: "enacted",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "47 CFR §25.111–25.117 (FCC Part 25)",
        notes:
          "FCC Part 25 requires applicants to demonstrate completion of ITU " +
          "coordination or provide a coordination plan as part of the satellite " +
          "licence application.",
      },
      {
        jurisdiction: "DE",
        reference: "BNetzA Frequenzplan; TKG §55–56",
        notes:
          "BNetzA conducts ITU coordination on behalf of German operators. " +
          "Frequency assignments are contingent on successful completion of " +
          "the coordination process.",
      },
      {
        jurisdiction: "UK",
        reference: "Ofcom Satellite Filing Guidelines; WT Act 2006 s.8",
        notes:
          "Ofcom manages the ITU coordination process for UK filings and " +
          "requires operators to support coordination technically and financially.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-NOTIFY — Notification and Recording (RR Art. 11)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-NOTIFY",
    source: {
      framework: "ITU Radio Regulations",
      reference: "RR Art. 11 (No. 11.2–11.49)",
      title:
        "Notification and recording in the Master International Frequency Register",
      fullText:
        "Following completion of coordination, the administration shall notify the " +
        "frequency assignments of its satellite network to the Radiocommunication " +
        "Bureau for examination and recording in the Master International Frequency " +
        "Register (MIFR). Notification must occur not earlier than the date of " +
        "receipt of the coordination request and not later than the date of " +
        "bringing into use. The Bureau examines the notification for conformity " +
        "with the Radio Regulations and the results of coordination. Recording " +
        "in the MIFR confers international recognition and protection against " +
        "harmful interference.",
      status: "enacted",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "47 CFR §25.117 (FCC Part 25)",
        notes:
          "FCC International Bureau manages notification to ITU for US-licensed " +
          "satellite systems. Operators must bring networks into use within " +
          "the regulatory deadlines to maintain MIFR priority.",
      },
      {
        jurisdiction: "DE",
        reference: "BNetzA Frequenzplan; TKG §57",
        notes:
          "BNetzA submits notifications to ITU and maintains records of " +
          "German satellite frequency assignments in the MIFR.",
      },
      {
        jurisdiction: "UK",
        reference: "Ofcom Satellite Filing Guidelines",
        notes:
          "Ofcom handles ITU notification for UK satellite filings and " +
          "ensures compliance with bringing-into-use deadlines.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-EPFD — NGSO EPFD Limits Protecting GSO (RR Art. 22)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-EPFD",
    source: {
      framework: "ITU Radio Regulations",
      reference: "RR Art. 22; Appendix 5, Resolution 76 (Rev. WRC-15)",
      title:
        "NGSO equivalent power flux density limits protecting GSO networks",
      fullText:
        "Non-geostationary satellite orbit (NGSO) systems operating in frequency " +
        "bands shared with geostationary satellite orbit (GSO) networks shall not " +
        "exceed the equivalent power flux density (EPFD) limits specified in " +
        "Article 22 and the associated tables. These EPFD limits ensure that " +
        "aggregate interference from NGSO constellations into GSO earth stations " +
        "and space stations remains within acceptable thresholds. Operators must " +
        "demonstrate compliance through EPFD validation software approved by the " +
        "Radiocommunication Bureau, considering the full constellation geometry " +
        "and operational parameters.",
      status: "enacted",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "47 CFR §25.146 (FCC Part 25); FCC NGSO Processing Rules",
        notes:
          "FCC requires NGSO applicants to demonstrate EPFD compliance with " +
          "Art. 22 limits as part of the licensing process. FCC adopted EPFD " +
          "limits consistent with ITU provisions.",
      },
      {
        jurisdiction: "DE",
        reference: "BNetzA Frequenzplan; ITU Art. 22 direct application",
        notes:
          "BNetzA applies ITU Art. 22 EPFD limits directly in frequency " +
          "assignment decisions for NGSO systems.",
      },
      {
        jurisdiction: "UK",
        reference: "Ofcom NGSO Licensing Framework",
        notes:
          "Ofcom requires NGSO operators to demonstrate Art. 22 EPFD " +
          "compliance in licence applications.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-WRC23-1 — WRC-23 5-Year Deorbit Alignment
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-WRC23-1",
    source: {
      framework: "ITU Radio Regulations (WRC-23)",
      reference: "WRC-23 Resolution [COM6/12]; Agenda Item 7, Topic B",
      title: "WRC-23 5-year deorbit alignment with FCC rule",
      fullText:
        "WRC-23 adopted provisions encouraging administrations to require satellite " +
        "operators to deorbit LEO spacecraft within 5 years after end of mission, " +
        "aligning with the FCC 5-year rule adopted in September 2022 (47 CFR §25.114). " +
        "While framed as a recommendation rather than a mandatory provision, this " +
        "represents a significant shift from the previous 25-year guideline and " +
        "signals the direction of future regulatory convergence. Administrations " +
        "are encouraged to incorporate this shorter timeline into national " +
        "licensing frameworks.",
      status: "published",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "47 CFR §25.114(d)(14)(v) (FCC 5-Year Rule, effective 2024)",
        notes:
          "FCC adopted the 5-year post-mission disposal rule for LEO satellites " +
          "in September 2022, effective for new applications from September 2024. " +
          "This is now a binding licence condition for all new US-licensed LEO satellites.",
      },
      {
        jurisdiction: "DE",
        reference: "BNetzA/DLR joint guidance (in development)",
        notes:
          "Germany is evaluating alignment with the 5-year deorbit guideline " +
          "through updated DLR technical guidance for debris mitigation assessment.",
      },
      {
        jurisdiction: "UK",
        reference: "CAA Orbital Operator Licence Guidance (Rev. 2024)",
        notes:
          "UK CAA has signalled intent to align with the 5-year guideline, " +
          "already encouraging operators to plan for shorter post-mission lifetimes.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "debris",
    applicableTo: ["SCO"],
    priority: "recommended",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-WRC23-2 — WRC-23 Spectrum Allocation Updates
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-WRC23-2",
    source: {
      framework: "ITU Radio Regulations (WRC-23)",
      reference: "WRC-23 Agenda Items 1.2, 1.3, 1.5",
      title: "WRC-23 spectrum allocation updates for satellite services",
      fullText:
        "WRC-23 adopted updated frequency allocations and sharing conditions for " +
        "several bands relevant to satellite services. Key outcomes include: " +
        "(1) identification of the 3600-3800 MHz band for IMT with protection " +
        "criteria for satellite services; (2) updated sharing conditions for " +
        "NGSO systems in Ka-band (17.7-20.2 GHz / 27.5-30.0 GHz); " +
        "(3) new allocations for Earth exploration satellite service (EESS) " +
        "in several bands; (4) updated power limits for satellite systems " +
        "operating in bands shared with terrestrial services. These changes " +
        "require satellite operators to verify continued compliance of existing " +
        "and planned systems.",
      status: "enacted",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "FCC ET Docket No. 24-xxx; NTIA Spectrum Strategy",
        notes:
          "FCC is implementing WRC-23 spectrum allocation changes through " +
          "rulemaking proceedings to update Part 25 and related rules.",
      },
      {
        jurisdiction: "DE",
        reference: "BNetzA Frequenzplan (2024 update)",
        notes:
          "BNetzA is updating the German Frequenzplan to incorporate WRC-23 " +
          "allocation changes, including updated sharing conditions for " +
          "satellite bands.",
      },
      {
        jurisdiction: "UK",
        reference: "Ofcom Spectrum Framework Review (2024)",
        notes:
          "Ofcom is implementing WRC-23 outcomes through updates to the " +
          "UK Frequency Allocation Table and satellite licensing conditions.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "inferred",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-HARMFUL — Harmful Interference Prevention (RR Art. 15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-HARMFUL",
    source: {
      framework: "ITU Radio Regulations",
      reference: "RR Art. 15 (No. 15.1–15.14)",
      title: "Harmful interference prevention and resolution",
      fullText:
        "All stations, including satellite earth stations and space stations, shall " +
        "be established and operated so as not to cause harmful interference to " +
        "other stations operating in accordance with the Radio Regulations. " +
        "Administrations shall take all practicable steps to ensure that the " +
        "operation of electrical apparatus and installations does not cause harmful " +
        "interference. When harmful interference is caused, the administration " +
        "responsible shall take steps to eliminate the interference. Satellite " +
        "operators must implement power control, beam shaping, and frequency " +
        "management techniques to minimize interference potential.",
      status: "enacted",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "47 CFR §25.140, §25.204 (FCC Part 25)",
        notes:
          "FCC requires satellite operators to demonstrate that their systems " +
          "will not cause harmful interference. FCC has enforcement authority " +
          "to order interference cessation.",
      },
      {
        jurisdiction: "DE",
        reference: "TKG §63; BNetzA interference resolution procedures",
        notes:
          "BNetzA enforces harmful interference prevention under TKG §63 " +
          "and can order operators to modify or cease transmissions causing " +
          "interference.",
      },
      {
        jurisdiction: "UK",
        reference: "Wireless Telegraphy Act 2006 s.54; Ofcom enforcement",
        notes:
          "Ofcom has statutory authority to investigate and resolve harmful " +
          "interference cases under the Wireless Telegraphy Act.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITU-CESSATION — Cessation of Emissions at End of Life (RR Art. 25)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITU-CESSATION",
    source: {
      framework: "ITU Radio Regulations",
      reference: "RR Art. 25 (No. 25.1–25.11); RR Art. 22.1",
      title: "Cessation of emissions at end of life",
      fullText:
        "Space stations shall cease emissions at the end of their operational " +
        "life to avoid harmful interference with other space and terrestrial " +
        "services. The responsible administration shall notify the " +
        "Radiocommunication Bureau when a satellite network ceases operation, " +
        "and the corresponding frequency assignments shall be cancelled from " +
        "the Master International Frequency Register. Operators must ensure " +
        "that on-board transmitters are permanently disabled during end-of-life " +
        "disposal operations, including passivation of transponders and beacons. " +
        "Failure to cease emissions from defunct satellites creates interference " +
        "risk and spectrum occupancy issues.",
      status: "enacted",
      citation: ITU_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "47 CFR §25.282 (FCC End-of-Life Disposal); FCC Bond Order",
        notes:
          "FCC requires operators to disable all transmitters during end-of-life " +
          "disposal and notify the FCC of cessation of operations. FCC may " +
          "require performance bonds for disposal compliance.",
      },
      {
        jurisdiction: "DE",
        reference: "BNetzA Frequenzplan; TKG §57 (cancellation of assignments)",
        notes:
          "BNetzA requires notification of cessation of satellite operations " +
          "and cancels the corresponding frequency assignments from national " +
          "and international registers.",
      },
      {
        jurisdiction: "UK",
        reference: "Ofcom Orbital Operator Licence Conditions; WT Act 2006",
        notes:
          "UK licences include conditions requiring transmitter deactivation " +
          "at end of life and notification of cessation to Ofcom for ITU " +
          "register update.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 71; Art. 73",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "spectrum",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },
];

// ─── Accessor Functions ─────────────────────────────────────────────────────

/**
 * Returns all ITU Radio Regulations satellite-relevant requirements.
 */
export function getITURequirements(): EnactedRequirement[] {
  return ituRequirements;
}

/**
 * Returns a single ITU requirement by its ID, or null if not found.
 *
 * @param id - The requirement identifier (e.g., "ITU-EPFD")
 */
export function getITURequirementById(id: string): EnactedRequirement | null {
  return ituRequirements.find((r) => r.id === id) ?? null;
}
