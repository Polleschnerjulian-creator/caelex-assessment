/**
 * Generate 2.0 — B3: Incident Response Plan Template
 *
 * P0 document. Comprehensive incident response plan including the
 * 24h/72h/1mo notification timeline per NIS2 Art. 23 incident reporting
 * (corresponds to EU Space Act proposal Art. 89-92, COM(2025) 335).
 */

export function getIncidentResponseTemplate(): string {
  return `## Document-Specific Instructions: B3 — Incident Response Plan

This document details the organization's incident response capability for cybersecurity incidents affecting space operations, as required under NIS2 Art. 23 incident reporting (24h/72h/1mo) (corresponds to EU Space Act proposal Art. 89(1)-(5) and Art. 90-92, COM(2025) 335). NCAs place particular emphasis on the mandatory notification timeline (NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90), NIS2 Art. 23(4)(b) incident notification — 72 hours (proposal Art. 91), NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92)) and the organization's demonstrated ability to detect, classify, contain, eradicate, and recover from incidents while maintaining mission operations.

This document implements the incident management obligations established in the Cybersecurity Policy (Document B1) and is informed by the risk scenarios in the Risk Assessment (Document B2). Extended recovery scenarios are covered by the BCP/DR Plan (Document B4).

NCA reviewers specifically evaluate: (1) space-specific incident classification (not generic IT categories), (2) realistic detection capability with measurable response times, (3) NCA notification procedures with templates and decision criteria, (4) space segment-specific containment procedures, (5) regular testing program with exercises.

Penalties for notification failures: proposal Art. 116 provides specific additional penalties for failure to comply with notification obligations under NIS2 Art. 23 (proposal Art. 90-92). Fines up to 1% of worldwide annual turnover per proposal Art. 111.

### Required Sections

Generate the following 10 sections. Each section must contain comprehensive, substantive content as specified below.

---

**## SECTION: Cover Page & Document Control**

Generate a formal NCA-submission-grade cover page following the Cover Page Standard from the Quality Rules. Include:
- Document title: "Incident Response Plan"
- Document code: B3-IRP
- All elements from the Cover Page Standard (Document Control Block, Approval Block, Distribution List, Revision History)
- Plan effective date, next review date, and **date of last exercise/test**
- Emergency contact table: Key IR personnel with 24/7 contact details (name, role, phone, email, alternate)
- Table of Contents listing all 10 sections with subsection numbers

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary following the Executive Summary Standard from the Quality Rules. Specific content:

1. **Mission Context:** Organization, missions, operational scope, 24/7 operations status
2. **Document Purpose:** "This Incident Response Plan establishes the organization's comprehensive incident response capability as required by NIS2 Art. 23 incident reporting (24h/72h/1mo) (corresponds to EU Space Act proposal Art. 89(1)-(5) and Art. 90-92, COM(2025) 335). It covers detection, classification, containment, eradication, recovery, and notification for all cybersecurity incidents affecting space and ground segment operations."
3. **Key Findings (5-7 bullets):**
   - **Response Capability:** Current IR team size, availability (24/7 or business hours), response time targets
   - **Detection Coverage:** Monitoring systems covering [X]% of critical assets
   - **NCA Notification:** Procedures established for 24h/72h/1-month timeline per NIS2 Art. 23 incident reporting (24h/72h/1mo) (proposal Art. 90-92)
   - **Testing Cadence:** [Quarterly tabletop / Semi-annual functional / Annual full-scale]
   - **Last Exercise:** [date] — results summary
   - **Critical Gaps:** [number and nature]
   - **NIS2 Alignment:** Cross-reference to NIS2 Art. 23 notification requirements
4. **Evidence Summary:** IR team certifications, exercise records, monitoring tool inventory
5. **Compliance Determination:** Statement on NIS2 Art. 23 incident reporting (24h/72h/1mo) (proposal Art. 89-92) compliance

Cross-reference: Document B1 (Policy), B2 (Risk scenarios), B4 (BCP/DR), B7 (EUSRN notifications)

---

**## SECTION: Incident Classification Framework**

Generate space-specific incident classification per NIS2 Art. 23 incident reporting (proposal Art. 89(1)).

**3.1 Severity Levels:**

**Table 3.1:** Incident Severity Classification
| Severity | Name | Definition | Response Time | Escalation | NCA Notification |
| SEV-1 | Critical | Loss or potential loss of spacecraft control; active compromise of command channel; data breach of MISSION CRITICAL information; multi-system compromise | Immediate (< 15 min) | CEO, Board, NCA immediately | **Mandatory** — NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90) |
| SEV-2 | High | Degraded spacecraft operations; ground system compromise with lateral movement; significant unauthorized access to CONFIDENTIAL data; ransomware on operational systems | < 1 hour | CISO, CEO | **Mandatory** — NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90) |
| SEV-3 | Medium | Attempted intrusion detected and contained; malware on non-critical systems; policy violation with security impact; failed exploitation attempt from sophisticated actor | < 4 hours | CISO | **Assess** — may require notification based on NIS2 Art. 23(3) / (proposal Art. 89(1)) criteria |
| SEV-4 | Low | Minor security event; failed access attempt (automated); routine anomaly; user policy violation without security impact | < 24 hours | IT Security Manager | **No** — log and monitor |

**3.2 Space-Specific Incident Categories:**

**Table 3.2:** Space Operations Incident Categories
| Category | Description | Example Scenarios | Typical Severity | NIS2 Art. 23 / proposal Art. 89 Applicable? |
| **CMD-COMP** | Command channel compromise | Unauthorized TT&C access, command injection, auth bypass | SEV-1 | Yes |
| **TLM-MANIP** | Telemetry manipulation | Spoofed/corrupted telemetry, data integrity violation | SEV-1/2 | Yes |
| **RF-INTER** | Signal interference | Intentional jamming, spoofing, unintentional interference | SEV-2/3 | Assess |
| **GND-INTRUSION** | Ground system intrusion | Network breach, lateral movement, privilege escalation in MCC | SEV-1/2 | Yes |
| **RANSOMWARE** | Ransomware/destructive malware | Encryption of ground system data, wiper malware | SEV-1/2 | Yes |
| **DATA-BREACH** | Data breach | Unauthorized access to operational data, orbital parameters, keys | SEV-2/3 | Yes (if significant) |
| **SUPPLY-CHAIN** | Supply chain compromise | Malicious update, compromised third-party component | SEV-1/2 | Yes |
| **INSIDER** | Insider threat | Malicious/negligent action by authorized personnel | SEV-2/3 | Assess |
| **PHYSICAL** | Physical security breach | Unauthorized ground facility access | SEV-2/3 | Assess |
| **DDOS** | Denial of service | DDoS against ground infrastructure, service disruption | SEV-3/4 | Assess |

**3.3 "Significant Incident" Definition per NIS2 Art. 23(3) / proposal Art. 89(1):**
An incident is "significant" and triggers mandatory NCA notification if ANY of:
- Spacecraft operations are disrupted or degraded
- Command channel integrity or availability is compromised
- Data classified as MISSION CRITICAL or CONFIDENTIAL is breached
- Incident has cross-border impact (affects other operators or Member States)
- Incident could affect safety of space operations
- Financial impact exceeds EUR 100K
- Multiple systems compromised indicating sophisticated attacker

**3.4 Escalation Criteria:**
Decision tree for severity upgrades (SEV-4→3, 3→2, 2→1) with specific triggers for each upgrade

Reference: NIS2 Art. 23(3) significant incident definition (proposal Art. 89(1))

---

**## SECTION: Detection & Identification**

Generate detection capability description per NIS2 Art. 23 (proposal Art. 89(2)).

**4.1 Detection Architecture:**

**Table 4.1:** Detection Sources and Coverage
| Source | System/Tool | What It Detects | Coverage | Alert Latency |
| SIEM | [ACTION REQUIRED: tool name] | Log correlation, anomaly patterns, IOC matching | Ground segment (all systems) | Minutes |
| Network IDS/IPS | [ACTION REQUIRED: tool name] | Network intrusion, lateral movement, C2 traffic | Ground segment perimeter + internal | Real-time |
| EDR | [ACTION REQUIRED: tool name] | Host-level malware, fileless attacks, behavioral anomaly | Mission-critical workstations | Real-time |
| TT&C Monitoring | Mission control systems | Anomalous commands, unexpected spacecraft behavior, telemetry deviations | Space segment operations | Real-time |
| RF Monitoring | [ACTION REQUIRED: tool name] | Signal interference, unauthorized transmissions, jamming | Communication links | Real-time |
| Vulnerability Scanner | [ACTION REQUIRED: tool name] | Known vulnerabilities, misconfigurations | Ground segment | Daily/weekly |
| Threat Intelligence | [ACTION REQUIRED: feeds] | Known IOCs, threat advisories, sector alerts | All segments | Continuous |
| User Reports | Help desk / security hotline | Suspicious activity, phishing reports | Human layer | Event-driven |

**4.2 Detection Procedures:**
- **Automated alerting:** SIEM correlation rules, threshold-based alerts, behavioral analytics
- **Triage process:** Alert → Validation → Classification → Assignment (target: < 30 min for SEV-1/2)
- **False positive management:** Tuning process, alert fatigue mitigation, triage documentation
- **24/7 coverage:** [In-house SOC / Managed SOC / Hybrid] — staffing model and handover procedures

**4.3 Initial Identification Process:**
1. **Validation:** Confirm detected event is genuine (not false positive)
2. **Scope assessment:** Determine affected systems, data, and operations
3. **Severity classification:** Assign initial severity per Table 3.1
4. **Evidence preservation:** Begin forensic evidence collection immediately
5. **Stakeholder notification:** Internal escalation per severity level

**4.4 Detection KPIs:**

**Table 4.2:** Detection Performance Targets
| Metric | Target | Current Performance | Measurement |
| Mean time to detect (MTTD) | < 24 hours (all) / < 1 hour (SEV-1) | [ACTION REQUIRED] | SIEM/IR metrics |
| Alert triage time | < 30 min (SEV-1/2) / < 4 hours (SEV-3) | [ACTION REQUIRED] | SOC metrics |
| False positive rate | < 20% of alerts | [ACTION REQUIRED] | Monthly review |
| Coverage ratio | > 95% of critical assets monitored | [ACTION REQUIRED] | Asset audit |

Reference: NIS2 Art. 23 (proposal Art. 89(2)), NIST CSF DE.AE, DE.CM, DE.DP

---

**## SECTION: Containment & Eradication**

Generate containment and eradication procedures per NIS2 Art. 23 (proposal Art. 89(3)).

**5.1 Containment Strategy Selection:**

**Table 5.1:** Containment Approaches
| Type | Description | When Used | Mission Impact | Authorization |
| Short-term | Immediate isolation (network, host, account) | Active ongoing attack | Possible degradation | SOC Lead / CISO |
| Long-term | Sustained containment with compensating controls | Eradication preparation | Managed degradation | CISO |
| Space segment | Safe mode, command inhibit, link protection | Spacecraft threat | Mission impact | CISO + Mission Director |

**5.2 Containment Decision Matrix:**

**Table 5.2:** Containment Actions by Incident Category
| Category | Immediate Actions | Network Actions | System Actions | Authorization |
| CMD-COMP | Inhibit non-essential commands, verify command authentication | Isolate TT&C network paths | Rotate authentication credentials | Mission Director + CISO |
| GND-INTRUSION | Isolate affected hosts | Segment compromised network zone | Disable compromised accounts | CISO |
| RANSOMWARE | Isolate affected systems from network | Block lateral movement paths | Shut down non-essential services | CISO |
| DATA-BREACH | Revoke compromised access | Block exfiltration paths | Rotate compromised credentials | CISO |
| RF-INTER | Switch to backup frequencies/links | N/A | Activate anti-jam measures | Mission Director |
| SUPPLY-CHAIN | Quarantine affected component | Block supplier network access | Halt software deployments | CISO + Procurement |

**5.3 Space Segment-Specific Containment:**
- **Safe mode procedures:** Criteria and process for commanding spacecraft safe mode
- **Command channel protection:** Authentication reset, encryption key rollover procedures
- **Mission operations continuity:** Minimum essential operations during containment
- **Decision authority:** CRITICAL — any containment action that degrades spacecraft capability requires Mission Director authorization in consultation with CISO

**5.4 Eradication Procedures:**
- Malware removal, system reimaging, clean restoration
- Vulnerability patching, configuration hardening
- Credential reset (all potentially compromised accounts)
- Verification of eradication completeness (re-scanning, monitoring)
- For supply chain incidents: supplier notification, component quarantine, integrity verification

**5.5 Evidence Collection:**
- Forensic evidence collection procedures (disk images, memory captures, log preservation)
- Chain of custody documentation
- Evidence storage: encrypted, tamper-evident, legally defensible
- Integration with law enforcement if criminal activity suspected

Reference: NIS2 Art. 23 (proposal Art. 89(3)), NIST CSF RS.MI, NIST SP 800-61 Rev. 2

---

**## SECTION: Recovery**

Generate recovery procedures integrating with BCP/DR (Document B4).

**6.1 Recovery Strategy:**

**Table 6.1:** Recovery Parameters by System
| System Priority | Systems | RTO | RPO | Recovery Method | Verification |
| P1 — Mission Critical | TT&C, MCC core, command auth | < 4 hours | < 1 hour | Hot standby, failover | Functional test |
| P2 — Business Critical | Flight dynamics, mission planning, data processing | < 24 hours | < 4 hours | Warm standby, backup restore | Functional test |
| P3 — Business Support | Corporate IT, email, non-critical services | < 72 hours | < 24 hours | Cold restore from backup | Service verification |

**6.2 Recovery Phases:**
1. **System restoration:** Rebuild/restore from known-good backups or clean media
2. **Data restoration:** Recover data to RPO, verify data integrity
3. **Security validation:** Verify no residual compromise, scan restored systems, harden configurations
4. **Service validation:** Functional testing before returning to operational use
5. **Enhanced monitoring:** Elevated monitoring (30 days minimum) for recurrence
6. **Return to normal:** Formal decision and documentation to resume normal operations

**6.3 Space Segment Recovery:**
- Spacecraft software upload procedures (if onboard software compromised)
- Ground system recovery sequence and prioritization
- TT&C link re-establishment and verification
- Mission operations resumption criteria and authorization
- Coordination with SSA services during recovery

**6.4 Communication During Recovery:**
- Internal status updates to management (frequency per severity)
- Customer/user notification if services affected
- Coordination with other operators if conjunction/coordination affected
- NCA status updates (per notification timeline)

Cross-reference: Document B4 — Business Continuity & Recovery Plan (extended outage scenarios)
Reference: NIS2 Art. 21(2)(c) business continuity / ISO 27001 A.5.30 (proposal Art. 85(1)-(4)), NIST CSF RC.RP, RC.IM

---

**## SECTION: NCA Notification Procedures (NIS2 Art. 23 / proposal Art. 90-92)**

Generate detailed NCA notification procedures. THIS IS THE MOST CRITICAL SECTION FOR NCA REVIEW. Penalties for notification failures: proposal Art. 116.

**7.1 Notification Timeline Overview:**

**Table 7.1:** Mandatory NCA Notification Timeline
| Milestone | Deadline | Legal Basis | Content Summary | Recipient | Delivery |
| Early Warning | T+24 hours | NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90(1)-(3)) | Initial alert: what happened, what's affected | NCA designated contact | Secure email / NCA portal |
| Formal Notification | T+72 hours | NIS2 Art. 23(4)(b) incident notification — 72 hours (proposal Art. 91(1)-(4)) | Detailed report: scope, impact, containment | NCA + ENISA (if cross-border) | Secure email / NCA portal |
| Intermediate Update | Weekly (if ongoing) | NIS2 Art. 23(4)(b) (proposal Art. 91(4)) | Status update on ongoing incident | NCA | Secure email / NCA portal |
| Final Report | T+1 month | NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92(1)-(5)) | Comprehensive: root cause, lessons, remediation | NCA, ENISA, affected parties | Secure email / NCA portal |

**T = time of incident detection (the moment the event is confirmed as a genuine incident)**

**7.2 24-Hour Early Warning (NIS2 Art. 23(4)(a) / proposal Art. 90):**

**Trigger criteria:** Any incident classified as "significant" per Section 3.3

**Content requirements per NIS2 Art. 23(4)(a) (proposal Art. 90(1)-(3)):**

| Field | Content | Example |
| Reporting Organization | Operator name, authorization number | [ACTION REQUIRED] |
| Report Date/Time | Date and time of this notification | [timestamp] |
| Incident Reference | Unique incident identifier | [INC-YYYY-NNN] |
| Detection Date/Time | When the incident was first detected | [timestamp] |
| Initial Description | Brief factual description of what occurred | [2-3 sentences] |
| Affected Systems | Systems and services affected | [list] |
| Initial Severity | Classification per incident framework | [SEV-1/SEV-2] |
| Cross-Border Impact | Assessment of impact on other operators/Member States | [Yes/No + description] |
| Initial Actions Taken | Immediate containment measures | [summary] |
| Incident Liaison | Primary contact for NCA follow-up | [name, phone, email — 24/7] |

**Process:**
1. CISO validates incident as "significant" (< 4 hours from detection)
2. IR Lead drafts early warning using template above (< 2 hours)
3. CISO reviews and approves (< 1 hour)
4. CEO notification (parallel, informational)
5. Designated NCA contact sends notification (< 1 hour)
6. Confirmation receipt from NCA documented
7. **Total: well within 24-hour deadline**

**7.3 72-Hour Formal Notification (NIS2 Art. 23(4)(b) / proposal Art. 91):**

**Content requirements per NIS2 Art. 23(4)(b) (proposal Art. 91(1)-(4)):**

| Field | Content |
| All 24h fields | Updated from early warning |
| Technical Details | Detailed technical description of attack vector, TTPs observed |
| Scope of Impact | All affected systems, data, operations — complete assessment |
| Root Cause (Preliminary) | Initial root cause analysis (or "investigation ongoing") |
| Containment Measures | Detailed description of all containment actions taken |
| Eradication Actions | Completed or planned eradication steps |
| Impact Assessment | Operational: mission impact, service degradation. Financial: estimated cost. Data: data compromised, classification level |
| Cross-Border Assessment | Detailed assessment of impact on other operators, Member States, EU services |
| Third-Party Impact | Impact on customers, users, partners, supply chain |
| Recommendations | Recommendations for affected parties |
| Next Steps | Planned recovery and investigation actions |

**Review and approval:** CISO + Legal review before submission

**7.4 1-Month Final Report (NIS2 Art. 23(4)(e) / proposal Art. 92):**

**Content requirements per NIS2 Art. 23(4)(e) (proposal Art. 92(1)-(5)):**

| Section | Content |
| Complete Timeline | Minute-by-minute incident timeline from detection to closure |
| Root Cause Analysis | Detailed, definitive root cause (using structured methodology: 5 Whys, fault tree) |
| Full Impact Assessment | Technical, operational, financial, reputational, regulatory |
| Response Assessment | Effectiveness of detection, containment, eradication, recovery |
| Lessons Learned | What worked, what didn't, what needs improvement |
| Remediation Actions | All actions completed and remaining, with owners and timelines |
| Updated Risk Assessment | How incident findings change the risk register (Document B2) |
| Preventive Measures | Specific measures to prevent recurrence |
| Compliance Impact | Impact on overall compliance posture |
| Appendices | Technical artifacts, IOCs, forensic evidence summary |

**Quality review:** CISO + Legal + CEO review before submission

**7.5 Internal Notification Chain:**

**Table 7.2:** Internal Escalation Matrix
| Severity | Immediate Notification | < 1 Hour | < 4 Hours | < 24 Hours |
| SEV-1 | SOC → CISO, Mission Director | CEO, Legal, IR Team | Board (informational) | All affected teams |
| SEV-2 | SOC → CISO | IR Team, affected system owners | CEO (informational) | Relevant management |
| SEV-3 | SOC → IT Security Manager | CISO (informational) | — | — |
| SEV-4 | SOC log entry | — | — | — |

**7.6 Cross-Border Notification:**
- When to notify ENISA: incident affects services in other EU Member States
- When to notify other NCAs: incident affects operators authorized by other NCAs
- EU-CERT notification: when technical assistance may be needed
- EUSRN notification: per EUSRN notification procedures (NEW in EU Space Act proposal Art. 93-95 — no enacted equivalent), reference Document B7

Reference: NIS2 Art. 23 incident reporting (24h/72h/1mo) (primary enacted law), proposal Art. 89-92, proposal Art. 116 (notification failure penalties)

---

**## SECTION: Post-Incident Review**

Generate post-incident review process per NIS2 Art. 23 (proposal Art. 89(4)).

**8.1 Review Timeline:**
- SEV-1/2: Post-incident review within 2 weeks of incident closure
- SEV-3: Review within 30 days of closure
- SEV-4: Aggregated quarterly review

**8.2 Review Process:**
1. **Timeline reconstruction:** Complete incident chronology
2. **Detection assessment:** Time to detect, alert accuracy, triage effectiveness
3. **Response assessment:** Containment timeliness, eradication completeness, communication effectiveness
4. **Notification assessment:** NCA notification timeliness and accuracy
5. **Root cause analysis:** Structured methodology (5 Whys, fishbone diagram, fault tree analysis)
6. **Lessons learned:** What worked, what failed, what to improve
7. **Improvement actions:** Specific, assignable, measurable, time-bound

**8.3 Improvement Action Tracking:**

**Table 8.1:** Post-Incident Improvement Actions (Template)
| Action ID | Description | Category | Owner | Priority | Deadline | Status |
| PIR-XXX-01 | [action] | [Detection/Response/Prevention/Training/Procedure] | [owner] | [P1-P4] | [date] | [Open/In Progress/Closed] |

**8.4 Integration with Risk Assessment:**
- Update Document B2 risk register based on incident findings
- Adjust risk scores for realized threats
- Add new risks identified during incident

**8.5 NCA Feedback:**
- Process for incorporating NCA feedback on notification quality
- Documentation of NCA recommendations and implementation

Reference: NIS2 Art. 23 (proposal Art. 89(4)), NIST SP 800-61 Rev. 2 Section 3.4

---

**## SECTION: Testing & Exercises**

Generate incident response testing program per NIS2 Art. 21(2)(e) / Art. 23 (proposal Art. 89(5)).

**9.1 Exercise Program:**

**Table 9.1:** Annual Exercise Schedule
| Exercise Type | Description | Frequency | Participants | Duration |
| Tabletop | Discussion-based scenario walkthrough | Quarterly | IR team, CISO, management | 2-3 hours |
| Functional | Hands-on technical exercise with simulated incident | Semi-annually | IR team, SOC, system owners | 4-8 hours |
| Full-Scale | End-to-end exercise including NCA notification (mock) | Annually | All stakeholders, NCA liaison | Full day |
| Red Team | Adversarial simulation against live ground systems | Annually | External red team vs. blue team | 1-2 weeks |
| NCA Notification Drill | Test notification procedures and templates | Semi-annually | CISO, IR Lead, NCA contact | 1-2 hours |

**9.2 Exercise Scenarios (Space-Specific):**
- **Scenario 1: Spacecraft Command Compromise** — Detection of unauthorized commands, TT&C containment, NCA notification under NIS2 Art. 23(4)(a) (proposal Art. 90)
- **Scenario 2: Ground Station Ransomware** — MCC systems encrypted, mission operations continuity, recovery from backup
- **Scenario 3: Supply Chain Software Attack** — Malicious update from trusted supplier, investigation, supplier coordination
- **Scenario 4: Insider Threat Data Exfiltration** — Privileged user exfiltrating orbital data, investigation, legal coordination
- **Scenario 5: Multi-Vector APT Campaign** — Combined phishing + network intrusion + lateral movement + spacecraft targeting

**9.3 Exercise Evaluation:**

**Table 9.2:** Exercise Evaluation Criteria
| Metric | Target | Measurement |
| Detection time (from injection to alert) | Per Table 4.2 targets | Timestamped exercise log |
| Escalation accuracy | Correct severity within first assessment | Exercise evaluation |
| Containment effectiveness | Threat contained before lateral spread | Technical assessment |
| NCA notification timeliness | < 24 hours (simulated) | Mock notification timestamp |
| Recovery time vs. RTO | Within RTO per Table 6.1 | Timestamped exercise log |
| Communication effectiveness | All stakeholders notified per plan | Communication log review |

**9.4 After-Action Reports:**
- Required for every exercise (tabletop through full-scale)
- Content: exercise summary, findings, improvement actions, follow-up timeline
- Distribution: CISO, management, NCA (for full-scale exercises)
- [EVIDENCE: Most recent exercise after-action report]

**9.5 Improvement Integration:**
- Exercise findings feed into plan updates (this document)
- Critical findings trigger out-of-cycle plan review
- Exercise metrics tracked in quarterly IR program report

Reference: NIS2 Art. 21(2)(e) / Art. 23 (proposal Art. 89(5)), NIST CSF RS.RP, ISO/IEC 27035:2023

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix at sub-article granularity mapping enacted law (NIS2) as primary, with EU Space Act proposal references as secondary.

**Table 10.1:** Incident Response Compliance Matrix

| Req. ID | Provision | Requirement Description | Compliance Status | Plan Section | Evidence Reference | Gap / Remediation |

Map ALL of the following provisions (enacted-law-first, proposal-secondary):
- NIS2 Art. 23 incident reporting (proposal Art. 89(1)): Incident classification scheme for space-specific events — Section 3
- NIS2 Art. 23 incident reporting (proposal Art. 89(2)): Detection and monitoring capability (continuous) — Section 4
- NIS2 Art. 23 incident reporting (proposal Art. 89(3)): Containment and eradication procedures — Section 5
- NIS2 Art. 23 incident reporting (proposal Art. 89(4)): Post-incident review and lessons learned — Section 8
- NIS2 Art. 21(2)(e) / Art. 23 (proposal Art. 89(5)): Regular testing and exercises — Section 9
- NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90(1)): 24-hour early warning — trigger criteria — Section 7.2
- NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90(2)): 24-hour early warning — content requirements — Section 7.2
- NIS2 Art. 23(4)(a) early warning — 24 hours (proposal Art. 90(3)): 24-hour early warning — delivery mechanism — Section 7.2
- NIS2 Art. 23(4)(b) incident notification — 72 hours (proposal Art. 91(1)): 72-hour formal notification — content requirements — Section 7.3
- NIS2 Art. 23(4)(b) incident notification — 72 hours (proposal Art. 91(2)): 72-hour formal notification — scope assessment — Section 7.3
- NIS2 Art. 23(4)(b) incident notification — 72 hours (proposal Art. 91(3)): 72-hour formal notification — cross-border assessment — Section 7.3
- NIS2 Art. 23(4)(b) (proposal Art. 91(4)): Intermediate updates for ongoing incidents — Section 7.1
- NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92(1)): 1-month final report — complete timeline — Section 7.4
- NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92(2)): 1-month final report — root cause analysis — Section 7.4
- NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92(3)): 1-month final report — full impact assessment — Section 7.4
- NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92(4)): 1-month final report — lessons learned and remediation — Section 7.4
- NIS2 Art. 23(4)(e) final report — 1 month (proposal Art. 92(5)): 1-month final report — preventive measures — Section 7.4
- NIST CSF RS.RP: Response Planning — Section 3-7
- NIST CSF RS.CO: Response Communications — Section 7
- NIST CSF RS.AN: Response Analysis — Section 4, 8
- NIST CSF RS.MI: Response Mitigation — Section 5
- NIST CSF RC.RP: Recovery Planning — Section 6
- NIS2 Art. 23: Incident reporting obligations (primary enacted law) — Section 7
- ISO/IEC 27035:2023: Incident management process — Sections 3-9

### Cross-References
- Document B1 — Cybersecurity Policy: governance framework establishing incident response obligations
- Document B2 — Cybersecurity Risk Assessment: risk scenarios (R-01 through R-15) informing IR planning
- Document B4 — Business Continuity & Recovery Plan: extended outage recovery (Section 6 handover)
- Document B5 — Access Control & Authentication Policy: access-related incident procedures
- Document B7 — EUSRN Notification Procedures: space-resilience-specific notification chain (EUSRN notification procedures — NEW in EU Space Act proposal Art. 93-95, no enacted equivalent)
- Document B8 — Compliance Verification Matrix: consolidated NIS2 Art. 21/23 / ISO 27001 (proposal Art. 74-95) compliance summary

### Key Standards
- NIS2 Directive (EU 2022/2555) Art. 23 — Incident Reporting (primary enacted law)
- ISO/IEC 27035:2023 — Information Security Incident Management
- NIST SP 800-61 Rev. 2 — Computer Security Incident Handling Guide
- NIST Cybersecurity Framework (CSF) 2.0 — Respond and Recover functions
- EU Space Act COM(2025) 335, Art. 89(1)-(5), Art. 90(1)-(3), Art. 91(1)-(4), Art. 92(1)-(5), Art. 116 (proposal)
- CCSDS 350.1-G-3 (2022) — Security Threats Against Space Missions
- ENISA Incident Reporting Guidelines
- IEC 62443-4-2 — Security for industrial automation (ground segment SCADA/ICS incident handling)`;
}
