/**
 * Cybersecurity Framework Prompt
 */

import type { CybersecurityDataBundle } from "../types";

function formatResponses(
  responses: Record<string, unknown> | null | undefined,
): string {
  if (!responses || Object.keys(responses).length === 0) return "";
  const lines = Object.entries(responses)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
      if (typeof value === "boolean")
        return `  - ${label}: ${value ? "Yes" : "No"}`;
      return `  - ${label}: ${value}`;
    });
  return lines.length > 0
    ? `\n  Sub-question responses:\n${lines.join("\n")}`
    : "";
}

export function buildCybersecurityPrompt(
  data: CybersecurityDataBundle,
): string {
  const a = data.assessment;
  const reqCompliant = data.requirements.filter(
    (r) => r.status === "compliant",
  ).length;
  const reqPartial = data.requirements.filter(
    (r) => r.status === "partial",
  ).length;
  const reqTotal = data.requirements.length;

  let certs: string[] = [];
  try {
    certs = a.existingCertifications
      ? JSON.parse(a.existingCertifications)
      : [];
  } catch {
    certs = a.existingCertifications ? [a.existingCertifications] : [];
  }

  return `Generate a comprehensive Cybersecurity Framework document for NCA submission. This framework must comply with EU Space Act Art. 27-30 and align with NIST CSF, ISO 27001, and ECSS-E-ST-70-41C for space systems cybersecurity.

## Organization Profile

**Operator:** ${data.organization.name}
**Organization Size:** ${a.organizationSize}
**Employee Count:** ${a.employeeCount || "Not specified"}
**Space Segment Complexity:** ${a.spaceSegmentComplexity}
**Satellite Count:** ${a.satelliteCount || "Not specified"}
**Data Sensitivity Level:** ${a.dataSensitivityLevel}
**Existing Certifications:** ${certs.length > 0 ? certs.join(", ") : "None"}
**Dedicated Security Team:** ${a.hasSecurityTeam ? `Yes (${a.securityTeamSize || "size unknown"} members)` : "No"}
**Incident Response Plan:** ${a.hasIncidentResponsePlan ? "Yes" : "No"}
**Business Continuity Plan:** ${a.hasBCP ? "Yes" : "No"}
**Critical Suppliers:** ${a.criticalSupplierCount || "Not assessed"}
**Maturity Score:** ${a.maturityScore !== null ? `${a.maturityScore}%` : "Not assessed"}
**Simplified Regime:** ${a.isSimplifiedRegime ? "Yes (Art. 10)" : "No"}
**Requirements Status:** ${reqCompliant} compliant, ${reqPartial} partial, ${reqTotal} total

${data.requirements.length > 0 ? `## Detailed Requirement Assessment\n${data.requirements.map((r) => `- **${r.requirementId}**: ${r.status}${r.notes ? ` — ${r.notes}` : ""}${formatResponses(r.responses)}`).join("\n")}` : ""}

## Required Sections

Generate the following sections in order. Focus on substantive analysis using the provided data — do NOT create blank template fields. Where sub-question responses are available, use them as evidence for compliance analysis.

1. **Executive Summary** — Overview of the organization's cybersecurity posture, maturity level, key strengths, and critical gaps. Include compliance score context.
2. **Organization Security Profile** — Analyze current security capabilities based on the provided data: team size, certifications, existing plans. Assess readiness against EU Space Act Art. 27-30.
3. **Risk Assessment** — Based on the space segment complexity, data sensitivity, and satellite count, analyze the threat landscape and risk categories specific to this operator.
4. **Implementation Status & Gap Analysis** — For each assessed requirement, provide compliance analysis incorporating the detailed sub-question responses as evidence. Group by compliance status (compliant, partial, non-compliant). Focus on what IS and ISN'T in place.
5. **Maturity Assessment** — Based on the assessment responses, evaluate maturity across key domains. Identify areas closest to compliance and furthest from target.
6. **Compliance Matrix** — Table mapping assessed requirements to implementation status with evidence from sub-question responses. Only include requirements that have been assessed.
7. **Recommendations** — Prioritized improvement actions based on gap analysis. Include effort estimates and regulatory deadlines. Focus on highest-impact items first.`;
}
