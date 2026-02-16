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

Generate the following sections in order. Focus on substantive analysis using the provided data — do NOT create blank template fields or list fields as "not provided". Where data is available, provide detailed regulatory analysis. Where data is missing, provide regulatory context on what's required and why, without listing empty fields.

1. **Executive Summary** — Overview of the operator, mission, debris mitigation approach, and overall compliance posture. Highlight key strengths and gaps based on the requirement assessment data above.
2. **Mission Overview** — Orbit parameters, mission objectives, constellation design, operational timeline. Analyze orbital environment risks specific to this altitude and orbit type.
3. **Spacecraft Description** — Focus on the technical capabilities relevant to debris mitigation: propulsion system analysis, maneuverability assessment, passivation capabilities. Only describe what is known — do not list every possible spacecraft parameter.
4. **Collision Avoidance Strategy** — Based on the operator's CA service provider and maneuverability data, analyze the collision avoidance approach against Art. 33 requirements. Include conjunction assessment procedures and maneuver decision criteria.
5. **End-of-Life Disposal Plan** — Analyze the deorbit strategy against Art. 34 requirements. Calculate or discuss post-mission orbital lifetime based on the altitude and deorbit timeline. Assess compliance with the 5-year (EU Space Act) and 25-year (IADC) rules.
6. **Fragmentation Prevention & Passivation** — Analyze passivation capabilities against Art. 35-36. Discuss energy source management based on the propulsion data provided.
7. **Compliance Verification Matrix** — Table mapping each assessed requirement to its compliance status, with the detailed sub-question responses incorporated as evidence. Only include requirements that have been assessed.
8. **Gap Analysis & Recommendations** — Based on non-compliant and partially compliant requirements, provide a prioritized action plan with regulatory deadlines.`;
}
