/**
 * Generate 2.0 — A1: Debris Mitigation Plan (DMP) Template
 *
 * P0 document. The foundational debris mitigation document required under
 * EU Space Act Art. 67, referencing IADC Guidelines and ISO 24113:2019.
 */

export function getDMPTemplate(): string {
  return `## Document-Specific Instructions: A1 — Debris Mitigation Plan (DMP)

This is the foundational debris mitigation document in the NCA submission package. It must demonstrate comprehensive compliance with EU Space Act Art. 58-73, IADC Space Debris Mitigation Guidelines, and ISO 24113:2019. NCAs treat the DMP as the primary document for evaluating an operator's debris mitigation posture.

### Required Sections

Generate the following 11 sections. Each section must contain the specified content.

---

**## SECTION: Cover Page & Document Control**

Generate a formal cover page including:
- Document title: "Debris Mitigation Plan"
- Document code: A1-DMP
- Operator name, mission name, document version, date
- Classification level (typically "NCA Confidential — Authorization Submission")
- Revision history table with columns: Version | Date | Author | Description of Changes
- Document approval table: Role | Name | Signature | Date
- Distribution list
- Table of contents placeholder

---

**## SECTION: Executive Summary**

Generate a 1-2 page executive summary covering:
- Mission overview in 2-3 sentences
- Regulatory context: EU Space Act Art. 67 DMP requirement, IADC Guidelines applicability, ISO 24113 compliance status
- Summary of key debris mitigation measures implemented
- Overall compliance assessment (compliant, partially compliant, with summary of gaps)
- Key risk factors and mitigation measures
- Reference to supporting documents: A2 (Orbital Lifetime), A4 (EOL Disposal), A5 (Passivation)

---

**## SECTION: Mission Overview & Orbital Parameters**

Generate detailed mission characterization including:
- Mission objectives and operational concept
- Orbital parameters table: Altitude (km) | Inclination (deg) | Eccentricity | RAAN | Argument of Perigee | Orbital Period
- If constellation: number of planes, satellites per plane, inter-satellite spacing
- Orbital regime classification (LEO/MEO/GEO/HEO) and its implications under Art. 58
- Protected regions analysis (IADC-defined LEO region below 2,000 km, GEO protected region +/-200 km)
- Mission phases: launch, early orbit, commissioning, operational, end-of-life, disposal
- Planned mission lifetime and relationship to 25-year rule per Art. 72
- Reference applicable Art. 60 (design principles), Art. 61 (operational obligations)

---

**## SECTION: Spacecraft Technical Description**

Generate comprehensive spacecraft technical data:
- Physical parameters table: Mass (kg) | Dimensions (m) | Cross-sectional area (m2) | Ballistic coefficient
- Propulsion system: type, thrust capability, delta-V budget allocation (station-keeping, collision avoidance, disposal)
- Power system: solar panel area, battery chemistry and capacity, passivation approach
- Attitude control: system type, sensors, actuators
- Communication: frequencies, antenna types, ground station network
- Payload description and any deployable elements
- Materials: external surface materials, susceptibility to fragmentation
- Trackability features: radar cross-section, reflectors, GNSS receiver for precision orbit determination
- Reference Art. 67(a) on spacecraft design for debris mitigation

---

**## SECTION: Orbital Lifetime Analysis (25-Year Rule)**

Generate summary of orbital lifetime compliance:
- State the 25-year post-mission disposal requirement per Art. 72
- Summarize the orbital lifetime analysis methodology (reference detailed analysis in Document A2)
- Present key results: natural decay timeline, required disposal maneuver delta-V
- Solar activity assumptions (F10.7 solar flux projections)
- Atmospheric density model used (e.g., NRLMSISE-00, JB2008)
- Compliance statement: whether the 25-year rule is met with margin
- If non-compliant: gap analysis and remediation plan with timeline
- Reference IADC Guidelines Section 5.3.1 and ISO 24113 Section 6.3

---

**## SECTION: Collision Avoidance Strategy**

Generate collision avoidance operations plan:
- Conjunction assessment process: data sources (18th SDS, EU SST, commercial), screening methodology, probability thresholds
- Conjunction action thresholds: probability of collision (Pc) trigger levels for monitoring, planning, and execution
- Maneuver planning: lead time requirements, maneuver design approach, fuel budget allocation
- Operator coordination: communication protocols with other operators, multi-object conjunction scenarios
- Automated vs. manual decision criteria
- Performance metrics: number of expected maneuvers per year, fuel consumption projections
- If no maneuverability: explain alternative risk mitigation measures
- Reference Art. 64 collision avoidance requirements and IADC Guidelines Section 5.2.2
- Cross-reference Document A2 for orbital parameters affecting conjunction geometry

---

**## SECTION: End-of-Life Disposal Plan**

Generate disposal strategy summary:
- Selected disposal method: controlled re-entry, natural decay (LEO), graveyard orbit (GEO), heliocentric escape
- Justification for selected approach per Art. 72 requirements
- Disposal maneuver design summary (reference detailed plan in Document A4)
- Fuel budget: allocation for disposal, margin analysis, contingency reserve
- Success probability analysis per ISO 24113
- Timeline: trigger criteria for EOL transition, disposal window, expected completion
- Contingency procedures if primary disposal fails
- For LEO: compliance with 25-year post-mission orbital lifetime limit
- For GEO: compliance with 300+ km above GEO altitude disposal orbit
- Reference IADC Guidelines Section 5.3 and ISO 24113 Section 6.3

---

**## SECTION: Passivation & Fragmentation Prevention**

Generate passivation and fragmentation prevention plan:
- Passivation objectives per Art. 67(d) and IADC Guidelines Section 5.2.3
- Energy sources inventory: batteries, propellant, pressurized systems, reaction wheels, momentum bias
- Passivation sequence for each energy source:
  - Battery: discharge procedure, isolation, thermal management
  - Propellant: depletion burn, venting procedure, valve configuration
  - Pressure vessels: depressurization sequence, residual pressure targets
  - Momentum storage: spin-down or desaturation procedure
- Passivation timeline relative to end-of-life
- Verification criteria: how passivation completion will be confirmed
- Fragmentation risk assessment: probability of accidental breakup during and after passivation
- Reference Art. 67(d), IADC Guidelines Section 5.2.3, ISO 24113 Section 6.2

---

**## SECTION: Trackability & Identification**

Generate trackability measures:
- Object registration: EUSR registration per Art. 31-57, UN Registry notification
- Tracking data: expected radar cross-section, optical magnitude
- Orbit determination: onboard GNSS, ground-based tracking, precision orbit ephemeris sharing
- Identification measures: unique identifiers, transponder-based identification if applicable
- Data sharing: orbit data sharing agreements, conjunction screening participation
- Compliance with Art. 67(e) trackability requirements
- For constellation operators: fleet management and identification of individual objects

---

**## SECTION: Compliance Verification Matrix (Art. 58-73)**

Generate a comprehensive compliance matrix table with the following columns:
| Article | Requirement Description | Compliance Status | Implementation Description | Evidence Reference | Gap / Remediation |

Include ALL articles from Art. 58 through Art. 73, with one row per article or sub-article. For each:
- State the requirement concisely
- Assess compliance: Compliant / Partially Compliant / Non-Compliant / Not Applicable
- Describe how compliance is achieved or planned
- Reference the evidence document(s)
- If not fully compliant, describe the gap and remediation plan

Also include rows for:
- IADC Guidelines compliance (by section)
- ISO 24113:2019 compliance (by section)

---

**## SECTION: Gap Analysis & Remediation Roadmap**

Generate prioritized gap analysis:
- Summary table of all identified gaps from the compliance matrix
- Risk rating for each gap: High / Medium / Low (based on regulatory and operational risk)
- Remediation actions for each gap with:
  - Description of required action
  - Responsible party
  - Target completion date
  - Dependencies and prerequisites
  - Cost estimate category (if applicable)
- Implementation timeline (Gantt-style description or phased approach)
- Resource requirements: personnel, tools, external support
- Progress tracking methodology
- Escalation criteria for gaps that cannot be remediated before authorization

### Cross-References
- Document A2 — Orbital Lifetime Analysis: detailed decay modeling and 25-year compliance
- Document A4 — End-of-Life Disposal Plan: detailed disposal maneuver design and fuel budget
- Document A5 — Passivation Procedure: detailed passivation sequence and verification
- Document A3 — Collision Avoidance Operations Plan: detailed conjunction assessment process
- Document A6 — Re-Entry Casualty Risk Assessment: if controlled or uncontrolled re-entry is planned

### Key Standards
- EU Space Act COM(2025) 335, Art. 58-73
- IADC Space Debris Mitigation Guidelines (IADC-02-01, Rev. 3)
- ISO 24113:2019 — Space debris mitigation requirements
- ECSS-U-AS-10C — Space sustainability
- ESA Space Debris Mitigation Compliance Verification Guidelines`;
}
