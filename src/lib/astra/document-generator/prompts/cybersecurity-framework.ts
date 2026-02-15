/**
 * Cybersecurity Framework Prompt
 */

import type { CybersecurityDataBundle } from "../types";

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

${data.requirements.length > 0 ? `## Requirement Status Matrix\n${data.requirements.map((r) => `- ${r.requirementId}: ${r.status}${r.notes ? ` — ${r.notes}` : ""}`).join("\n")}` : ""}

## Required Sections

Generate the following sections in order:

1. **Executive Summary** — Overview of the organization's cybersecurity posture and framework objectives
2. **Organization Security Profile** — Current security capabilities, team, certifications, maturity level
3. **Security Architecture** — Space segment, ground segment, and link security architecture overview
4. **Risk Assessment** — Threat landscape for space operations, risk categories, impact analysis
5. **Implementation Plan** — 8-phase roadmap: (1) Governance, (2) Asset Management, (3) Access Control, (4) Network Security, (5) Data Protection, (6) Incident Response, (7) Supply Chain, (8) Monitoring & Audit
6. **Gap Analysis** — Current vs. target state for each requirement area
7. **Maturity Assessment** — Current maturity level per NIST CSF domain with target levels
8. **Compliance Matrix** — Table mapping requirements to implementation status, responsible parties, and timelines
9. **Recommendations** — Prioritized improvement actions with estimated effort and impact`;
}
