/**
 * Generate 2.0 — B2: Cybersecurity Risk Assessment Template
 *
 * P0 document. Comprehensive risk assessment for space and ground systems
 * per EU Space Act Art. 77-78, aligned with NIST SP 800-30 and ISO 27005.
 */

export function getCyberRiskTemplate(): string {
  return `## Document-Specific Instructions: B2 — Cybersecurity Risk Assessment

This document provides the comprehensive cybersecurity risk assessment required under EU Space Act Art. 77(1)(a)-(d) and Art. 78(1)-(3). NCAs expect a structured, methodical risk assessment covering the full attack surface of space operations — space segment, ground segment, communication links, and supply chain. The assessment must identify threats specific to space systems (per CCSDS 350.1-G-3), evaluate vulnerabilities, and present a prioritized risk treatment plan with residual risk acceptance.

This document implements the risk assessment obligation established in the Cybersecurity Policy (Document B1) and informs the Incident Response Plan (Document B3), Access Control Policy (Document B5), and Supply Chain Security Plan (Document B6).

NCA reviewers specifically evaluate: (1) use of a recognized risk methodology (NIST SP 800-30 / ISO 27005), (2) space-specific threat scenarios (not generic IT risks), (3) comprehensive asset inventory per Art. 77(a), (4) quantified risk levels with clear acceptance criteria, (5) actionable risk treatment plan with timelines.

### Required Sections

Generate the following 9 sections. Each section must contain comprehensive, substantive content as specified below.

---

**## SECTION: Cover Page & Document Control**

Generate a formal NCA-submission-grade cover page following the Cover Page Standard from the Quality Rules. Include:
- Document title: "Cybersecurity Risk Assessment"
- Document code: B2-CRA
- All elements from the Cover Page Standard (Document Control Block, Approval Block, Distribution List, Revision History)
- Assessment date and validity period (NCA expectation: annual reassessment per Art. 78(3))
- Table of Contents listing all 9 sections with subsection numbers

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary following the Executive Summary Standard from the Quality Rules. Specific content:

1. **Mission Context:** Organization, missions/spacecraft covered, operational scope
2. **Document Purpose:** "This Cybersecurity Risk Assessment fulfills the requirements of Art. 77(1)(a)-(d) and Art. 78(1)-(3) of the EU Space Act (COM(2025) 335). It identifies, evaluates, and prioritizes cybersecurity risks across all segments of space operations and establishes a risk treatment plan with documented residual risk acceptance."
3. **Key Findings (5-7 bullets):**
   - **Total Risks Identified:** [X] risks across [Y] categories
   - **Risk Distribution:** [X] Critical, [X] High, [X] Medium, [X] Low
   - **Top Risk:** [Brief description of highest-priority risk]
   - **Residual Risk Posture:** [Assessment after planned treatments]
   - **Critical Assets:** [Number] mission-critical assets identified per Art. 77(a)
   - **Space-Specific Threats:** [Number] space-specific threat scenarios analyzed per CCSDS 350.1-G-3
   - **Supply Chain Risks:** [Number] supply chain risks per Art. 78(2)
4. **Evidence Summary:** Assessment methodology, tools used, validation approach
5. **Compliance Determination:** Statement on Art. 77-78 compliance

Cross-reference: Document B1 (Cybersecurity Policy), B3 (Incident Response), B5 (Access Control), B6 (Supply Chain)

---

**## SECTION: Risk Assessment Methodology**

Generate detailed methodology description demonstrating use of recognized framework.

**3.1 Selected Framework:**
- Primary: NIST SP 800-30 Rev. 1 (Guide for Conducting Risk Assessments) or ISO/IEC 27005:2022
- Supplementary: CCSDS 350.1-G-3 for space-specific threat modeling
- Justification for framework selection and NCA acceptance

**3.2 Risk Assessment Process:**
1. Asset identification and valuation per Art. 77(a)
2. Threat identification and characterization per Art. 77(b)
3. Vulnerability identification per Art. 77(c)
4. Likelihood determination (5-level scale)
5. Impact analysis (5-level scale, multi-dimensional)
6. Risk determination (likelihood × impact)
7. Risk treatment selection per Art. 78(1)

**3.3 Likelihood Scale:**

**Table 3.1:** Likelihood Scale Definition
| Level | Score | Definition | Frequency Estimate | Justification Criteria |
| Very Low | 1 | Rare, no known precedent in space sector | < 1% per year | No known attack of this type against space systems |
| Low | 2 | Unlikely but theoretically possible | 1-10% per year | Isolated precedent, high attacker capability required |
| Medium | 3 | Possible, some precedent in space/critical infra | 10-50% per year | Multiple precedents, moderate capability required |
| High | 4 | Likely, regular occurrence in similar sectors | 50-90% per year | Frequent occurrence, widely available tools |
| Very High | 5 | Near certain, active exploitation observed | > 90% per year | Active campaigns targeting space sector |

**3.4 Impact Scale:**

**Table 3.2:** Impact Scale Definition (Multi-Dimensional)
| Level | Score | Operational Impact | Financial Impact | Regulatory Impact | Safety Impact |
| Negligible | 1 | No effect on ops | < EUR 10K | No regulatory action | No safety impact |
| Minor | 2 | Degraded non-critical | EUR 10K-100K | Informal NCA inquiry | Negligible safety |
| Moderate | 3 | Degraded critical service | EUR 100K-1M | Formal NCA investigation | Minor safety concern |
| Major | 4 | Loss of critical service | EUR 1M-10M | NCA enforcement (Art. 106-110) | Significant safety |
| Catastrophic | 5 | Loss of spacecraft/mission | > EUR 10M | Authorization revocation (Art. 115), fines up to 1% turnover (Art. 111) | Loss of life risk |

**3.5 Risk Matrix:**

**Table 3.3:** 5×5 Risk Matrix
| | Impact 1 | Impact 2 | Impact 3 | Impact 4 | Impact 5 |
| Likelihood 5 | Medium (5) | High (10) | High (15) | Critical (20) | Critical (25) |
| Likelihood 4 | Low (4) | Medium (8) | High (12) | Critical (16) | Critical (20) |
| Likelihood 3 | Low (3) | Medium (6) | Medium (9) | High (12) | Critical (15) |
| Likelihood 2 | Low (2) | Low (4) | Medium (6) | Medium (8) | High (10) |
| Likelihood 1 | Low (1) | Low (2) | Low (3) | Low (4) | Medium (5) |

Risk levels: **Critical** (≥15): Immediate action, Board notification | **High** (10-14): Short-term action (90 days) | **Medium** (5-9): Medium-term (180 days) | **Low** (1-4): Accept or address in next cycle

**3.6 Risk Acceptance Criteria:**
- Critical risks: NEVER accepted — must be mitigated, transferred, or avoided
- High risks: Board approval required for acceptance, with documented justification and compensating controls
- Medium risks: CISO approval for acceptance with documented justification
- Low risks: Accepted by default, monitored in risk register

Reference: Art. 77(1)(a)-(d), NIST SP 800-30 Rev. 1, ISO/IEC 27005:2022

---

**## SECTION: Asset Inventory & Classification**

Generate comprehensive asset inventory per Art. 77(a).

**4.1 Asset Identification Methodology:**
- Identification approach: system architecture review, interviews, documentation analysis
- Classification criteria: mission impact if compromised (C/I/A)
- Criticality assignment: Mission Critical / Business Critical / Business Support

**4.2 Space Segment Assets:**

**Table 4.1:** Space Segment Asset Inventory
| Asset ID | Asset Name | Description | Criticality | Owner | C | I | A |
| SA-001 | Spacecraft bus | AOCS, power, thermal, structure | Mission Critical | [ACTION REQUIRED] | H | H | H |
| SA-002 | Onboard computer | Flight software, command processing | Mission Critical | [ACTION REQUIRED] | H | H | H |
| SA-003 | Payload systems | Mission payload and data processing | Mission Critical | [ACTION REQUIRED] | H | H | H |
| SA-004 | TT&C transponder | Telecommand receive, telemetry transmit | Mission Critical | [ACTION REQUIRED] | H | H | H |
| SA-005 | ISL equipment | Inter-satellite link (if applicable) | Business Critical | [ACTION REQUIRED] | M | H | M |
| SA-006 | Encryption module | Onboard security hardware | Mission Critical | [ACTION REQUIRED] | H | H | H |
| SA-007 | GNSS receiver | Position and timing | Business Critical | [ACTION REQUIRED] | L | H | M |

**4.3 Ground Segment Assets:**

**Table 4.2:** Ground Segment Asset Inventory
| Asset ID | Asset Name | Description | Criticality | Owner | C | I | A |
| GA-001 | Mission Control Center | Primary MCC systems and infrastructure | Mission Critical | [ACTION REQUIRED] | H | H | H |
| GA-002 | Ground station(s) | Antenna, RF chain, TT&C equipment | Mission Critical | [ACTION REQUIRED] | H | H | H |
| GA-003 | Flight dynamics system | Orbit determination, maneuver planning | Mission Critical | [ACTION REQUIRED] | M | H | H |
| GA-004 | Mission planning system | Command generation, scheduling | Business Critical | [ACTION REQUIRED] | M | H | M |
| GA-005 | Data processing system | Payload data processing and archival | Business Critical | [ACTION REQUIRED] | H | H | M |
| GA-006 | SIEM/SOC systems | Security monitoring infrastructure | Business Critical | [ACTION REQUIRED] | M | H | H |
| GA-007 | Network infrastructure | Firewalls, switches, routers, VPN | Mission Critical | [ACTION REQUIRED] | M | H | H |
| GA-008 | IAM system | Identity and access management | Mission Critical | [ACTION REQUIRED] | H | H | H |
| GA-009 | Backup systems | Backup and disaster recovery | Business Critical | [ACTION REQUIRED] | M | H | H |

**4.4 Communication Link Assets:**

**Table 4.3:** Communication Link Asset Inventory
| Asset ID | Asset Name | Description | Criticality | C | I | A |
| LA-001 | TT&C uplink | Telecommand link to spacecraft | Mission Critical | H | H | H |
| LA-002 | TT&C downlink | Telemetry link from spacecraft | Mission Critical | H | H | H |
| LA-003 | Payload data link | Mission data downlink | Business Critical | H | M | M |
| LA-004 | Inter-satellite link | ISL communications (if applicable) | Business Critical | H | H | M |
| LA-005 | Ground network links | MCC to ground station connectivity | Mission Critical | M | H | H |

**4.5 Asset Dependency Mapping:**
- Critical dependencies between assets (which ground assets are required for which space operations)
- Single points of failure identification
- Redundancy assessment for mission-critical asset chains

Reference: Art. 77(a) asset identification, ISO/IEC 27001:2022 Annex A.5.9

---

**## SECTION: Threat Landscape Analysis**

Generate space-specific threat analysis per Art. 77(b) and CCSDS 350.1-G-3.

**5.1 Threat Actor Assessment:**

**Table 5.1:** Threat Actor Characterization
| Actor Type | Motivation | Capability Level | Targeting Likelihood | Historical Precedent |
| Nation-state APT | Espionage, disruption, strategic advantage | Very High (custom tools, zero-days) | High (space sector is strategic target) | Turla targeting satellite operators, Viasat KA-SAT attack (2022) |
| Cybercriminal orgs | Financial gain (ransomware, data sale) | High (RaaS, exploit kits) | Medium (opportunistic + targeted) | Ransomware attacks on satellite ground systems |
| Hacktivists | Ideological disruption, publicity | Medium (public tools, DDoS) | Low-Medium | Defacement, DDoS against space agencies |
| Insider threat | Financial, ideological, negligent | Variable (legitimate access) | Medium | Insider incidents at defense contractors |
| Supply chain compromise | Access to target via trusted supplier | High (sophisticated, patient) | Medium-High | SolarWinds, Codecov, hardware implants |
| Competitors | Industrial espionage | Medium-High | Low-Medium | IP theft in satellite manufacturing |

**5.2 Space-Specific Threat Scenarios (per CCSDS 350.1-G-3):**

**Table 5.2:** Space-Specific Threat Catalog
| Threat ID | Threat Scenario | Target Segment | Attack Vector | Impact Category | Severity |
| T-01 | Command injection via TT&C uplink | Space/Link | RF interception + command spoofing | Spacecraft control loss | Catastrophic |
| T-02 | Telemetry manipulation/spoofing | Space/Link | Downlink interception + data injection | Incorrect operator decisions | Major |
| T-03 | Signal jamming/denial | Link | RF interference (intentional/unintentional) | Loss of communications | Major |
| T-04 | Ground station network intrusion | Ground | Network exploitation, phishing, supply chain | Lateral movement to MCC | Major-Catastrophic |
| T-05 | Flight software supply chain implant | Space | Malicious code in S/W update or component | Persistent backdoor on spacecraft | Catastrophic |
| T-06 | Ransomware on ground systems | Ground | Phishing, exploitation, RDP | Mission ops disruption | Major |
| T-07 | Privileged insider misuse | Ground | Legitimate access abuse | Data exfiltration, sabotage | Major |
| T-08 | RF replay attack on command channel | Link | Capture + replay of command sequences | Unauthorized command execution | Catastrophic |
| T-09 | GPS/GNSS spoofing | Space/Link | False navigation signals | Incorrect orbit determination | Major |
| T-10 | Eavesdropping on payload data link | Link | Signal interception | Data confidentiality breach | Moderate-Major |
| T-11 | Physical intrusion to ground facility | Ground | Physical break-in or tailgating | Direct system access | Major |
| T-12 | DDoS on ground infrastructure | Ground | Volumetric/application layer DDoS | Service disruption | Moderate-Major |
| T-13 | Firmware manipulation of ground equipment | Ground/Supply | Supply chain or maintenance access | Persistent ground compromise | Major |
| T-14 | Key compromise (encryption/auth) | All | Cryptanalysis, insider, poor key management | Complete system compromise | Catastrophic |
| T-15 | Social engineering of ops personnel | Ground/Human | Phishing, vishing, pretexting | Credential theft, info disclosure | Moderate-Major |

**5.3 Threat Intelligence Sources:**
- ENISA Threat Landscape reports (annual)
- CERT-EU advisories
- Space ISAC (if member) or relevant industry ISACs
- CISA advisories and KEV catalog
- CCSDS security working group publications
- NCA-specific threat briefings (if available)

**5.4 Emerging Threats:**
- AI-enabled attack automation and evasion
- Quantum computing implications for current encryption
- Counter-space operations (cyber-kinetic)
- Proliferation of commercial SIGINT capabilities
- 5G/6G ground infrastructure attack surface expansion

Reference: Art. 77(b), CCSDS 350.1-G-3, ENISA Threat Landscape

---

**## SECTION: Vulnerability Assessment**

Generate vulnerability analysis per Art. 77(c).

**6.1 Assessment Methodology:**

**Table 6.1:** Vulnerability Assessment Methods
| Method | Scope | Frequency | Tools/Approach |
| Architecture review | All segments | Per design change | Manual expert review |
| Vulnerability scanning | Ground segment | Monthly | [ACTION REQUIRED: tool name] |
| Penetration testing | Ground segment perimeter | Annual | External red team |
| Configuration audit | Ground systems | Quarterly | CIS benchmarks, STIG |
| Code review / SAST | Ground + flight software | Per release | [ACTION REQUIRED: tool name] |
| Supply chain audit | Critical suppliers | Annual | Questionnaire + assessment |

**6.2 Vulnerability Findings:**

**Table 6.2:** Vulnerability Register
| Vuln ID | Description | Affected Asset(s) | CVSS Score | Exploitability | Current Mitigation | Residual Exposure |
| V-01 | Limited onboard patching capability | SA-002 (OBC) | N/A (design) | Medium | Secure boot, code signing | Accepted — space segment constraint |
| V-02 | Legacy TT&C protocol weaknesses | SA-004, LA-001/002 | N/A (design) | Medium | Encryption overlay | Monitor for protocol upgrade path |
| V-03 | Long mission lifetime exceeding crypto algorithm lifetime | SA-006, all links | N/A (design) | Low (future) | Crypto agility planning | Post-quantum migration plan |
| V-04 | Ground system OS/application vulnerabilities | GA-001 through GA-009 | Variable | High | Patching program per SLA | Patch compliance monitoring |
| V-05 | Remote access attack surface | GA-007 (VPN) | Variable | High | MFA, network segmentation | Monitoring + pen test |
| V-06 | Shared ground infrastructure with other missions | GA-001, GA-002 | N/A (design) | Medium | Network segmentation | Isolation verification |
| V-07 | Personnel security awareness gaps | Human factor | N/A | High | Training program | Exercise results tracking |
| V-08 | Third-party software dependencies | GA-001-009 | Variable | Medium-High | SBOM management, scanning | Supply chain monitoring |

(Expand with additional findings based on operator's specific infrastructure)

**6.3 Space-Specific Vulnerability Considerations:**
- Inability to physically access spacecraft for remediation after launch
- Limited computational resources for onboard security functions
- Long mission lifetimes (5-15+ years) exceeding cryptographic algorithm security lifetimes
- Radiation-induced faults potentially creating security vulnerabilities
- Shared ground infrastructure serving multiple missions
- Time-delayed communication affecting real-time security response

Reference: Art. 77(c), ISO/IEC 27001:2022 Annex A.8.8

---

**## SECTION: Risk Register & Evaluation**

Generate comprehensive risk register — the core deliverable of this assessment.

**7.1 Risk Register:**

**Table 7.1:** Cybersecurity Risk Register

| Risk ID | Risk Description | Threat (Ref.) | Vulnerability (Ref.) | Affected Asset(s) | Likelihood (1-5) | Impact (1-5) | Risk Score | Risk Level |
| R-01 | Unauthorized command execution via TT&C compromise | T-01, T-08 | V-02 | SA-004, LA-001 | 2 | 5 | 10 | High |
| R-02 | Ransomware disrupting ground operations | T-06 | V-04 | GA-001-009 | 3 | 4 | 12 | High |
| R-03 | Supply chain implant in flight software | T-05 | V-08 | SA-002, SA-003 | 2 | 5 | 10 | High |
| R-04 | Ground station intrusion leading to spacecraft access | T-04 | V-04, V-05 | GA-002, SA-all | 3 | 5 | 15 | Critical |
| R-05 | Insider exfiltration of orbital/operational data | T-07 | V-07 | GA-all, data assets | 3 | 3 | 9 | Medium |
| R-06 | Signal jamming disrupting TT&C operations | T-03 | V-02 | LA-001, LA-002 | 2 | 4 | 8 | Medium |
| R-07 | Encryption key compromise | T-14 | V-03 | SA-006, all links | 1 | 5 | 5 | Medium |
| R-08 | DDoS disrupting data distribution services | T-12 | V-04 | GA-005, LA-005 | 3 | 3 | 9 | Medium |
| R-09 | Phishing leading to credential compromise | T-15 | V-07 | GA-008, human | 4 | 3 | 12 | High |
| R-10 | GPS/GNSS spoofing affecting orbit determination | T-09 | V-02 | SA-007, GA-003 | 2 | 4 | 8 | Medium |
| R-11 | Physical intrusion to MCC/ground station | T-11 | — | GA-001, GA-002 | 2 | 4 | 8 | Medium |
| R-12 | Third-party software vulnerability exploitation | T-04, T-05 | V-08 | GA-all | 3 | 3 | 9 | Medium |
| R-13 | Loss of backup/recovery capability during incident | T-06 | V-04 | GA-009 | 2 | 4 | 8 | Medium |
| R-14 | Telemetry manipulation leading to incorrect decisions | T-02 | V-02 | LA-002, GA-003 | 2 | 4 | 8 | Medium |
| R-15 | Quantum computing breaking current crypto | T-14 | V-03 | All encrypted assets | 1 | 5 | 5 | Medium |

(Generate additional risks as warranted by operator's specific profile)

**7.2 Risk Distribution Summary:**

**Table 7.2:** Risk Distribution by Segment
| Segment | Critical | High | Medium | Low | Total |
| Space Segment | [count] | [count] | [count] | [count] | [total] |
| Ground Segment | [count] | [count] | [count] | [count] | [total] |
| Communication Links | [count] | [count] | [count] | [count] | [total] |
| Supply Chain | [count] | [count] | [count] | [count] | [total] |
| Human Factor | [count] | [count] | [count] | [count] | [total] |
| **Total** | **[sum]** | **[sum]** | **[sum]** | **[sum]** | **[sum]** |

**7.3 Top 5 Priority Risks:**
Detailed analysis of the 5 highest-scoring risks:
For each: detailed attack scenario, current controls, gaps, recommended treatment

**7.4 Industry Benchmark Comparison:**
- How this risk profile compares to similar space operators
- Areas above/below industry average risk levels

Reference: Art. 77(d), Art. 78(1), NIST SP 800-30 Rev. 1

---

**## SECTION: Risk Treatment Plan**

Generate actionable risk treatment plan per Art. 78(1).

**8.1 Treatment Strategy:**

**Table 8.1:** Risk Treatment Plan
| Risk ID | Current Score | Treatment Option | Treatment Description | Target Score | Owner | Timeline | Cost |
| R-04 | 15 (Critical) | Mitigate | Network segmentation, zero-trust architecture, enhanced monitoring | 8 (Medium) | [ACTION REQUIRED] | 90 days | [estimate] |
| R-01 | 10 (High) | Mitigate | Command encryption upgrade, dual authorization, anomaly detection | 4 (Low) | [ACTION REQUIRED] | 180 days | [estimate] |
| R-02 | 12 (High) | Mitigate | EDR deployment, network segmentation, offline backups, IR exercises | 6 (Medium) | [ACTION REQUIRED] | 90 days | [estimate] |
| R-03 | 10 (High) | Mitigate | SBOM management, code signing, supplier audits, secure boot | 4 (Low) | [ACTION REQUIRED] | 180 days | [estimate] |
| R-09 | 12 (High) | Mitigate | MFA enforcement, phishing simulations, security awareness program | 6 (Medium) | [ACTION REQUIRED] | 60 days | [estimate] |

(Continue for all risks requiring treatment)

**8.2 Priority Implementation Schedule:**

**Table 8.2:** Treatment Implementation Priority
| Priority | Risk IDs | Action Category | Deadline | Status |
| P1 (Critical) | R-04 | Network security, zero trust | 30 days | [ACTION REQUIRED] |
| P2 (High) | R-01, R-02, R-03, R-09 | Encryption, EDR, supply chain, training | 90 days | [ACTION REQUIRED] |
| P3 (Medium) | R-05 through R-15 | Various controls | 180 days | [ACTION REQUIRED] |
| P4 (Low) | Remaining | Next review cycle | 12 months | Planned |

**8.3 Residual Risk Assessment:**

**Table 8.3:** Residual Risk After Treatment
| Risk ID | Current Score | Current Level | Post-Treatment Score | Post-Treatment Level | Accepted? | Accepted By |
(Map all risks from current to residual state)

**8.4 Residual Risk Acceptance:**
- Formal acceptance statement for all residual risks by appropriate authority per Section 3.6
- Board-level acceptance required for any residual High risks
- CISO acceptance for residual Medium risks
- [ACTION REQUIRED: Formal risk acceptance signatures]

**8.5 Monitoring and Reassessment:**
- Risk register review frequency: quarterly
- Full risk assessment reassessment: annually per Art. 78(3)
- Trigger events for out-of-cycle reassessment (same as policy review triggers)
- KPIs for tracking risk treatment progress

Reference: Art. 78(1)-(3), NIST SP 800-30 Rev. 1, ISO/IEC 27005:2022

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix at sub-article granularity for Art. 77-78.

**Table 9.1:** Risk Assessment Compliance Matrix

| Req. ID | Provision | Requirement Description | Compliance Status | Assessment Section | Evidence Reference | Gap / Remediation |

Map ALL of the following provisions:
- Art. 77(1)(a): Asset identification and classification — Section 4
- Art. 77(1)(b): Threat assessment specific to space operations — Section 5
- Art. 77(1)(c): Vulnerability identification and assessment — Section 6
- Art. 77(1)(d): Risk evaluation and prioritization — Section 7
- Art. 78(1): Risk treatment plan with residual risk acceptance — Section 8
- Art. 78(2): Supply chain risk assessment for critical components — Section 5.2 (T-05, T-13), Section 7 (R-03, R-12), cross-ref Document B6
- Art. 78(3): Periodic reassessment obligation (minimum annually) — Section 8.5
- NIST SP 800-30 Rev. 1: Full risk assessment process compliance
- NIST CSF 2.0 ID.RA: Risk Assessment subcategory mapping
- ISO/IEC 27005:2022: Risk management process compliance
- NIS2 Directive Art. 21(2)(a): Risk analysis and information system security policies

### Cross-References
- Document B1 — Cybersecurity Policy: governance framework authorizing this assessment
- Document B3 — Incident Response Plan: informed by risks R-01 through R-15 and threat scenarios
- Document B4 — Business Continuity & Recovery Plan: informed by impact analysis (Section 3.4)
- Document B5 — Access Control & Authentication Policy: implements access-related risk treatments
- Document B6 — Supply Chain Security Plan: implements supply chain risk treatments (R-03, R-12)
- Document B8 — Compliance Verification Matrix: consolidated Art. 74-95 compliance summary

### Key Standards
- EU Space Act COM(2025) 335, Art. 77(1)(a)-(d), Art. 78(1)-(3)
- NIST SP 800-30 Rev. 1 — Guide for Conducting Risk Assessments
- NIST Cybersecurity Framework (CSF) 2.0 — Identify function
- ISO/IEC 27005:2022 — Information Security Risk Management
- ISO/IEC 27001:2022 Annex A.5.9 — Information security in supplier relationships
- CCSDS 350.1-G-3 (2022) — Security Threats Against Space Missions
- NIS2 Directive (EU 2022/2555) Art. 21(2)(a)
- ENISA Threat Landscape for Space (if available)`;
}
