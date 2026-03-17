/**
 * Generate 2.0 — A2: Orbital Lifetime Analysis Template
 *
 * P0 document. Technical analysis demonstrating compliance with the
 * IADC 25-year post-mission orbital lifetime requirement (IADC Section 5.3.2
 * / ISO 24113 Section 6.3.3; corresponds to EU Space Act proposal Art. 72,
 * COM(2025) 335).
 * This document directly supports the DMP (A1) and informs the EOL Disposal Plan (A4).
 */

export function getOrbitalLifetimeTemplate(): string {
  return `## Document-Specific Instructions: A2 — Orbital Lifetime Analysis

This document provides the rigorous technical analysis demonstrating compliance with the IADC 25-year post-mission orbital lifetime requirement (IADC Guidelines Section 5.3.2 / ISO 24113:2019 Section 6.3.3; corresponds to EU Space Act proposal Art. 72(2), COM(2025) 335). NCAs expect quantitative analysis with clearly stated assumptions, validated propagation models, multiple solar activity scenarios, sensitivity analysis, and explicit compliance determination with margins. This is a technically critical document — NCA reviewers (typically orbital mechanics engineers) will scrutinize the methodology, assumptions, and margin analysis.

This document directly supports the DMP (Document A1, Section 5) and informs the EOL Disposal Plan (Document A4) regarding disposal delta-V requirements.

### Required Sections

Generate the following 9 sections. Each section must contain comprehensive, substantive technical content as specified below.

---

**## SECTION: Cover Page & Document Control**

Generate a formal NCA-submission-grade cover page following the Cover Page Standard from the Quality Rules. Include:
- Document title: "Orbital Lifetime Analysis"
- Document code: A2-OLA
- All elements from the Cover Page Standard (Document Control Block, Approval Block, Distribution List, Revision History)
- Table of Contents listing all 9 sections with subsection numbers

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary following the Executive Summary Standard from the Quality Rules. Specific content:

1. **Mission Context:** Operator, mission name, orbital regime, planned mission lifetime
2. **Document Purpose:** "This Orbital Lifetime Analysis demonstrates compliance with the IADC 25-year post-mission orbital lifetime requirement (IADC Guidelines Section 5.3.2 / ISO 24113:2019 Section 6.3.3), the primary enacted international standards for orbital lifetime limitation. It also maps compliance to the EU Space Act proposal (COM(2025) 335), Art. 72(2). It provides the quantitative basis for the disposal strategy described in Document A4 and referenced by the DMP (Document A1)."
3. **Key Findings (5-7 bullets):**
   - **Primary Result:** Predicted orbital lifetime under conservative scenario: [X] years
   - **25-Year Compliance:** [PASS/FAIL] with [X]% margin under conservative case
   - **Disposal Maneuver:** [Required/Not required] — [X] m/s delta-V if required
   - **Critical Assumption:** Solar activity scenario driving compliance determination
   - **Sensitivity:** Most sensitive parameter identified with impact range
   - **Confidence Level:** [High/Medium/Low] based on model validation and uncertainty bounds
4. **Evidence Summary:** Propagation tool, atmospheric model, validation references
5. **Compliance Determination:** "Based on the analysis presented in this document, the [Mission Name] mission [MEETS / DOES NOT MEET] the IADC 25-year post-mission orbital lifetime requirement (IADC Section 5.3.2 / ISO 24113 Section 6.3.3; corresponds to EU Space Act proposal Art. 72(2), COM(2025) 335) under the conservative (low solar activity) scenario with a margin of [X] years ([Y]%)."

---

**## SECTION: Orbital Parameters**

Generate detailed orbital parameter characterization establishing the technical baseline.

**3.1 Operational Orbit:**

**Table 3.1:** Initial Operational Orbit Parameters
| Parameter | Value | Unit | Source/Justification |
| Semi-major axis | [ACTION REQUIRED] | km | Mission design baseline |
| Altitude (perigee) | [ACTION REQUIRED] | km | |
| Altitude (apogee) | [ACTION REQUIRED] | km | |
| Eccentricity | [ACTION REQUIRED] | — | |
| Inclination | [ACTION REQUIRED] | deg | |
| RAAN | [ACTION REQUIRED] | deg | |
| Argument of Perigee | [ACTION REQUIRED] | deg | |
| Mean Anomaly | [ACTION REQUIRED] | deg | Epoch: [date] |
| Orbital Period | [calculated] | min | |

**3.2 Orbit Regime Classification:**
- Classification per IADC: LEO (< 2,000 km), MEO, GEO, HEO
- IADC Protected Region assessment:
  - LEO Protected Region: up to 2,000 km altitude — IADC 25-year post-mission orbital lifetime requirement applies (IADC Section 5.3.2; corresponds to EU Space Act proposal Art. 72(2))
  - GEO Protected Region: GEO ± 200 km altitude, ± 15° latitude — IADC re-orbit requirement applies (IADC Section 5.3.3; corresponds to EU Space Act proposal Art. 72(3))
- Explicit statement of which disposal requirement applies based on orbital regime

**3.3 Constellation Parameters (if applicable):**
- Number of orbital planes, altitude/inclination per plane
- Variation in orbital parameters across the constellation
- Impact of orbital plane differences on lifetime predictions

**3.4 Planned Orbit Changes:**
- Any orbit raising/lowering during operational phase
- Station-keeping strategy and its effect on end-of-mission orbit
- Post-mission disposal orbit parameters (if disposal maneuver is planned)

Reference: IADC Guidelines Section 5.3 / ISO 24113:2019 Section 6.3-6.4 (EU Space Act proposal Art. 72(1)-(3), COM(2025) 335)

---

**## SECTION: Atmospheric Drag Analysis**

Generate atmospheric drag modeling methodology — the core physical model driving lifetime predictions.

**4.1 Atmospheric Density Model:**
- Model selected: [e.g., NRLMSISE-00 / JB2008 / DTM-2013]
- Justification for model selection (accuracy at operational altitude, heritage, NCA acceptance)
- Model limitations at the operational altitude regime
- Comparison with alternative models (if performed)

**4.2 Spacecraft Drag Parameters:**

**Table 4.1:** Drag Parameters
| Parameter | Value | Unit | Source/Justification |
| End-of-life mass | [ACTION REQUIRED] | kg | After fuel depletion |
| Cross-sectional area (min) | [ACTION REQUIRED] | m² | Ram direction, stabilized |
| Cross-sectional area (max) | [ACTION REQUIRED] | m² | Maximum, deployed |
| Cross-sectional area (tumble avg) | [ACTION REQUIRED] | m² | Post-passivation tumble |
| Drag coefficient (Cd) | [2.0-2.2] | — | [Justify value] |
| Ballistic coefficient (BC) | [calculated: m/(Cd×A)] | kg/m² | |

**4.3 Drag Analysis Methodology:**
- Drag force equation and averaging approach (orbit-averaged vs. instantaneous)
- Treatment of atmospheric rotation effects at operational inclination
- Altitude-dependent atmospheric density variation across orbit
- Long-term secular effects on orbital elements

**4.4 Post-Passivation Attitude Assumption:**
- Stabilized vs. tumbling assumption after passivation
- Impact on effective cross-sectional area (critical for lifetime)
- Justification: IADC recommends using tumble-averaged area for conservative analysis

Reference: ISO 24113:2019 Section 6.3, IADC Guidelines Section 5.3.1

---

**## SECTION: Solar Activity Projections**

Generate solar activity analysis — the primary external uncertainty in lifetime predictions.

**5.1 Solar Cycle Context:**
- Current solar cycle number and phase
- Expected solar cycle peak/minimum dates
- Relevance to mission end-of-life timeline

**5.2 Solar Activity Scenarios:**

**Table 5.1:** Solar Activity Scenarios for Analysis
| Scenario | Purpose | F10.7 Profile | Data Source |
| Nominal | Best-estimate cycle | Mean prediction | MSFC Solar Cycle Prediction |
| Conservative | Worst-case lifetime (low drag) | -2σ prediction | NOAA/SWPC |
| Optimistic | Best-case lifetime (high drag) | +2σ prediction | NOAA/SWPC |

- Detailed F10.7 solar flux index projections for each scenario covering the analysis period
- Geomagnetic activity (Ap/Kp index) projections and correlation with F10.7

**5.3 IADC Compliance Note:**
Per IADC Guidelines Section 5.3.1: The CONSERVATIVE (low solar activity, -2σ) scenario shall be used as the primary compliance assessment case, because:
- Lower solar activity → lower atmospheric density → less drag → longer orbital lifetime
- This is the worst case for 25-year compliance
- NCAs require compliance demonstration under this conservative assumption

**5.4 Solar Cycle Uncertainty Impact:**
- Quantified impact of solar cycle uncertainty on predicted lifetime
- Range of predicted lifetimes across scenarios

Reference: IADC Guidelines Section 5.3.1, ISO 24113:2019 Section 6.3

---

**## SECTION: Decay Modeling Results**

Generate orbital decay modeling results — the core quantitative output.

**6.1 Propagation Tool:**
- Tool/software: [e.g., STELA v3.x (CNES), DRAMA (ESA), GMAT (NASA), STK Lifetime (AGI)]
- Version number and validation status
- [EVIDENCE: Propagation tool validation report or reference to published validation study]

**6.2 Propagation Configuration:**

**Table 6.1:** Propagation Assumptions
| Parameter | Value | Justification |
| Atmospheric model | [selected model] | [justification] |
| Solar activity | Per scenario (Table 5.1) | IADC recommendation |
| Drag coefficient | [value] | [justification] |
| Area-to-mass ratio | [value] m²/kg | [end-of-life configuration] |
| Attitude assumption | [Stabilized/Tumbling] | [justification] |
| Solar radiation pressure | [Included/Excluded] | [justification] |
| Third-body perturbations | [Included/Excluded] | [Moon/Sun effects] |
| Initial epoch | [date] | End-of-mission date |
| Initial state | [orbital elements from Section 3] | End-of-mission orbit |

**6.3 Results — Natural Decay (No Disposal Maneuver):**

**Table 6.2:** Natural Decay Predictions
| Scenario | Predicted Lifetime (years) | Re-entry Date | 25-Year Compliant? | Margin (years) |
| Nominal | [result] | [date] | [Yes/No] | [margin] |
| Conservative (-2σ) | [result] | [date] | [Yes/No] | [margin] |
| Optimistic (+2σ) | [result] | [date] | [Yes/No] | [margin] |

**6.4 Results — Post-Disposal Maneuver (if applicable):**

**Table 6.3:** Post-Disposal Maneuver Predictions
| Scenario | Disposal Altitude (km) | Predicted Lifetime (years) | 25-Year Compliant? | Margin (years) |
| Nominal | [target] | [result] | [Yes/No] | [margin] |
| Conservative (-2σ) | [target] | [result] | [Yes/No] | [margin] |

**6.5 Decay Curve Description:**
- Describe the expected orbital decay profile (altitude vs. time)
- Key inflection points (e.g., rapid decay below ~300 km due to exponential density increase)
- Comparison of natural decay vs. post-maneuver decay curves

Reference: IADC Guidelines Section 5.3.1-5.3.2 / ISO 24113:2019 Section 6.3 (EU Space Act proposal Art. 72(2), COM(2025) 335)

---

**## SECTION: 25-Year Compliance Assessment**

Generate the formal compliance determination — the most scrutinized section by NCAs.

**7.1 Regulatory Requirement Statement:**
Per IADC Guidelines Section 5.3.2: Post-mission orbital lifetime in the LEO protected region shall not exceed 25 years from the end of the operational mission, using conservative solar activity assumptions.
Per ISO 24113:2019 Section 6.3.3: The post-mission orbital lifetime shall be limited in accordance with the 25-year requirement.
(These enacted requirements correspond to EU Space Act proposal Art. 72(2), COM(2025) 335: "For space objects in low Earth orbit, the post-mission orbital lifetime shall not exceed 25 years from the end of the operational mission.")

**7.2 Compliance Determination:**

**Table 7.1:** 25-Year Compliance Assessment
| Scenario | Predicted Lifetime | 25-Year Limit | Margin (years) | Margin (%) | Status |
| Nominal | [result] | 25 years | [margin] | [%] | [PASS/FAIL] |
| Conservative (-2σ) | [result] | 25 years | [margin] | [%] | [PASS/FAIL] |

**PRIMARY COMPLIANCE CASE:** The conservative (-2σ) scenario per IADC recommendation.

**7.3 Margin Analysis:**
- NCA expectation: typical margin of ≥ 20% (predicted lifetime ≤ 20 years) for robust compliance
- Achieved margin vs. NCA expectation
- If margin is thin (< 20%): discuss risk factors and mitigation measures

**7.4 If Not Compliant Without Disposal Maneuver:**
- Required disposal delta-V to achieve 25-year compliance
- Target disposal orbit altitude
- Post-maneuver predicted lifetime
- Fuel availability and margin (cross-reference Document A4)
- Compliance determination after disposal maneuver

**7.5 If Not Compliant Even With Disposal:**
- Gap identification with specific regulatory reference
- Remediation plan (e.g., alternative disposal technology, mission redesign)
- NCA notification requirements

**7.6 Compliance Statement:**
"Based on the analysis presented in this document, using the conservative solar activity scenario (-2σ) as the primary compliance case per IADC Guidelines Section 5.3.1, the [Mission Name] mission [MEETS / DOES NOT MEET] the IADC 25-year post-mission orbital lifetime requirement (IADC Section 5.3.2 / ISO 24113 Section 6.3.3; corresponds to EU Space Act proposal Art. 72(2), COM(2025) 335) with a margin of [X] years ([Y]%)."

Reference: IADC Guidelines Section 5.3.1-5.3.2 / ISO 24113:2019 Section 6.3 (EU Space Act proposal Art. 72(2), COM(2025) 335)

---

**## SECTION: Sensitivity Analysis**

Generate comprehensive sensitivity analysis to characterize prediction uncertainty.

**8.1 Parameter Sensitivity:**

**Table 8.1:** Sensitivity Analysis Results
| Parameter | Baseline | Low Variation | High Variation | Lifetime Range (years) | Sensitivity |
| Ballistic coefficient | [baseline] | -20% | +20% | [min]-[max] | [High/Med/Low] |
| Solar activity | Nominal | -2σ | +2σ | [min]-[max] | [High/Med/Low] |
| Drag coefficient | [baseline] | -10% | +10% | [min]-[max] | [High/Med/Low] |
| End-of-life mass | [baseline] | -10% | +10% | [min]-[max] | [High/Med/Low] |
| Initial altitude | [baseline] | -5 km | +5 km | [min]-[max] | [High/Med/Low] |
| Attitude (tumble vs. stable) | Tumble | Stable (min area) | Stable (max area) | [min]-[max] | [High/Med/Low] |

**8.2 Dominant Uncertainty Driver:**
- Identify which parameter has the greatest impact on predicted lifetime
- Discuss implications for compliance margin

**8.3 Monte Carlo Analysis (if performed):**
- Number of samples, parameter distributions, correlation assumptions
- Median predicted lifetime, 5th/95th percentile bounds
- Probability of exceeding 25-year limit

**8.4 Combined Worst-Case:**
- All adverse parameters simultaneously
- Resulting predicted lifetime
- Impact on compliance determination

**8.5 Recommendations:**
- Actions to reduce dominant uncertainties (e.g., improved Cd measurement, attitude stabilization)
- Recommended analysis updates during mission lifecycle

Reference: ISO 24113:2019 Section 6.3, ESA Space Debris Mitigation Compliance Verification Guidelines

---

**## SECTION: Conclusions & Recommendations**

Generate formal conclusions with clear regulatory determination.

**9.1 Compliance Summary:**
- Restate the IADC 25-year post-mission orbital lifetime requirement (IADC Section 5.3.2 / ISO 24113 Section 6.3.3; corresponds to EU Space Act proposal Art. 72(2))
- Summarize methodology: tool, model, scenarios
- State the compliance determination unambiguously

**9.2 Key Results:**
- Predicted orbital lifetime (conservative case): [X] years
- 25-year margin: [X] years ([Y]%)
- Disposal maneuver required: [Yes/No]
- If yes: delta-V = [X] m/s, fuel available: [Y] m/s, margin: [Z]%

**9.3 Caveats and Limitations:**
- Model accuracy limitations at operational altitude
- Solar cycle prediction uncertainty
- Spacecraft configuration assumptions post-passivation
- Any simplifying assumptions in the analysis

**9.4 Recommendations:**
- Review triggers: significant solar cycle prediction updates, mission design changes, spacecraft mass changes
- Recommended analysis update frequency (annually or upon significant changes)
- Pre-disposal orbit determination requirements for maneuver targeting
- Recommended updates to this analysis before authorization renewal

### Cross-References
- Document A1 — Debris Mitigation Plan: master debris document referencing this analysis (Section 5)
- Document A4 — End-of-Life Disposal Plan: disposal maneuver design informed by this analysis
- Document A5 — Passivation Procedure: post-passivation spacecraft state assumed in this analysis

### Key Standards
- IADC Space Debris Mitigation Guidelines (IADC-02-01, Rev. 3) Section 5.3.1-5.3.2 — primary enacted orbital lifetime framework
- ISO 24113:2019 Section 6.3 — enacted international standard for orbital lifetime requirements
- EU Space Act COM(2025) 335, Art. 72(1)-(5) (Proposal)
- ECSS-U-AS-10C (2023) — Space sustainability
- ESA DRAMA software suite documentation (if DRAMA used)
- CNES STELA software documentation (if STELA used)`;
}
