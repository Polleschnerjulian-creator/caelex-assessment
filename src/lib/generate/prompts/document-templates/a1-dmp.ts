/**
 * Generate 2.0 — A1: Debris Mitigation Plan (DMP) Template
 *
 * P0 document. The foundational debris mitigation document required under
 * IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (codified as Art. 67
 * in EU Space Act proposal COM(2025) 335).
 * This is the master debris document — all other A-series documents support it.
 */

export function getDMPTemplate(): string {
  return `## Document-Specific Instructions: A1 — Debris Mitigation Plan (DMP)

This is the foundational debris mitigation document in the NCA submission package. It must demonstrate comprehensive compliance with the IADC Space Debris Mitigation Guidelines (IADC-02-01, Rev. 3), ISO 24113:2019, and the corresponding debris mitigation provisions of the EU Space Act proposal (COM(2025) 335, Art. 58-73). NCAs treat the DMP as the PRIMARY document for evaluating an operator's debris mitigation posture. All other A-series documents (A2-A8) support and are referenced by this master document.

The DMP must be sufficiently detailed for an NCA technical reviewer to independently assess compliance without requiring external documents, while also providing clear cross-references to supporting analyses in the A-series package.

### Required Sections

Generate the following 11 sections. Each section must contain comprehensive, substantive content as specified below. Do NOT produce summaries — produce full professional analysis for each section.

---

**## SECTION: Cover Page & Document Control**

Generate a formal NCA-submission-grade cover page following the Cover Page Standard from the Quality Rules. Include:
- Document title: "Debris Mitigation Plan"
- Document code: A1-DMP
- All elements from the Cover Page Standard (Document Control Block, Approval Block, Distribution List, Revision History)
- Table of Contents listing all 11 sections with subsection numbers

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary following the Executive Summary Standard from the Quality Rules. Specific content:

1. **Mission Context:** Describe the operator, mission type, orbital regime, constellation size (if applicable), and planned mission lifetime
2. **Document Purpose:** "This Debris Mitigation Plan is prepared in compliance with the IADC Space Debris Mitigation Guidelines (IADC-02-01, Rev. 3) and ISO 24113:2019, the primary enacted frameworks for space debris mitigation. It also maps compliance to the EU Space Act proposal (COM(2025) 335), Art. 58-73. It constitutes a required element of the NCA authorization application package."
3. **Key Findings (5-7 bullets):**
   - **Overall Compliance Status:** [compliant/partially compliant] with IADC Guidelines and ISO 24113 (corresponds to EU Space Act proposal Art. 58-73)
   - **25-Year Rule:** Status per IADC Section 5.3.2 / ISO 24113 Section 6.3.3 with predicted orbital lifetime (corresponds to EU Space Act proposal Art. 72(2))
   - **Collision Avoidance:** Capability assessment per IADC Section 5.4 (corresponds to EU Space Act proposal Art. 64(1)-(5))
   - **Passivation:** Status of energy source passivation per IADC Section 5.2.1 / ISO 24113 Section 6.3 (corresponds to EU Space Act proposal Art. 67(1)(d))
   - **Disposal Strategy:** Selected approach per IADC Section 5.3 / ISO 24113 Section 6.4 (corresponds to EU Space Act proposal Art. 72(1)) with success probability
   - **Critical Gaps:** Number and nature of identified gaps
   - **Evidence Completeness:** Assessment of supporting documentation
4. **Evidence Summary:** List of referenced evidence documents and supporting analyses
5. **Compliance Determination:** Clear statement per IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (codified as Art. 67 in EU Space Act proposal COM(2025) 335) compliance

Cross-reference supporting documents: A2 (Orbital Lifetime), A3 (Collision Avoidance), A4 (EOL Disposal), A5 (Passivation), A6 (Re-Entry Risk), A7 (Supply Chain Debris), A8 (Debris Compliance Matrix)

---

**## SECTION: Mission Overview & Orbital Parameters**

Generate detailed mission characterization. This section establishes the technical baseline for all subsequent analysis.

**3.1 Mission Description:**
- Mission objectives, concept of operations, and operational concept summary
- Operator type classification per IADC scope definition (corresponds to Art. 3(12)-(18) of EU Space Act proposal COM(2025) 335)
- Light regime applicability assessment (entity size, mission type, risk classification) per EU Space Act proposal Art. 10
- Planned mission lifetime with start/end dates
- Key mission phases: launch, LEOP (Launch and Early Orbit Phase), commissioning, operational, extended operations (if any), end-of-life, disposal

**3.2 Orbital Parameters:**
Generate a detailed orbital parameters table:

**Table 3.1:** Operational Orbit Parameters
| Parameter | Value | Unit | Notes |
| Semi-major axis | [ACTION REQUIRED] | km | |
| Altitude (perigee) | [ACTION REQUIRED] | km | |
| Altitude (apogee) | [ACTION REQUIRED] | km | |
| Inclination | [ACTION REQUIRED] | deg | |
| Eccentricity | [ACTION REQUIRED] | — | |
| RAAN | [ACTION REQUIRED] | deg | |
| Argument of Perigee | [ACTION REQUIRED] | deg | |
| Orbital Period | [calculated from above] | min | |

**3.3 Orbital Regime Classification:**
- LEO/MEO/GEO/HEO classification and implications under IADC Guidelines general obligations (corresponds to EU Space Act proposal Art. 58)
- IADC Protected Region analysis:
  - LEO Protected Region: altitude < 2,000 km — 25-year rule applies per IADC Section 5.3.2 (corresponds to EU Space Act proposal Art. 72(2))
  - GEO Protected Region: GEO altitude ± 200 km, ± 15° latitude — re-orbit requirements per IADC Section 5.3.3 (corresponds to EU Space Act proposal Art. 72(3))
- If within protected region: explicit statement of applicable disposal requirements

**3.4 Constellation Architecture (if applicable):**
- Number of orbital planes, satellites per plane, inter-satellite spacing
- Phasing strategy and station-keeping box dimensions
- Spare satellite strategy and replacement cadence
- Fleet disposal sequencing per IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (codified as Art. 67(1)(e) in EU Space Act proposal COM(2025) 335) for SCO operators

Reference: IADC Guidelines general obligations (EU Space Act proposal Art. 58(1)-(3), Art. 60(1)-(5), Art. 62(1)-(4))

---

**## SECTION: Spacecraft Technical Description**

Generate comprehensive spacecraft technical characterization. NCAs require sufficient detail to independently verify debris mitigation analysis.

**4.1 Physical Parameters:**

**Table 4.1:** Spacecraft Physical Characteristics
| Parameter | Value | Unit | Notes |
| Dry mass | [ACTION REQUIRED] | kg | |
| Wet mass (at launch) | [ACTION REQUIRED] | kg | |
| End-of-life mass | [ACTION REQUIRED] | kg | After fuel depletion |
| Dimensions (stowed) | [ACTION REQUIRED] | m × m × m | |
| Dimensions (deployed) | [ACTION REQUIRED] | m × m × m | With solar arrays deployed |
| Cross-sectional area (min) | [ACTION REQUIRED] | m² | Ram direction, minimum |
| Cross-sectional area (max) | [ACTION REQUIRED] | m² | Maximum, with arrays |
| Cross-sectional area (avg) | [ACTION REQUIRED] | m² | Tumble-averaged |
| Drag coefficient (Cd) | [2.0-2.2 typical] | — | Justify value selected |
| Ballistic coefficient | [calculated: m/(Cd×A)] | kg/m² | |

**4.2 Propulsion System:**
- Propulsion type, manufacturer, and heritage
- Specific impulse (Isp), thrust level, total delta-V budget
- Delta-V allocation table:

**Table 4.2:** Delta-V Budget Allocation
| Activity | Delta-V (m/s) | Fuel Mass (kg) | % of Total |
| Orbit acquisition | | | |
| Station-keeping (annual × mission years) | | | |
| Collision avoidance (statistical) | | | |
| End-of-life disposal | | | |
| Margin/contingency | | | |
| **Total** | | | 100% |

**4.3 Power System:** Solar panel area, battery chemistry/capacity, passivation approach per IADC Section 5.2.1 / ISO 24113 Section 6.3 (corresponds to EU Space Act proposal Art. 67(1)(d))
**4.4 Attitude Control:** System type, sensors, actuators, stored angular momentum
**4.5 Communications:** Frequencies (TT&C and payload), antenna types, ground station network
**4.6 Payload:** Description and any deployable elements
**4.7 Materials & Fragmentation Susceptibility:** External surface materials, Design for Demise features per ISO 24113 Section 6.2 (corresponds to EU Space Act proposal Art. 59(1)-(4)), fragmentation analysis results
**4.8 Trackability Features:** Radar cross-section, optical magnitude, reflectors, GNSS receiver for precision orbit determination per IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (codified as Art. 67(1)(e) in EU Space Act proposal COM(2025) 335)

Reference: IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (EU Space Act proposal Art. 67(1)(a), Art. 59(1)-(4), Art. 60(1)-(5))

---

**## SECTION: Orbital Lifetime Analysis (25-Year Rule)**

Generate a summary of the orbital lifetime compliance analysis. Full technical detail is in Document A2.

**5.1 Regulatory Requirement:**
State the 25-year post-mission disposal requirement per IADC Guidelines Section 5.3.2 (25-year rule) and ISO 24113:2019 Section 6.3.3 (corresponds to EU Space Act proposal Art. 72(2), COM(2025) 335). For GEO operators, state the re-orbit requirement per IADC Section 5.3.3 (corresponds to EU Space Act proposal Art. 72(3)).

**5.2 Analysis Methodology:**
- Propagation tool/software used (e.g., STELA, DRAMA, GMAT, STK Lifetime)
- Atmospheric density model (NRLMSISE-00, JB2008, DTM-2013)
- Solar activity scenarios: nominal, conservative (-2σ), optimistic (+2σ)

**5.3 Key Results:**

**Table 5.1:** Orbital Lifetime Predictions
| Scenario | Solar Activity | Predicted Lifetime (years) | 25-Year Compliant? | Margin |
| Nominal | Medium F10.7 | [from A2] | [Yes/No] | [X years] |
| Conservative | Low F10.7 (-2σ) | [from A2] | [Yes/No] | [X years] |
| Optimistic | High F10.7 (+2σ) | [from A2] | [Yes/No] | [X years] |

**5.4 Compliance Determination:**
- Use the CONSERVATIVE scenario as the primary compliance case per IADC recommendation
- NCAs expect ≥ 20% margin (predicted lifetime well below 20 years for robust compliance)
- If disposal maneuver required: summarize delta-V requirement and fuel availability (detailed in Document A4)

**5.5 Gap Identification:**
If not compliant: clearly identify the gap, root cause, and reference the remediation plan in the Gap Analysis section

Reference: IADC Guidelines Section 5.3.1-5.3.2 / ISO 24113:2019 Section 6.3 (EU Space Act proposal Art. 72(1)-(2), COM(2025) 335)
Cross-reference: Document A2 — Orbital Lifetime Analysis (full technical detail)

---

**## SECTION: Collision Avoidance Strategy**

Generate comprehensive collision avoidance operations plan per IADC Section 5.4 (corresponds to EU Space Act proposal Art. 64(1)-(5), COM(2025) 335).

**6.1 Conjunction Assessment Process:**
- Data sources: 18th Space Defense Squadron (18 SDS), EU SST (EU Space Act proposal Art. 45-50), commercial providers (LeoLabs, ExoAnalytic)
- Screening methodology: conjunction data message (CDM) processing, probability of collision (Pc) computation
- Screening volume: define the screening dimensions (e.g., 10 km radial, 50 km along-track, 25 km cross-track)

**6.2 Decision Thresholds:**

**Table 6.1:** Collision Avoidance Decision Thresholds
| Phase | Pc Threshold | Action | Timeline |
| Monitoring | > 1e-5 | Enhanced tracking, CDM analysis | T-7 days |
| Planning | > 1e-4 | Maneuver planning initiated | T-3 days |
| Execution | > 1e-3 | Maneuver executed | T-24 to T-6 hours |
| Emergency | > 1e-2 | Emergency maneuver | Immediate |

**6.3 Maneuver Execution:**
- Maneuver design approach (in-plane vs. out-of-plane, radial vs. along-track)
- Lead time requirements and decision authority chain
- Fuel budget allocation for collision avoidance (statistical: [X] maneuvers per year × [Y] m/s average)
- Post-maneuver orbit determination and verification

**6.4 Operator Coordination:**
- Communication protocols per IADC Section 5.4 (corresponds to EU Space Act proposal Art. 64(3)) with other operators in similar orbital regimes
- Multi-object conjunction scenarios: priority and coordination procedures
- Coordination with EU SST per EU Space Act proposal Art. 45-50

**6.5 Non-Maneuverable Spacecraft:**
If spacecraft lacks maneuver capability: explain alternative risk mitigation measures, operational limitations, and notification requirements per IADC Section 5.4 (corresponds to EU Space Act proposal Art. 64(5))

Reference: IADC Guidelines Section 5.4 / ISO 24113:2019 Section 6.2 (EU Space Act proposal Art. 64(1)-(5), COM(2025) 335)
Cross-reference: Document A2 for orbital parameters, Document A3 — Collision Avoidance Operations Plan (full operational detail)

---

**## SECTION: End-of-Life Disposal Plan**

Generate disposal strategy summary. Full technical detail is in Document A4.

**7.1 Disposal Strategy Selection:**
- Available options evaluated per IADC Section 5.3 / ISO 24113 Section 6.4 (corresponds to EU Space Act proposal Art. 72(1)-(5), COM(2025) 335): controlled re-entry, semi-controlled re-entry, natural decay, graveyard orbit (GEO), heliocentric escape
- Selected strategy with justification against IADC/ISO disposal requirements
- For LEO: compliance with IADC Section 5.3.2 25-year rule (corresponds to EU Space Act proposal Art. 72(2))
- For GEO: compliance with IADC Section 5.3.3 300+ km re-orbit requirement (corresponds to EU Space Act proposal Art. 72(3))
- For controlled re-entry: compliance with ISO 24113 Section 6.4 casualty risk < 1:10,000 (corresponds to EU Space Act proposal Art. 72(4))

**7.2 Disposal Maneuver Summary:**

**Table 7.1:** Disposal Maneuver Parameters
| Parameter | Value | Unit |
| Disposal delta-V required | [from A4] | m/s |
| Fuel available at EOL (nominal) | [from A4] | kg / m/s equivalent |
| Fuel available at EOL (worst case) | [from A4] | kg / m/s equivalent |
| Margin (nominal) | [calculated] | % |
| Success probability | [from A4] | % |

**7.3 Contingency Procedures:**
- Summary of contingency approaches if primary disposal fails (detailed in Document A4)
- NCA notification requirements per IADC Section 5.3 / ISO 24113 Section 6.4 (corresponds to EU Space Act proposal Art. 72) if disposal is not achievable

Reference: IADC Guidelines Section 5.3 / ISO 24113:2019 Section 6.3-6.4 (EU Space Act proposal Art. 72(1)-(5), COM(2025) 335)
Cross-reference: Document A4 — End-of-Life Disposal Plan (full technical detail), Document A2 for lifetime calculations

---

**## SECTION: Passivation & Fragmentation Prevention**

Generate comprehensive passivation plan per IADC Guidelines Section 5.2.1 / ISO 24113 Section 6.3 (codified as Art. 67(1)(d) in EU Space Act proposal COM(2025) 335) and IADC Guidelines Section 5.2.3.

**8.1 Energy Sources Inventory:**

**Table 8.1:** Stored Energy Sources
| Source | Type | Quantity | Energy (J) | Passivation Method | Verification |
| Battery | [chemistry] | [capacity Wh] | [calculated] | Discharge + isolation | [criteria] |
| Propellant | [type] | [mass kg] | [calculated] | Depletion burn + venting | [criteria] |
| Pressure vessels | [count] | [pressure bar] | [calculated] | Depressurization | [criteria] |
| Reaction wheels | [count] | [RPM/momentum] | [calculated] | Spin-down | [criteria] |

**8.2 Passivation Sequence:**
For each energy source, define:
- Trigger criteria for initiating passivation
- Step-by-step passivation procedure
- Expected duration of passivation activity
- Telemetry monitoring during passivation
- Completion criteria and verification method

**8.3 Passivation Timeline:**
- Timing relative to end-of-mission decision
- Sequence relative to disposal maneuver (passivation after disposal per IADC recommendation)
- Total passivation campaign duration

**8.4 Fragmentation Risk Assessment:**
- Probability of accidental breakup during operational phase per ISO 24113 Section 6.2
- Probability of accidental breakup post-passivation
- Design for Demise features per ISO 24113 Section 6.2 (corresponds to EU Space Act proposal Art. 59(1)-(4))

Reference: IADC Guidelines Section 5.2.1-5.2.3 / ISO 24113:2019 Section 6.2-6.3 (EU Space Act proposal Art. 67(1)(d), Art. 59(1)-(4), COM(2025) 335)
Cross-reference: Document A5 — Passivation Procedure (full procedural detail)

---

**## SECTION: Trackability & Identification**

Generate trackability measures per IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (codified as Art. 67(1)(e) in EU Space Act proposal COM(2025) 335).

**9.1 Object Registration:**
- EU Space Registry (EUSR) registration per EU Space Act proposal Art. 33-38
- UN Registry notification per EU Space Act proposal Art. 39-44
- NORAD/COSPAR designation tracking

**9.2 Tracking Characteristics:**

**Table 9.1:** Tracking Parameters
| Parameter | Value | Notes |
| Radar cross-section (X-band) | [ACTION REQUIRED] | m² |
| Optical magnitude (V-band) | [ACTION REQUIRED] | mag |
| Minimum trackable size | [derived] | m |

**9.3 Orbit Determination:**
- Onboard GNSS receiver capability (if applicable)
- Ground-based tracking support
- Precision orbit ephemeris generation and sharing cadence
- Data sharing agreements with SSA providers per IADC coordination provisions (corresponds to EU Space Act proposal Art. 63(1)-(2))

**9.4 Constellation Identification (if applicable):**
- Individual object identification methodology per IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (codified as Art. 67(1)(e) in EU Space Act proposal COM(2025) 335) for SCO operators
- Fleet management and tracking data dissemination

Reference: IADC Guidelines Section 5 / ISO 24113:2019 Section 6 (EU Space Act proposal Art. 67(1)(e), Art. 33-44, Art. 63(1)-(2), Art. 68(1)-(4), COM(2025) 335)

---

**## SECTION: Compliance Verification Matrix**

Generate a comprehensive compliance matrix using the enacted-law-first format from the Quality Rules. Use the following column structure:

**Table 10.1:** Debris Mitigation Compliance Matrix

| Enacted Standard | Requirement | National Implementation | Compliance Status | Evidence Reference | EU Space Act Mapping |

The **Enacted Standard** column ALWAYS lists the IADC/ISO reference first. The **EU Space Act Mapping** column lists the corresponding EU Space Act proposal article, ALWAYS marked "(Proposal)".

Include ALL of the following provisions with one row per enacted standard requirement, mapped to corresponding EU Space Act proposal articles:

**IADC Guidelines (enacted):**
- IADC 5.1 — General debris mitigation obligations (EU Space Act proposal Art. 58(1)-(3))
- IADC 5.2.1 — Passivation of energy sources (EU Space Act proposal Art. 67(1)(d))
- IADC 5.2.2 — Collision avoidance (EU Space Act proposal Art. 64(1)-(5))
- IADC 5.2.3 — Fragmentation prevention (EU Space Act proposal Art. 59(1)-(4))
- IADC 5.3.1 — Post-mission orbit lifetime (EU Space Act proposal Art. 72(1))
- IADC 5.3.2 — LEO 25-year rule (EU Space Act proposal Art. 72(2))
- IADC 5.3.3 — GEO re-orbit (EU Space Act proposal Art. 72(3))
- IADC 5.4 — Collision avoidance operations (EU Space Act proposal Art. 64(1)-(5))

**ISO 24113:2019 (enacted):**
- ISO 24113 Section 6.1 — General requirements (EU Space Act proposal Art. 58(1)-(3))
- ISO 24113 Section 6.2 — Prevention of on-orbit breakups (EU Space Act proposal Art. 59(1)-(4), Art. 60(1)-(5))
- ISO 24113 Section 6.3 — Disposal and passivation (EU Space Act proposal Art. 67(1)(a)-(e), Art. 72(1)-(5))
- ISO 24113 Section 6.4 — Post-mission disposal (EU Space Act proposal Art. 72(1)-(5))

**Additional EU Space Act proposal provisions (Proposal):**
- Art. 61(1)-(3) — Operational debris minimization (Proposal)
- Art. 62(1)-(4) — Standards adoption (Proposal)
- Art. 63(1)-(2) — Coordination obligations (Proposal)
- Art. 68(1)-(4) — Light pollution mitigation (Proposal)
- Art. 73(1)-(3) — Supply chain debris mitigation (Proposal)

---

**## SECTION: Gap Analysis & Remediation Roadmap**

Generate prioritized gap analysis based on the Compliance Matrix findings.

**11.1 Gap Summary:**

**Table 11.1:** Identified Compliance Gaps
| Gap ID | Provision | Gap Description | Risk Rating | Impact on Authorization |
(Populate from Compliance Matrix entries with status other than "Compliant")

**11.2 Risk Assessment:**
For each gap: High / Medium / Low risk rating based on:
- Regulatory severity (authorization-blocking vs. post-authorization condition)
- Technical risk (mission safety impact)
- Timeline risk (can it be remediated before authorization decision?)

**11.3 Remediation Plan:**

**Table 11.2:** Remediation Roadmap
| Gap ID | Remediation Action | Responsible Party | Target Date | Dependencies | Status |

**11.4 Implementation Timeline:**
Phased approach:
- **Phase 1 (Pre-submission):** Critical gaps that must be addressed before NCA filing
- **Phase 2 (During review):** Gaps that can be addressed during NCA review period
- **Phase 3 (Post-authorization):** Gaps accepted as conditions of authorization

**11.5 Resource Requirements:**
Personnel, tools, external support, and estimated cost categories for remediation

### Cross-References
- Document A2 — Orbital Lifetime Analysis: detailed decay modeling and 25-year compliance proof
- Document A3 — Collision Avoidance Operations Plan: detailed conjunction assessment procedures
- Document A4 — End-of-Life Disposal Plan: detailed disposal maneuver design and fuel budget
- Document A5 — Passivation Procedure: detailed passivation sequence and verification criteria
- Document A6 — Re-Entry Casualty Risk Assessment: if controlled/uncontrolled re-entry is planned
- Document A7 — Supply Chain Debris Mitigation Plan: debris requirement flow-down to suppliers
- Document A8 — Debris Compliance Verification Matrix: consolidated IADC/ISO compliance summary (mapped to EU Space Act proposal Art. 58-73)

### Key Standards
- IADC Space Debris Mitigation Guidelines (IADC-02-01, Rev. 3, 2021) — primary enacted debris framework
- ISO 24113:2019 — Space debris mitigation requirements (enacted international standard)
- EU Space Act COM(2025) 335, Art. 58-73 (Proposal — with subsection granularity)
- ECSS-U-AS-10C (2023) — Space sustainability
- ESA Space Debris Mitigation Compliance Verification Guidelines
- NASA-STD-8719.14 Rev. B — Process for Limiting Orbital Debris
- ISO 27875:2019 — Re-entry risk management`;
}
