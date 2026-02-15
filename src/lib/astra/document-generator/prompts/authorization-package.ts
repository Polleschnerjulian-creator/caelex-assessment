/**
 * Authorization Application Package Prompt
 */

import type { AuthorizationDataBundle } from "../types";

export function buildAuthorizationPrompt(
  data: AuthorizationDataBundle,
): string {
  const scores: string[] = [];
  if (data.debrisAssessment?.complianceScore != null)
    scores.push(`Debris: ${data.debrisAssessment.complianceScore}%`);
  if (data.cybersecurityAssessment?.maturityScore != null)
    scores.push(
      `Cybersecurity: ${data.cybersecurityAssessment.maturityScore}%`,
    );
  if (data.environmentalAssessment?.complianceScore != null)
    scores.push(
      `Environmental: ${data.environmentalAssessment.complianceScore}%`,
    );
  if (data.insuranceAssessment?.complianceScore != null)
    scores.push(`Insurance: ${data.insuranceAssessment.complianceScore}%`);
  if (data.nis2Assessment?.complianceScore != null)
    scores.push(`NIS2: ${data.nis2Assessment.complianceScore}%`);

  return `Generate a comprehensive Authorization Application Package for NCA submission. This is the most critical document — it consolidates all compliance areas into a single submission-ready package per EU Space Act Art. 4-12.

## Organization Profile

**Operator:** ${data.organization.name}
**Workflow Status:** ${data.workflow?.status || "Not started"}
**Current Step:** ${data.workflow?.currentStep || "N/A"}
**Compliance Scores:** ${scores.length > 0 ? scores.join(", ") : "No assessments completed"}

${data.spacecraft.length > 0 ? `## Spacecraft Fleet\n${data.spacecraft.map((s) => `- ${s.name}${s.noradId ? ` (NORAD: ${s.noradId})` : ""}${s.type ? ` — ${s.type}` : ""}${s.orbitType ? ` — ${s.orbitType}` : ""}`).join("\n")}` : "## Spacecraft Fleet\nNo spacecraft registered"}

${data.debrisAssessment ? `## Debris Mitigation Summary\n**Orbit:** ${data.debrisAssessment.orbitType}${data.debrisAssessment.altitudeKm ? ` at ${data.debrisAssessment.altitudeKm} km` : ""}\n**Satellites:** ${data.debrisAssessment.satelliteCount}\n**Deorbit Strategy:** ${data.debrisAssessment.deorbitStrategy}\n**Compliance:** ${data.debrisAssessment.complianceScore != null ? `${data.debrisAssessment.complianceScore}%` : "Not assessed"}` : ""}

${data.cybersecurityAssessment ? `## Cybersecurity Summary\n**Org Size:** ${data.cybersecurityAssessment.organizationSize}\n**Maturity:** ${data.cybersecurityAssessment.maturityScore != null ? `${data.cybersecurityAssessment.maturityScore}%` : "Not assessed"}\n**Security Team:** ${data.cybersecurityAssessment.hasSecurityTeam ? "Yes" : "No"}\n**Incident Response Plan:** ${data.cybersecurityAssessment.hasIncidentResponsePlan ? "Yes" : "No"}` : ""}

${data.environmentalAssessment ? `## Environmental Summary\n**EFD Grade:** ${data.environmentalAssessment.efdGrade || "Not assessed"}\n**Total GWP:** ${data.environmentalAssessment.totalGWP != null ? `${data.environmentalAssessment.totalGWP.toFixed(1)} kg CO2eq` : "Not calculated"}\n**Launch Vehicle:** ${data.environmentalAssessment.launchVehicle}` : ""}

${data.insuranceAssessment ? `## Insurance Summary\n**Jurisdiction:** ${data.insuranceAssessment.primaryJurisdiction}\n**TPL Requirement:** ${data.insuranceAssessment.calculatedTPL ? `EUR ${data.insuranceAssessment.calculatedTPL.toLocaleString()}` : "Not calculated"}\n**Risk Level:** ${data.insuranceAssessment.riskLevel || "Not assessed"}` : ""}

${data.nis2Assessment ? `## NIS2 Summary\n**Classification:** ${data.nis2Assessment.entityClassification || "Not classified"}\n**Compliance:** ${data.nis2Assessment.complianceScore != null ? `${data.nis2Assessment.complianceScore}%` : "Not assessed"}` : ""}

${data.documents.length > 0 ? `## Supporting Documents\n${data.documents.map((d) => `- ${d.name} (${d.category}) — ${d.status}`).join("\n")}` : "## Supporting Documents\nNo documents uploaded"}

## Required Sections

Generate the following sections in order:

1. **Cover Letter** — Formal cover letter to the NCA requesting authorization review
2. **Operator Profile** — Company description, legal status, technical capabilities, organizational structure
3. **Mission Description** — Comprehensive mission overview including orbit, spacecraft, timeline, and operational concept
4. **Compliance Summary** — Module-by-module compliance status with scores, covering debris, cybersecurity, environmental, insurance, and NIS2
5. **Authorization Checklist** — Pre-authorization checklist per Art. 7 with completion status for each requirement
6. **Supporting Documents Index** — Catalogued list of all supporting documents with cross-references to requirements
7. **Certification Statement** — Formal statement by authorized representative certifying accuracy and completeness`;
}
