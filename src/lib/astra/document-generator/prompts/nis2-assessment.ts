/**
 * NIS2 Assessment Report Prompt
 */

import type { NIS2DataBundle } from "../types";

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

export function buildNIS2Prompt(data: NIS2DataBundle): string {
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

  return `Generate a comprehensive NIS2 Compliance Assessment Report. This document must address EU Directive 2022/2555 (NIS2) requirements as they apply to space sector entities, including overlap with EU Space Act cybersecurity provisions.

## Entity Profile

**Organization:** ${data.organization.name}
**Entity Classification:** ${a.entityClassification || "Not classified"}
**Classification Reason:** ${a.classificationReason || "Not specified"}
**Sector:** ${a.sector || "Space"}
**Organization Size:** ${a.organizationSize || "Not specified"}
**Employee Count:** ${a.employeeCount || "Not specified"}
**Existing Certifications:** ${certs.length > 0 ? certs.join(", ") : "None"}
**ISO 27001:** ${a.hasISO27001 ? "Yes" : "No"}
**Existing CSIRT:** ${a.hasExistingCSIRT ? "Yes" : "No"}
**Risk Management:** ${a.hasRiskManagement ? "Yes" : "No"}
**Compliance Score:** ${a.complianceScore !== null ? `${a.complianceScore}%` : "Not assessed"}
**Maturity Score:** ${a.maturityScore !== null ? `${a.maturityScore}%` : "Not assessed"}
**Risk Level:** ${a.riskLevel || "Not assessed"}
**EU Space Act Overlap:** ${a.euSpaceActOverlapCount || 0} overlapping requirements
**Requirements Status:** ${reqCompliant} compliant, ${reqPartial} partial, ${reqTotal} total

${data.requirements.length > 0 ? `## Detailed Requirement Assessment\n${data.requirements.map((r) => `- **${r.requirementId}**: ${r.status}${r.notes ? ` — ${r.notes}` : ""}${formatResponses(r.responses)}`).join("\n")}` : ""}

## Required Sections

Generate the following sections in order. Focus on substantive analysis using the provided data — do NOT create blank template fields. Where sub-question responses are available, use them as evidence for compliance analysis.

1. **Executive Summary** — Overview of NIS2 applicability, entity classification, compliance score, and key findings. Highlight critical gaps and strengths.
2. **Entity Classification** — Detailed analysis of essential/important/out-of-scope classification per Art. 3, using the provided sector, size, and classification data. Explain the implications.
3. **Implementation Status & Gap Analysis** — For each assessed requirement area (Art. 21(2)(a)-(j)), provide compliance analysis incorporating the detailed sub-question responses as evidence. Group findings by compliance status. Focus on what IS and ISN'T in place — do not list requirements that haven't been assessed.
4. **Incident Reporting Readiness** — Based on the reporting-related requirement responses, assess Art. 23 capability: 24h early warning, 72h notification, 1-month final report. Identify specific gaps.
5. **Cross-Regulation Overlap** — Analyze the ${a.euSpaceActOverlapCount || 0} overlapping requirements between NIS2 and EU Space Act, highlighting where single implementation efforts can satisfy both frameworks.
6. **Compliance Matrix** — Table mapping assessed requirements to status with evidence from sub-question responses. Include article references and severity levels.
7. **Recommendations** — Prioritized implementation roadmap based on gap analysis. Start with critical severity items, then major, then minor. Include effort estimates and deadlines.`;
}
