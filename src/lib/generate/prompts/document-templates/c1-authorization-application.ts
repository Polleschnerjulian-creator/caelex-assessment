/**
 * Generate 2.0 — C1: Authorization Application Package Template
 *
 * P0 document. The master submission document that consolidates all compliance
 * areas into a single NCA-ready authorization application under the applicable
 * national space law authorization framework (primary), enacted international
 * standards (secondary), and EU Space Act (COM(2025) 335) (tertiary/anticipated).
 *
 * Hierarchy: National law first → enacted standards (IADC, ISO, NIS2) → EU Space Act.
 */

export function getAuthorizationApplicationTemplate(): string {
  return `## Document-Specific Instructions: C1 — Authorization Application Package

This is the master NCA authorization submission document. It must consolidate ALL compliance areas into a single, submission-ready package under the operator's **national space law authorization requirements** (e.g., LOS Art. 2-4 for France, SIA 2018 s.3-8 for UK, WeltraumG §3-6 for Germany). The EU Space Act (COM(2025) 335) is referenced as an anticipated harmonization framework but is NOT yet enacted law — national provisions are the binding primary source.

NCAs treat this as the PRIMARY document for evaluating an operator's overall regulatory readiness. All A-series (debris), B-series (cybersecurity), and other C-series documents support this master application.

The package must be sufficiently comprehensive for an NCA to initiate formal review without requiring additional information requests, while maintaining clear cross-references to all supporting documents.

### Required Sections

Generate the following 7 sections. Each section must contain comprehensive, substantive content as specified below. Do NOT produce summaries — produce full professional analysis for each section.

---

**## SECTION: Cover Letter**

Generate a formal cover letter addressed to the relevant National Competent Authority. Include:
- Formal letterhead format with operator name, registration details, and contact information
- Subject line: "Application for Authorization under [applicable national space law]" — e.g., "Loi relative aux Opérations Spatiales (LOS)" for France, "Space Industry Act 2018" for UK, "Weltraumgesetz" for Germany. Note alignment with anticipated EU Space Act (COM(2025) 335).
- Reference to the national authorization requirement (e.g., LOS Art. 2 for France, SIA 2018 s.3 for UK)
- Brief description of the space activity requiring authorization
- List of enclosed documents with document codes (A1-A8, B1-B8, C1-C3)
- Named authorized representative with title, signature block, and date
- Request for acknowledgement of receipt and estimated review timeline
- Reference to any prior correspondence or pre-application consultations

---

**## SECTION: Operator Profile**

Generate a comprehensive operator profile. Include:
- **Legal Entity Information:** Full legal name, registration number, registered address, legal form (e.g., GmbH, SA, Ltd), date of incorporation
- **Organizational Structure:** Parent company (if applicable), subsidiaries, ownership structure, EU establishment status
- **Technical Capabilities:** Space operations experience, heritage missions, ground segment capabilities, flight operations center
- **Key Personnel:** CEO/Managing Director, CTO, Chief Safety Officer, Compliance Officer, with qualifications summary
- **Financial Standing:** Summary of financial capacity to meet national TPL/insurance obligations (e.g., LOS Art. 6 for France: €60M minimum, SIA 2018 s.12 for UK: MIR approach) — reference Insurance Compliance Report (C3)
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

Generate a module-by-module compliance status overview. For EACH compliance area, provide the **enacted law or standard** as the primary reference, with EU Space Act articles as secondary/anticipated:

1. **Debris Mitigation — IADC Space Debris Mitigation Guidelines (2007, rev. 2020) + ISO 24113:2023:**
   - Overall compliance status and score
   - 25-year rule compliance per IADC Guideline 5 / ISO 24113 §6.3 (anticipated: EU Space Act Art. 72)
   - Collision avoidance capability per national requirements + IADC Guideline 3 (anticipated: Art. 64)
   - Passivation readiness per IADC Guideline 4 / ISO 24113 §6.2 (anticipated: Art. 67(1)(d))
   - End-of-life disposal strategy per IADC Guideline 5 / ISO 24113 §6.3 (anticipated: Art. 72(1))
   - Cross-reference: Documents A1-A8

2. **Cybersecurity — NIS2 Directive (EU 2022/2555, enacted, transposition deadline Oct 2024):**
   - Overall maturity score and compliance status
   - Security policy and governance per NIS2 Art. 21(2)(a)
   - Risk assessment status per NIS2 Art. 21(2)(a)-(b)
   - Incident response readiness per NIS2 Art. 23 (24h/72h/1mo)
   - National transposition measures (e.g., NIS2UmsuCG for Germany, DORA overlap for financial entities)
   - Note: EU Space Act Art. 74-95 anticipates space-specific cybersecurity requirements aligned with NIS2
   - Cross-reference: Documents B1-B8

3. **Environmental — National environmental requirements where enacted:**
   - EFD grade and compliance status
   - For France: RT Art. 47-48, INERIS methodology for environmental assessment
   - For other jurisdictions: note where national environmental obligations exist for space activities
   - Lifecycle assessment per ISO 14040/14044 methodology
   - Key environmental impact metrics (GWP, ODP)
   - Note: The EU Space Act Art. 44-46 EFD is largely a NEW obligation — limited enacted equivalents exist at national level
   - Cross-reference: Document C2

4. **Insurance — National TPL requirements (enacted, sole primary source):**
   - TPL calculation and coverage per national law (e.g., LOS Art. 6 for France: €60M min; SIA 2018 s.12 for UK: MIR approach; WeltraumG §4 for Germany)
   - Liability Convention 1972 as international framework
   - Required vs. actual coverage
   - Jurisdiction-specific requirements
   - Coverage gap summary
   - Note: The EU Space Act does NOT harmonize insurance — national law governs entirely
   - Cross-reference: Document C3

5. **NIS2 Directive (EU 2022/2555, enacted):**
   - Entity classification (essential/important/out-of-scope) per NIS2 Art. 3 + Annex I/II
   - Compliance status with NIS2 Art. 21 measures
   - Incident notification readiness per NIS2 Art. 23 (24h/72h/1mo)
   - National transposition status and any additional requirements

For each area, use a clear status indicator: Compliant / Substantially Compliant / Partially Compliant / Non-Compliant / Not Yet Assessed.

---

**## SECTION: Authorization Checklist**

Generate a pre-authorization checklist based on national application procedure requirements (consistent with EU Space Act Art. 6 "Authorization Requirement" and Art. 7 "Application Procedure" as anticipated harmonization). Structure as a verification table:

| Req. ID | Requirement | Legal Basis (National) | EU Space Act Ref. | Status | Evidence Reference | Notes |
|---------|------------|----------------------|-------------------|--------|-------------------|-------|

Cover ALL authorization prerequisites including:
- National authorization requirement (EU Space Act Art. 6: Authorization Requirement — no space activity without NCA authorization)
- National application procedure (EU Space Act Art. 7: Application Procedure — submission with technical file)
- National authorization decision timeline (EU Space Act Art. 8: Authorization Decision)
- Constellation authorization (EU Space Act Art. 9: Constellation Authorization, if applicable)
- Light regime / simplified provisions eligibility (EU Space Act Art. 10: Light Regimes & Exemptions, where applicable under national law)
- Authorization conditions and ongoing obligations (EU Space Act Art. 11-13)

Use status values: Complete / In Progress / Not Started / Not Applicable.

Include [ACTION REQUIRED] markers for any incomplete items with specific descriptions of what is needed.

---

**## SECTION: Supporting Documents Index**

Generate a catalogued index of ALL supporting documents in the NCA submission package:

| Doc Code | Document Title | Version | Date | Status | Primary Legal Basis | EU Space Act Ref. |
|----------|---------------|---------|------|--------|--------------------|--------------------|

Include all A-series (A1-A8), B-series (B1-B8), and C-series (C1-C3) documents.
For each document, indicate: Available / In Preparation / Not Applicable.
Cross-reference each document to the enacted law or standard it primarily addresses, and the EU Space Act article where applicable.
Note any supplementary documents (ISO certificates, third-party audit reports, insurance certificates).

---

**## SECTION: Certification Statement**

Generate a formal certification statement. Include:
- Declaration by the authorized representative certifying the accuracy and completeness of all information
- Acknowledgement of obligations under applicable national authorization conditions
- Commitment to notify NCA of material changes per national reporting requirements
- Statement of compliance with applicable national law, enacted international standards (IADC, ISO 24113, NIS2, Liability Convention 1972), and anticipated EU Space Act requirements
- Named signatory with title, organization, date, and signature block
- Legal disclaimer regarding ongoing obligation to maintain compliance
- Statement that all supporting documents are current as of the submission date

### Key Requirements
- Reference national space law provisions as the PRIMARY legal basis throughout
- Reference enacted standards (IADC Guidelines, ISO 24113, NIS2 Directive, Liability Convention 1972) as secondary binding sources
- Reference EU Space Act (COM(2025) 335) articles as anticipated/tertiary framework where relevant
- Cross-reference ALL A-series, B-series, and C-series documents using format: "See Document [Code] — [Title], Section [X.Y]"
- Include [ACTION REQUIRED: specific description] markers for all missing operator data
- Include [EVIDENCE: specific description] markers for all claims requiring supporting documentation
- Use formal, professional third-person language ("The Operator shall...")
- Use definitive compliance language ("shall", "will", "is required to") — never hedging language`;
}
