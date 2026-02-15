/**
 * NIS2 Assessment Report Prompt
 */

import type { NIS2DataBundle } from "../types";

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

${data.requirements.length > 0 ? `## Requirement Status Matrix\n${data.requirements.map((r) => `- ${r.requirementId}: ${r.status}${r.notes ? ` — ${r.notes}` : ""}`).join("\n")}` : ""}

## Required Sections

Generate the following sections in order:

1. **Executive Summary** — Overview of NIS2 applicability, classification, and compliance status
2. **Entity Classification** — Detailed analysis of essential/important/out-of-scope classification per Art. 3, including sector and size criteria
3. **Applicable Requirements** — Full list of NIS2 requirements applicable to this entity type, referencing Art. 21(2)(a)-(j)
4. **Implementation Status** — Current implementation status per requirement area with evidence references
5. **Gap Analysis** — Detailed gap analysis identifying non-compliant and partially compliant areas with remediation priorities
6. **Incident Reporting Readiness** — Assessment of Art. 23 incident reporting capability: 24h early warning, 72h notification, 1-month final report
7. **Cross-Regulation Overlap** — Analysis of overlapping requirements between NIS2 and EU Space Act cybersecurity provisions, highlighting efficiency opportunities
8. **Recommendations** — Prioritized implementation roadmap with effort estimates and compliance deadlines`;
}
