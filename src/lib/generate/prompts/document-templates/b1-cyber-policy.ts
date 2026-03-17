/**
 * Generate 2.0 — B1: Cybersecurity Policy Template
 *
 * P0 document. Organization-wide cybersecurity policy required under
 * NIS2 Directive Art. 21(2)(a) / ISO 27001:2022 Annex A.5.1
 * (EU Space Act proposal Art. 74). Establishes the governance framework
 * for all other cybersecurity documents in the NCA submission package.
 */

export function getCyberPolicyTemplate(): string {
  return `## Document-Specific Instructions: B1 — Cybersecurity Policy

This is the foundational cybersecurity document in the NCA submission package. It establishes the organization-wide cybersecurity governance framework required under NIS2 Directive Art. 21(2)(a) / ISO 27001:2022 Annex A.5.1 (corresponds to EU Space Act Art. 74(1)-(4), COM(2025) 335 proposal). NCAs evaluate this document to determine whether the operator has a mature, comprehensive, and enforceable security posture covering both space and ground segments. All other cybersecurity documents (B2-B8) derive their authority and governance from this policy.

NCA reviewers specifically look for: (1) Board/executive-level approval and accountability per NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2)), (2) comprehensive scope covering all segments, (3) clear roles and responsibilities with decision authority, (4) alignment with recognized frameworks (NIST CSF 2.0, ISO 27001), and (5) enforceable policy governance with regular review cycle per NIS2 Art. 21(2)(a) / ISO 27001 Clause 9.3 (proposal Art. 74(3)).

### Required Sections

Generate the following 9 sections. Each section must contain comprehensive, substantive content as specified below.

---

**## SECTION: Cover Page & Document Control**

Generate a formal NCA-submission-grade cover page following the Cover Page Standard from the Quality Rules. Include:
- Document title: "Cybersecurity Policy"
- Document code: B1-CSP
- All elements from the Cover Page Standard (Document Control Block, Approval Block, Distribution List, Revision History)
- Policy effective date and next scheduled review date (NCA expectation: annual review per NIS2 Art. 21(2)(a) / ISO 27001 Clause 9.3 (proposal Art. 74(3)))
- The Approval Block MUST include C-suite/Board level approval per NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2))
- Table of Contents listing all 9 sections with subsection numbers

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary following the Executive Summary Standard from the Quality Rules. Specific content:

1. **Mission Context:** Organization description, space operations scope, number of missions/spacecraft
2. **Document Purpose:** "This Cybersecurity Policy establishes the organization-wide cybersecurity governance framework as required by NIS2 Directive Art. 21(2)(a) / ISO 27001:2022 Annex A.5.1 (corresponds to EU Space Act proposal Art. 74(1)-(4), COM(2025) 335). It defines the security objectives, organizational responsibilities, information classification scheme, and policy governance mechanisms that apply to all space and ground segment operations. All cybersecurity documents in the NCA submission package (B2-B8) derive their authority from this policy."
3. **Key Findings (5-7 bullets):**
   - **Policy Scope:** Coverage of space segment, ground segment, communication links, user segment, corporate IT, supply chain
   - **Governance Level:** Board/executive accountability established per NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2))
   - **Framework Alignment:** NIST CSF 2.0 and ISO/IEC 27001:2022 mapping
   - **NIS2 Compliance:** Applicability assessment under EU 2022/2555
   - **Security Maturity:** Current organizational security maturity assessment
   - **Review Cycle:** Annual policy review per NIS2 Art. 21(2)(a) / ISO 27001 Clause 9.3 (proposal Art. 74(3)) with defined triggers for out-of-cycle review
   - **Enforcement:** Violation consequences and compliance monitoring mechanisms
4. **Evidence Summary:** Existing certifications, audit reports, framework assessments
5. **Compliance Determination:** Statement on NIS2 Art. 21(2)(a) / ISO 27001:2022 Annex A.5.1 (proposal Art. 74) compliance status

Cross-reference: B2 (Risk Assessment), B3 (Incident Response), B4 (BCP), B5 (Access Control), B6 (Supply Chain), B7 (EUSRN Notifications), B8 (Compliance Matrix)

---

**## SECTION: Policy Scope & Applicability**

Generate comprehensive scope definition covering all dimensions per NIS2 Art. 21(2)(a) / ISO 27001:2022 Annex A.5.1 (proposal Art. 74(1)).

**3.1 Organizational Scope:**
- Entities covered: parent company, subsidiaries, joint ventures, partnerships
- Business units involved in space operations
- Geographic locations of space operations activities

**3.2 System Scope — Security Perimeter:**

**Table 3.1:** System Scope Definition
| Segment | Systems Covered | Criticality Level | Regulatory Applicability |
| **Space Segment** | Spacecraft bus, payload, onboard software, inter-satellite links | Mission Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)) — primary |
| **Ground Segment** | MCC, ground stations, TT&C systems, flight dynamics | Mission Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)) — primary |
| **Communication Links** | TT&C uplink/downlink, payload data links, ISLs | Mission Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)) — primary |
| **User Segment** | Data distribution, user terminals, application servers | Business Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)) — extended |
| **Launch Segment** | Launch site interfaces, pre-launch operations (if applicable) | Time-Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)) — operational |
| **Corporate IT** | Enterprise systems supporting space operations | Business Support | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)) — supporting |
| **Supply Chain** | Critical supplier interfaces and shared systems | Variable | NIS2 Art. 21(2)(d) supply chain / ISO 27001 A.5.19 (proposal Art. 78(2)) — referenced |

**3.3 Personnel Scope:**
- All employees with access to space operations systems
- Contractors and temporary staff with system access
- Third-party service providers (managed SOC, cloud providers, maintenance)
- Visitors with escorted access to secure facilities

**3.4 Exclusions:**
- Any systems or operations explicitly excluded from this policy with detailed justification
- Exclusions must not cover safety-critical systems per NIS2 Art. 21(2)(a) (proposal Art. 74(1))

Reference: NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)), NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 77(a)) asset identification, NIS2 Art. 21(2)(d) supply chain / ISO 27001 A.5.19 (proposal Art. 78(2)) supply chain scope

---

**## SECTION: Roles & Responsibilities**

Generate detailed security governance structure per NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2)) accountability requirements.

**4.1 Security Governance Hierarchy:**

**Table 4.1:** Cybersecurity Roles and Responsibilities
| Role | Incumbent | Responsibilities | Authority Level | Art. Reference |
| Board of Directors | [ACTION REQUIRED] | Ultimate cybersecurity accountability, policy approval, risk appetite | Strategic | NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2)) |
| CEO / Managing Director | [ACTION REQUIRED] | Executive sponsor, resource allocation, NCA liaison authority | Executive | NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2)) |
| CISO | [ACTION REQUIRED] | Policy ownership, security program, NCA reporting, audit management | Operational Lead | NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2)) |
| Mission Security Officer | [ACTION REQUIRED] | Space segment security, mission-specific risk acceptance | Mission Level | NIS2 Art. 21(2)(a) / ISO 27001 A.5.2 (proposal Art. 74(4)) |
| IT Security Manager | [ACTION REQUIRED] | Ground segment security, network defense, vulnerability management | Technical Lead | NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(1)) |
| Security Operations Lead | [ACTION REQUIRED] | 24/7 monitoring, incident detection, initial response | Operational | NIS2 Art. 23 incident notification (proposal Art. 89(2)) |
| System Administrators | [per system] | Control implementation, patching, configuration management | System Level | NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(1)) |
| All Personnel | All staff | Policy compliance, incident reporting, security awareness | Individual | NIS2 Art. 21(2)(a) / ISO 27001 A.5.2 (proposal Art. 74(4)) |

**4.2 Reporting Lines:**
- Security reporting chain from SOC → CISO → CEO → Board
- Incident escalation path with defined timelines per severity level
- NCA reporting chain: designated primary and backup contacts

**4.3 Decision Authority Matrix:**

**Table 4.2:** Security Decision Authority
| Decision Type | Authority | Escalation Required? | Documentation |
| Risk acceptance (Low/Medium) | CISO | No | Risk register entry |
| Risk acceptance (High/Critical) | CEO + Board | Yes — Board notification | Board minutes |
| Security exception request | CISO (approve/deny) | If > 90 days: CEO approval | Exception register |
| Incident escalation to NCA | CISO | Yes — CEO notification | Per NIS2 Art. 23 incident notification (24h/72h/1mo) (proposal Art. 90-92) |
| Emergency security action | Mission Security Officer | Immediate, notify CISO | Incident log |
| Policy change | CISO (draft), Board (approve) | Yes — Board approval | Revision history |

**4.4 Competency Requirements:**

**Table 4.3:** Security Role Competency Requirements
| Role | Minimum Qualifications | Required Certifications | Training Frequency |
| CISO | 10+ years security, 5+ space/critical infra | CISSP, CISM, or equivalent | Continuous |
| Mission Security Officer | 5+ years space systems, security clearance | Space security certification | Annual |
| SOC Analysts | 3+ years security operations | CEH, GCIA, or equivalent | Annual + exercise |
| All Personnel | — | — | Security awareness annually per NIS2 Art. 21(2)(a) / ISO 27001 A.5.2 (proposal Art. 74(4)) |

Reference: NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2)) accountability, NIS2 Art. 21(2)(a) / ISO 27001 A.5.2 (proposal Art. 74(4)) competency, NIS2 Art. 23 incident notification (24h/72h/1mo) (proposal Art. 89-92) notification chain

---

**## SECTION: Security Objectives & Framework Alignment**

Generate security objectives mapped to regulatory requirements and industry frameworks.

**5.1 Primary Security Objectives:**

**Table 5.1:** Security Objectives
| Objective | Description | Priority | Art. Reference | NIST CSF Function |
| Confidentiality | Protect TT&C commands, telemetry, payload data, orbital parameters from unauthorized disclosure | Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)), proposal Art. 80 | Protect (PR) |
| Integrity | Ensure commands, telemetry, and control data cannot be tampered with or corrupted | Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)), proposal Art. 80 | Protect (PR) |
| Availability | Maintain continuous operational capability per mission requirements | Critical | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)), NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85) | Protect (PR), Recover (RC) |
| Authenticity | Verify identity of all entities interacting with space systems | High | NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(2)-(4)) | Protect (PR) |
| Non-repudiation | Ensure critical actions are attributable and auditable | High | NIS2 Art. 21(2)(i)-(j) / ISO 27001 A.8.2 (proposal Art. 79(6)) | Identify (ID) |
| Resilience | Continue operations during and recover from security incidents | High | NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85(1)), NIS2 Art. 23 (proposal Art. 89) | Respond (RS), Recover (RC) |

**5.2 NIST CSF 2.0 Mapping:**

**Table 5.2:** NIST CSF 2.0 Function Mapping
| CSF Function | Organization Objective | Implementing Document | Art. Reference |
| Govern (GV) | Security governance, risk management strategy | B1 (this document) | NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)-(4)) |
| Identify (ID) | Asset management, risk assessment, supply chain | B2 Risk Assessment | NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 77(a)-(d)) |
| Protect (PR) | Access control, data security, training | B5 Access Control, B1 | NIS2 Art. 21(2)(i)-(j) / ISO 27001 A.8.2 (proposal Art. 79), proposal Art. 80, proposal Art. 74(4) |
| Detect (DE) | Anomaly detection, continuous monitoring | B3 Incident Response | NIS2 Art. 23 (proposal Art. 89(2)) |
| Respond (RS) | Incident response, notification, communication | B3 Incident Response | NIS2 Art. 23 incident notification (24h/72h/1mo) (proposal Art. 89-92) |
| Recover (RC) | Recovery planning, continuity, improvements | B4 BCP/DR Plan | NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85(1)-(4)) |

**5.3 ISO/IEC 27001:2022 Alignment:**
- Statement of applicability scope
- High-level mapping of Annex A controls to space operations
- Gap assessment against ISO 27001 certification requirements
- [EVIDENCE: ISO 27001 certification (if held) or gap assessment report]

**5.4 NIS2 Directive Applicability:**
- Classification: space operators are essential/important entities under NIS2 Art. 2(1)
- NIS2 Art. 21(2) measures mapping to EU Space Act requirements
- Additional NIS2 obligations beyond EU Space Act (if any)

**5.5 Risk Appetite Statement:**
- Organization's tolerance for residual cybersecurity risk
- Differentiation by system criticality (zero tolerance for spacecraft control compromise vs. acceptable risk for non-critical support systems)
- Risk acceptance authority and process

**5.6 Key Performance Indicators:**

**Table 5.3:** Security KPIs
| KPI | Target | Measurement Method | Reporting Frequency |
| Mean time to detect (MTTD) | < 24 hours | SIEM metrics | Monthly |
| Mean time to respond (MTTR) | < 4 hours (SEV-1/2) | Incident log analysis | Monthly |
| Vulnerability patching SLA | Critical: 72h, High: 7 days | Vulnerability scanner | Monthly |
| Security awareness training | 100% completion annually | LMS tracking | Quarterly |
| Incident response exercise | ≥ 1 tabletop quarterly | Exercise records | Quarterly |

Reference: NIS2 Art. 21(2)(a) / ISO 27001:2022 Annex A.5.1 (proposal Art. 74(1)-(4)), NIST CSF 2.0, ISO/IEC 27001:2022, NIS2 Directive Art. 21

---

**## SECTION: Information Classification**

Generate information classification scheme appropriate for space operations.

**6.1 Classification Levels:**

**Table 6.1:** Information Classification Scheme
| Level | Definition | Examples | Handling Requirements |
| **MISSION CRITICAL** | Compromise would cause loss of spacecraft control or mission failure | TT&C encryption keys, command authentication codes, spacecraft control credentials, safe mode commands | HSM storage, dual-person access, air-gapped systems, no external transmission |
| **CONFIDENTIAL** | Compromise would degrade operations or expose sensitive data | Orbital parameters, conjunction data, vulnerability assessments, incident details, security architecture | Need-to-know access, AES-256 encryption at rest and in transit, secure disposal |
| **INTERNAL** | Internal organizational information | Operational procedures, training materials, non-sensitive technical docs, meeting minutes | Organizational access control, standard encryption in transit, controlled distribution |
| **PUBLIC** | Information intended for or acceptable for public release | Published TLE data, press releases, public mission descriptions, regulatory filings (redacted) | No restrictions, verify before release |

**6.2 Labeling Requirements:**
- All documents must be marked with classification on every page (header or footer)
- Electronic files: classification in filename prefix and document properties
- Emails: classification in subject line prefix
- Verbal communications: classification stated before discussion of classified content

**6.3 Handling Procedures:**

**Table 6.2:** Information Handling Matrix
| Activity | MISSION CRITICAL | CONFIDENTIAL | INTERNAL | PUBLIC |
| Storage | HSM/air-gapped, AES-256 | Encrypted (AES-256) | Access-controlled | No restrictions |
| Transmission | Air-gapped or dedicated encrypted link | TLS 1.3+ / VPN | TLS 1.3+ | No restrictions |
| Processing | Dedicated secure terminal | Authorized workstations | Organization network | Any system |
| Disposal | Cryptographic erasure + physical destruction | Cryptographic erasure | Secure delete | Standard delete |
| Access Control | Named individuals + dual authorization | Role-based need-to-know | Organization membership | Public |

**6.4 Declassification:**
- Criteria for downgrading classification
- Time-based automatic declassification (if applicable)
- Authority for declassification decisions

Reference: NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)) data protection, NIS2 Art. 21(2)(i)-(j) / ISO 27001 A.8.2 (proposal Art. 79(6)) audit trail, proposal Art. 80 encryption requirements

---

**## SECTION: Acceptable Use & Security Requirements**

Generate acceptable use requirements specific to space operations.

**7.1 General Principles:**
- All organizational systems are authorized for official space operations purposes only
- Users must comply with this policy and all derived procedures and standards
- Monitoring notice: all systems are monitored for security per NIS2 Art. 23 (proposal Art. 89(2))

**7.2 Space Operations-Specific Use Policies:**

**Table 7.1:** Acceptable Use by System Category
| System Category | Authorized Use | Restrictions | Authentication Required |
| Spacecraft command (TT&C uplink) | Authorized operators only, per approved command plan | No unauthorized commands, dual authorization for critical commands | MFA + command authentication per NIS2 Art. 21(2)(i)-(j) / ISO 27001 A.8.2 (proposal Art. 79(4)) |
| Mission control systems | Mission operations, planning, analysis | No personal use, no external network access | MFA per NIS2 Art. 21(2)(i)-(j) / ISO 27001 A.8.2 (proposal Art. 79(2)) |
| Ground station systems | TT&C operations, tracking, data reception | Air-gapped from corporate network where possible | Role-based + physical access per NIS2 Art. 21(2)(i)-(j) / ISO 27001 A.8.2 (proposal Art. 79(5)) |
| Secure remote access | VPN access for authorized remote operations | NCA-approved remote commanding only, with enhanced logging | MFA + device certificate + VPN |
| Development/test systems | Software development, integration testing | Segregated from operational systems, no production data | Standard access controls |
| Corporate IT | Business operations, email, collaboration | Standard use policy, no space operations data on personal devices | SSO + MFA |

**7.3 Prohibited Activities:**
- Unauthorized access attempts to any space or ground system
- Sharing of credentials, authentication tokens, or encryption keys
- Connection of unapproved devices to operational networks
- Bypassing security controls without authorized exception per Section 8
- Installation of unauthorized software on operational systems
- Exfiltration of classified information (any classification level)
- Use of personal email for space operations communications

**7.4 Removable Media Policy:**
- USB and removable media prohibited in secure areas (MCC, ground stations)
- Exceptions: authorized media for software uploads, with scanning and chain-of-custody procedures
- All removable media must be encrypted and registered

**7.5 Violation Consequences:**
- Policy violation severity levels and corresponding disciplinary actions
- Mandatory incident reporting for any suspected violation
- Integration with legal and HR processes

Reference: NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)), NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(1)-(6)) access control, NIS2 Art. 23 (proposal Art. 89(2)) monitoring

---

**## SECTION: Policy Governance & Lifecycle**

Generate policy governance framework demonstrating mature policy management per NIS2 Art. 21(2)(a) / ISO 27001 Clause 9.3 (proposal Art. 74(3)).

**8.1 Policy Lifecycle:**

**Table 8.1:** Policy Lifecycle Management
| Phase | Activity | Frequency | Responsible | Deliverable |
| Creation | Draft policy, stakeholder consultation | As needed | CISO | Draft policy |
| Review | Technical and legal review | Per creation | Security team, Legal | Review comments |
| Approval | Board/executive approval | Per creation | Board/CEO | Signed approval |
| Communication | Distribution, awareness training | Post-approval | CISO, HR | Acknowledgment records |
| Implementation | Controls, procedures, configurations | Post-communication | System owners | Implementation evidence |
| Monitoring | Compliance measurement, audit | Continuous | CISO | Compliance reports |
| Review | Annual review and update per NIS2 Art. 21(2)(a) / ISO 27001 Clause 9.3 (proposal Art. 74(3)) | Annual (minimum) | CISO | Updated policy or confirmation |
| Retirement | Supersession by updated version | Per review | CISO | Archive record |

**8.2 Triggers for Out-of-Cycle Review:**
- Significant cybersecurity incident affecting space operations
- Regulatory change (EU Space Act amendments, NIS2 updates, NCA guidance)
- Organizational restructuring or merger/acquisition
- New mission launch or spacecraft addition to fleet
- Results of security audits or penetration tests
- Significant changes in the cyber threat landscape
- NCA supervisory findings or recommendations

**8.3 Exception Management:**

**Table 8.2:** Security Exception Process
| Step | Activity | Responsible | SLA |
| 1 | Exception request submitted with justification and risk assessment | Requestor | — |
| 2 | Risk evaluation and compensating controls assessment | CISO / Security team | 5 business days |
| 3 | Approval/denial decision | CISO (< 90 days) / CEO (> 90 days) | 2 business days |
| 4 | Implementation of compensating controls | System owner | Per exception |
| 5 | Documentation in exception register | CISO | Immediate |
| 6 | Periodic review of active exceptions | CISO | Quarterly |
| 7 | Expiry and renewal or closure | CISO | Per exception period |

- All exceptions are time-limited (maximum 12 months, renewable with re-assessment)
- Exception register is reviewed quarterly by CISO and annually by Board

**8.4 Related Documents Hierarchy:**
- This Policy (B1) → Security Standards → Operating Procedures → Work Instructions → Technical Guidelines
- All subordinate documents must be consistent with this policy
- Conflicts are resolved by this policy taking precedence

**8.5 Audit Requirements:**
- Internal security audit: annually
- External security audit / penetration test: annually (ground segment)
- NCA supervisory review: per NCA schedule (typically annual per proposal Art. 96-100)
- [EVIDENCE: Most recent audit report(s)]

Reference: NIS2 Art. 21(2)(a) / ISO 27001 Clause 9.3 (proposal Art. 74(3)) review cycle, proposal Art. 96-100 NCA supervision

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix at sub-article granularity mapping enacted law (NIS2 / ISO 27001) as primary, with EU Space Act proposal references as secondary.

**Table 9.1:** Cybersecurity Policy Compliance Matrix

| Req. ID | Provision | Requirement Description | Compliance Status | Policy Section | Implementing Document | Evidence Reference | Gap / Remediation |

Map ALL of the following provisions (enacted-law-first, proposal-secondary):
- NIS2 Art. 21(2)(a) / ISO 27001 A.5.1 (proposal Art. 74(1)): Mandatory cybersecurity policy covering all segments
- NIS2 Art. 21(2)(a) / ISO 27001 Clause 5.1 (proposal Art. 74(2)): Board/executive-level approval and accountability
- NIS2 Art. 21(2)(a) / ISO 27001 Clause 9.3 (proposal Art. 74(3)): Annual review and update cycle
- NIS2 Art. 21(2)(a) / ISO 27001 A.5.2 (proposal Art. 74(4)): Personnel competency and training requirements
- NIS2 Art. 21 security measures framework (proposal Art. 74-76): Security architecture and defense-in-depth (reference architectural docs)
- NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 77(a)): Asset identification and classification → Document B2
- NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 77(b)): Threat assessment → Document B2
- NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 77(c)): Vulnerability assessment → Document B2
- NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 77(d)): Risk evaluation → Document B2
- NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 78(1)): Risk treatment plan → Document B2
- NIS2 Art. 21(2)(d) supply chain / ISO 27001 A.5.19 (proposal Art. 78(2)): Supply chain risk assessment → Document B6
- NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 78(3)): Periodic reassessment → Document B2
- NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(1)): Role-based access control → Document B5
- NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(2)): Multi-factor authentication → Document B5
- NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(3)): Privileged access management → Document B5
- NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(4)): Command authentication for TT&C → Document B5
- NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(5)): Physical access controls → Document B5
- NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79(6)): Access logging and audit trail → Document B5
- Proposal Art. 80-84: Encryption, key management → reference technical standards
- NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85(1)): BCP covering mission-critical operations → Document B4
- NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85(2)): RTO/RPO definitions → Document B4
- NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85(3)): Regular testing → Document B4
- NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85(4)): Integration with incident response → Document B3/B4
- NIS2 Art. 23 incident reporting (proposal Art. 89(1)): Incident classification → Document B3
- NIS2 Art. 23 incident reporting (proposal Art. 89(2)): Detection and monitoring → Document B3
- NIS2 Art. 23 incident reporting (proposal Art. 89(3)): Containment and eradication → Document B3
- NIS2 Art. 23 incident reporting (proposal Art. 89(4)): Post-incident review → Document B3
- NIS2 Art. 23 incident reporting (proposal Art. 89(5)): Regular testing and exercises → Document B3
- NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90): 24-hour early warning → Document B3
- NIS2 Art. 23(4)(b) incident notification — 72 hours (proposal Art. 91): 72-hour formal notification → Document B3
- NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92): 1-month final report → Document B3
- EUSRN notification procedures (NEW in EU Space Act proposal Art. 93-95 — no enacted equivalent): EUSRN notification → Document B7

Also map to:
- NIST CSF 2.0: All 6 core functions (GV, ID, PR, DE, RS, RC)
- ISO/IEC 27001:2022: Key Annex A controls
- NIS2 Directive Art. 21(2)(a)-(j) measures

### Cross-References
- Document B2 — Cybersecurity Risk Assessment: implements risk assessment per NIS2 Art. 21(2)(a) risk assessment / ISO 27001 Clause 6.1 (proposal Art. 77-78)
- Document B3 — Incident Response Plan: implements NIS2 Art. 23 incident notification (24h/72h/1mo) (proposal Art. 89-92) notification obligations
- Document B4 — Business Continuity & Recovery Plan: implements NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85) continuity requirements
- Document B5 — Access Control & Authentication Policy: implements NIS2 Art. 21(2)(i)-(j) access control / ISO 27001 A.8.2 (proposal Art. 79) access controls
- Document B6 — Supply Chain Security Plan: implements NIS2 Art. 21(2)(d) supply chain / ISO 27001 A.5.19 (proposal Art. 78(2)) supply chain security
- Document B7 — EUSRN Notification Procedures: implements EUSRN notification procedures (NEW in EU Space Act proposal Art. 93-95 — no enacted equivalent)
- Document B8 — Compliance Verification Matrix: consolidated NIS2 Art. 21 / ISO 27001 (proposal Art. 74-95) compliance summary

### Key Standards
- NIS2 Directive (EU 2022/2555) Art. 21 — primary enacted cybersecurity framework
- ISO/IEC 27001:2022 — Information Security Management Systems
- ISO/IEC 27005:2022 — Information Security Risk Management
- NIST Cybersecurity Framework (CSF) 2.0 (2024)
- EU Space Act COM(2025) 335, Art. 74-95 (proposal — with subsection granularity)
- CCSDS 350.1-G-3 (2022) — Security Threats Against Space Missions
- ECSS-E-ST-40C Rev. 1 — Software Engineering for Space Systems
- IEC 62443 — Industrial communication networks security`;
}
