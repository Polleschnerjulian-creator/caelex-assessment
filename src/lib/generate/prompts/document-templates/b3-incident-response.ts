/**
 * Generate 2.0 — B3: Incident Response Plan Template
 *
 * P0 document. Comprehensive incident response plan including the
 * 24h/72h/1mo notification timeline per EU Space Act Art. 89-92.
 */

export function getIncidentResponseTemplate(): string {
  return `## Document-Specific Instructions: B3 — Incident Response Plan

This document details the organization's incident response capability for cybersecurity incidents affecting space operations, as required under EU Space Act Art. 89-92. NCAs place particular emphasis on the notification timeline (24-hour early warning, 72-hour formal notification, 1-month final report) and the organization's ability to detect, contain, and recover from incidents while maintaining mission operations. This document implements the incident management obligations established in the Cybersecurity Policy (Document B1) and is informed by the Risk Assessment (Document B2).

### Required Sections

Generate the following 10 sections. Each section must contain the specified content.

---

**## SECTION: Cover Page & Document Control**

Generate a formal cover page including:
- Document title: "Incident Response Plan"
- Document code: B3-IRP
- Operator name, document version, date
- Classification level (typically "Confidential — NCA Submission")
- Plan effective date, next review date, and last test date
- Revision history table: Version | Date | Author | Description of Changes
- Document approval table: Role | Name | Signature | Date
- Emergency contact list: key incident response personnel with 24/7 contact details
- Distribution list

---

**## SECTION: Executive Summary**

Generate a 1-2 page executive summary covering:
- Purpose: establish comprehensive incident response capability per Art. 89-92 of the EU Space Act
- Scope: all cybersecurity incidents affecting space segment, ground segment, communication links, and supporting systems
- Key capabilities: detection, classification, containment, eradication, recovery, and notification
- Notification timeline overview: 24h early warning to NCA, 72h formal notification, 1-month final report
- Current readiness level: incident response team status, tools, and testing cadence
- Alignment with NIST CSF Respond (RS) and Recover (RC) functions
- Reference to Cybersecurity Policy (Document B1) and Risk Assessment (Document B2)
- Reference to BCP (Document B4) for business continuity during extended incidents

---

**## SECTION: Incident Classification**

Generate incident classification framework:
- Incident severity levels:
  | Severity | Name | Definition | Response Time | Notification Required |
  | SEV-1 | Critical | Loss of spacecraft control, mission compromise, data breach of classified information | Immediate (< 15 min) | Yes — 24h NCA notification per Art. 90 |
  | SEV-2 | High | Degraded spacecraft operations, ground system compromise, significant unauthorized access | < 1 hour | Yes — 24h NCA notification per Art. 90 |
  | SEV-3 | Medium | Attempted intrusion detected and contained, malware on non-critical systems, policy violation | < 4 hours | Assess — may require notification depending on impact |
  | SEV-4 | Low | Minor security event, failed access attempt, routine anomaly | < 24 hours | No — log and monitor |

- Incident categories specific to space operations:
  | Category | Description | Examples | Typical Severity |
  Categories to include:
  - **Command channel compromise:** unauthorized access to TT&C uplink, command injection, authentication bypass
  - **Telemetry manipulation:** spoofed or corrupted telemetry data, data integrity violation
  - **Signal interference:** jamming, spoofing, or denial of RF links
  - **Ground system intrusion:** network breach, lateral movement, privilege escalation in MCC
  - **Ransomware / destructive malware:** encryption or destruction of ground system data
  - **Data breach:** unauthorized access to sensitive operational data, orbital parameters, encryption keys
  - **Supply chain compromise:** malicious update from supplier, compromised third-party component
  - **Insider threat:** malicious or negligent action by authorized personnel
  - **Physical security breach:** unauthorized access to ground facilities
  - **Denial of service:** DDoS against ground infrastructure, service disruption

- Escalation criteria: when to escalate from one severity level to another
- NCA notification trigger criteria per Art. 89: definition of a "significant incident" requiring notification
- Reference Art. 89(1) incident classification requirements

---

**## SECTION: Detection & Identification**

Generate detection capability description:
- Detection sources and monitoring:
  | Source | System | What It Detects | Coverage |
  Sources to include:
  - **SIEM (Security Information and Event Management):** log correlation, anomaly detection across ground systems
  - **Network IDS/IPS:** network-level intrusion detection at ground segment perimeters
  - **Endpoint Detection & Response (EDR):** host-level monitoring on mission-critical workstations
  - **TT&C monitoring:** anomalous command patterns, unexpected spacecraft behavior, telemetry deviations
  - **RF monitoring:** signal interference detection, unauthorized transmissions
  - **Application monitoring:** anomalous user behavior, unauthorized data access
  - **Threat intelligence feeds:** known indicators of compromise (IOCs), threat advisories
  - **User reports:** personnel reporting suspicious activity

- Detection procedures:
  - Automated alerting thresholds and criteria
  - Triage process: initial alert assessment and validation
  - False positive handling and tuning
  - 24/7 monitoring capability (in-house SOC, managed SOC, or hybrid)
- Initial identification:
  - Incident validation: confirming that a detected event is a genuine incident
  - Scope assessment: initial determination of affected systems and data
  - Impact assessment: initial severity classification
  - Evidence preservation: initial steps to preserve forensic evidence
- Reference Art. 89(2) detection capability requirements and NIST CSF DE (Detect) function

---

**## SECTION: Containment & Eradication**

Generate containment and eradication procedures:
- Containment strategy selection:
  | Containment Type | Description | When Used | Considerations |
  Types to include:
  - **Short-term containment:** immediate actions to stop the spread (isolate affected system, block IP, disable account)
  - **Long-term containment:** sustained containment while eradication is prepared (network segmentation, temporary controls)
  - **Space segment containment:** procedures for spacecraft anomalies (safe mode, command inhibit, ground-commanded isolation)

- Containment decision matrix:
  | Incident Type | Containment Actions | Mission Impact | Authorization Required |
  For each incident category defined above, specify containment actions

- Space segment-specific containment:
  - Spacecraft safe mode procedures: when and how to command safe mode
  - Command channel protection: authentication reset, encryption key rollover
  - Mission operations continuity during containment
  - Decision criteria: when containment actions may impact mission operations
  - Authorization for containment actions that degrade mission capability

- Eradication procedures:
  - Malware removal and system cleaning
  - Vulnerability patching and configuration hardening
  - Credential reset and access review
  - Verification of eradication completeness
  - For supply chain incidents: supplier notification and component quarantine
- Evidence collection and chain of custody throughout containment and eradication
- Reference Art. 89(3) containment requirements

---

**## SECTION: Recovery**

Generate recovery procedures:
- Recovery strategy by incident type:
  | Incident Type | Recovery Procedure | RTO | RPO | Verification Steps |
  RTO = Recovery Time Objective, RPO = Recovery Point Objective

- Recovery phases:
  1. **System restoration:** rebuild or restore from known-good backups
  2. **Data restoration:** recover data to last known-good state
  3. **Service validation:** verify system functionality and security before returning to operations
  4. **Monitoring enhancement:** elevated monitoring during and after recovery
  5. **Return to normal operations:** formal decision to resume normal operations

- Space segment recovery considerations:
  - Spacecraft software upload procedures (if onboard software is compromised)
  - Ground system recovery sequence and priorities
  - TT&C link re-establishment procedures
  - Mission operations resumption criteria
  - Coordination with other operators and SSA services during recovery

- Recovery prioritization: order of system restoration based on mission criticality
- Backup and restore procedures: backup locations, restore procedures, tested restore times
- Communication during recovery: internal and external communication plan
- Cross-reference Document B4 (Business Continuity & Recovery Plan) for extended outage scenarios
- Reference NIST CSF RC (Recover) function

---

**## SECTION: Notification (24h / 72h / 1mo per Art. 89-92)**

Generate detailed NCA notification procedures. This is the most critical section for NCA review.

- **Notification timeline** (mandatory under Art. 89-92):
  | Milestone | Deadline | Requirement | Content | Recipient |
  | Early Warning | T+24 hours | Art. 90 | Initial alert that a significant incident has occurred | NCA designated contact |
  | Formal Notification | T+72 hours | Art. 91 | Detailed incident report with scope, impact, and containment measures | NCA and ENISA (if cross-border) |
  | Final Report | T+1 month | Art. 92 | Comprehensive post-incident report with root cause, lessons learned, and remediation | NCA, ENISA, affected parties |

- **24-Hour Early Warning (Art. 90):**
  - Trigger criteria: what constitutes a "significant incident" requiring notification
  - Content requirements:
    - Date and time of detection
    - Brief description of the incident
    - Systems and services affected
    - Initial severity assessment
    - Cross-border impact assessment (triggers ENISA notification)
    - Contact details for incident liaison
  - Delivery mechanism: secure email, NCA portal, encrypted channel
  - Template: include a notification template or reference to appendix
  - Responsibility: who prepares and sends the early warning
  - Approval: who approves the notification before sending

- **72-Hour Formal Notification (Art. 91):**
  - Content requirements:
    - Updated description with technical details
    - Scope of impact: affected systems, data, operations
    - Root cause analysis (preliminary if investigation ongoing)
    - Containment measures taken
    - Eradication actions completed or planned
    - Impact on space operations and services
    - Cross-border and third-party impact assessment
    - Recommendations for affected parties
  - Template: include a formal notification template
  - Review and approval process before submission

- **1-Month Final Report (Art. 92):**
  - Content requirements:
    - Complete incident timeline
    - Detailed root cause analysis
    - Full scope of impact (technical, operational, financial, reputational)
    - Comprehensive response actions taken
    - Lessons learned and improvement recommendations
    - Remediation actions completed and remaining
    - Updated risk assessment reflecting incident findings
    - Preventive measures to avoid recurrence
  - Template: include a final report template
  - Quality review process before submission

- **Internal notification procedures:**
  - Internal escalation chain by severity level
  - Board / executive notification criteria
  - Legal counsel notification criteria
  - Public communications / media handling (if applicable)
  - Customer / user notification (if data breach affecting third parties)

- Cross-border notification: when to notify ENISA, other EU Member State NCAs, and EU CERT
- Reference Art. 89-92 in full, NIS2 Directive Art. 23 for cross-reference

---

**## SECTION: Post-Incident Review**

Generate post-incident review process:
- Review timeline: when post-incident review occurs (typically within 2 weeks of incident closure)
- Review participants: incident response team, affected system owners, management, external parties if relevant
- Review agenda:
  1. Incident timeline reconstruction
  2. Detection effectiveness: how quickly was the incident detected?
  3. Response effectiveness: were containment and eradication timely and complete?
  4. Communication effectiveness: were notifications timely and accurate?
  5. Root cause analysis (using structured methodology: 5 Whys, fishbone diagram, fault tree)
  6. Lessons learned identification
  7. Improvement actions definition
- Improvement action tracking:
  | Action ID | Description | Owner | Priority | Deadline | Status |
- Categories of improvements:
  - Detection capability enhancements
  - Response procedure updates
  - Training and awareness gaps
  - Technical control improvements
  - Policy and procedure updates
  - Communication process improvements
- Integration with risk assessment: update Document B2 risk register based on incident findings
- NCA feedback incorporation: how NCA feedback on notification is addressed
- Knowledge base: how incident data is stored for future reference
- Reference Art. 92 final report and improvement requirements

---

**## SECTION: Testing & Exercises**

Generate incident response testing program:
- Exercise types and frequency:
  | Exercise Type | Description | Frequency | Participants |
  | Tabletop Exercise | Discussion-based scenario walkthrough | Quarterly | IR team, management |
  | Functional Exercise | Hands-on technical exercise with simulated incident | Semi-annually | IR team, SOC |
  | Full-Scale Exercise | End-to-end exercise including NCA notification | Annually | All stakeholders |
  | Red Team Exercise | Adversarial simulation against live systems | Annually (if applicable) | External red team |

- Exercise scenarios specific to space operations:
  - Spacecraft command channel compromise
  - Ground station ransomware attack
  - Supply chain software supply attack
  - Insider threat exfiltrating orbital data
  - Multi-vector attack combining physical and cyber
- Exercise evaluation criteria:
  - Detection time
  - Escalation accuracy and timeliness
  - Containment effectiveness
  - NCA notification timeliness and accuracy
  - Recovery time vs. RTO
  - Communication effectiveness
- After-action report requirements for each exercise
- Improvement tracking: how exercise findings drive plan updates
- NCA requirements: demonstrating regular testing to the NCA as part of supervision
- Reference Art. 89 preparedness requirements and NIS2 Art. 21(2)(e) on testing

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix for Art. 89-92:
| Requirement | Article Reference | Plan Section | Implementation Status | Evidence Reference |

Requirements to map:
- Art. 89(1): Incident classification and detection capability
- Art. 89(2): Monitoring and detection systems
- Art. 89(3): Containment and eradication procedures
- Art. 90: 24-hour early warning notification to NCA
- Art. 91: 72-hour formal incident notification
- Art. 92: 1-month final incident report
- Art. 89(4): Post-incident review and improvement
- Art. 89(5): Regular testing and exercises
- NIST CSF RS.RP: Response Planning
- NIST CSF RS.CO: Response Communications
- NIST CSF RS.AN: Response Analysis
- NIST CSF RS.MI: Response Mitigation
- NIST CSF RC.RP: Recovery Planning
- NIS2 Art. 23: Incident reporting obligations (cross-reference)

### Cross-References
- Document B1 — Cybersecurity Policy: governance framework establishing incident response obligations
- Document B2 — Cybersecurity Risk Assessment: risk scenarios that inform incident response planning
- Document B4 — Business Continuity & Recovery Plan: extended outage recovery procedures
- Document B5 — Access Control & Authentication Policy: access-related incident procedures
- Document B7 — EUSRN Notification Procedures: space-resilience-specific notification chain
- Document B8 — Compliance Verification Matrix: consolidated compliance mapping

### Key Standards
- EU Space Act COM(2025) 335, Art. 89-92
- NIST SP 800-61 Rev. 2 — Computer Security Incident Handling Guide
- NIST Cybersecurity Framework (CSF) 2.0 — Respond and Recover functions
- ISO/IEC 27035:2023 — Information Security Incident Management
- CCSDS 350.1-G-3 — Security Threats Against Space Missions
- NIS2 Directive (EU 2022/2555) Art. 23 — Incident Reporting
- ENISA Incident Reporting Guidelines`;
}
