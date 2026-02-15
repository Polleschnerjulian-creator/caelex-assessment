/**
 * Environmental Footprint Declaration Prompt
 */

import type { EnvironmentalDataBundle } from "../types";

export function buildEnvironmentalPrompt(
  data: EnvironmentalDataBundle,
): string {
  const a = data.assessment;

  return `Generate a comprehensive Environmental Footprint Declaration (EFD) for NCA submission. This document must comply with EU Space Act Art. 44-46 and align with ISO 14040/14044 lifecycle assessment methodology.

## Mission Profile

**Operator:** ${data.organization.name}
**Mission Name:** ${a.missionName || "Not specified"}
**Operator Type:** ${a.operatorType}
**Mission Type:** ${a.missionType}
**Spacecraft Mass:** ${a.spacecraftMassKg} kg
**Spacecraft Count:** ${a.spacecraftCount}
**Orbit Type:** ${a.orbitType}
**Altitude:** ${a.altitudeKm ? `${a.altitudeKm} km` : "Not specified"}
**Launch Vehicle:** ${a.launchVehicle}
**Launch Share:** ${a.launchSharePercent}%
**Propellant Type:** ${a.spacecraftPropellant || "Not specified"}
**Propellant Mass:** ${a.propellantMassKg ? `${a.propellantMassKg} kg` : "Not specified"}
**Deorbit Strategy:** ${a.deorbitStrategy}

## Calculated Environmental Impact

**Total GWP:** ${a.totalGWP != null ? `${a.totalGWP.toFixed(1)} kg CO2eq` : "Not calculated"}
**Total ODP:** ${a.totalODP != null ? `${a.totalODP.toFixed(6)} kg CFC-11 eq` : "Not calculated"}
**Carbon Intensity:** ${a.carbonIntensity != null ? `${a.carbonIntensity.toFixed(1)} kg CO2eq/kg payload` : "Not calculated"}
**EFD Grade:** ${a.efdGrade || "Not assessed"}
**Compliance Score:** ${a.complianceScore !== null ? `${a.complianceScore}%` : "Not assessed"}

${data.impactResults.length > 0 ? `## Lifecycle Impact Breakdown\n${data.impactResults.map((r) => `- ${r.category}: ${r.value.toFixed(1)} ${r.unit}`).join("\n")}` : ""}

${data.supplierRequests.length > 0 ? `## Supplier Data Collection Status\n${data.supplierRequests.map((s) => `- ${s.supplierName}: ${s.status}`).join("\n")}` : ""}

## Required Sections

Generate the following sections in order:

1. **Executive Summary** — Overview of the environmental assessment scope, methodology, and key findings
2. **Mission Profile** — Detailed mission description, orbital parameters, and operational concept
3. **Lifecycle Assessment Methodology** — LCA approach per ISO 14040, system boundaries, functional unit, data quality
4. **Launch Vehicle Analysis** — Launch vehicle environmental impact, propellant emissions, shared launch allocation
5. **Propellant Analysis** — Spacecraft propellant type assessment, emissions profile, green alternatives considered
6. **Lifecycle Phase Breakdown** — Impact per phase: manufacturing, transport, launch, operations, end-of-life
7. **Supplier Data Summary** — Status of supplier environmental data collection, data gaps, assumptions
8. **Hotspot Identification** — Key environmental impact drivers, phase with highest contribution
9. **Mitigation Measures** — Actions taken or planned to reduce environmental footprint
10. **EFD Grade Justification** — Rationale for assigned grade based on Art. 45 criteria
11. **Recommendations** — Improvement opportunities for future missions`;
}
