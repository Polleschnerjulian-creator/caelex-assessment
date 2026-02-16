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

Generate a COMPLETE NIS2 Compliance Assessment Report that meets EU Directive 2022/2555 requirements for space sector entities. Every section must be comprehensive, authoritative, and suitable for submission to the national competent authority. Use the assessment data above as the foundation, and supplement with expert regulatory analysis, space-sector-specific guidance, and cross-regulation insights.

1. **Executive Summary** — High-level overview: entity classification, sector analysis, compliance score interpretation, maturity assessment, key strengths, critical gaps, penalty exposure, and strategic recommendations. An NCA reviewer should get the complete compliance picture from this section alone.

2. **Entity Classification Analysis** — Comprehensive Art. 2-3 classification: detailed analysis of why this entity is classified as ${a.entityClassification || "the determined classification"}, sector-specific criteria applied, size thresholds analysis, space-sector exceptions and special provisions, implications for supervisory regime, applicable penalty framework (Art. 34: essential = EUR 10M / 2%, important = EUR 7M / 1.4%). Reference national transposition specifics where relevant.

3. **Applicable Regulatory Framework** — Complete mapping of NIS2 obligations for this entity type: Art. 21(2)(a)-(j) measures, Art. 23 reporting obligations, Art. 20 governance requirements, Art. 27 registration duties. For each, explain what is required, the space-sector-specific interpretation, and how it relates to EU Space Act cybersecurity provisions.

4. **Implementation Status by Measure Category** — For each Art. 21(2) measure category, provide detailed compliance analysis:
   - **(a) Risk Analysis & IS Policies** — Current policy framework, risk assessment methodology, space-specific risk considerations
   - **(b) Incident Handling** — Detection capabilities, response procedures, classification taxonomy, escalation workflows
   - **(c) Business Continuity** — BCP/BIA status, crisis management framework, backup systems for space operations
   - **(d) Supply Chain Security** — Supplier risk management, contractual security requirements, SBOM practices
   - **(e) Network & IS Acquisition** — Secure development lifecycle, vulnerability management, patch compliance
   - **(f) Effectiveness Assessment** — Audit programme, penetration testing, security metrics and KPIs
   - **(g) Cyber Hygiene & Training** — Training programme, awareness campaigns, space-operations-specific training
   - **(h) Cryptography** — Encryption standards for uplink/downlink, key management, crypto agility
   - **(i) HR, Access Control, Asset Management** — Personnel screening, access governance, asset inventory
   - **(j) MFA & Authentication** — MFA coverage, emergency access procedures, secure communications
   For each category: use the sub-question response data as evidence, identify gaps, cite specific article requirements, and provide implementation guidance referencing ENISA NIS2 guidance and ISO 27001 controls.

5. **Incident Reporting Readiness** — Comprehensive Art. 23 analysis: current capability for 24h early warning, 72h notification, intermediate reporting, 1-month final report. Analyze the operator's detection capabilities (MTTD), reporting workflows, CSIRT coordination, significant incident criteria. Provide gap analysis against the reporting timeline requirements and specific remediation steps.

6. **Cross-Regulation Synergies** — Detailed analysis of the ${a.euSpaceActOverlapCount || 0} overlapping requirements between NIS2 and EU Space Act (Art. 27-30). For each overlap: identify where a single implementation effort satisfies both frameworks, estimate effort savings, and flag areas requiring separate compliance work. Include ISO 27001 and ENISA space controls cross-references. Quantify total potential efficiency gains.

7. **Governance & Accountability** — Art. 20 compliance: management body responsibilities, cybersecurity training requirements for leadership, personal liability provisions, CISO appointment and reporting structure. Provide guidance on governance best practices for space sector entities.

8. **Compliance Verification Matrix** — Complete table mapping ALL applicable NIS2 requirements to compliance status. For each: requirement ID, article reference, category, severity (critical/major/minor), compliance status, evidence summary from sub-question responses, and remediation action if non-compliant.

9. **Risk-Prioritized Remediation Roadmap** — Implementation plan prioritized by: (1) critical severity gaps with regulatory deadlines, (2) major gaps affecting core operations, (3) minor improvements for maturity advancement. For each action: specific deliverable, estimated effort (weeks), responsible role, dependencies, and target completion date. Include quick wins (0-3 months), core programme (3-9 months), and continuous improvement (9-18 months) phases.`;
}
