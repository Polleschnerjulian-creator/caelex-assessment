/**
 * Generate 2.0 — B2: Cybersecurity Risk Assessment Template
 *
 * P0 document. Comprehensive risk assessment for space and ground systems
 * per EU Space Act Art. 77-78, aligned with NIST CSF and ISO 27005.
 */

export function getCyberRiskTemplate(): string {
  return `## Document-Specific Instructions: B2 — Cybersecurity Risk Assessment

This document provides the comprehensive cybersecurity risk assessment required under EU Space Act Art. 77-78. NCAs expect a structured, methodical risk assessment covering the full attack surface of space operations — space segment, ground segment, communication links, and supply chain. The assessment must identify threats specific to space systems, evaluate vulnerabilities, and present a risk treatment plan. This document implements the risk assessment obligation established in the Cybersecurity Policy (Document B1).

### Required Sections

Generate the following 9 sections. Each section must contain the specified content.

---

**## SECTION: Cover Page & Document Control**

Generate a formal cover page including:
- Document title: "Cybersecurity Risk Assessment"
- Document code: B2-CRA
- Operator name, assessment date, document version
- Classification level (typically "Confidential — NCA Submission")
- Assessment validity period (NCA expectation: reassessment at least annually)
- Revision history table: Version | Date | Author | Description of Changes
- Document approval table: Role | Name | Signature | Date
- Distribution list

---

**## SECTION: Executive Summary**

Generate a 1-2 page executive summary covering:
- Purpose: comprehensive cybersecurity risk assessment per Art. 77-78 of the EU Space Act
- Methodology used (reference to established framework)
- Scope of assessment: systems, segments, and operations covered
- Key findings summary:
  - Total risks identified
  - Risk distribution by severity: Critical | High | Medium | Low
  - Top 5 risks requiring immediate attention
- Current residual risk posture assessment
- Key recommendations summary
- Reference to Cybersecurity Policy (Document B1) as the governance authority
- Reference to related documents: B3 (Incident Response), B5 (Access Control), B6 (Supply Chain Security)

---

**## SECTION: Methodology**

Generate risk assessment methodology description:
- Selected risk assessment framework and justification:
  - Primary: NIST SP 800-30 Rev. 1 (Guide for Conducting Risk Assessments) or ISO 27005:2022
  - Supplementary: CCSDS 350.1-G-3 for space-specific threat modeling
- Risk assessment process:
  1. Asset identification and valuation
  2. Threat identification and characterization
  3. Vulnerability identification
  4. Likelihood determination
  5. Impact analysis
  6. Risk determination (likelihood x impact)
  7. Risk treatment selection
- Likelihood scale:
  | Level | Score | Description | Frequency |
  | Very Low | 1 | Rare, no known precedent | < 1% per year |
  | Low | 2 | Unlikely but possible | 1-10% per year |
  | Medium | 3 | Possible, some precedent | 10-50% per year |
  | High | 4 | Likely, regular occurrence | 50-90% per year |
  | Very High | 5 | Near certain, frequent | > 90% per year |
- Impact scale:
  | Level | Score | Operational Impact | Financial Impact | Regulatory Impact |
  | Negligible | 1 | No effect on operations | < EUR 10K | No regulatory action |
  | Minor | 2 | Degraded non-critical service | EUR 10K-100K | Informal NCA inquiry |
  | Moderate | 3 | Degraded critical service | EUR 100K-1M | Formal NCA investigation |
  | Major | 4 | Loss of critical service | EUR 1M-10M | NCA enforcement action |
  | Catastrophic | 5 | Loss of spacecraft / mission | > EUR 10M | License revocation |
- Risk matrix: 5x5 likelihood-impact matrix with risk levels (Critical, High, Medium, Low)
- Risk acceptance criteria: thresholds for accepting, mitigating, transferring, or avoiding risks
- Reference Art. 77 risk assessment requirements

---

**## SECTION: Asset Inventory**

Generate comprehensive asset inventory:
- Asset identification and classification per Art. 77(a):
  | Asset ID | Asset Name | Segment | Category | Criticality | Owner |

  Categories and example assets to include:

  **Space Segment Assets:**
  - Spacecraft bus systems (AOCS, power, thermal)
  - Onboard computer and flight software
  - Payload systems and data processing
  - Inter-satellite link equipment
  - Encryption hardware / security modules

  **Ground Segment Assets:**
  - Mission Control Center (MCC) systems
  - Ground station antenna and RF systems
  - Telemetry, Tracking & Command (TT&C) systems
  - Flight dynamics systems
  - Mission planning systems
  - Data processing and archival systems

  **Communication Link Assets:**
  - TT&C uplink (telecommand)
  - TT&C downlink (telemetry)
  - Payload data downlink
  - Inter-satellite links
  - Ground network interconnections

  **Supporting Assets:**
  - Network infrastructure (firewalls, switches, routers)
  - Identity and access management systems
  - Monitoring and SIEM systems
  - Backup and recovery systems
  - Development and test environments
  - Documentation and configuration management

- Asset criticality assessment: methodology for rating criticality (e.g., based on mission impact if compromised)
- Asset dependency mapping: which assets depend on which others
- Reference Art. 77(a) asset identification obligations

---

**## SECTION: Threat Landscape**

Generate space-specific threat analysis:
- Threat actor categorization:
  | Actor Type | Motivation | Capability | Targeting Likelihood |
  Actors to analyze:
  - Nation-state APT groups (espionage, disruption)
  - Cybercriminal organizations (ransomware, data theft)
  - Hacktivists (ideological disruption)
  - Insider threats (malicious or negligent)
  - Supply chain compromise (third-party attack vector)
  - Competitors (industrial espionage)

- Space-specific threat scenarios (per CCSDS 350.1-G-3):
  | Threat ID | Threat Scenario | Target Segment | Attack Vector | Potential Impact |
  Scenarios to analyze:
  - **T-01:** Command injection — unauthorized telecommand to spacecraft
  - **T-02:** Telemetry spoofing — manipulation of downlinked telemetry data
  - **T-03:** Signal jamming/interference — denial of TT&C or payload links
  - **T-04:** Ground station compromise — network intrusion into MCC
  - **T-05:** Supply chain implant — malicious code in spacecraft software/firmware
  - **T-06:** Ransomware on ground systems — encryption of mission-critical data
  - **T-07:** Insider threat — privileged user misuse of access
  - **T-08:** RF replay attack — capture and replay of command sequences
  - **T-09:** Side-channel attack — exploitation of spacecraft RF emissions
  - **T-10:** GPS/GNSS spoofing — manipulation of navigation data
  - **T-11:** Physical intrusion — unauthorized access to ground facilities
  - **T-12:** DDoS on ground infrastructure — denial of data distribution services

- Threat intelligence sources: where threat information is obtained (ENISA, CERT-EU, industry ISACs)
- Emerging threats: AI-enabled attacks, quantum computing implications, anti-satellite cyber operations
- Reference CCSDS 350.1-G-3 and Art. 77(b) threat assessment requirements

---

**## SECTION: Vulnerability Assessment**

Generate vulnerability analysis:
- Vulnerability identification methodology:
  - Technical vulnerability scanning (ground systems)
  - Architecture review (space and ground segments)
  - Configuration review against security baselines
  - Code review / SAST for flight and ground software
  - Penetration testing results (ground segment)
  - Supply chain vulnerability analysis
- Vulnerability findings table:
  | Vuln ID | Description | Affected Asset(s) | Severity (CVSS) | Exploitability | Current Mitigation |
  Categories of vulnerabilities to assess:
  - **Space segment:** limited patching capability, long lifecycle hardware, legacy protocols, radiation-induced faults
  - **Communication links:** unencrypted links, weak authentication, susceptibility to jamming
  - **Ground segment:** unpatched systems, misconfigured firewalls, weak access controls, remote access risks
  - **Human factors:** insufficient training, social engineering susceptibility, credential management
  - **Supply chain:** third-party software vulnerabilities, hardware provenance, firmware integrity
- Space-specific vulnerability considerations:
  - Inability to physically access spacecraft for remediation
  - Limited onboard processing for security functions
  - Long mission lifetimes exceeding cryptographic algorithm lifetimes
  - Shared ground infrastructure with other missions
- Reference Art. 77(c) vulnerability assessment requirements

---

**## SECTION: Risk Evaluation**

Generate risk register:
- Risk register table (the core output of the risk assessment):
  | Risk ID | Risk Description | Threat | Vulnerability | Asset | Likelihood | Impact | Risk Score | Risk Level |

  Generate at minimum 15-20 risks covering all segments, mapped from the threats and vulnerabilities identified above. Each risk should be specific and actionable.

- Risk heat map description: distribution of risks across the 5x5 matrix
- Risk by segment summary:
  | Segment | Critical | High | Medium | Low | Total |
  | Space | ? | ? | ? | ? | ? |
  | Ground | ? | ? | ? | ? | ? |
  | Links | ? | ? | ? | ? | ? |
  | Supply Chain | ? | ? | ? | ? | ? |
  | Human | ? | ? | ? | ? | ? |

- Top 10 risks requiring priority treatment
- Risks exceeding acceptance threshold — must be treated
- Comparison with industry risk benchmarks for space operators of similar type and size
- Reference Art. 78 risk evaluation requirements

---

**## SECTION: Risk Treatment Plan**

Generate risk treatment plan:
- Treatment strategy for each risk exceeding acceptance threshold:
  | Risk ID | Treatment Option | Treatment Description | Residual Risk | Owner | Timeline | Cost Category |
  Treatment options:
  - **Mitigate:** implement controls to reduce likelihood or impact
  - **Transfer:** insurance or contractual transfer to third party
  - **Avoid:** eliminate the risk by changing operations or architecture
  - **Accept:** formally accept the risk with documented justification (only for risks below acceptance threshold)

- Priority treatment actions:
  | Priority | Risk ID | Action | Deadline | Status |
  P1 (Critical): immediate action required — within 30 days
  P2 (High): short-term action — within 90 days
  P3 (Medium): medium-term action — within 180 days
  P4 (Low): long-term / next review cycle

- Control implementation plan: mapping of treatments to specific security controls
- Residual risk assessment: risk levels after all planned treatments are implemented
- Residual risk acceptance: formal acceptance of remaining residual risk by appropriate authority
- Budget and resource requirements for risk treatment implementation
- Monitoring plan: how risk levels will be tracked over time
- Reference Art. 78 risk treatment requirements

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix for Art. 77-78:
| Requirement | Article Reference | Assessment Finding | Status | Evidence Reference |

Requirements to map:
- Art. 77(a): Asset identification and classification
- Art. 77(b): Threat assessment for space operations
- Art. 77(c): Vulnerability identification and assessment
- Art. 77(d): Risk evaluation and prioritization
- Art. 78(1): Risk treatment and residual risk management
- Art. 78(2): Supply chain risk assessment (cross-reference Document B6)
- Art. 78(3): Periodic reassessment obligation
- NIST CSF ID.RA: Risk Assessment subcategory mapping
- ISO 27005: Risk management process compliance
- NIS2 Art. 21(2)(a): Risk analysis and information system security policies

### Cross-References
- Document B1 — Cybersecurity Policy: governance framework authorizing this assessment
- Document B3 — Incident Response Plan: informed by risks identified in this assessment
- Document B4 — Business Continuity & Recovery Plan: informed by impact analysis
- Document B5 — Access Control & Authentication Policy: implements access control treatments
- Document B6 — Supply Chain Security Plan: implements supply chain risk treatments
- Document B8 — Compliance Verification Matrix: consolidated requirement mapping

### Key Standards
- EU Space Act COM(2025) 335, Art. 77-78
- NIST SP 800-30 Rev. 1 — Guide for Conducting Risk Assessments
- NIST Cybersecurity Framework (CSF) 2.0
- ISO/IEC 27005:2022 — Information Security Risk Management
- CCSDS 350.1-G-3 — Security Threats Against Space Missions
- NIS2 Directive (EU 2022/2555) Art. 21(2)(a)`;
}
