/**
 * Generate 2.0 — B1: Cybersecurity Policy Template
 *
 * P0 document. Organization-wide cybersecurity policy required under
 * EU Space Act Art. 74. Establishes the governance framework for all
 * other cybersecurity documents in the NCA submission package.
 */

export function getCyberPolicyTemplate(): string {
  return `## Document-Specific Instructions: B1 — Cybersecurity Policy

This is the foundational cybersecurity document in the NCA submission package. It establishes the organization-wide cybersecurity governance framework required under EU Space Act Art. 74. NCAs evaluate this document to determine whether the operator has a mature, comprehensive, and enforceable security posture covering both space and ground segments. All other cybersecurity documents (B2-B8) derive their authority from this policy.

### Required Sections

Generate the following 9 sections. Each section must contain the specified content.

---

**## SECTION: Cover Page & Document Control**

Generate a formal cover page including:
- Document title: "Cybersecurity Policy"
- Document code: B1-CSP
- Operator name, document version, date
- Classification level (typically "Confidential — NCA Submission")
- Policy effective date and next review date
- Revision history table: Version | Date | Author | Description of Changes
- Document approval table: Role | Name | Signature | Date (must include C-suite / Board approval)
- Distribution list

---

**## SECTION: Executive Summary**

Generate a 1-2 page executive summary covering:
- Purpose: establish the organization's cybersecurity governance framework as required by Art. 74 of the EU Space Act
- Scope: all space and ground segment systems, operations, and personnel
- Regulatory context: EU Space Act Art. 74-95 cybersecurity requirements, NIS2 Directive applicability, NIST CSF alignment
- Policy governance: approval authority, review cycle, enforcement mechanisms
- Key policy commitments: confidentiality, integrity, availability of space operations
- Summary of organization's current security posture and maturity level
- Reference to supporting documents: B2 (Risk Assessment), B3 (Incident Response), B4 (BCP), B5 (Access Control)

---

**## SECTION: Policy Scope**

Generate comprehensive scope definition:
- Organizational scope: which entities, business units, and subsidiaries are covered
- System scope — define the security perimeter:
  | Segment | Systems Covered | Criticality |
  Segments to include:
  - **Space segment:** spacecraft bus, payload, onboard software, inter-satellite links
  - **Ground segment:** mission control center(s), ground stations, telemetry/telecommand systems
  - **User segment:** data distribution, user terminals, application servers
  - **Launch segment:** launch site interfaces, pre-launch operations (if applicable)
  - **Communication links:** TT&C uplink/downlink, payload data links, inter-satellite links
  - **Corporate IT:** enterprise systems supporting space operations
  - **Supply chain:** critical suppliers and their interfaces
- Personnel scope: all employees, contractors, third parties with access to covered systems
- Geographic scope: all locations where space operations are conducted or supported
- Exclusions: any systems or operations explicitly excluded, with justification
- Reference Art. 74(1) scope requirements and Art. 77 asset identification obligations

---

**## SECTION: Roles & Responsibilities**

Generate organizational security governance structure:
- Security governance hierarchy:
  | Role | Responsibilities | Authority Level |
  Roles to define:
  - **Board of Directors / Executive Management:** ultimate accountability for cybersecurity, policy approval, resource allocation
  - **Chief Information Security Officer (CISO):** policy ownership, security program management, NCA liaison
  - **Mission Security Officer:** space segment security oversight, mission-specific risk acceptance
  - **Security Operations Team:** day-to-day monitoring, incident detection, vulnerability management
  - **System Administrators:** implementation of security controls on specific systems
  - **All Personnel:** compliance with policy, incident reporting, security awareness
  - **Third Parties / Suppliers:** contractual security obligations (reference Document B6)
- Reporting lines: security reporting chain from operations to board level
- Decision authority matrix: who can authorize risk acceptance, security exceptions, incident escalation
- Segregation of duties: critical functions requiring multi-person authorization
- Competency requirements: minimum qualifications and certifications for security roles
- Training requirements by role (reference Art. 74 competency obligations)
- NCA reporting chain: designated contacts for NCA security inquiries and incident notification

---

**## SECTION: Security Objectives**

Generate security objectives aligned with Art. 74:
- Primary security objectives table:
  | Objective | Description | Applicable Standard | Priority |
  Objectives to define:
  - **Confidentiality:** protect sensitive operational data, TT&C commands, payload data from unauthorized disclosure
  - **Integrity:** ensure commands, telemetry, and control data cannot be tampered with
  - **Availability:** maintain continuous operational capability of space and ground systems per mission requirements
  - **Authenticity:** verify the identity of all entities interacting with space systems
  - **Non-repudiation:** ensure critical actions (commands, data transmissions) are attributable
  - **Resilience:** ability to continue operations during and recover from security incidents
- Security objectives mapped to NIST CSF 2.0 functions:
  | NIST CSF Function | Organization Objective | Art. Reference |
  - Identify (ID): asset management, risk assessment — Art. 77
  - Protect (PR): access control, data security, training — Art. 79, 74
  - Detect (DE): anomaly detection, continuous monitoring — Art. 85
  - Respond (RS): incident response, reporting — Art. 89-92
  - Recover (RC): recovery planning, continuity — Art. 85
- Key performance indicators (KPIs) for measuring security objective achievement
- Risk appetite statement: organization's tolerance for residual security risk in space operations

---

**## SECTION: Information Classification**

Generate information classification scheme:
- Classification levels table:
  | Level | Definition | Examples | Handling Requirements |
  Recommended levels for space operators:
  - **TOP SECRET / MISSION CRITICAL:** TT&C encryption keys, command authentication codes, spacecraft control credentials — strictest access controls, hardware security modules
  - **CONFIDENTIAL:** orbital parameters, conjunction data, vulnerability assessments, incident details — need-to-know access, encrypted storage and transmission
  - **INTERNAL:** operational procedures, training materials, non-sensitive technical documentation — organizational access, standard protection
  - **PUBLIC:** published orbital elements, press releases, general mission descriptions — no restrictions
- Labeling requirements: how documents and data are marked with their classification
- Handling procedures for each level:
  - Storage (at rest encryption requirements)
  - Transmission (in transit encryption requirements)
  - Processing (secure environment requirements)
  - Disposal (secure deletion/destruction requirements)
- Declassification criteria and procedures
- Classification authority: who assigns and can change classifications
- Mapping to regulatory requirements: Art. 74 data protection obligations
- Alignment with national classification schemes where applicable

---

**## SECTION: Acceptable Use**

Generate acceptable use requirements:
- General principles: authorized use of organizational systems for space operations
- Specific use policies:
  - **Space segment access:** who can send commands, under what conditions, with what authentication
  - **Ground segment access:** physical and logical access to mission control, ground stations
  - **Remote access:** VPN, secure remote operations, conditions for remote commanding
  - **Personal devices:** BYOD policy for personnel involved in space operations
  - **Internet and email:** use policies for systems connected to space operations networks
  - **Removable media:** USB, external storage restrictions in secure areas
  - **Software installation:** authorized software, change management requirements
  - **Social media:** restrictions on disclosing operational information
- Prohibited activities:
  - Unauthorized access attempts to any space or ground system
  - Sharing of credentials or authentication tokens
  - Connection of unapproved devices to operational networks
  - Bypassing security controls without authorized exception
- Monitoring notice: statement that organizational systems are monitored for security purposes
- Violation consequences: disciplinary actions for policy violations
- Reference Art. 79 access control and Art. 74 general security obligations

---

**## SECTION: Policy Governance**

Generate policy governance framework:
- Policy lifecycle:
  | Phase | Activity | Frequency | Responsible |
  - **Creation:** initial policy development and stakeholder consultation
  - **Approval:** board/executive approval process
  - **Communication:** distribution to all personnel, acknowledgment tracking
  - **Implementation:** translation into procedures, controls, and configurations
  - **Review:** periodic review and update (NCA expectation: at least annually, or after significant changes)
  - **Retirement:** obsolescence and replacement process
- Triggers for out-of-cycle policy review:
  - Significant security incident
  - Regulatory change (EU Space Act amendments, NIS2 updates)
  - Organizational restructuring
  - New mission or spacecraft launch
  - Results of security audits or assessments
  - Changes in threat landscape
- Exception management:
  - Process for requesting policy exceptions
  - Exception approval authority
  - Exception documentation and tracking
  - Time-limited exceptions with mandatory review
- Related documents hierarchy: how this policy relates to standards, procedures, guidelines, and work instructions
- Compliance monitoring: how adherence to this policy is measured and reported
- Audit requirements: internal and external security audit schedule
- NCA engagement: process for submitting policy updates to the NCA and obtaining approval

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix mapping to Art. 74-95 high-level requirements:
| Article | Requirement | Policy Section | Implementation Status | Evidence Reference |

Articles to map:
- Art. 74: Cybersecurity policy requirement (this document)
- Art. 77: Risk assessment obligation (reference Document B2)
- Art. 78: Supply chain security (reference Document B6)
- Art. 79: Access control measures (reference Document B5)
- Art. 85: Business continuity (reference Document B4)
- Art. 89: Incident detection and response (reference Document B3)
- Art. 90: 24-hour early warning notification
- Art. 91: 72-hour incident notification
- Art. 92: 1-month final incident report
- Art. 93-95: EUSRN notification procedures (reference Document B7)

Also map to:
- NIST CSF 2.0 core functions (Identify, Protect, Detect, Respond, Recover)
- ISO/IEC 27001:2022 Annex A controls (high-level mapping)
- NIS2 Directive Art. 21(2) measures (if applicable)

### Cross-References
- Document B2 — Cybersecurity Risk Assessment: implements risk assessment required by this policy
- Document B3 — Incident Response Plan: implements incident management required by this policy
- Document B4 — Business Continuity & Recovery Plan: implements continuity planning required by this policy
- Document B5 — Access Control & Authentication Policy: implements access control required by this policy
- Document B6 — Supply Chain Security Plan: implements supply chain security required by this policy
- Document B7 — EUSRN Notification Procedures: implements notification procedures required by this policy
- Document B8 — Compliance Verification Matrix: consolidated compliance mapping

### Key Standards
- EU Space Act COM(2025) 335, Art. 74-95
- NIST Cybersecurity Framework (CSF) 2.0
- ISO/IEC 27001:2022 — Information Security Management Systems
- NIS2 Directive (EU 2022/2555) Art. 21
- CCSDS 350.1-G-3 — Security Threats Against Space Missions
- ECSS-E-ST-40C — Software Engineering for Space Systems`;
}
