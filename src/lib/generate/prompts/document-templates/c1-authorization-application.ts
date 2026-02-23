/**
 * Generate 2.0 — C1: Authorization Application Package Template
 *
 * P0 document. The master submission document that consolidates all compliance
 * areas into a single NCA-ready authorization application per EU Space Act Art. 4-12.
 * This is the most critical document — it ties together debris, cybersecurity,
 * environmental, insurance, and NIS2 compliance into one coherent package.
 */

export function getAuthorizationApplicationTemplate(): string {
  return `## Document-Specific Instructions: C1 — Authorization Application Package

This is the master NCA authorization submission document. It must consolidate ALL compliance areas into a single, submission-ready package per EU Space Act Art. 4-12. NCAs treat this as the PRIMARY document for evaluating an operator's overall regulatory readiness. All A-series (debris), B-series (cybersecurity), and other C-series documents support this master application.

The package must be sufficiently comprehensive for an NCA to initiate formal review without requiring additional information requests, while maintaining clear cross-references to all supporting documents.

### Required Sections

Generate the following 7 sections. Each section must contain comprehensive, substantive content as specified below. Do NOT produce summaries — produce full professional analysis for each section.

---

**## SECTION: Cover Letter**

Generate a formal cover letter addressed to the relevant National Competent Authority. Include:
- Formal letterhead format with operator name, registration details, and contact information
- Subject line: "Application for Authorization under EU Space Act (COM(2025) 335)"
- Reference to Art. 4(1) authorization requirement
- Brief description of the space activity requiring authorization
- List of enclosed documents with document codes (A1-A8, B1-B8, C1-C3)
- Named authorized representative with title, signature block, and date
- Request for acknowledgement of receipt and estimated review timeline
- Reference to any prior correspondence or pre-application consultations

---

**## SECTION: Operator Profile**

Generate a comprehensive operator profile. Include:
- **Legal Entity Information:** Full legal name, registration number, registered address, legal form (e.g., GmbH, SA, Ltd), date of incorporation
- **Organizational Structure:** Parent company (if applicable), subsidiaries, ownership structure, EU establishment status per Art. 2(1)
- **Technical Capabilities:** Space operations experience, heritage missions, ground segment capabilities, flight operations center
- **Key Personnel:** CEO/Managing Director, CTO, Chief Safety Officer, Compliance Officer, with qualifications summary
- **Financial Standing:** Summary of financial capacity to meet obligations under Art. 47-50 (insurance), without disclosing exact figures — reference Insurance Compliance Report (C3)
- **Regulatory History:** Previous authorizations, licenses, NCA interactions, compliance track record
- **Quality Management:** ISO 9001, ECSS standards compliance, quality assurance framework

---

**## SECTION: Mission Description**

Generate a comprehensive mission overview. Include:
- **Mission Objectives:** Primary and secondary mission objectives, scientific or commercial purpose
- **Orbital Parameters:** Target orbit (LEO/MEO/GEO/HEO), altitude, inclination, RAAN, eccentricity
- **Spacecraft Description:** Bus platform, payload instruments, mass, dimensions, power system, propulsion capability, design lifetime
- **Constellation Details:** (if applicable) Number of spacecraft, orbital planes, spacing, phasing, spare strategy
- **Launch Segment:** Launch vehicle, launch site, target launch window, shared/dedicated launch, launch service provider
- **Ground Segment:** Ground stations, mission control center, data processing facilities, redundancy
- **Operations Concept:** Commissioning phase, nominal operations, contingency modes, end-of-life
- **Mission Timeline:** Key milestones from launch to decommissioning with target dates
- **Frequency Coordination:** ITU filings, frequency bands, coordination status

Cross-reference: A1 (DMP) for debris mitigation parameters, A2 (Orbital Lifetime) for decay analysis.

---

**## SECTION: Compliance Summary**

Generate a module-by-module compliance status overview. For EACH compliance area, provide:

1. **Debris Mitigation (Art. 58-73):**
   - Overall compliance status and score
   - 25-year rule compliance per Art. 72
   - Collision avoidance capability per Art. 64
   - Passivation readiness per Art. 67(1)(d)
   - End-of-life disposal strategy per Art. 72(1)
   - Cross-reference: Documents A1-A8

2. **Cybersecurity (Art. 74-95):**
   - Overall maturity score and compliance status
   - Security policy and governance per Art. 74
   - Risk assessment status per Art. 77-78
   - Incident response readiness per Art. 89-92
   - NIS2 Directive alignment
   - Cross-reference: Documents B1-B8

3. **Environmental (Art. 44-46):**
   - EFD grade and compliance status
   - Lifecycle assessment completion
   - Key environmental impact metrics (GWP, ODP)
   - Mitigation measures
   - Cross-reference: Document C2

4. **Insurance (Art. 47-50):**
   - TPL calculation and coverage status
   - Required vs. actual coverage
   - Jurisdiction-specific requirements
   - Coverage gap summary
   - Cross-reference: Document C3

5. **NIS2 Directive:**
   - Entity classification (essential/important/out-of-scope)
   - Compliance status with Art. 21 measures
   - Incident notification readiness (24h/72h/1mo)

For each area, use a clear status indicator: Compliant / Substantially Compliant / Partially Compliant / Non-Compliant / Not Yet Assessed.

---

**## SECTION: Authorization Checklist (Art. 7)**

Generate a pre-authorization checklist based on Art. 7 requirements. Structure as a verification table:

| Req. ID | Requirement | Status | Evidence Reference | Notes |
|---------|------------|--------|-------------------|-------|

Cover ALL authorization prerequisites including:
- Art. 4: Authorization requirement and scope confirmation
- Art. 5: Application completeness check
- Art. 6: Technical competence demonstration
- Art. 7: Pre-authorization conditions (each sub-paragraph)
- Art. 8: Financial guarantees and insurance
- Art. 9: Safety assessment
- Art. 10: Light regime eligibility assessment (if applicable)
- Art. 11: Authorization conditions and obligations
- Art. 12: Ongoing reporting obligations

Use status values: Complete / In Progress / Not Started / Not Applicable.

Include [ACTION REQUIRED] markers for any incomplete items with specific descriptions of what is needed.

---

**## SECTION: Supporting Documents Index**

Generate a catalogued index of ALL supporting documents in the NCA submission package:

| Doc Code | Document Title | Version | Date | Status | Relevant Articles |
|----------|---------------|---------|------|--------|------------------|

Include all A-series (A1-A8), B-series (B1-B8), and C-series (C1-C3) documents.
For each document, indicate: Available / In Preparation / Not Applicable.
Cross-reference each document to the specific EU Space Act articles it addresses.
Note any supplementary documents (ISO certificates, third-party audit reports, insurance certificates).

---

**## SECTION: Certification Statement**

Generate a formal certification statement. Include:
- Declaration by the authorized representative certifying the accuracy and completeness of all information
- Acknowledgement of obligations under Art. 11 (authorization conditions)
- Commitment to notify NCA of material changes per Art. 12
- Statement of compliance with applicable articles at sub-article granularity
- Named signatory with title, organization, date, and signature block
- Legal disclaimer regarding ongoing obligation to maintain compliance
- Statement that all supporting documents are current as of the submission date

### Key Requirements
- Reference Art. 4-12 at sub-article granularity throughout
- Cross-reference ALL A-series, B-series, and C-series documents using format: "See Document [Code] — [Title], Section [X.Y]"
- Include [ACTION REQUIRED: specific description] markers for all missing operator data
- Include [EVIDENCE: specific description] markers for all claims requiring supporting documentation
- Use formal, professional third-person language ("The Operator shall...")
- Use definitive compliance language ("shall", "will", "is required to") — never hedging language`;
}
