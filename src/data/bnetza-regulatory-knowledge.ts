/**
 * @deprecated Consolidated into `src/data/regulatory/jurisdictions/germany.ts` knowledgeBase field.
 */

/**
 * BNetzA (Germany) Regulatory Knowledge Base
 *
 * Extracted from official German regulatory documents:
 * - Eckpunkte der Bundesregierung für ein Weltraumgesetz (WRG), Sept 2024
 * - BSI-TR-03184 Part 1: Information Security for Space Systems — Space Segment (July 2023)
 * - BSI-TR-03184 Part 2: Information Security for Space Systems — Ground Segment (July 2025)
 * - RAÜG (Raumfahrtaufgabenübertragungsgesetz)
 * - SatDSiG (Satellitendatensicherheitsgesetz, 2007) + SatDSiV
 * - NIS2UmsuCG (NIS-2-Umsetzungs- und Cybersicherheitsstärkungsgesetz)
 * - BSI IT-Grundschutz Kompendium (current edition)
 *
 * This knowledge is injected into generation prompts when BNetzA is selected as target NCA.
 */

// ─── German Regulatory Landscape ──────────────────────────────────────────────

export const GERMAN_REGULATORY_LANDSCAPE = `
## German Space Regulatory Landscape — Current State

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
- **Bundeswehr**: Military space interests, potential service requisition under WRG
`;

// ─── WRG Eckpunkte Knowledge ──────────────────────────────────────────────────

export const WRG_ECKPUNKTE_KNOWLEDGE = `
## Weltraumgesetz (WRG) — Eckpunkte der Bundesregierung (September 2024)

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
- Reduced documentation requirements for low-risk missions
`;

// ─── BSI-TR-03184 Knowledge ──────────────────────────────────────────────────

export const BSI_TR_03184_KNOWLEDGE = `
## BSI-TR-03184 — Information Security for Space Systems

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
- NIST SP 800-53 (where applicable for international missions)
`;

// ─── NIS2 German Implementation Knowledge ────────────────────────────────────

export const NIS2_GERMAN_IMPLEMENTATION_KNOWLEDGE = `
## NIS2 German Implementation — NIS2UmsuCG

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
- BSI-TR-03184 provides the technical implementation guidance specific to space systems
`;

// ─── BSI IT-Grundschutz Knowledge ────────────────────────────────────────────

export const BSI_IT_GRUNDSCHUTZ_KNOWLEDGE = `
## BSI IT-Grundschutz Framework

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
- Space operations typically classified as "hoch" or "sehr hoch" for availability and integrity
`;

// ─── SatDSiG Knowledge (for EO Operators) ────────────────────────────────────

export const SATDSIG_KNOWLEDGE = `
## SatDSiG — Satellite Data Security (for Earth Observation Operators Only)

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
- Data security measures from SatDSiG are complementary to NIS2/EU Space Act cyber requirements
`;

// ─── German Compliance Matrix Format ──────────────────────────────────────────

export const GERMAN_COMPLIANCE_MATRIX_KNOWLEDGE = `
## German Compliance Matrix Format (BNetzA Expectations)

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
- For cybersecurity: dual compliance demonstration (NIS2UmsuCG + EU Space Act)
`;

// ─── Consolidated BNetzA Knowledge for Prompt Injection ───────────────────────

/**
 * Returns the full BNetzA regulatory knowledge block for prompt injection.
 * Called when targetNCA === "bnetza" to give Claude deep Germany-specific context.
 */
export function getBNetzARegulatoryKnowledge(): string {
  return [
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
    GERMAN_REGULATORY_LANDSCAPE,
    WRG_ECKPUNKTE_KNOWLEDGE,
    BSI_TR_03184_KNOWLEDGE,
    NIS2_GERMAN_IMPLEMENTATION_KNOWLEDGE,
    BSI_IT_GRUNDSCHUTZ_KNOWLEDGE,
    SATDSIG_KNOWLEDGE,
    GERMAN_COMPLIANCE_MATRIX_KNOWLEDGE,
  ].join("\n");
}
