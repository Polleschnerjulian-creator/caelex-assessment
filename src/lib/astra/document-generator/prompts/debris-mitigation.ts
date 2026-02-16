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

Generate the following sections in order:

1. **Executive Summary** — Overview of the operator, mission, and debris mitigation approach
2. **Mission Overview** — Orbit parameters, mission objectives, operational timeline
3. **Spacecraft Description** — Technical specifications, propulsion, sensors, materials
4. **Collision Avoidance Strategy** — CA procedures, conjunction assessment, maneuver protocols (Art. 33)
5. **End-of-Life Disposal Plan** — Deorbit method, timeline, success probability analysis (Art. 34)
6. **Fragmentation Prevention** — Energy source passivation, stored energy management (Art. 35)
7. **Passivation Measures** — Battery, propellant, and pressurized system passivation procedures
8. **25-Year Rule Analysis** — Post-mission orbital lifetime calculation and compliance (IADC guideline)
9. **Compliance Verification Matrix** — Table mapping each requirement to compliance status with evidence
10. **Certification Statement** — Formal statement of plan completeness and accuracy`;
}
