/**
 * Generate 2.0 — C3: Insurance Compliance Report Template
 *
 * P0 document. Insurance compliance report analyzing TPL requirements,
 * coverage status, and jurisdiction-specific obligations under NATIONAL
 * insurance/liability law (sole primary source) and the Liability Convention 1972.
 *
 * The EU Space Act (COM(2025) 335) does NOT harmonize insurance — this is
 * entirely national law territory. National TPL requirements are already
 * enacted and binding (e.g., LOS Art. 6 for France: €60M min, SIA 2018 s.12
 * for UK: Maximum Insured Risk approach, WeltraumG §4 for Germany).
 *
 * Hierarchy: National insurance/liability law ONLY as primary → Liability
 * Convention 1972 as international framework → EU Space Act as context only.
 */

export function getInsuranceComplianceTemplate(): string {
  return `## Document-Specific Instructions: C3 — Insurance Compliance Report

This document is the Insurance Compliance Report demonstrating adequate third-party liability (TPL) coverage and financial security under the operator's **national space law insurance requirements** (sole primary source). The EU Space Act (COM(2025) 335) does NOT harmonize insurance — national law governs this area entirely. Key enacted frameworks include:
- **France:** Loi relative aux Opérations Spatiales (LOS) Art. 6 — €60M minimum TPL
- **UK:** Space Industry Act 2018 s.12 — Maximum Insured Risk (MIR) approach, licensee liability cap
- **Germany:** Weltraumgesetz (WeltraumG) §4 — mandatory third-party liability insurance
- **International:** Liability Convention 1972 (Convention on International Liability for Damage Caused by Space Objects)

NCAs use this to evaluate whether the operator meets mandatory national insurance requirements and has identified and addressed coverage gaps. The report must be technically precise regarding coverage amounts, policy types, and jurisdiction-specific requirements. It should enable an NCA reviewer to independently assess insurance compliance without requiring additional documentation.

### Required Sections

Generate the following 8 sections. Each section must contain comprehensive, substantive content as specified below. Do NOT produce summaries — produce full professional analysis for each section.

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary. Include:
1. **Mission Context:** Operator, mission type, orbital regime, fleet characteristics
2. **Document Purpose:** "This Insurance Compliance Report is prepared in compliance with the applicable national space law insurance requirements — [identify specific national law, e.g., LOS Art. 6 for France, SIA 2018 s.12 for UK, WeltraumG §4 for Germany] — and the Liability Convention 1972. It constitutes a required element of the NCA authorization submission package, demonstrating the operator's financial security and third-party liability coverage. Note: The EU Space Act (COM(2025) 335) does not harmonize insurance; national law is the sole binding source."
3. **Key Findings (5-7 bullets):**
   - **TPL Requirement:** Calculated minimum third-party liability per applicable national law (e.g., LOS Art. 6: €60M for France)
   - **Current Coverage Status:** Total active coverage vs. required national minimum
   - **Coverage Gap:** Any shortfall between required and actual coverage (EUR amount)
   - **Required Policy Count:** Number of required insurance types vs. active policies
   - **Risk Level:** Overall risk assessment for the mission profile
   - **Compliance Status:** Overall insurance compliance determination against national requirements
   - **Critical Actions:** Number of high-priority remediation items
4. **Compliance Determination:** Clear statement against applicable national insurance law and Liability Convention 1972

Cross-reference: C1 (Authorization Application) for overall compliance context, C2 (EFD) for environmental risk considerations.

---

**## SECTION: Organization Risk Profile**

Generate a comprehensive risk profile for insurance assessment. Include:
- **Operator Classification:** Type per national licensing categories and (anticipated) EU Space Act Art. 3(12)-(18), establishment, size
- **Mission Risk Factors:**
  - Orbital regime and altitude (collision risk profile)
  - Spacecraft count and constellation size
  - Spacecraft mass and dimensions (re-entry casualty risk)
  - Propulsion capability (maneuverability, collision avoidance)
  - Mission duration and operational complexity
- **Fleet Characteristics:**
  - Total satellite value (aggregated)
  - Launch provider and vehicle type
  - Ground segment value
- **Historical Risk Data:** (if available) Prior incidents, near-misses, claims history
- **Third-Party Risk Exposure:**
  - Co-located spacecraft in similar orbits
  - Ground population density under orbital track
  - Re-entry casualty risk estimate per IADC Guidelines / ISO 24113 (anticipated: EU Space Act Art. 72)
- **Operational Risk Factors:**
  - Autonomous operations vs. manual control
  - Ground station redundancy
  - Cybersecurity posture (reference B-series documents)

---

**## SECTION: Third-Party Liability Analysis**

Generate a detailed TPL calculation and analysis. Include:
- **Legal Basis:** National TPL requirements as sole primary source (e.g., LOS Art. 6 for France: €60M minimum; SIA 2018 s.12 for UK: MIR approach with licensee liability cap; WeltraumG §4 for Germany). Liability Convention 1972 (Arts. II-VII) as international framework establishing state liability. Note: EU Space Act Art. 47-50 is anticipated but NOT enacted — do not cite as binding authority.
- **TPL Calculation Methodology:**
  - National law calculation approach (varies by jurisdiction — e.g., France uses fixed minimum, UK uses risk-based MIR)
  - Factors considered: orbit, mass, mission type, constellation size
  - Calculation model and assumptions
- **Calculated TPL Minimum:** EUR amount with detailed derivation
- **Comparison with Current Coverage:** Actual TPL coverage vs. calculated minimum
- **Damage Scenarios:**
  - Collision with operational spacecraft
  - Collision with debris
  - Re-entry ground damage
  - Interference with other operators
- **Liability Cap Assessment:** Whether jurisdiction applies liability caps and at what level
- **Cross-Waiver Analysis:** Existing cross-waiver agreements with other operators or agencies

Include [ACTION REQUIRED] markers if TPL coverage is below the calculated minimum.

---

**## SECTION: Coverage Overview**

Generate a comprehensive insurance portfolio summary. Present as a detailed table:

| Insurance Type | Required | Status | Insurer | Coverage (EUR) | Premium (EUR/yr) | Policy No. | Expiry Date | Notes |
|---------------|----------|--------|---------|---------------|-----------------|-----------|-------------|-------|

Cover ALL relevant insurance types:
- **Launch Insurance:** Pre-launch, launch, and early orbit phase coverage
- **In-Orbit Insurance:** Operational phase coverage for spacecraft loss/damage
- **Third-Party Liability (TPL):** Mandatory coverage per national law (e.g., LOS Art. 6, SIA 2018 s.12, WeltraumG §4)
- **Government Indemnification:** (if applicable) State backstop coverage
- **Professional Indemnity:** Errors and omissions coverage
- **Product Liability:** For manufactured components or services
- **Property Insurance:** Ground segment and facilities
- **Business Interruption:** Revenue loss coverage

For each policy, indicate: Bound / Active / Quoted / Not Obtained / Not Applicable.

---

**## SECTION: Jurisdiction Requirements**

Generate jurisdiction-specific insurance requirement analysis. Include:
- **Primary Jurisdiction:** Identify the primary jurisdiction and its specific insurance framework
- **Mandatory Requirements:**
  - Minimum TPL amount required by national law
  - Required insurance types (launch, in-orbit, TPL)
  - Proof of insurance documentation requirements
  - Renewal and reporting obligations
- **Supplementary Requirements:**
  - Environmental damage coverage (if required)
  - Government indemnification arrangements
  - Financial guarantee alternatives to insurance
- **Multi-Jurisdiction Considerations:** (if applicable)
  - Requirements of secondary jurisdictions
  - Harmonization issues between jurisdictions
  - Most restrictive requirement identification
- **EU Space Act Context:** Note that EU Space Act Art. 47-50 is anticipated but does NOT harmonize insurance — national law remains the sole binding source. Identify any areas where the anticipated EU Space Act may create additional obligations beyond current national requirements.
- **Regulatory Trends:** Upcoming changes to national insurance requirements relevant to the operator

---

**## SECTION: Gap Analysis**

Generate a detailed gap analysis between required and actual coverage. Include:
- **Coverage Gaps Table:**
  | Gap ID | Insurance Type | Required Coverage | Actual Coverage | Shortfall | Risk Rating | Priority |
  |--------|---------------|------------------|-----------------|-----------|-------------|----------|
- **Gap Description:** For each identified gap, describe:
  - Nature of the gap (missing policy, insufficient coverage, expired policy)
  - Regulatory impact (which article/requirement is not met)
  - Risk exposure (potential financial exposure in EUR)
  - Root cause (cost, availability, oversight)
- **Risk Assessment:** Impact and likelihood rating for each gap
- **Authorization Impact:** Whether each gap is authorization-blocking or can be conditioned
- **Market Availability:** Assessment of whether required coverage is available in the current space insurance market

Include [ACTION REQUIRED] markers for all authorization-blocking gaps.

---

**## SECTION: Premium Estimates**

Generate market context for space insurance premiums. Include:
- **Market Overview:** Current state of the space insurance market (hard/soft market conditions)
- **Premium Benchmarks:** Typical premium rates for the operator's risk profile:
  - Launch insurance: typical rate on sum insured
  - In-orbit insurance: typical rate on sum insured
  - TPL: typical rate based on risk factors
- **Cost Estimation:** Estimated annual insurance cost for full compliance
- **Cost Optimization:** Strategies to optimize insurance costs:
  - Deductible adjustments
  - Multi-year policies
  - Portfolio packaging
  - Risk retention groups
- **Budget Planning:** Projected insurance costs over mission lifetime

Note: Actual quotes may differ significantly from estimates. Include disclaimer about estimates being indicative only.

---

**## SECTION: Recommendations**

Generate prioritized recommendations for insurance compliance. Include:
- **Immediate Actions (Pre-Authorization):**
  - Authorization-blocking gaps that must be resolved before submission
  - Specific policies to obtain or increase
  - Documentation to prepare
- **Short-term Actions (During NCA Review):**
  - Gaps that can be addressed as authorization conditions
  - Broker engagement and quote collection
- **Medium-term Actions (Post-Authorization):**
  - Coverage optimization and cost reduction
  - Annual renewal strategy
  - Portfolio review schedule
- **Ongoing Obligations:**
  - Annual proof of insurance submission to NCA
  - Notification of material changes to coverage
  - Claims reporting requirements
- **Risk Management:**
  - Loss prevention measures that may reduce premiums
  - Safety improvements that demonstrate lower risk profile

### Key Requirements
- Reference national insurance/liability law as the SOLE PRIMARY binding source throughout (e.g., LOS Art. 6, SIA 2018 s.12, WeltraumG §4)
- Reference Liability Convention 1972 as the international liability framework
- Do NOT cite EU Space Act Art. 47-50 as binding authority — reference only as anticipated/context where relevant
- Cross-reference related documents: C1 (Authorization Application), A6 (Re-Entry Risk)
- Include [ACTION REQUIRED: specific description] markers for all authorization-blocking gaps
- Include [EVIDENCE: specific description] markers for all claims requiring supporting documentation
- Present all monetary values in EUR with clear notation
- Use formal, professional third-person language ("The Operator shall...")
- Use definitive compliance language ("shall", "will", "is required to") — never hedging language`;
}
