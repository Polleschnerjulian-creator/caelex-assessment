/**
 * Generate 2.0 — C2: Environmental Footprint Declaration (EFD) Template
 *
 * P0 document. Environmental Footprint Declaration per EU Space Act Art. 44-46,
 * aligned with ISO 14040/14044 lifecycle assessment methodology. Required for
 * NCA authorization to demonstrate environmental impact assessment and mitigation.
 */

export function getEnvironmentalFootprintTemplate(): string {
  return `## Document-Specific Instructions: C2 — Environmental Footprint Declaration (EFD)

This document is the Environmental Footprint Declaration required under EU Space Act Art. 44-46. It must demonstrate comprehensive lifecycle environmental impact assessment aligned with ISO 14040/14044 methodology. NCAs use this to evaluate the operator's environmental stewardship and compliance with sustainability requirements.

The EFD must be technically rigorous, quantitative where data is available, and transparent about data gaps and assumptions. It should enable an NCA reviewer to independently assess the operator's environmental impact and mitigation commitments.

### Required Sections

Generate the following 11 sections. Each section must contain comprehensive, substantive content as specified below. Do NOT produce summaries — produce full professional analysis for each section.

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary. Include:
1. **Mission Context:** Operator, mission type, orbital regime, spacecraft characteristics
2. **Document Purpose:** "This Environmental Footprint Declaration is prepared in compliance with Art. 44-46 of the EU Space Act (COM(2025) 335) and constitutes a required element of the NCA authorization submission package. The assessment follows ISO 14040/14044 lifecycle assessment methodology."
3. **Key Findings (5-7 bullets):**
   - **EFD Grade:** Assigned grade based on Art. 45 criteria with justification summary
   - **Total GWP:** Global Warming Potential in kg CO2eq for the complete mission lifecycle
   - **Total ODP:** Ozone Depletion Potential in kg CFC-11 eq
   - **Carbon Intensity:** kg CO2eq per kg of payload delivered to orbit
   - **Dominant Impact Phase:** Which lifecycle phase contributes most to environmental impact
   - **Mitigation Effectiveness:** Summary of mitigation measures and their estimated impact reduction
   - **Data Quality Assessment:** Completeness and reliability of environmental data
4. **Compliance Determination:** Clear statement per Art. 44-46

Cross-reference: A1 (DMP) for debris-related environmental considerations, C1 (Authorization Application) for overall compliance context.

---

**## SECTION: Mission Profile**

Generate a detailed mission profile focused on environmental impact parameters. Include:
- **Operator:** Organization name, type, establishment country
- **Mission Name and Type:** Scientific, commercial, defense, or dual-use
- **Spacecraft Specifications:** Mass (dry/wet), dimensions, power system type, propellant type and mass
- **Orbital Parameters:** Target orbit, altitude, inclination, planned lifetime
- **Constellation Details:** (if applicable) Number of spacecraft, replacement strategy
- **Launch Configuration:** Launch vehicle, launch site, shared/dedicated launch, payload share percentage
- **Deorbit Strategy:** Planned disposal method and timeline
- **Mission Lifetime:** From manufacturing through end-of-life including ground segment operations

---

**## SECTION: Lifecycle Assessment Methodology**

Generate a detailed description of the LCA approach. Include:
- **Standard Compliance:** Alignment with ISO 14040 (Principles and Framework) and ISO 14044 (Requirements and Guidelines)
- **Goal and Scope Definition:** Purpose of the LCA, intended audience, system boundaries
- **Functional Unit:** Definition of the functional unit for comparison (e.g., "delivery of 1 kg payload to LEO for 5 years of operational service")
- **System Boundaries:** What is included/excluded — manufacturing, transport, launch, operations, end-of-life
- **Impact Categories:** GWP (Global Warming Potential), ODP (Ozone Depletion Potential), AP (Acidification Potential), EP (Eutrophication Potential), land use
- **Data Sources:** Primary data (operator-specific), secondary data (databases: ecoinvent, ELCD), literature values
- **Data Quality Assessment:** Temporal, geographical, and technological representativeness
- **Allocation Procedures:** How shared launch impacts are allocated (mass-based, volume-based, economic)
- **Assumptions and Limitations:** Key assumptions, data gaps, and their impact on results

---

**## SECTION: Launch Vehicle Analysis**

Generate a detailed launch vehicle environmental impact analysis. Include:
- **Launch Vehicle Identification:** Type, manufacturer, propellant configuration
- **Propellant Emissions Profile:** Fuel type (RP-1, LH2, solid, hypergolic), oxidizer, exhaust products
- **Emission Quantities:** CO2, H2O, Al2O3, HCl, NOx, soot — per launch and allocated share
- **Atmospheric Deposition:** Stratospheric ozone impact, black carbon deposition
- **Launch Site Impact:** Ground-level emissions, noise, land use
- **Shared Launch Allocation:** Methodology for allocating environmental burden (operator's payload share: percentage of total)
- **Comparison with Alternatives:** Brief comparison with alternative launch vehicles if data available
- **Launch Frequency Impact:** (for constellations) Total lifecycle launch burden including replacements

Reference Art. 45 requirements for launch-phase environmental assessment.

---

**## SECTION: Propellant Analysis**

Generate a spacecraft propellant type assessment. Include:
- **Propellant System:** Type (chemical mono/bipropellant, electric, cold gas, none), specific impulse, total mass
- **Emissions Profile:** Exhaust products during orbital maneuvers, station-keeping, and disposal burns
- **In-Orbit Environmental Impact:** Contribution to orbital environment contamination
- **Green Alternatives Assessment:** Analysis of greener propellant alternatives considered (e.g., AF-M315E, LMP-103S)
- **Propellant Lifecycle:** Manufacturing, transport, handling, and storage environmental impact
- **Passivation Impact:** Environmental considerations of end-of-life propellant venting

If spacecraft has no propulsion system, state this explicitly and note the environmental implications (e.g., no active deorbit capability, reliance on atmospheric drag).

---

**## SECTION: Lifecycle Phase Breakdown**

Generate a phase-by-phase environmental impact breakdown. For EACH phase:

1. **Manufacturing Phase:**
   - Raw materials extraction and processing
   - Component manufacturing (solar cells, batteries, electronics, structures)
   - Assembly and integration
   - Testing (thermal vacuum, vibration, EMC)
   - Facility energy consumption

2. **Transport & Integration Phase:**
   - Spacecraft transport to launch site
   - Launch campaign operations
   - Ground support equipment

3. **Launch Phase:**
   - Propellant production and transport
   - Launch vehicle manufacturing (allocated share)
   - Launch emissions (atmospheric)
   - Launch site ground-level impact

4. **Operations Phase:**
   - Ground station energy consumption
   - Mission control center operations
   - Data processing and distribution
   - Station-keeping propellant consumption

5. **End-of-Life Phase:**
   - Disposal maneuver propellant
   - Re-entry emissions and debris
   - Ground segment decommissioning

Present results in tabular format with GWP, ODP, and other impact categories per phase.

---

**## SECTION: Supplier Data Summary**

Generate a status report on supplier environmental data collection. Include:
- **Data Collection Framework:** How supplier environmental data is requested and validated
- **Supplier Response Status:** Table of key suppliers with data provision status (received/pending/not available)
- **Data Gaps:** Identified gaps in supplier data and their significance
- **Assumptions for Missing Data:** How gaps are filled (industry averages, literature values, conservative estimates)
- **Supply Chain Environmental Hotspots:** Suppliers or components with highest environmental contribution
- **Improvement Plan:** Steps to improve supplier data quality for future declarations

---

**## SECTION: Hotspot Identification**

Generate a hotspot analysis identifying the key environmental impact drivers. Include:
- **Phase Hotspot:** Which lifecycle phase dominates overall environmental impact (typically launch)
- **Component Hotspot:** Which spacecraft components or subsystems have highest environmental footprint
- **Supply Chain Hotspot:** Which supplier activities contribute most to environmental burden
- **Sensitivity Analysis:** How results change with key assumption variations
- **Comparison with Benchmarks:** How this mission compares to industry averages for similar mission types
- **Pareto Analysis:** Identify the 20% of activities causing 80% of impact

---

**## SECTION: Mitigation Measures**

Generate a comprehensive mitigation measures assessment. Include:
- **Implemented Measures:** Actions already taken to reduce environmental footprint, with estimated impact reduction
- **Planned Measures:** Actions committed to for future implementation, with timeline
- **Considered but Rejected:** Measures evaluated but not adopted, with justification
- **Technology Roadmap:** Future technology improvements expected to reduce impact
- **Offsetting Measures:** (if applicable) Carbon offset or environmental compensation programs
- **Continuous Improvement:** Framework for ongoing environmental performance monitoring and improvement

For each measure, provide: description, applicable lifecycle phase, estimated impact reduction (quantitative where possible), implementation status, and timeline.

---

**## SECTION: EFD Grade Justification**

Generate a formal EFD grade assessment per Art. 45 criteria. Include:
- **Grading Methodology:** How the EFD grade is determined (A through E scale or equivalent)
- **Assessment Criteria:** Specific criteria evaluated for grade assignment
- **Grade Assignment:** Assigned grade with detailed justification
- **Comparison:** How this grade compares to industry benchmarks
- **Improvement Path:** What actions would improve the grade in future declarations
- **NCA Considerations:** Factors the NCA should consider in evaluating the grade

---

**## SECTION: Recommendations**

Generate prioritized recommendations for environmental improvement. Include:
- **Short-term Actions:** Immediately actionable improvements (within current mission)
- **Medium-term Actions:** Improvements for next mission iteration or constellation refresh
- **Long-term Actions:** Strategic environmental goals for the operator's future missions
- **Industry Collaboration:** Opportunities for sector-wide environmental improvement
- **Declaration Update Schedule:** Recommended frequency for EFD updates and triggers for revision
- **Regulatory Engagement:** Recommendations for engagement with NCA on evolving environmental requirements

### Key Requirements
- Reference Art. 44-46 at sub-article granularity throughout
- Include ISO 14040/14044 methodology references where applicable
- Cross-reference related documents: A1 (DMP), C1 (Authorization Application)
- Include [ACTION REQUIRED: specific description] markers for all missing operator data
- Include [EVIDENCE: specific description] markers for all claims requiring supporting documentation
- Present quantitative data in tables with units and source references
- Use formal, professional third-person language ("The Operator shall...")`;
}
