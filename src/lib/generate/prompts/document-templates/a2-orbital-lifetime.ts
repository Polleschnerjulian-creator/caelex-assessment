/**
 * Generate 2.0 — A2: Orbital Lifetime Analysis Template
 *
 * P0 document. Technical analysis demonstrating compliance with the
 * 25-year post-mission orbital lifetime rule per EU Space Act Art. 72.
 */

export function getOrbitalLifetimeTemplate(): string {
  return `## Document-Specific Instructions: A2 — Orbital Lifetime Analysis

This document provides the technical analysis demonstrating compliance with the 25-year post-mission orbital lifetime requirement under EU Space Act Art. 72. NCAs expect rigorous quantitative analysis with clearly stated assumptions, validated models, and sensitivity analysis. This document directly supports the DMP (Document A1) and EOL Disposal Plan (Document A4).

### Required Sections

Generate the following 9 sections. Each section must contain the specified content.

---

**## SECTION: Cover Page & Document Control**

Generate a formal cover page including:
- Document title: "Orbital Lifetime Analysis"
- Document code: A2-OLA
- Operator name, mission name, document version, date
- Classification level
- Revision history table: Version | Date | Author | Description of Changes
- Document approval table: Role | Name | Signature | Date
- Distribution list

---

**## SECTION: Executive Summary**

Generate a concise executive summary covering:
- Purpose: demonstrate compliance with the 25-year post-mission orbital lifetime rule per Art. 72 of the EU Space Act
- Key result: predicted orbital lifetime after end-of-mission (with and without disposal maneuver)
- Compliance determination: PASS / FAIL with margin
- Summary of critical assumptions (solar activity, atmospheric model, ballistic coefficient)
- If disposal maneuver is required: summary of delta-V requirement and fuel availability
- Reference to IADC Guidelines Section 5.3.1 and ISO 24113:2019 Section 6.3

---

**## SECTION: Orbital Parameters**

Generate detailed orbital parameter characterization:
- Initial operational orbit table:
  | Parameter | Value | Unit |
  Including: semi-major axis, altitude (perigee/apogee), eccentricity, inclination, RAAN, argument of perigee, mean anomaly, orbital period
- If constellation: orbital parameters for each plane and any variation across the constellation
- Orbit regime classification and relationship to IADC-defined protected regions
- LEO protected region: below 2,000 km altitude — if operational orbit is within this region, the 25-year rule applies directly
- GEO protected region: GEO altitude +/- 200 km, +/- 15 deg latitude — if applicable, describe re-orbit requirements instead
- Any planned orbit changes during mission lifetime (orbit raising/lowering, plane changes)
- Post-mission disposal orbit parameters (if disposal maneuver is planned)

---

**## SECTION: Atmospheric Drag Analysis**

Generate atmospheric drag modeling analysis:
- Atmospheric density model selection: identify model used (e.g., NRLMSISE-00, JB2008, DTM-2013) and justify selection
- Key spacecraft parameters affecting drag:
  - Mass at end-of-life (kg)
  - Cross-sectional area: minimum, maximum, and average (m2)
  - Drag coefficient (Cd) — typically 2.0-2.2 for LEO, justify value used
  - Ballistic coefficient calculation: BC = m / (Cd * A)
- Drag force estimation methodology
- Orbit-averaged vs. instantaneous drag considerations
- Effect of atmospheric rotation on drag for different inclinations
- Limitations and uncertainties in atmospheric modeling at the operational altitude
- Reference ISO 24113 Section 6.3 drag modeling requirements

---

**## SECTION: Solar Activity Projections**

Generate solar activity analysis:
- Solar cycle context: identify the current solar cycle and its phase
- Solar activity proxy: F10.7 solar flux index projections
  - Provide or reference projected F10.7 values for the analysis period
  - Identify data source (e.g., MSFC Solar Cycle Prediction, NOAA/SWPC)
- Analysis cases — NCAs typically expect three scenarios:
  | Scenario | Solar Activity | F10.7 Profile | Purpose |
  | Nominal | Medium/expected | Best-estimate cycle | Primary compliance case |
  | Conservative | Low activity | -2 sigma | Worst-case for decay (longest lifetime) |
  | Optimistic | High activity | +2 sigma | Best-case for decay (shortest lifetime) |
- Geomagnetic activity assumptions (Ap/Kp index projections)
- Impact of solar cycle uncertainty on orbital lifetime prediction
- IADC recommendation: use the +2 sigma (conservative/low activity) case for compliance assessment since lower solar activity means less atmospheric drag and longer orbital lifetime
- Reference IADC Guidelines Section 5.3.1 on solar activity assumptions

---

**## SECTION: Decay Modeling Results**

Generate orbital decay modeling results:
- Propagation tool/software identification (e.g., STELA, DRAMA, GMAT, STK Lifetime) and version
- Propagation methodology: semi-analytical, numerical, or analytical — justify selection
- Initial conditions: state vector or orbital elements at end-of-mission epoch
- Key assumptions table:
  | Parameter | Value | Justification |
  Including: atmospheric model, solar activity scenario, drag coefficient, area-to-mass ratio, tumbling assumption post-passivation
- Results for each solar activity scenario:
  | Scenario | Predicted Lifetime (years) | Re-entry Date | 25-Year Compliant? |
- Orbit altitude vs. time plot description (describe the expected decay curve shape)
- For disposal maneuver case: post-maneuver orbit parameters and resulting lifetime
- Comparison of natural decay vs. assisted disposal if applicable
- Confidence level and uncertainty bounds on the prediction
- Reference to validation of the propagation tool against historical re-entries

---

**## SECTION: 25-Year Compliance Assessment**

Generate formal compliance determination:
- State the requirement: per Art. 72 of the EU Space Act and IADC Guidelines Section 5.3.1, the orbital lifetime after end-of-mission shall not exceed 25 years
- Compliance determination for each scenario:
  | Scenario | Predicted Lifetime | 25-Year Limit | Margin | Status |
- Use the CONSERVATIVE (low solar activity) case as the primary compliance case per IADC recommendation
- If compliant: state compliance with margin and confidence level
- If not compliant without disposal maneuver:
  - Required disposal maneuver delta-V to achieve compliance
  - Target disposal orbit altitude
  - Resulting post-maneuver orbital lifetime
  - Fuel availability and margin analysis (cross-reference Document A4)
  - Compliance determination after disposal maneuver
- If not compliant even with disposal: identify the gap and remediation plan
- NCA recommendation: NCAs typically expect a minimum margin of 20% on the 25-year limit (i.e., predicted lifetime should be well below 20 years) for robust compliance
- Reference Art. 72, IADC Guidelines 5.3.1, ISO 24113 Section 6.3

---

**## SECTION: Sensitivity Analysis**

Generate sensitivity analysis on key parameters:
- Identify the parameters with the greatest impact on orbital lifetime prediction
- Sensitivity analysis table — vary each parameter independently:
  | Parameter | Baseline Value | Variation Range | Lifetime Impact (years) | Sensitivity Rating |
  Parameters to analyze:
  - Ballistic coefficient (+/- 20%)
  - Solar activity (low, medium, high)
  - Drag coefficient (+/- 10%)
  - End-of-life mass (accounting for fuel uncertainty)
  - Initial altitude (accounting for orbit maintenance accuracy)
  - Tumbling vs. stable attitude post-passivation
- Identify the dominant uncertainty driver
- Monte Carlo analysis (if performed): distribution of predicted lifetimes, percentile values
- Combined worst-case analysis: all adverse parameters simultaneously
- Impact assessment: does the compliance determination change under any sensitivity case?
- Recommendations for reducing uncertainty (e.g., improved drag coefficient measurement, attitude stabilization)

---

**## SECTION: Conclusions**

Generate formal conclusions:
- Restate the 25-year compliance requirement and applicable regulations
- Summarize the analysis methodology and key assumptions
- State the compliance determination clearly:
  - "Based on the analysis presented in this document, the [Mission Name] mission [MEETS / DOES NOT MEET] the 25-year post-mission orbital lifetime requirement of Art. 72 of the EU Space Act and IADC Guidelines Section 5.3.1."
- If disposal maneuver is required: summarize the maneuver requirement and confirm fuel availability
- Key caveats and limitations of the analysis
- Recommendations for ongoing monitoring and analysis updates
- Recommended review triggers: significant changes in solar cycle predictions, mission design changes, spacecraft mass changes

### Cross-References
- Document A1 — Debris Mitigation Plan: master debris document referencing this analysis
- Document A4 — End-of-Life Disposal Plan: disposal maneuver design informed by this analysis
- Document A5 — Passivation Procedure: post-passivation spacecraft state assumed in this analysis

### Key Standards
- EU Space Act COM(2025) 335, Art. 72
- IADC Space Debris Mitigation Guidelines Section 5.3.1
- ISO 24113:2019 Section 6.3
- ESA DRAMA software suite documentation
- ECSS-U-AS-10C — Space sustainability`;
}
