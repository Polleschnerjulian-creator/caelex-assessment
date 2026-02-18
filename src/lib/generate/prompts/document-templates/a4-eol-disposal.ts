/**
 * Generate 2.0 — A4: End-of-Life Disposal Plan Template
 *
 * P0 document. Detailed plan for spacecraft disposal at end of mission,
 * per EU Space Act Art. 72, IADC Guidelines, and ISO 24113:2019.
 */

export function getEOLDisposalTemplate(): string {
  return `## Document-Specific Instructions: A4 — End-of-Life Disposal Plan

This document details the spacecraft disposal strategy at end-of-life, demonstrating compliance with EU Space Act Art. 72 disposal requirements. NCAs require a well-justified disposal approach with quantitative fuel budget analysis, success probability assessment, and contingency procedures. This document is a key supporting document to the DMP (Document A1) and is informed by the Orbital Lifetime Analysis (Document A2).

### Required Sections

Generate the following 9 sections. Each section must contain the specified content.

---

**## SECTION: Cover Page & Document Control**

Generate a formal cover page including:
- Document title: "End-of-Life Disposal Plan"
- Document code: A4-EOL
- Operator name, mission name, document version, date
- Classification level
- Revision history table: Version | Date | Author | Description of Changes
- Document approval table: Role | Name | Signature | Date
- Distribution list

---

**## SECTION: Executive Summary**

Generate a concise executive summary covering:
- Mission context and regulatory basis for disposal (Art. 72 EU Space Act)
- Selected disposal strategy and justification
- Key metrics: disposal delta-V requirement, fuel availability, success probability
- Compliance determination: whether the disposal plan meets Art. 72 requirements and IADC Guidelines
- Summary of contingency procedures if primary disposal fails
- Reference to supporting analyses: Document A2 (Orbital Lifetime), Document A5 (Passivation)
- Timeline: when disposal will be initiated and expected completion

---

**## SECTION: Disposal Strategy Selection**

Generate disposal strategy analysis:
- Available disposal options analysis — evaluate each against Art. 72 requirements:
  | Option | Description | Applicability | Advantages | Disadvantages |
  Options to evaluate (as applicable to orbit regime):
  - **Controlled re-entry:** targeted re-entry over unpopulated area (ocean)
  - **Semi-controlled re-entry:** lowered perigee for accelerated decay within 25 years
  - **Natural orbital decay:** if already compliant with 25-year rule without maneuver
  - **Graveyard orbit (GEO):** re-orbit to 300+ km above GEO altitude
  - **Heliocentric escape:** for MEO/HEO missions
- Selected strategy with detailed justification:
  - Why this strategy was chosen over alternatives
  - Compliance with Art. 72 specific requirements for the selected approach
  - Compliance with IADC Guidelines Section 5.3 for the orbital regime
  - ISO 24113 Section 6.3 requirements met
- For LEO: demonstrate 25-year post-disposal compliance (reference Document A2)
- For GEO: demonstrate minimum 300 km above GEO altitude and eccentricity constraints
- For controlled re-entry: casualty risk analysis reference (Document A6 if applicable)

---

**## SECTION: Disposal Maneuver Design**

Generate detailed maneuver design:
- Pre-disposal orbit state (operational orbit at end-of-mission)
- Target disposal orbit parameters:
  | Parameter | Operational Orbit | Disposal Orbit | Change Required |
  Including: altitude, eccentricity, inclination, period
- Maneuver sequence:
  | Maneuver # | Type | Delta-V (m/s) | Duration | Purpose |
  For multi-burn strategies, detail each burn
- Maneuver execution timeline:
  - Decision trigger for initiating disposal
  - Maneuver planning period
  - Execution window(s)
  - Total duration from initiation to disposal orbit confirmation
- Orbit determination requirements before and after each maneuver
- Ground segment support requirements during disposal operations
- If controlled re-entry: impact zone selection, timing constraints, notification requirements
- Maneuver accuracy analysis: expected vs. required accuracy, orbit determination uncertainty impact
- Reference Art. 72 disposal maneuver requirements

---

**## SECTION: Fuel Budget Analysis**

Generate comprehensive fuel budget:
- Total fuel capacity at launch (kg or equivalent delta-V in m/s)
- Fuel budget allocation table:
  | Phase | Activity | Delta-V (m/s) | Fuel Mass (kg) | Notes |
  Activities to include:
  - Launch injection correction
  - Orbit acquisition / phasing
  - Station-keeping (annual and total)
  - Collision avoidance maneuvers (statistical allocation)
  - Orbit maintenance
  - **End-of-life disposal** (the focus of this document)
  - Margin / contingency reserve
- Fuel remaining at end-of-mission:
  - Nominal case: expected fuel remaining
  - Worst case: minimum fuel remaining (accounting for extra station-keeping, additional collision avoidance maneuvers)
- Disposal delta-V requirement vs. fuel availability:
  | Scenario | Disposal Delta-V Required | Fuel Available | Margin | Sufficient? |
- Fuel margin policy: minimum reserve required for disposal (NCA expectation: typically 10-20% margin above disposal requirement)
- Impact of propulsion system degradation on available delta-V
- If propellant-less disposal (e.g., drag sail, electrodynamic tether): describe the system, deployment reliability, effectiveness analysis
- Reference ISO 24113 Section 6.3 on disposal maneuver fuel reservation

---

**## SECTION: Success Probability**

Generate disposal success probability analysis:
- Definition of success: what constitutes successful disposal for this mission
- Reliability analysis of disposal-critical systems:
  | System | Reliability | Failure Mode | Impact on Disposal |
  Systems to analyze:
  - Propulsion system (thruster, valves, tanks, feed system)
  - Attitude control (required for maneuver execution)
  - Power system (required for maneuver execution)
  - Command and control link (required for maneuver commanding)
  - Onboard computer (required for autonomous operations if applicable)
- Combined success probability: product of critical system reliabilities
- NCA expectation: ISO 24113 recommends demonstrating > 90% probability of successful disposal
- Comparison with industry benchmarks and similar missions
- End-of-life system degradation: how aging affects reliability estimates
- Redundancy measures that improve success probability
- Historical disposal success rates for similar spacecraft/missions
- Reference ISO 24113 Section 6.3 and IADC Guidelines on disposal reliability

---

**## SECTION: Contingency Procedures**

Generate contingency plans for disposal failure scenarios:
- Failure scenario identification table:
  | Scenario | Probability | Cause | Consequence |
  Scenarios to address:
  - Partial propulsion failure (reduced delta-V available)
  - Complete propulsion failure
  - Loss of attitude control
  - Loss of communication link
  - Premature end-of-mission (anomaly forcing early disposal)
  - Insufficient fuel due to excess collision avoidance maneuvers
- Contingency response for each scenario:
  | Scenario | Response Strategy | Expected Outcome |
  Examples:
  - Partial propulsion: optimized low-thrust disposal over extended period
  - Loss of propulsion: deploy passive deorbit device if available, accept natural decay timeline
  - Communication loss: autonomous disposal sequence if pre-programmed
  - Premature EOL: early initiation of disposal sequence with full fuel budget
- Decision tree: how the operator decides which contingency to invoke
- Notification procedures: who is notified when contingency is activated (NCA, ESA SSA, other operators)
- Art. 72 implications: what happens if 25-year compliance cannot be achieved under contingency — gap notification to NCA
- Reference IADC Guidelines on contingency disposal planning

---

**## SECTION: Ground Support**

Generate ground segment support plan for disposal:
- Ground station network: stations supporting disposal operations, coverage analysis
- Tracking and orbit determination: how post-maneuver orbit will be verified
- Telemetry monitoring: critical parameters monitored during disposal sequence
- Command capability: uplink requirements for disposal maneuver commanding
- Operations team: staffing requirements, shift coverage during disposal operations
- Communication plan: coordination with Space Surveillance and Tracking (SST) services
- Post-disposal monitoring:
  - Orbit tracking to confirm disposal orbit achieved
  - Duration of post-disposal monitoring
  - Criteria for closing out the disposal campaign
- Data archiving: disposal telemetry and orbit data retention requirements
- NCA reporting: disposal completion report format and timeline

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix mapping to Art. 72 requirements:
| Requirement | Article Reference | Implementation | Status | Evidence |

Requirements to map:
- Art. 72(1): General disposal obligation
- Art. 72(2): LEO — 25-year post-mission lifetime limit
- Art. 72(3): GEO — re-orbit to graveyard altitude
- Art. 72(4): Controlled re-entry casualty risk limit (if applicable)
- Art. 72(5): Fuel reservation for disposal
- IADC Guideline 5.3.1: Post-mission orbit lifetime < 25 years
- IADC Guideline 5.3.2: GEO re-orbit requirements
- ISO 24113 Section 6.3: Disposal requirements
- Cross-reference compliance entries from Document A1 (DMP) compliance matrix

### Cross-References
- Document A1 — Debris Mitigation Plan: master document referencing this disposal plan
- Document A2 — Orbital Lifetime Analysis: provides the orbital lifetime predictions informing disposal delta-V requirements
- Document A5 — Passivation Procedure: passivation sequence executed before or after disposal maneuver
- Document A6 — Re-Entry Casualty Risk Assessment: if controlled/uncontrolled re-entry is the disposal method

### Key Standards
- EU Space Act COM(2025) 335, Art. 72
- IADC Space Debris Mitigation Guidelines Section 5.3
- ISO 24113:2019 Section 6.3
- ECSS-U-AS-10C — Space sustainability
- ESA Space Debris Mitigation Compliance Verification Guidelines`;
}
