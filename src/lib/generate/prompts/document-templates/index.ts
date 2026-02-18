/**
 * Generate 2.0 — Document Template Registry
 *
 * Layer 4 of 4: Document-specific section structure and content requirements.
 * Returns the appropriate template based on document type.
 */

import type { NCADocumentType } from "../../types";
import { NCA_DOC_TYPE_MAP } from "../../types";
import { getDMPTemplate } from "./a1-dmp";
import { getOrbitalLifetimeTemplate } from "./a2-orbital-lifetime";
import { getEOLDisposalTemplate } from "./a4-eol-disposal";
import { getCyberPolicyTemplate } from "./b1-cyber-policy";
import { getCyberRiskTemplate } from "./b2-cyber-risk";
import { getIncidentResponseTemplate } from "./b3-incident-response";

/**
 * Template lookup for P0 document types.
 */
const TEMPLATE_MAP: Partial<Record<NCADocumentType, () => string>> = {
  DMP: getDMPTemplate,
  ORBITAL_LIFETIME: getOrbitalLifetimeTemplate,
  EOL_DISPOSAL: getEOLDisposalTemplate,
  CYBER_POLICY: getCyberPolicyTemplate,
  CYBER_RISK_ASSESSMENT: getCyberRiskTemplate,
  INCIDENT_RESPONSE: getIncidentResponseTemplate,
};

/**
 * Returns the document-specific template for the given document type.
 * P0 types have detailed templates; P1/P2 types use a generic template
 * until their dedicated templates are implemented.
 */
export function getDocumentTemplate(docType: NCADocumentType): string {
  const templateFn = TEMPLATE_MAP[docType];

  if (templateFn) {
    return templateFn();
  }

  // Generic template for P1/P2 document types without dedicated templates
  return getGenericTemplate(docType);
}

/**
 * Generic template for document types that do not yet have a dedicated template.
 * Provides a reasonable section structure based on document metadata.
 */
function getGenericTemplate(docType: NCADocumentType): string {
  const meta = NCA_DOC_TYPE_MAP[docType];

  return `## Document-Specific Instructions: ${meta.code} — ${meta.title}

> NOTE: This document type does not yet have a dedicated template. Generate a comprehensive NCA submission document following the general structure below. A dedicated template with detailed section requirements will be available in a future release.

### Required Document Structure

Generate the following sections for this ${meta.title} document:

**1. Cover Page & Document Control**
- Document title: "${meta.title}"
- Document code: ${meta.code}
- Version, date, author, approval status
- Revision history table
- Distribution list

**2. Executive Summary**
- One-page overview of the document scope, key findings, and compliance status
- Summary of applicable regulatory requirements (${meta.articleRef})

**3. Scope & Applicability**
- Define the scope of this document within the NCA submission package
- Identify applicable regulatory requirements from ${meta.articleRef}
- State any exclusions or limitations

**4. Regulatory Requirements Analysis**
- For each applicable article in ${meta.articleRef}:
  - State the requirement
  - Describe the operator's current compliance posture
  - Identify gaps and remediation actions
  - Reference supporting evidence

**5. Technical Implementation**
- Detailed description of how the operator meets or plans to meet each requirement
- Technical specifications, procedures, and controls
- Industry standard references where applicable

**6. Compliance Verification Matrix**
- Table mapping each requirement from ${meta.articleRef} to:
  - Compliance status (Compliant / Partially Compliant / Non-Compliant / Not Applicable)
  - Evidence reference
  - Responsible party
  - Remediation timeline (if applicable)

**7. Gap Analysis & Remediation Roadmap**
- Summary of all identified gaps
- Prioritized remediation actions with timelines
- Resource requirements and dependencies

**8. Appendices**
- Supporting data, calculations, and evidence references
- Glossary of terms
- List of referenced standards and regulations

### Key Requirements
- Reference ${meta.articleRef} throughout the document
- Cross-reference related documents in the NCA package where applicable
- Include [ACTION REQUIRED] markers for all missing operator data
- Include [EVIDENCE] markers for all claims requiring supporting documentation
- Category: ${meta.category === "debris" ? "Debris Mitigation (EU Space Act Title IV, Art. 58-73)" : "Cybersecurity (EU Space Act Title V, Art. 74-95)"}`;
}
