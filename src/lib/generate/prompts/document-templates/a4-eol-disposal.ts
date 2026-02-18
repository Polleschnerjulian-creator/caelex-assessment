/**
 * Generate 2.0 — A4: End-of-Life Disposal Plan Template
 *
 * P0 document. Detailed plan for spacecraft disposal at end of mission,
 * per EU Space Act Art. 72, IADC Guidelines, and ISO 24113:2019.
 * Informed by Document A2 (Orbital Lifetime Analysis).
 */

export function getEOLDisposalTemplate(): string {
  return `## Document-Specific Instructions: A4 — End-of-Life Disposal Plan

This document details the spacecraft disposal strategy at end-of-life, demonstrating compliance with EU Space Act Art. 72(1)-(5) disposal requirements. NCAs require a well-justified disposal approach with quantitative fuel budget analysis, success probability assessment per ISO 24113 (> 90% target), and detailed contingency procedures. This is a key supporting document to the DMP (Document A1) and is informed by the Orbital Lifetime Analysis (Document A2).

NCA reviewers pay particular attention to: (1) disposal delta-V margin analysis, (2) success probability with system reliability breakdown, and (3) contingency procedures for degraded capabilities.

### Required Sections

Generate the following 9 sections. Each section must contain comprehensive, substantive content as specified below.

---

**## SECTION: Cover Page & Document Control**

Generate a formal NCA-submission-grade cover page following the Cover Page Standard from the Quality Rules. Include:
- Document title: "End-of-Life Disposal Plan"
- Document code: A4-EOL
- All elements from the Cover Page Standard (Document Control Block, Approval Block, Distribution List, Revision History)
- Table of Contents listing all 9 sections with subsection numbers

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary following the Executive Summary Standard from the Quality Rules. Specific content:

1. **Mission Context:** Operator, mission, orbital regime, planned mission lifetime, end-of-mission date
2. **Document Purpose:** "This End-of-Life Disposal Plan details the spacecraft disposal strategy in compliance with Art. 72(1)-(5) of the EU Space Act (COM(2025) 335). It provides the quantitative analysis of the disposal maneuver design, fuel budget, success probability, and contingency procedures required for NCA authorization."
3. **Key Findings (5-7 bullets):**
   - **Disposal Strategy:** [selected method] per Art. 72(1)
   - **Disposal Delta-V:** [X] m/s required, [Y] m/s available (margin: [Z]%)
   - **Success Probability:** [X]% combined probability per ISO 24113 (target: > 90%)
   - **25-Year Compliance:** [PASS/FAIL] after disposal (from Document A2)
   - **Fuel Margin:** [X]% above disposal requirement (NCA expectation: 10-20%)
   - **Contingency:** [number] contingency scenarios defined with response procedures
   - **Critical Gaps:** [number and nature]
4. **Evidence Summary:** Analysis tools, heritage data, reliability assessments
5. **Compliance Determination:** Clear statement per Art. 72

Cross-reference: Document A1 (DMP, Section 7), Document A2 (Orbital Lifetime Analysis), Document A5 (Passivation Procedure)

---

**## SECTION: Disposal Strategy Selection**

Generate comprehensive disposal strategy trade-off analysis per Art. 72(1)-(5).

**3.1 Available Options Analysis:**

**Table 3.1:** Disposal Strategy Trade-Off
| Option | Description | Art. 72 Ref. | Applicability | Advantages | Disadvantages | Selected? |
| Controlled re-entry | Targeted re-entry to ocean | Art. 72(4) | LEO with sufficient ΔV | Deterministic, clears orbit immediately | High ΔV, casualty risk analysis required | [Yes/No] |
| Semi-controlled re-entry | Lowered perigee for accelerated decay | Art. 72(2) | LEO | Moderate ΔV, achieves 25-year compliance | Longer decay period, less predictable | [Yes/No] |
| Natural decay | No maneuver, natural atmospheric drag | Art. 72(2) | LEO if already < 25 years | No fuel required | Only if already compliant without maneuver | [Yes/No] |
| Graveyard orbit | Re-orbit 300+ km above GEO | Art. 72(3) | GEO | Proven approach, lower ΔV than re-entry | Permanent debris in graveyard orbit | [Yes/No] |
| Heliocentric escape | Earth escape trajectory | — | MEO/HEO | Complete removal from Earth orbit | Very high ΔV | [Yes/No] |

**3.2 Selected Strategy — Detailed Justification:**
- Rationale for selected approach over alternatives
- Compliance with applicable Art. 72 sub-paragraph:
  - LEO: Art. 72(2) — 25-year post-mission lifetime limit
  - GEO: Art. 72(3) — minimum 300 km re-orbit altitude, eccentricity constraints
  - Controlled re-entry: Art. 72(4) — casualty risk < 1:10,000 per event
- IADC Guidelines Section 5.3 compliance for the orbital regime
- ISO 24113:2019 Section 6.3 requirements assessment
- For controlled re-entry: reference to Document A6 (Re-Entry Casualty Risk Assessment)

**3.3 Art. 72(5) Fuel Reservation:**
Statement of compliance with Art. 72(5) mandatory fuel reservation:
- Fuel reserved specifically for disposal: [X] kg / [Y] m/s
- Protection mechanism against pre-disposal fuel consumption (e.g., operational procedures, fuel budget monitoring triggers)

Reference: Art. 72(1)-(5), IADC Guidelines Section 5.3, ISO 24113:2019 Section 6.3

---

**## SECTION: Disposal Maneuver Design**

Generate detailed maneuver design — the core technical content.

**4.1 Pre-Disposal Orbit State:**

**Table 4.1:** End-of-Mission Orbit Parameters
| Parameter | Value | Unit | Notes |
| Altitude (perigee) | [ACTION REQUIRED] | km | After station-keeping ceases |
| Altitude (apogee) | [ACTION REQUIRED] | km | |
| Eccentricity | [ACTION REQUIRED] | — | |
| Inclination | [ACTION REQUIRED] | deg | |

**4.2 Target Disposal Orbit:**

**Table 4.2:** Disposal Orbit Parameters
| Parameter | Operational Orbit | Disposal Orbit | Change Required |
| Altitude (perigee) | [ACTION REQUIRED] | [target] km | [delta] km |
| Altitude (apogee) | [ACTION REQUIRED] | [target] km | [delta] km |
| Eccentricity | [ACTION REQUIRED] | [target] | [delta] |
| Period | [calculated] | [calculated] | [delta] min |

**4.3 Maneuver Sequence:**

**Table 4.3:** Disposal Maneuver Sequence
| Burn # | Type | Delta-V (m/s) | Duration (s) | True Anomaly | Purpose |
| 1 | [Hohmann/impulse] | [value] | [value] | [value] | [description] |
| 2 | [if multi-burn] | [value] | [value] | [value] | [description] |
| **Total** | | **[total]** | | | |

**4.4 Maneuver Execution Timeline:**

**Table 4.4:** Disposal Campaign Timeline
| Event | Timing | Description |
| EOL decision trigger | T-0 | [criteria for initiating disposal] |
| Pre-disposal systems check | T+1 day | Verify all systems for disposal operations |
| Orbit determination (pre-maneuver) | T+2 days | Precision OD for maneuver targeting |
| Maneuver planning finalization | T+3 days | Final ΔV computation and upload |
| Burn 1 execution | T+5 days | [description] |
| Post-burn 1 OD | T+6 days | Verify achieved orbit |
| Burn 2 execution (if multi-burn) | T+7 days | [description] |
| Disposal orbit confirmation | T+8 days | Final OD confirming disposal orbit achieved |
| Passivation sequence | T+9-12 days | Per Document A5 |
| Disposal campaign completion | T+14 days | NCA notification of disposal completion |

**4.5 Maneuver Accuracy Analysis:**
- Expected maneuver execution accuracy (% of commanded ΔV)
- Orbit determination accuracy before and after maneuver
- Impact of execution errors on disposal orbit and resulting lifetime
- Re-targeting or trim maneuver approach if accuracy is insufficient

Reference: Art. 72(1)-(5), ISO 24113:2019 Section 6.3

---

**## SECTION: Fuel Budget Analysis**

Generate comprehensive fuel budget — NCAs scrutinize margin analysis closely.

**5.1 Total Propellant Budget:**

**Table 5.1:** Complete Mission Fuel Budget
| Phase | Activity | Delta-V (m/s) | Fuel Mass (kg) | % of Total | Cumulative % |
| Launch | Injection correction | [ACTION REQUIRED] | [calculated] | [%] | [%] |
| LEOP | Orbit acquisition/phasing | [ACTION REQUIRED] | [calculated] | [%] | [%] |
| Operations | Station-keeping (annual × years) | [ACTION REQUIRED] | [calculated] | [%] | [%] |
| Operations | Collision avoidance (statistical) | [ACTION REQUIRED] | [calculated] | [%] | [%] |
| Operations | Orbit maintenance | [ACTION REQUIRED] | [calculated] | [%] | [%] |
| **EOL** | **Disposal maneuver** | **[from Section 4]** | **[calculated]** | **[%]** | [%] |
| Reserve | Contingency/margin | [ACTION REQUIRED] | [calculated] | [%] | 100% |
| | **Total propellant capacity** | **[total]** | **[total]** | **100%** | |

**5.2 Fuel Remaining at End-of-Mission:**

**Table 5.2:** End-of-Mission Fuel Availability
| Scenario | Fuel Remaining (kg) | Equivalent ΔV (m/s) | Disposal ΔV Required (m/s) | Margin (m/s) | Margin (%) | Sufficient? |
| Nominal | [calculated] | [calculated] | [from Section 4] | [margin] | [%] | [Yes/No] |
| Worst case | [calculated] | [calculated] | [from Section 4] | [margin] | [%] | [Yes/No] |

Worst case accounts for: extra station-keeping, additional collision avoidance maneuvers (2× statistical), orbit maintenance corrections

**5.3 NCA Fuel Margin Expectation:**
- NCA expectation: 10-20% margin above disposal ΔV requirement per Art. 72(5)
- Achieved margin vs. NCA expectation
- If margin < 10%: risk assessment and mitigation measures

**5.4 Propellant-Less Disposal (if applicable):**
If using drag sail, electrodynamic tether, or other propellant-less system:
- System description and manufacturer heritage
- Deployment reliability analysis
- Effectiveness analysis (acceleration due to drag augmentation)
- Demonstrated heritage on similar missions
- [EVIDENCE: Drag augmentation system test/qualification data]

Reference: Art. 72(5), ISO 24113:2019 Section 6.3

---

**## SECTION: Success Probability**

Generate disposal success probability analysis per ISO 24113 (target: > 90%).

**6.1 Definition of Success:**
Successful disposal = [selected disposal orbit achieved within tolerances] AND [passivation completed] AND [disposal confirmed via orbit determination]

**6.2 Critical System Reliability:**

**Table 6.1:** Disposal-Critical System Reliability Assessment
| System | Subsystem | Reliability (EOL) | Failure Mode | Impact on Disposal | Redundancy |
| Propulsion | Thruster(s) | [ACTION REQUIRED] | Thrust failure | Cannot execute maneuver | [Single/Redundant] |
| Propulsion | Valves | [ACTION REQUIRED] | Stuck closed/open | Partial/no thrust | [details] |
| Propulsion | Feed system | [ACTION REQUIRED] | Blockage/leak | Reduced ΔV available | [details] |
| AOCS | Attitude sensors | [ACTION REQUIRED] | Attitude knowledge loss | Cannot point for maneuver | [details] |
| AOCS | Actuators | [ACTION REQUIRED] | Torque failure | Cannot maintain pointing | [details] |
| Power | Solar arrays | [ACTION REQUIRED] | Power degradation | Insufficient power for ops | [details] |
| Power | Battery | [ACTION REQUIRED] | Capacity loss | Eclipse operation limited | [details] |
| Comms | TT&C link | [ACTION REQUIRED] | Link loss | Cannot command maneuver | [details] |
| OBC | Flight computer | [ACTION REQUIRED] | Processing failure | Cannot execute commands | [details] |

**6.3 Combined Success Probability:**

**Table 6.2:** Disposal Success Probability Calculation
| System | Reliability | Weight | Contribution |
| Propulsion | [R₁] | Critical | [R₁] |
| AOCS | [R₂] | Critical | [R₂] |
| Power | [R₃] | Critical | [R₃] |
| Communications | [R₄] | Critical | [R₄] |
| OBC | [R₅] | Critical | [R₅] |
| **Combined** | **[R₁×R₂×R₃×R₄×R₅]** | | **[result]%** |

**6.4 ISO 24113 Compliance:**
- ISO 24113 target: > 90% probability of successful disposal
- Achieved probability: [X]%
- [PASS/FAIL] against ISO 24113 target
- If below 90%: identify dominant failure contributor and mitigation plan

**6.5 End-of-Life Degradation:**
- How spacecraft aging affects reliability (radiation damage, thermal cycling, mechanism wear)
- Degradation model assumptions
- Impact on success probability vs. beginning-of-life estimates

**6.6 Industry Benchmark:**
- Historical disposal success rates for similar spacecraft/orbit regimes
- Comparison of this mission's probability with industry benchmarks

Reference: ISO 24113:2019 Section 6.3, IADC Guidelines Section 5.3

---

**## SECTION: Contingency Procedures**

Generate contingency plans for disposal failure scenarios — NCAs evaluate preparedness.

**7.1 Failure Scenario Identification:**

**Table 7.1:** Disposal Failure Scenarios
| Scenario ID | Failure | Probability | Root Cause | Consequence for Disposal |
| C-01 | Partial propulsion (50% ΔV) | [estimate] | Thruster degradation, partial blockage | Reduced maneuver capability |
| C-02 | Complete propulsion failure | [estimate] | Thruster failure, feed system failure | No active disposal possible |
| C-03 | Loss of attitude control | [estimate] | AOCS failure, sensor failure | Cannot point for maneuver execution |
| C-04 | Loss of communication | [estimate] | Transmitter failure, antenna failure | Cannot command disposal |
| C-05 | Premature end-of-mission | [estimate] | Anomaly forcing early disposal | Full fuel budget available |
| C-06 | Insufficient fuel | [estimate] | Excess collision avoidance usage | Reduced ΔV for disposal |

**7.2 Contingency Response Matrix:**

**Table 7.2:** Contingency Response Procedures
| Scenario | Response Strategy | Expected Outcome | 25-Year Compliance? |
| C-01: Partial propulsion | Optimized low-ΔV disposal to higher drag orbit | Extended decay, may achieve compliance | [Assess] |
| C-02: No propulsion | Deploy passive deorbit device (if available); accept natural decay | Depends on current orbit | [Assess] |
| C-03: No attitude control | Tumble-mode thruster firing (if possible); ground-based targeting | Reduced accuracy | [Assess] |
| C-04: No communications | Autonomous disposal sequence (if pre-programmed) | Pre-planned maneuver | [Assess] |
| C-05: Premature EOL | Early disposal with full fuel budget | Likely better outcome | [Yes] |
| C-06: Low fuel | Partial disposal maneuver, accept extended decay | Partial compliance | [Assess] |

**7.3 Decision Authority:**
- Decision tree for selecting contingency response
- Authorization chain for contingency activation
- Time constraints for contingency decisions

**7.4 NCA Notification:**
- Per Art. 72: notification to NCA if disposal cannot achieve 25-year compliance
- Notification timeline and content requirements
- Coordination with EU SST for post-contingency tracking

**7.5 Art. 72 Implications:**
If 25-year compliance cannot be achieved under any contingency:
- Gap notification to NCA with remediation assessment
- Potential authorization implications per Art. 114-115
- Long-term monitoring plan for the non-compliant object

Reference: Art. 72, IADC Guidelines Section 5.3, ISO 24113:2019 Section 6.3

---

**## SECTION: Ground Support for Disposal**

Generate ground segment support plan for disposal operations.

**8.1 Ground Station Network:**

**Table 8.1:** Disposal Operations Ground Support
| Station | Location | Capability | Coverage | Role in Disposal |
| [ACTION REQUIRED] | [location] | [TT&C/tracking] | [hours/day] | [primary/backup] |

**8.2 Operations Planning:**
- Pre-disposal orbit determination requirements and accuracy
- Maneuver planning cycle: computation, review, approval, upload
- Post-maneuver orbit determination and verification criteria
- Acceptance criteria for disposal orbit confirmation

**8.3 Operations Team:**
- Staffing requirements during disposal campaign
- Shift coverage for continuous operations (if required)
- Roles and responsibilities during disposal

**8.4 Post-Disposal Monitoring:**
- Tracking duration after disposal (until natural re-entry or handover to SSA)
- Criteria for closing out the disposal campaign
- Data archiving requirements per Art. 72

**8.5 NCA Reporting:**
- Disposal completion report format and timeline per Art. 72
- Content: achieved disposal orbit, passivation status, predicted remaining lifetime
- [EVIDENCE: Template disposal completion report for NCA]

---

**## SECTION: Compliance Matrix**

Generate a compliance matrix at sub-article granularity for Art. 72.

**Table 9.1:** End-of-Life Disposal Compliance Matrix

| Req. ID | Provision | Requirement Description | Compliance Status | Implementation Description | Evidence Reference | Gap Description | Remediation Action | Target Date |

Requirements to map:
- Art. 72(1): General disposal obligation for all space objects
- Art. 72(2): LEO — 25-year post-mission orbital lifetime limit
- Art. 72(3): GEO — re-orbit to 300+ km above GEO altitude, eccentricity constraints
- Art. 72(4): Controlled re-entry — casualty risk < 1:10,000 per event
- Art. 72(5): Fuel reservation — mandatory allocation for disposal with documented margin
- IADC Guideline 5.3.1: Post-mission orbit lifetime < 25 years (LEO)
- IADC Guideline 5.3.2: GEO re-orbit requirements (300+ km, eccentricity < 0.003)
- ISO 24113:2019 Section 6.3.1: Disposal orbit requirements
- ISO 24113:2019 Section 6.3.2: Success probability > 90%
- ISO 24113:2019 Section 6.3.3: Re-entry casualty risk requirements
- Cross-reference entries from Document A1 (DMP) compliance matrix, Section 10

### Cross-References
- Document A1 — Debris Mitigation Plan: master debris document referencing this disposal plan (Section 7)
- Document A2 — Orbital Lifetime Analysis: orbital lifetime predictions informing disposal ΔV requirements
- Document A5 — Passivation Procedure: passivation sequence executed after disposal maneuver
- Document A6 — Re-Entry Casualty Risk Assessment: casualty risk analysis (if controlled/uncontrolled re-entry)

### Key Standards
- EU Space Act COM(2025) 335, Art. 72(1)-(5)
- IADC Space Debris Mitigation Guidelines (IADC-02-01, Rev. 3) Section 5.3
- ISO 24113:2019 Section 6.3
- ECSS-U-AS-10C (2023) — Space sustainability
- ESA Space Debris Mitigation Compliance Verification Guidelines
- NASA-STD-8719.14 Rev. B — Process for Limiting Orbital Debris (for casualty risk methodology)`;
}
