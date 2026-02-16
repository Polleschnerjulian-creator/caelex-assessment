/**
 * Debris Mitigation Plan Prompt
 */

import { debrisRequirements } from "@/data/debris-requirements";
import type { DebrisDataBundle } from "../types";

function formatResponses(
  requirementId: string,
  responses: Record<string, unknown> | null | undefined,
): string {
  if (!responses) return "";

  const req = debrisRequirements.find((r) => r.id === requirementId);
  if (!req?.assessmentFields) return "";

  const lines: string[] = [];
  for (const field of req.assessmentFields) {
    const val = responses[field.id];
    if (val === null || val === undefined || val === "") continue;

    let display: string;
    if (field.type === "boolean") {
      display = val ? "Yes" : "No";
    } else if (field.type === "select" && field.options) {
      const opt = field.options.find((o) => o.value === val);
      display = opt ? opt.label : String(val);
    } else {
      display = `${val}${field.unit ? ` ${field.unit}` : ""}`;
    }
    lines.push(`- ${field.label}: ${display}`);
  }

  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

export function buildDebrisPrompt(data: DebrisDataBundle): string {
  const a = data.assessment;
  const reqCompliant = data.requirements.filter(
    (r) => r.status === "compliant",
  ).length;
  const reqTotal = data.requirements.length;

  const requirementSections = data.requirements
    .map((r) => {
      const reqDef = debrisRequirements.find((d) => d.id === r.requirementId);
      const title = reqDef?.title || r.requirementId;
      const articleRef = reqDef?.articleRef || "";
      const status = r.status.toUpperCase().replace("_", "-");
      const responsesText = formatResponses(r.requirementId, r.responses);
      const notes = r.notes ? `\n- Notes: ${r.notes}` : "";

      return `### ${title} (${articleRef}) — ${status}${responsesText}${notes}`;
    })
    .join("\n\n");

  return `Generate a comprehensive Debris Mitigation Plan for NCA submission. This plan must comply with EU Space Act Art. 31-37, IADC Space Debris Mitigation Guidelines, and ISO 24113:2019.

## Operator & Mission Data

**Operator:** ${data.organization.name}
**Mission Name:** ${a.missionName || "Not specified"}
**Orbit Type:** ${a.orbitType}
**Altitude:** ${a.altitudeKm ? `${a.altitudeKm} km` : "Not specified"}
**Satellite Count:** ${a.satelliteCount}
**Constellation Tier:** ${a.constellationTier}
**Maneuverability:** ${a.hasManeuverability}
**Propulsion:** ${a.hasPropulsion ? "Yes" : "No"}
**Passivation Capability:** ${a.hasPassivationCap ? "Yes" : "No"}
**Planned Mission Duration:** ${a.plannedDurationYears} years
**Deorbit Strategy:** ${a.deorbitStrategy}
**Deorbit Timeline:** ${a.deorbitTimelineYears ? `${a.deorbitTimelineYears} years` : "Not specified"}
**Collision Avoidance Provider:** ${a.caServiceProvider || "Not specified"}
**Current Compliance Score:** ${a.complianceScore !== null ? `${a.complianceScore}%` : "Not assessed"}
**Requirements Status:** ${reqCompliant}/${reqTotal} compliant

${data.spacecraft.length > 0 ? `## Registered Spacecraft\n${data.spacecraft.map((s) => `- ${s.name}${s.noradId ? ` (NORAD: ${s.noradId})` : ""}${s.type ? ` — ${s.type}` : ""}`).join("\n")}` : ""}

## Detailed Requirement Assessment

${requirementSections}

## Required Sections

Generate a COMPLETE Debris Mitigation Plan that an NCA would accept for authorization review. Every section must be comprehensive and substantive. Use the assessment data above as the foundation, and supplement with expert regulatory analysis, industry best practices, and technical guidance for all areas.

1. **Executive Summary** — High-level overview: operator profile, mission summary, debris mitigation strategy, compliance score, key achievements, critical gaps, and recommended next steps. This section alone should give an NCA reviewer a complete picture.

2. **Mission Overview** — Complete mission profile: orbit parameters (type, altitude, inclination analysis), mission objectives, constellation architecture, operational timeline, orbital environment risk analysis (debris density at this altitude, conjunction frequency estimates per IADC/ESA MASTER model data). Analyze how the orbit choice impacts debris mitigation obligations under Art. 31-37.

3. **Spacecraft Description** — Complete technical profile relevant to debris mitigation: spacecraft bus design, propulsion system analysis (type, delta-V budget, fuel allocation for collision avoidance vs. disposal), attitude control capabilities, tracking and identification features (RCS, radar reflectors, optical properties per Art. 32), materials and shielding, passivation-relevant subsystems (batteries, pressure vessels, reaction wheels). Where specific data wasn't provided, describe what Art. 32-37 requires and industry best practices.

4. **Orbital Lifetime & 25-Year Rule Analysis** — Detailed analysis of post-mission orbital lifetime based on the altitude, deorbit strategy, and timeline. Compare against both the EU Space Act 5-year best practice standard (Art. 34(2)) and the IADC 25-year guideline. Include discussion of atmospheric drag effects at this altitude, solar cycle considerations, and disposal orbit selection rationale per ISO 24113:2019.

5. **Collision Avoidance Strategy** — Comprehensive CA approach: conjunction assessment process, data sources (EUSST, 18th SDS, commercial SSA), alert thresholds, maneuver decision criteria, maneuver execution procedures, coordination protocols with other operators, Art. 33(2) compliance analysis. Reference the operator's CA service provider and maneuverability data. Include typical CA operational workflows per IADC guidelines.

6. **End-of-Life Disposal Plan** — Complete disposal strategy: method selection rationale, timeline compliance with Art. 34, success probability analysis, contingency procedures if primary disposal fails, fuel reserve calculations for disposal maneuver, ground station availability for disposal commanding. Include ECSS-U-AS-10C and ISO 24113 compliance analysis.

7. **Fragmentation Prevention & Passivation** — Comprehensive passivation approach per Art. 35-36: battery discharge/isolation procedures, propellant venting/depletion, pressure vessel safing, reaction wheel de-spin, RF transmitter shutdown, solar array isolation. Reference ECSS-E-ST-70-41C passivation standards. Include timeline and sequencing.

8. **Trackability & Identification** — Art. 32 compliance: radar cross-section adequacy, radar reflector specifications, optical tracking feasibility, registration with space surveillance networks, compliance with UN Registration Convention obligations. Include specific technical requirements per IADC Space Debris Mitigation Guidelines §5.2.

9. **Light & Radio Pollution Mitigation** — Art. 31(4) compliance: brightness mitigation measures, anti-reflective coatings, sun visor/shade analysis, coordination with astronomical community, RFI mitigation, ITU coordination status. Reference IAU recommendations and ESA best practices.

10. **Supply Chain & Manufacturing Compliance** — Art. 73 compliance: debris mitigation requirements flow-down to manufacturers and suppliers, contractual clauses, verification approach. Industry standard per ECSS-Q-ST-70C.

11. **Compliance Verification Matrix** — Complete table mapping ALL applicable debris mitigation requirements to compliance status. For each requirement, include: article reference, compliance status, evidence summary (from sub-question responses above), and remediation action if non-compliant.

12. **Gap Analysis & Remediation Roadmap** — Prioritized action plan based on compliance gaps. Include: priority ranking, specific remediation actions, estimated effort, responsible party, regulatory deadline, and risk if not addressed. Group by criticality (critical/major/minor).`;
}
