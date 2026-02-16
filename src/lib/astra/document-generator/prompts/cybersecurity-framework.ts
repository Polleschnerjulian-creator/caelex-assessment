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

Generate a COMPLETE Cybersecurity Framework document that meets EU Space Act Art. 27-30 requirements and aligns with NIST CSF, ISO 27001, and ECSS-E-ST-70-41C. Every section must be comprehensive, authoritative, and NCA-submission-ready. Use the assessment data above as the foundation, and supplement with expert cybersecurity guidance, industry standards, and space-specific threat analysis.

1. **Executive Summary** — High-level overview: organization security profile, maturity score analysis, compliance posture across all requirement areas, key strengths, critical vulnerabilities, and strategic recommendations. An NCA reviewer should get the complete picture from this section alone.

2. **Organization Security Profile** — Complete security capabilities assessment: team structure and expertise, certifications held and their scope, existing security infrastructure, incident response readiness, business continuity posture. Analyze against EU Space Act Art. 27 requirements for space operators. Where data wasn't provided, describe what Art. 27-30 requires.

3. **Threat Landscape & Risk Assessment** — Comprehensive space cybersecurity threat analysis tailored to this operator: threats to space segment (jamming, spoofing, cyber-physical attacks on satellites), ground segment threats (network intrusion, insider threats, supply chain compromise), link segment threats (eavesdropping, command injection, replay attacks). Risk categorization by likelihood and impact. Reference ENISA space threat taxonomy and NIST SP 800-53 controls. Tailor analysis to the operator's specific complexity level and data sensitivity.

4. **Security Architecture** — Complete security architecture across all segments: space segment hardening (onboard encryption, secure boot, command authentication), ground segment security (network segmentation, access control, monitoring), link security (encryption standards, key management, anti-jamming). Reference CCSDS security standards and ECSS-E-ST-70-41C. Where specific implementation data was provided in sub-questions, incorporate it as evidence.

5. **Implementation Status by Requirement Area** — For each cybersecurity requirement area, provide detailed analysis: current implementation status (using sub-question response data as evidence), gap identification, regulatory requirement (Art. reference), and specific technical measures needed. Group into: (1) Governance & Policy, (2) Access Control & Authentication, (3) Network & Communications Security, (4) Data Protection & Encryption, (5) Incident Response, (6) Supply Chain Security, (7) Monitoring & Audit.

6. **Maturity Assessment** — NIST CSF maturity evaluation across all five functions (Identify, Protect, Detect, Respond, Recover). For each function: current maturity level assessment based on the data, target maturity level per EU Space Act requirements, specific gaps, and improvement roadmap. Include maturity scoring methodology.

7. **Compliance Verification Matrix** — Complete table mapping ALL cybersecurity requirements to implementation status. For each: requirement ID, article reference, compliance status, evidence summary from sub-question responses, responsible party, and remediation action if non-compliant.

8. **Implementation Roadmap & Recommendations** — Phased implementation plan: Phase 1 (Quick Wins, 0-3 months), Phase 2 (Core Controls, 3-6 months), Phase 3 (Advanced Capabilities, 6-12 months), Phase 4 (Continuous Improvement, 12+ months). Each phase: specific actions, effort estimates, resource requirements, dependencies, and expected maturity improvement.`;
}
