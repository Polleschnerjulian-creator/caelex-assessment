/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Germany / BNetzA jurisdiction data — consolidated from:
 *   - NCA profile (bnetza) from nca-profiles.ts
 *   - Full knowledge base from bnetza-regulatory-knowledge.ts
 *   - Germany entry from national-space-laws.ts
 *   - Germany entry from insurance-requirements.ts
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ─────────────────────────────────────────────────────

const BSI_TR_03184_PART1_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "de-bsi-tr03184-p1-structure",
    nationalRef: {
      law: "BSI-TR-03184 Part 1",
      article: "Section 3",
      title: "Structure Description (Strukturbeschreibung) — Space Segment",
      fullText:
        "Operators must define the complete system architecture and asset inventory for the space segment, " +
        "including satellite bus, payload, communication subsystems, and onboard software. Each component " +
        "must be identified as a protection target (Schutzobjekt) for subsequent protection needs analysis.",
    },
    standardsMapping: [
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Clause 8.1",
        relationship: "implements",
      },
      {
        framework: "CCSDS 350.1-G-3",
        reference: "Section 3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 77-78",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-bsi-tr03184-p1-schutzbedarf",
    nationalRef: {
      law: "BSI-TR-03184 Part 1",
      article: "Section 4",
      title:
        "Protection Needs Assessment (Schutzbedarfsfeststellung) — Space Segment",
      fullText:
        "Each space segment asset must be classified according to BSI protection needs categories: " +
        "Normal (limited negative impact), Hoch/High (considerable negative impact), or " +
        "Sehr Hoch/Very High (existential negative impact). Space operations are typically " +
        "classified as 'hoch' or 'sehr hoch' for availability and integrity.",
    },
    standardsMapping: [
      {
        framework: "BSI-Standard 200-2",
        reference: "Section 6",
        relationship: "implements",
      },
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Clause 6.1.2",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 77",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-bsi-tr03184-p1-threats",
    nationalRef: {
      law: "BSI-TR-03184 Part 1",
      article: "Section 5",
      title: "Space-Specific Threat Identification",
      fullText:
        "Threat analysis for space segment must address: unauthorized telecommand injection " +
        "(unberechtigte Telekommandoeinspeisung), telemetry interception and manipulation, " +
        "GNSS spoofing and jamming, software/firmware manipulation via supply chain, " +
        "side-channel attacks on space-qualified hardware, and denial of service against " +
        "the ground-space link.",
    },
    standardsMapping: [
      {
        framework: "CCSDS 350.1-G-3",
        reference: "Section 4",
        relationship: "implements",
      },
      {
        framework: "BSI-Standard 200-3",
        reference: "Full",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 78",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-bsi-tr03184-p1-measures",
    nationalRef: {
      law: "BSI-TR-03184 Part 1",
      article: "Section 6",
      title: "Security Measures (Sicherheitsmaßnahmen) — Space Segment",
      fullText:
        "Technical and organizational controls must be implemented for the space segment, including: " +
        "TT&C link encryption (TRANSEC), command authentication, onboard software integrity " +
        "verification, GNSS anti-spoofing measures, and post-quantum cryptography considerations " +
        "for long-duration missions. Controls must be traceable to identified threats.",
    },
    standardsMapping: [
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Annex A",
        relationship: "exceeds",
      },
      {
        framework: "NIST SP 800-53",
        reference: "SC family",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 79-85",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-bsi-tr03184-p1-lifecycle",
    nationalRef: {
      law: "BSI-TR-03184 Part 1",
      article: "Section 7",
      title: "Lifecycle Security Coverage — Space Segment",
      fullText:
        "Security measures must cover all mission lifecycle phases: Design (Entwurf), " +
        "Manufacturing (Fertigung), Integration & Test (Integration und Test), Launch (Start), " +
        "Commissioning (Inbetriebnahme), Operations (Betrieb), and Decommissioning " +
        "(Außerbetriebnahme). Each phase has specific security requirements and threat vectors.",
    },
    standardsMapping: [
      {
        framework: "ECSS-Q-ST-80C",
        reference: "Full",
        relationship: "equivalent",
      },
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Clause 8",
        relationship: "exceeds",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-95",
      confidence: "partial",
    },
    category: "cybersecurity",
  },
  {
    id: "de-bsi-tr03184-p1-supply-chain",
    nationalRef: {
      law: "BSI-TR-03184 Part 1",
      article: "Section 5.4",
      title: "Supply Chain Security — Space Segment",
      fullText:
        "Software/firmware manipulation via supply chain must be assessed. Operators shall maintain " +
        "a Software Bill of Materials (SBOM) for all onboard software, verify COTS component provenance, " +
        "and implement hardware trust anchors where feasible. Supply chain risks from ITAR/EAR-controlled " +
        "components must be documented.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 21(2)(d)",
        relationship: "implements",
      },
      {
        framework: "NIST SP 800-161",
        reference: "Full",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 82",
      confidence: "partial",
    },
    category: "cybersecurity",
  },
];

const BSI_TR_03184_PART2_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "de-bsi-tr03184-p2-ground-arch",
    nationalRef: {
      law: "BSI-TR-03184 Part 2",
      article: "Section 3",
      title: "Ground Segment Security Architecture",
      fullText:
        "Ground segment infrastructure security must address: Satellite Control Center (SCC) " +
        "security architecture, Mission Control System (MCS) hardening, ground station network " +
        "security, key management infrastructure for TT&C encryption, and physical security of " +
        "ground facilities. Ground segment may qualify as KRITIS (Kritische Infrastruktur) " +
        "under NIS2/NIS2UmsuCG.",
    },
    standardsMapping: [
      {
        framework: "BSI IT-Grundschutz",
        reference: "INF.1, INF.2, NET.1.1",
        relationship: "implements",
      },
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Annex A.11",
        relationship: "exceeds",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 79-85",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-bsi-tr03184-p2-protection-needs",
    nationalRef: {
      law: "BSI-TR-03184 Part 2",
      article: "Section 4",
      title: "Protection Needs Analysis — Ground Segment",
      fullText:
        "Ground segment protection needs analysis must cover three dimensions: " +
        "Confidentiality (Vertraulichkeit) — TT&C command encryption, mission data protection; " +
        "Integrity (Integrität) — command authentication, software signing, configuration management; " +
        "Availability (Verfügbarkeit) — redundancy, failover, BCP for ground operations.",
    },
    standardsMapping: [
      {
        framework: "BSI-Standard 200-2",
        reference: "Section 6",
        relationship: "implements",
      },
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Clause 6.1.2",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 77",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-bsi-tr03184-p2-key-mgmt",
    nationalRef: {
      law: "BSI-TR-03184 Part 2",
      article: "Section 5",
      title: "Key Management & TT&C Security — Ground Segment",
      fullText:
        "Key management infrastructure for TT&C encryption must be documented. This includes " +
        "key generation, distribution, storage, rotation, and revocation procedures. Access control " +
        "for satellite command operations requires privileged access management (PAM) with MFA " +
        "mandatory for all critical operations per NIS2UmsuCG.",
    },
    standardsMapping: [
      {
        framework: "BSI IT-Grundschutz",
        reference: "ORP.4, OPS.1.1.1",
        relationship: "implements",
      },
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Annex A.10",
        relationship: "exceeds",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 79",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
];

const NIS2UMSUCG_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "de-nis2umsucg-scope",
    nationalRef: {
      law: "NIS2UmsuCG",
      article: "§ 28",
      title: "Scope Determination for Space Operators",
      fullText:
        "Space operators classified as 'important entities' (wichtige Einrichtungen) " +
        "or 'essential entities' (besonders wichtige Einrichtungen) depending on size and criticality. " +
        "Ground segment infrastructure may qualify as KRITIS (Kritische Infrastruktur). " +
        "Size thresholds: ≥50 employees or ≥€10M turnover triggers NIS2 applicability.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 2",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-75",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-nis2umsucg-risk-mgmt",
    nationalRef: {
      law: "NIS2UmsuCG",
      article: "§ 30",
      title: "Risk Management Measures (Risikomanagementmaßnahmen)",
      fullText:
        "Operators must implement: risk analysis and information system security policies, " +
        "incident handling (detection, response, reporting), business continuity and crisis management, " +
        "supply chain security (Lieferkettensicherheit), security in network and information system " +
        "acquisition/development/maintenance, cryptography and encryption policies, human resources " +
        "security and access control, MFA or continuous authentication.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 21",
        relationship: "implements",
      },
      {
        framework: "BSI-Standard 200-2",
        reference: "Full",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 77-85",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-nis2umsucg-incident-reporting",
    nationalRef: {
      law: "NIS2UmsuCG",
      article: "§ 32",
      title: "Incident Reporting to BSI (Meldepflichten)",
      fullText:
        "Mandatory incident reporting to BSI: Early warning (Frühwarnung) within 24 hours, " +
        "Incident notification (Meldung) within 72 hours with initial assessment, " +
        "Final report (Abschlussbericht) within 1 month with root cause analysis. " +
        "Dual reporting required: to BSI (cybersecurity) and NCA (space operations impact). " +
        "BSI coordinates with EU-level CSIRT network.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 23",
        relationship: "implements",
      },
      {
        framework: "BSI IT-Grundschutz",
        reference: "DER.2.1",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 89-92",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
  {
    id: "de-nis2umsucg-penalties",
    nationalRef: {
      law: "NIS2UmsuCG",
      article: "§ 65",
      title: "Penalties and Management Liability (Sanktionen)",
      fullText:
        "Essential entities: up to €10M or 2% of global annual turnover. " +
        "Important entities: up to €7M or 1.4% of global annual turnover. " +
        "Personal liability for management (Geschäftsleitung) for compliance failures. " +
        "Management must approve cybersecurity risk management measures and undergo regular training.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 34",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 93-95",
      confidence: "partial",
    },
    category: "cybersecurity",
  },
  {
    id: "de-nis2umsucg-bcm",
    nationalRef: {
      law: "NIS2UmsuCG",
      article: "§ 30(1)(4)",
      title: "Business Continuity Management",
      fullText:
        "BCP must include tested recovery procedures with documented RTO/RPO. " +
        "BSI-Standard 200-4 (Business Continuity Management) is the expected methodology. " +
        "Must cover both ground segment failover and degraded-mode satellite operations. " +
        "Crisis communication procedures required.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 21(2)(c)",
        relationship: "implements",
      },
      {
        framework: "BSI-Standard 200-4",
        reference: "Full",
        relationship: "implements",
      },
      {
        framework: "BSI IT-Grundschutz",
        reference: "DER.4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 85",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
];

const SATDSIG_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "de-satdsig-approval",
    nationalRef: {
      law: "SatDSiG",
      article: "§ 3",
      title: "EO System Operation Approval (Genehmigung)",
      fullText:
        "German entities operating qualifying high-resolution Earth observation satellite systems " +
        "require SatDSiG approval from BMWK. 'German entity' includes German nationals, companies " +
        "with registered office in Germany, and operators using ground stations in Germany. " +
        "Approval covers system design, data distribution policy, sensitivity classification. " +
        "NOT applicable to non-EO missions (communications, navigation, science/research without qualifying EO payloads).",
    },
    standardsMapping: [],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "partial",
    },
    category: "authorization",
  },
  {
    id: "de-satdsig-sensitivity",
    nationalRef: {
      law: "SatDSiG / SatDSiV",
      article: "§ 17 SatDSiG / § 2 SatDSiV",
      title: "Data Sensitivity Classification (Sensitivitätseinstufung)",
      fullText:
        "All data from qualifying systems must be classified into sensitivity levels. " +
        "High information content thresholds (SatDSiV): Optical ≤2.5m, Thermal IR ≤5m, " +
        "Microwave/SAR ≤3m, Hyperspectral >49 channels at ≤10m ground resolution. " +
        "Sensitive requests based on target country (classified BMWK lists), target area type " +
        "(military installations, critical infrastructure), and timeliness (near-real-time more sensitive). " +
        "Security assessment for data exceeding 0.4m ground resolution threshold.",
    },
    standardsMapping: [],
    euSpaceActProposal: null,
    category: "authorization",
  },
];

// ─── All Requirements ──────────────────────────────────────────────────────────

const GERMANY_REQUIREMENTS: NationalRequirement[] = [
  ...BSI_TR_03184_PART1_REQUIREMENTS,
  ...BSI_TR_03184_PART2_REQUIREMENTS,
  ...NIS2UMSUCG_REQUIREMENTS,
  ...SATDSIG_REQUIREMENTS,
];

// ─── Knowledge Base ────────────────────────────────────────────────────────────

const GERMANY_KNOWLEDGE_BASE = [
  "## BNETZA-SPECIFIC REGULATORY KNOWLEDGE (GERMANY)",
  "",
  "The following knowledge is extracted from official German regulatory documents and must be used",
  "to ensure this document meets BNetzA expectations for German-authorized space operations.",
  "Reference these sources throughout the document where applicable.",
  "",
  "IMPORTANT: Germany currently has NO comprehensive space law. The planned Weltraumgesetz (WRG)",
  "is in the Eckpunkte stage (September 2024). Reference the WRG Eckpunkte as planned regulation,",
  "not as enacted law. For cybersecurity, BSI (not DLR) is the authoritative body.",
  "",
  // ── German Regulatory Landscape ──
  `## German Space Regulatory Landscape — Current State

### CRITICAL CONTEXT: Germany Has No Comprehensive Space Law (as of 2024)
Unlike France (LOS since 2008) or the UK (Space Industry Act 2018), Germany currently lacks a
unified national space law. The regulatory framework is fragmented across several laws and
institutional responsibilities. The planned Weltraumgesetz (WRG) will change this — its
Eckpunkte (key points) were published by the Federal Government in September 2024.

### Current Legal Framework (Pre-WRG)

1. **RAÜG (Raumfahrtaufgabenübertragungsgesetz)**
   - DLR (Deutsches Zentrum für Luft- und Raumfahrt) holds administrative authority for space activities
   - DLR prepares the German space plan (Raumfahrtplan), executes national programs, represents Germany at ESA
   - DLR decides on objections (Widersprüche) to its own administrative acts
   - Subject to supervision by commissioning federal ministries (primarily BMWK)

2. **SatDSiG (Satellitendatensicherheitsgesetz, 2007)**
   - ONLY applies to high-resolution Earth observation (Erdbeobachtung) systems
   - Requires approval (Genehmigung) for operation of EO systems by German entities
   - Sensitivity classification (Sensitivitätseinstufung) for data distribution
   - Authority: BMWK (Federal Ministry for Economic Affairs and Climate Action)
   - NOT a general space law — covers only remote sensing data security

3. **SatDSiV (Satellitendatensicherheitsverordnung)**
   - Implementing regulation for SatDSiG
   - Defines "high information content" (hoher Informationsgehalt) thresholds:
     - Optical: ≤2.5m ground resolution
     - Thermal IR: ≤5m ground resolution
     - Microwave/SAR: ≤3m ground resolution
     - Hyperspectral: >49 channels at ≤10m ground resolution
   - Defines sensitive requests based on country lists, target areas, timeliness

### Institutional Responsibilities
- **BMWK** (Bundesministerium für Wirtschaft und Klimaschutz): Primary ministry for space policy
- **DLR**: Space agency and administrative authority under RAÜG
- **BSI** (Bundesamt für Sicherheit in der Informationstechnik): Cybersecurity authority for space systems
- **BNetzA** (Bundesnetzagentur): Frequency regulation and, under EU Space Act, NCA functions
- **Bundeswehr**: Military space interests, potential service requisition under WRG`,
  "",
  // ── WRG Eckpunkte Knowledge ──
  `## Weltraumgesetz (WRG) — Eckpunkte der Bundesregierung (September 2024)

### Overview
The Eckpunkte outline Germany's planned comprehensive space law. While not yet enacted,
they signal the direction of German space regulation and should be referenced in forward-looking
compliance documentation for German-authorized missions.

### Authorization Requirement (Genehmigungsvorbehalt)
- All space activities (Weltraumaktivitäten) by non-state operators require authorization
- Authority: A new agency under BMWK will be established as the licensing body
- Satellite constellations (Satellitenkonstellationen) are treated as a single space activity
  (einheitliche Weltraumaktivität) — one authorization covers the entire constellation
- Launch site operation (Startplätze) requires separate approval (Zulassungserfordernis)
- Environmental impact assessment (Umweltverträglichkeitsprüfung, UVP) required

### Liability & Insurance (Regress und Deckungsvorsorge)
- Federal Republic assumes strict liability (verschuldensunabhängige Haftung) vis-à-vis third states
- Federal Republic has recourse (Regress) against operators
- Operators must maintain insurance coverage (Deckungsvorsorge):
  - Haftpflichtversicherung (liability insurance) or Bankbürgschaft (bank guarantee)
  - Cap: 10% of average annual turnover (Jahresumsatz) over last 3 years
  - Maximum: €50 million per incident (Schadensfall)
- Constellations: increased insurance requirements considering higher aggregate risk
- Universities and research institutions: exempt from recourse (regressfrei)
  unless gross negligence (grobe Fahrlässigkeit) is proven

### Supervision (Überwachung)
- Licensing authority may issue all necessary orders (Anordnungen) to ensure:
  - Öffentliche Sicherheit (public safety)
  - Nationale Sicherheit (national security)
  - Verteidigung (defense)
  - Nachhaltige Nutzung des Weltraums (sustainable use of outer space)
  - Vermeidung von Weltraummüll (debris prevention)
- Bundeswehr may requisition operator services for defense purposes (with compensation)
- Civil protection agencies may requisition in emergencies (Katastrophenschutz)

### Registration (Registrierung)
- National registry for space objects per UN Registration Convention
- Registry maintained by BMWK authority (Registerbehörde)
- All German-authorized space objects must be registered
- Information sharing with UN Office for Outer Space Affairs (UNOOSA)

### Debris Mitigation & Space Sustainability
- Technical requirements (technische Anforderungen) for debris avoidance (Weltraummüllvermeidung)
- Mandatory planned end-of-life (geplantes Missionsende) for every space activity
- Collision avoidance (Kollisionsvermeidung) requirements
- Space Situational Awareness (SSA) data sharing obligations
- Alignment with IADC Guidelines and ISO 24113

### Simplified Regime (Vereinfachtes Verfahren)
- Proportionate regime (verhältnismäßiges Regime) for SMEs and research institutions
- Regulatory sandbox (Regulierungssandkasten) for innovative projects
- Reduced documentation requirements for low-risk missions`,
  "",
  // ── BSI-TR-03184 Knowledge ──
  `## BSI-TR-03184 — Information Security for Space Systems

### Overview
BSI Technical Guideline (Technische Richtlinie) TR-03184 is Germany's authoritative framework
for space systems cybersecurity. It was developed by BSI in collaboration with the German
space industry (OHB, Airbus Defence & Space, secunet Security Networks) under the Alliance
for Cybersecurity (Allianz für Cyber-Sicherheit).

### Part 1: Space Segment (Weltraumsegment) — July 2023, 74 pages
**Scope:** Covers satellite/space vehicle cybersecurity across the full lifecycle.

**Methodology:**
1. Structure Description (Strukturbeschreibung) — Define system architecture and assets
2. Applications (Anwendungen) — Identify business processes and data flows
3. Protection Needs (Schutzbedarf) — Classify protection requirements:
   - Normal (normal): Limited negative impact
   - High (hoch): Considerable negative impact
   - Very High (sehr hoch): Existential negative impact
4. Risk Treatment (Risikobehandlung) — Threat identification and mitigation
5. Security Measures (Sicherheitsmaßnahmen) — Technical and organizational controls

**Lifecycle Phases Covered:**
- Design (Entwurf)
- Manufacturing (Fertigung)
- Integration & Test (Integration und Test)
- Launch (Start)
- Commissioning (Inbetriebnahme)
- Operations (Betrieb)
- Decommissioning (Außerbetriebnahme)

**Key Space-Segment Threats:**
- Unauthorized telecommand injection (unberechtigte Telekommandoeinspeisung)
- Telemetry interception and manipulation
- GNSS spoofing and jamming
- Software/firmware manipulation via supply chain
- Side-channel attacks on space-qualified hardware
- Denial of service against ground-space link

### Part 2: Ground Segment (Bodensegment) — July 2025, 34 pages
**Scope:** Covers ground segment infrastructure cybersecurity.

**Key Aspects:**
- Ground segment as critical infrastructure (KRITIS) under NIS2/NIS2UmsuCG
- Satellite Control Center (SCC) security architecture
- Mission Control System (MCS) hardening
- Ground station network security
- Key management infrastructure for TT&C encryption
- Physical security of ground facilities
- Builds on BSI Alliance for Cybersecurity expert group findings

**Protection Needs Analysis:**
- Confidentiality (Vertraulichkeit): TT&C command encryption, mission data protection
- Integrity (Integrität): Command authentication, software signing, configuration management
- Availability (Verfügbarkeit): Redundancy, failover, BCP for ground operations

### References & Standards
- BSI IT-Grundschutz Kompendium (current edition)
- NIS2 Directive (EU 2022/2555)
- ISO/IEC 27001:2022
- CCSDS 350.1-G-3 (Security threats against space missions)
- NIST SP 800-53 (where applicable for international missions)`,
  "",
  // ── NIS2 German Implementation Knowledge ──
  `## NIS2 German Implementation — NIS2UmsuCG

### NIS-2-Umsetzungs- und Cybersicherheitsstärkungsgesetz (NIS2UmsuCG)
Germany's transposition of the NIS2 Directive into national law. This is the primary
cybersecurity compliance framework for space operators under German jurisdiction.

### Key Provisions for Space Operators
1. **Scope Determination (Anwendungsbereich)**
   - Space operators classified as "important entities" (wichtige Einrichtungen)
     or "essential entities" (besonders wichtige Einrichtungen) depending on size and criticality
   - Ground segment infrastructure may qualify as KRITIS (Kritische Infrastruktur)
   - Size thresholds: ≥50 employees or ≥€10M turnover → NIS2 applies

2. **Risk Management Measures (Risikomanagementmaßnahmen)**
   - Risk analysis and information system security policies
   - Incident handling (detection, response, reporting)
   - Business continuity and crisis management
   - Supply chain security (Lieferkettensicherheit)
   - Security in network and information systems acquisition, development, and maintenance
   - Policies and procedures for effectiveness assessment of cybersecurity measures
   - Cyber hygiene practices and cybersecurity training
   - Cryptography and encryption policies
   - Human resources security and access control
   - Multi-factor authentication (MFA) or continuous authentication

3. **Incident Reporting (Meldepflichten)**
   - To BSI (Bundesamt für Sicherheit in der Informationstechnik):
     - Early warning (Frühwarnung): Within 24 hours of detection
     - Incident notification (Meldung): Within 72 hours with initial assessment
     - Final report (Abschlussbericht): Within 1 month with root cause analysis
   - BSI coordinates with EU-level CSIRT network

4. **Supervisory Authority**
   - BSI is the national supervisory authority for NIS2 cybersecurity
   - BNetzA has sector-specific responsibilities for telecommunications
   - For space operators: dual reporting to BSI (cybersecurity) and NCA (space operations)

5. **Penalties (Sanktionen)**
   - Essential entities: up to €10M or 2% of global annual turnover
   - Important entities: up to €7M or 1.4% of global annual turnover
   - Personal liability for management (Geschäftsleitung) for compliance failures

### Intersection with EU Space Act
- EU Space Act Art. 74-95 cybersecurity requirements are additive to NIS2
- German operators must satisfy BOTH NIS2UmsuCG AND EU Space Act cyber requirements
- BSI-TR-03184 provides the technical implementation guidance specific to space systems`,
  "",
  // ── BSI IT-Grundschutz Knowledge ──
  `## BSI IT-Grundschutz Framework

### Overview
IT-Grundschutz is BSI's comprehensive information security methodology.
It is the German standard for implementing information security and is recognized
as equivalent to ISO 27001 (BSI ISO 27001 certification on the basis of IT-Grundschutz).

### Framework Structure
1. **BSI-Standards:**
   - BSI-Standard 200-1: Information Security Management Systems (ISMS)
   - BSI-Standard 200-2: IT-Grundschutz Methodology
   - BSI-Standard 200-3: Risk Analysis (Risikoanalyse)
   - BSI-Standard 200-4: Business Continuity Management (BCM)

2. **IT-Grundschutz Kompendium:**
   - Organized into "Bausteine" (building blocks / modules)
   - Each Baustein contains: threat analysis + security requirements (Anforderungen)
   - Requirements classified as: MUSS (mandatory), SOLL (should), KANN (optional)

### Relevant Bausteine for Space Operators
- **OPS.1.1.1** Allgemeiner IT-Betrieb (General IT Operations)
- **OPS.1.1.3** Patch- und Änderungsmanagement (Patch & Change Management)
- **OPS.1.2.5** Fernwartung (Remote Maintenance) — critical for satellite operations
- **OPS.2.3** Nutzung von Cloud-Diensten (Cloud Services) — for ground segment
- **CON.3** Datensicherungskonzept (Backup Concept)
- **CON.6** Löschen und Vernichten (Deletion & Destruction) — for mission data
- **DER.1** Detektion von sicherheitsrelevanten Ereignissen (Security Event Detection)
- **DER.2.1** Behandlung von Sicherheitsvorfällen (Incident Handling)
- **DER.2.2** Vorsorge für die IT-Forensik (IT Forensics Preparedness)
- **DER.4** Notfallmanagement (Emergency Management / BCM)
- **NET.1.1** Netzarchitektur und -design (Network Architecture)
- **NET.1.2** Netzmanagement (Network Management)
- **NET.3.3** VPN (for ground station connectivity)
- **INF.1** Allgemeines Gebäude (General Building Security) — ground stations
- **INF.2** Rechenzentrum sowie Serverraum (Data Center / Server Room)
- **SYS.1.1** Allgemeiner Server (General Server) — mission control servers
- **SYS.2.1** Allgemeiner Client (General Client)
- **SYS.4.4** Allgemeines IoT-Gerät (General IoT Device) — satellite as IoT device
- **APP.3.2** Webserver (for ground-based interfaces)

### IT-Grundschutz Certification
- BSI issues "ISO 27001 Certificate on the basis of IT-Grundschutz"
- Recognized internationally as ISO 27001 compliant
- More prescriptive than standalone ISO 27001: specifies concrete controls, not just objectives
- For German NCA submissions: IT-Grundschutz certification is the gold standard
- Alternative: ISO/IEC 27001:2022 standalone certification (accepted but less preferred)

### Protection Needs Categories (Schutzbedarfskategorien)
- Normal: Breach causes limited damage
- Hoch (High): Breach causes considerable damage
- Sehr Hoch (Very High): Breach causes existential/catastrophic damage
- Space operations typically classified as "hoch" or "sehr hoch" for availability and integrity`,
  "",
  // ── SatDSiG Knowledge ──
  `## SatDSiG — Satellite Data Security (for Earth Observation Operators Only)

### Applicability
SatDSiG (Satellitendatensicherheitsgesetz, 2007) ONLY applies to operators of high-resolution
Earth observation satellite systems. It is NOT a general space law and does NOT apply to:
- Communication satellites
- Navigation satellites
- Science/research missions (unless they carry qualifying EO payloads)
- Low-resolution imaging systems

### Authorization Requirement
- German entities operating qualifying EO systems need SatDSiG approval from BMWK
- "German entity" includes: German nationals, companies with registered office in Germany,
  and operators using ground stations in Germany
- Approval covers: system design, data distribution policy, sensitivity classification

### Data Sensitivity Framework
- All data from qualifying systems classified into sensitivity levels
- Sensitive requests (sensible Anfragen): Based on:
  - Target country (classified country lists maintained by BMWK)
  - Target area type (military installations, critical infrastructure)
  - Timeliness (near-real-time data is more sensitive)
- Data distribution requires compliance with sensitivity classification

### Relevance to BNetzA Submissions
- EO operators submitting to BNetzA under EU Space Act must ALSO demonstrate SatDSiG compliance
- SatDSiG approval should be referenced in the Authorization Application
- Data security measures from SatDSiG are complementary to NIS2/EU Space Act cyber requirements`,
  "",
  // ── German Compliance Matrix Format ──
  `## German Compliance Matrix Format (BNetzA Expectations)

### Structure
German regulatory submissions should include a compliance matrix mapping requirements from
BOTH the EU Space Act AND relevant German national regulations.

### Required Compliance Matrix Columns
| Anforderung (Requirement) | EU Space Act Art. | German Law Reference | Status | Nachweis (Evidence) | Abschnitt (Section) | Bemerkung (Comment) |
|---------------------------|-------------------|---------------------|--------|--------------------|--------------------|---------------------|

### Status Values
Use German abbreviations with English explanation on first use:
- **K**: Konform (Compliant)
- **NK**: Nicht Konform (Non-Compliant)
- **TK**: Teilweise Konform (Partially Compliant)
- **NA**: Nicht Anwendbar (Not Applicable — requires justification)

### German Law References to Include
Depending on document type, map each requirement to:
- WRG Eckpunkte reference (where applicable — note "geplant/planned" status)
- BSI-TR-03184 Part 1/Part 2 section (for cybersecurity)
- NIS2UmsuCG article (for cybersecurity)
- IT-Grundschutz Baustein (for cybersecurity evidence)
- SatDSiG section (for EO operators only)
- ISO 24113:2019 section (for debris)
- IADC Guidelines section (for debris)

### Language Requirements
- Executive summary (Zusammenfassung) in German
- Technical content may be in English with German terminology in parentheses on first use
- Compliance matrix: German column headers, bilingual content acceptable
- All German regulatory references must use official German titles

### Additional Format Expectations
- BSI IT-Grundschutz Baustein references where applicable (e.g., "DER.2.1 — Behandlung von Sicherheitsvorfällen")
- Clear cross-references between EU Space Act articles and German national provisions
- Risk classifications using BSI Schutzbedarfskategorien (Normal / Hoch / Sehr Hoch)
- For cybersecurity: dual compliance demonstration (NIS2UmsuCG + EU Space Act)`,
].join("\n");

// ─── Jurisdiction Data ─────────────────────────────────────────────────────────

const GERMANY_JURISDICTION: JurisdictionData = {
  code: "DE",
  name: "Germany",

  nca: {
    name: "DLR (space) + BSI (cybersecurity) + BNetzA (spectrum)",
    fullName:
      "Deutsches Zentrum für Luft- und Raumfahrt / " +
      "Bundesamt für Sicherheit in der Informationstechnik / " +
      "Bundesnetzagentur",
    website: "https://www.bnetza.de",
    language: "de",
    executiveSummaryLanguage: "de",
  },

  // Germany has NO comprehensive space law
  spaceLaw: null,

  additionalLaws: [
    {
      name: "Satellitendatensicherheitsgesetz (SatDSiG)",
      citation: "SatDSiG 2007, §§ 1-30",
      scope:
        "High-resolution Earth observation systems only — NOT a general space law",
      status: "enacted",
    },
    {
      name: "Raumfahrtaufgabenübertragungsgesetz (RAÜG)",
      citation: "RAÜG",
      scope:
        "DLR administrative authority for space activities, national programs, ESA representation",
      status: "enacted",
    },
    {
      name: "NIS-2-Umsetzungs- und Cybersicherheitsstärkungsgesetz (NIS2UmsuCG)",
      citation: "NIS2UmsuCG 2024",
      scope:
        "Cybersecurity obligations for essential/important entities including space operators; " +
        "BSI as supervisory authority; incident reporting; penalties up to €10M or 2% turnover",
      status: "enacted",
    },
    {
      name: "Weltraumgesetz Eckpunkte (WRG)",
      citation:
        "Eckpunkte der Bundesregierung für ein Weltraumgesetz, Sept 2024",
      scope:
        "Planned comprehensive space law — authorization requirement, liability/insurance regime, " +
        "debris mitigation, registration, simplified regime for SMEs. NOT YET ENACTED.",
      status: "draft",
    },
  ],

  requirements: GERMANY_REQUIREMENTS,

  insurance: {
    minimumTPL: 50_000_000,
    formula:
      "10% of average annual turnover (3-year avg), max €50M per incident",
    cap: 50_000_000,
    governmentGuarantee: false,
    legalBasis:
      "WRG Eckpunkte Draft §§ 15-17 (NOT enacted — from Sept 2024 key points paper). " +
      "Currently no specific space insurance law in force. Federal Republic assumes strict " +
      "liability (verschuldensunabhängige Haftung) with operator recourse (Regress). " +
      "Acceptable forms: Haftpflichtversicherung or Bankbürgschaft. " +
      "Universities/research exempt from recourse unless gross negligence (grobe Fahrlässigkeit).",
  },

  complianceMatrixFormat: {
    statusValues: [
      "K (Konform)",
      "NK (Nicht Konform)",
      "TK (Teilweise Konform)",
      "NA (Nicht Anwendbar)",
    ],
    columns: [
      "Anforderung (Requirement)",
      "EU Space Act Art.",
      "German Law Reference",
      "Status",
      "Nachweis (Evidence)",
      "Abschnitt (Section)",
      "Bemerkung (Comment)",
    ],
    language: "de",
  },

  rigor: { debris: 4, cybersecurity: 5, general: 4, safety: 3 },

  requiredTools: [
    {
      name: "ESA DRAMA Suite",
      description:
        "OSCAR, MASTER, ARES modules for orbital lifetime and re-entry risk analysis. " +
        "No mandatory German-specific tool (unlike CNES STELA for France).",
      mandatory: false,
    },
  ],

  acceptedEvidence: [
    {
      type: "BSI_GRUNDSCHUTZ_CERT",
      description:
        "BSI ISO 27001 Certificate on the basis of IT-Grundschutz — the gold standard " +
        "for German NCA cybersecurity submissions. More prescriptive than standalone ISO 27001.",
      acceptedAsShortcut: true,
    },
    {
      type: "ISO27001_CERT",
      description:
        "ISO/IEC 27001:2022 certificate — accepted but less preferred than BSI IT-Grundschutz certification. " +
        "Must be accompanied by Statement of Applicability (SoA) demonstrating space-relevant controls.",
      acceptedAsShortcut: true,
    },
    {
      type: "BSI_TR_03184_COMPLIANCE",
      description:
        "BSI-TR-03184 compliance attestation — demonstrates adherence to BSI's space-specific " +
        "cybersecurity technical guideline for both space segment (Part 1) and ground segment (Part 2).",
      acceptedAsShortcut: false,
    },
    {
      type: "NIS2_COMPLIANCE_REPORT",
      description:
        "NIS2UmsuCG compliance report — demonstrates adherence to German NIS2 transposition " +
        "including incident reporting procedures, risk management measures, and supply chain security.",
      acceptedAsShortcut: false,
    },
    {
      type: "SATDSIG_APPROVAL",
      description:
        "SatDSiG approval (Genehmigung) from BMWK — required ONLY for Earth observation operators " +
        "with high-resolution imaging systems. Not applicable to non-EO missions.",
      acceptedAsShortcut: false,
    },
    {
      type: "DRAMA_OUTPUT",
      description:
        "ESA DRAMA suite output (OSCAR, MASTER, ARES) — accepted for orbital lifetime " +
        "and re-entry risk analysis. No mandatory German-specific tool equivalent to CNES STELA.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    DMP: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Include German-language executive summary (Zusammenfassung auf Deutsch)",
        "Reference WRG Eckpunkte (Sept 2024) debris requirements alongside EU Space Act throughout",
        "WRG treats constellations as single activity (einheitliche Weltraumaktivität) — address fleet-level compliance",
        "Reference IADC Guidelines Rev.2 (IADC-02-01, 2020) and ISO 24113:2019 as primary debris standards",
        "No mandatory German-specific tools (unlike CNES) — ESA DRAMA suite or equivalent accepted for orbital analysis",
        "Include collision avoidance strategy referencing WRG SSA data sharing obligations",
        "Address WRG mandatory planned end-of-life (geplantes Missionsende) requirement",
        "Include compliance matrix mapping EU Space Act articles to WRG Eckpunkte provisions",
      ],
      commonRejectionReasons: [
        "No reference to WRG Eckpunkte or German regulatory context (28%)",
        "Constellation not treated as unified activity per WRG approach (18%)",
        "Missing SSA data sharing commitment per WRG requirements (15%)",
        "Compliance matrix missing German national regulation references (12%)",
      ],
    },
    ORBITAL_LIFETIME: {
      depthExpectation: "detailed",
      specificRequirements: [
        "ESA DRAMA suite (OSCAR module) or equivalent propagation tool accepted — no mandatory German-specific tool",
        "Include propagation curves for mean, +2σ, and -2σ solar activity scenarios",
        "Show altitude vs. time plots for the full 25-year post-mission period",
        "Reference WRG Eckpunkte debris avoidance requirements and planned end-of-life mandate",
        "Include atmospheric density model specification and justification",
        "For constellations: individual satellite analysis plus fleet-level statistical assessment",
      ],
      commonRejectionReasons: [
        "No solar cycle sensitivity analysis (must show mean, +2σ, -2σ scenarios)",
        "Atmospheric density model not specified or justified",
        "Constellation fleet-level analysis missing",
      ],
    },
    EOL_DISPOSAL: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference WRG Eckpunkte mandatory end-of-life planning requirement",
        "Delta-V budget with margin (≥10% recommended)",
        "Probability of success analysis for disposal maneuver",
        "For controlled re-entry: ESA DRAMA (SARA module) or equivalent for casualty risk assessment",
        "Contingency procedures for failed disposal must be described",
        "For constellations: fleet disposal strategy considering WRG unified activity concept",
      ],
      commonRejectionReasons: [
        "No probability of success analysis for disposal maneuver",
        "Insufficient fuel margin documentation",
        "Missing contingency procedures for failed disposal",
      ],
    },
    CYBER_POLICY: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Map every requirement to BOTH NIS2UmsuCG article AND EU Space Act article — dual compliance required",
        "Reference BSI-TR-03184 (Parts 1 & 2) as primary technical guidance for space cybersecurity",
        "Reference BSI IT-Grundschutz framework and applicable Bausteine (building blocks)",
        "Include ISMS scope aligned with BSI-Standard 200-1 or ISO 27001",
        "Address protection needs (Schutzbedarf) per BSI methodology: Normal/Hoch/Sehr Hoch",
        "German technical terminology preferred (with English in parentheses on first use)",
        "Reference WRG Eckpunkte alongside EU Space Act for forward-looking compliance",
        "ISO 27001 or BSI IT-Grundschutz certificate can substitute for detailed policy sections — reference explicitly",
        "Address both IT and OT (Operational Technology) segments per BSI-TR-03184",
      ],
      commonRejectionReasons: [
        "NIS2UmsuCG mapping incomplete — missing dual compliance demonstration (41%)",
        "No reference to BSI-TR-03184 or IT-Grundschutz framework (22%)",
        "Missing BCP test evidence (BSI-Standard 200-4 not referenced) (18%)",
        "Access control policy too generic — no IT-Grundschutz Baustein references (10%)",
      ],
    },
    CYBER_RISK_ASSESSMENT: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Use BSI-TR-03184 methodology as primary risk assessment framework for space systems",
        "Structure analysis per BSI approach: Strukturbeschreibung → Schutzbedarfsfeststellung → Risikoanalyse → Risikobehandlung",
        "Protection needs (Schutzbedarf) classification: Normal, Hoch (High), Sehr Hoch (Very High)",
        "Address space-specific threats from BSI-TR-03184 Part 1: unauthorized telecommand, telemetry interception, GNSS spoofing",
        "Address ground-segment threats from BSI-TR-03184 Part 2: SCC compromise, key management, physical security",
        "Reference CCSDS 350.1-G-3 for space-specific threat taxonomy",
        "Include lifecycle coverage per BSI-TR-03184: design through decommissioning",
        "Supply chain risk assessment per NIS2UmsuCG requirements (Lieferkettensicherheit)",
        "Cross-reference BSI IT-Grundschutz relevant Bausteine for each identified risk",
      ],
      commonRejectionReasons: [
        "Risk methodology not aligned with BSI-TR-03184 or IT-Grundschutz (35%)",
        "Protection needs classification missing or incomplete (22%)",
        "Space segment vs. ground segment not separately analyzed per BSI-TR-03184 Parts 1 & 2 (18%)",
        "TT&C link security not adequately assessed (12%)",
      ],
    },
    INCIDENT_RESPONSE: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Follow NIS2UmsuCG incident reporting timelines to BSI: 24h Frühwarnung, 72h Meldung, 1-month Abschlussbericht",
        "Define dual reporting: to BSI (cybersecurity incidents) and to NCA (space operations impact)",
        "Reference BSI IT-Grundschutz Baustein DER.2.1 (Behandlung von Sicherheitsvorfällen)",
        "Include IT forensics preparedness per BSI Baustein DER.2.2 (Vorsorge für die IT-Forensik)",
        "Reference EU Space Act Art. 89-92 alongside NIS2UmsuCG notification requirements",
        "Define penalties for non-compliance: essential entities up to €10M or 2% turnover, important entities up to €7M or 1.4%",
        "Include CSIRT coordination procedures with BSI CERT-Bund",
        "Address management liability (Geschäftsleitung) for compliance failures per NIS2UmsuCG",
      ],
      commonRejectionReasons: [
        "NIS2UmsuCG reporting timelines not accurately reflected (32%)",
        "Dual reporting to BSI + NCA not described (24%)",
        "No reference to BSI DER.2.1/DER.2.2 Bausteine (18%)",
        "Management liability provisions not addressed (12%)",
      ],
    },
    BCP_RECOVERY: {
      depthExpectation: "extensive",
      specificRequirements: [
        "BSI-Standard 200-4 (Business Continuity Management) is the expected methodology",
        "Document RTO (Recovery Time Objective) and RPO (Recovery Point Objective) for all critical systems",
        "Cover both ground segment failover and degraded-mode satellite operations",
        "Reference BSI IT-Grundschutz Baustein DER.4 (Notfallmanagement)",
        "Include tested recovery procedures — BNetzA expects documented test results",
        "Address satellite-specific BCM: safe mode operations, ground station redundancy, backup TT&C paths",
        "Crisis communication procedures per NIS2UmsuCG",
      ],
      commonRejectionReasons: [
        "No documented BCP test results (32%)",
        "RTO/RPO not defined for critical systems (24%)",
        "BSI-Standard 200-4 not referenced (18%)",
        "Satellite-specific degraded-mode operations not covered (14%)",
      ],
    },
    ACCESS_CONTROL: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference BSI IT-Grundschutz Bausteine ORP.4 (Identitäts- und Berechtigungsmanagement)",
        "MFA mandatory for all critical operations per NIS2UmsuCG",
        "Physical access control for ground stations per BSI Bausteine INF.1 and INF.2",
        "Privileged access management (PAM) for satellite command operations",
        "Access control for TT&C systems per BSI-TR-03184 Part 2",
        "Role-based access control (RBAC) with least-privilege principle",
        "Regular access review and recertification procedures",
      ],
      commonRejectionReasons: [
        "MFA not mandated for critical operations (28%)",
        "Physical access control for ground facilities not addressed (22%)",
        "No IT-Grundschutz Baustein references (18%)",
        "TT&C access control not specifically addressed (14%)",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Structure must address both EU Space Act requirements and WRG Eckpunkte provisions",
        "Include compliance matrix with dual mapping: EU Space Act articles + German national regulations",
        "Matrix columns: Anforderung | EU Space Act Art. | German Law Reference | Status (K/NK/TK/NA) | Nachweis | Abschnitt | Bemerkung",
        "German-language Zusammenfassung (executive summary) mandatory",
        "Reference WRG Eckpunkte authorization requirements (Genehmigungsvorbehalt)",
        "Address WRG liability and insurance provisions (10% turnover cap, max €50M)",
        "For constellations: address unified activity concept (einheitliche Weltraumaktivität)",
        "For EO operators: include SatDSiG compliance status",
        "Reference BSI-TR-03184 compliance for cybersecurity sections",
        "Address WRG simplified regime eligibility if applicable (SME/research)",
        "Registration requirements per UN Registration Convention and WRG",
      ],
      commonRejectionReasons: [
        "Compliance matrix not mapped to German national regulations (34%)",
        "WRG Eckpunkte provisions not addressed (22%)",
        "Liability/insurance not quantified per WRG cap provisions (16%)",
        "Missing German-language executive summary (12%)",
      ],
    },
    ENVIRONMENTAL_FOOTPRINT: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference WRG Eckpunkte environmental impact assessment (Umweltverträglichkeitsprüfung, UVP) requirement",
        "German UVP framework may apply depending on mission type and launch arrangements",
        "Reference EU Space Act Art. 44-46 environmental requirements",
        "Include propellant environmental impact assessment for re-entry debris",
        "Address space sustainability per WRG Nachhaltige Nutzung des Weltraums provisions",
      ],
      commonRejectionReasons: [
        "No reference to WRG UVP requirement (28%)",
        "Space sustainability aspects not addressed (22%)",
      ],
    },
    INSURANCE_COMPLIANCE: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference WRG Eckpunkte liability regime: Federal Republic strict liability with operator recourse",
        "Insurance cap calculation: 10% of average annual turnover (Jahresumsatz) over last 3 years, max €50M per incident",
        "Acceptable forms: Haftpflichtversicherung (liability insurance) or Bankbürgschaft (bank guarantee)",
        "For constellations: increased insurance considering higher aggregate risk",
        "University/research exemptions: regressfrei unless grobe Fahrlässigkeit (gross negligence)",
        "Reference Liability Convention 1972 obligations for Germany as launching state",
      ],
      commonRejectionReasons: [
        "WRG liability cap not properly calculated (28%)",
        "Constellation aggregate risk not addressed in insurance analysis (22%)",
        "German-specific liability regime not referenced (18%)",
      ],
    },
  },

  knowledgeBase: GERMANY_KNOWLEDGE_BASE,
};

// ─── Export ────────────────────────────────────────────────────────────────────

export function getGermanyJurisdiction(): JurisdictionData {
  return GERMANY_JURISDICTION;
}
