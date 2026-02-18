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
 * Provides NCA-submission-grade section structure based on document metadata,
 * applying the same quality standards as dedicated P0 templates.
 */
function getGenericTemplate(docType: NCADocumentType): string {
  const meta = NCA_DOC_TYPE_MAP[docType];
  const categoryDetail =
    meta.category === "debris"
      ? "Debris Mitigation (EU Space Act Title IV, Art. 58-73)"
      : "Cybersecurity (EU Space Act Title V, Art. 74-95)";

  return `## Document-Specific Instructions: ${meta.code} — ${meta.title}

This document is part of the NCA authorization submission package. It must be generated to the same quality standard as all other documents in the package — comprehensive, authoritative, and submission-ready. Category: ${categoryDetail}.

### Required Document Structure

Generate the following sections. Each section must contain substantive, professional content — not summaries or placeholders. Follow ALL formatting standards from the Quality Rules (Cover Page Standard, Executive Summary Standard, Compliance Matrix Standard).

---

**## SECTION: Cover Page & Document Control**

Generate a formal NCA-submission-grade cover page following the Cover Page Standard from the Quality Rules. Include:
- Document title: "${meta.title}"
- Document code: ${meta.code}
- All elements from the Cover Page Standard (Document Control Block, Approval Block with C-suite/Board signature line, Distribution List, Revision History)
- Table of Contents listing all sections with subsection numbers

---

**## SECTION: Executive Summary**

Generate a comprehensive executive summary following the Executive Summary Standard from the Quality Rules:

1. **Mission Context:** Operator, mission, and operational scope (2-3 sentences)
2. **Document Purpose:** "This ${meta.title} is prepared in compliance with ${meta.articleRef} of the EU Space Act (COM(2025) 335) and constitutes a required element of the NCA authorization submission package."
3. **Key Findings (5-7 bullets):**
   - **Overall Compliance Status:** Assessment against ${meta.articleRef}
   - **Critical Requirements Met:** Summary of key requirements addressed
   - **Gaps Identified:** Number and severity of compliance gaps
   - **Evidence Completeness:** Assessment of supporting documentation
   - **Remediation Required:** Scope of remediation needed
4. **Evidence Summary:** Referenced evidence documents and their sufficiency
5. **Compliance Determination:** Clear, definitive statement per ${meta.articleRef}

Cross-reference related documents in the NCA package.

---

**## SECTION: Scope & Applicability**

- Define the precise scope of this document within the NCA submission package
- Identify ALL applicable regulatory requirements from ${meta.articleRef} at sub-article granularity (Art. XX(Y)(z))
- State any exclusions with explicit justification
- Reference the operator type classification per Art. 3(12)-(18)
- Art. 10 light regime applicability assessment
- Relationship to other documents in the package (cross-references)

---

**## SECTION: Regulatory Requirements Analysis**

For EACH applicable article and sub-article in ${meta.articleRef}:

Generate a detailed analysis structured as:
- **Requirement statement:** Paraphrase of the regulatory requirement with article citation
- **Operator compliance posture:** How the operator currently meets or plans to meet this requirement
- **Evidence referenced:** Specific evidence documents supporting the compliance claim, or [EVIDENCE: description] markers
- **Gap identification:** Any gaps between current posture and requirement
- **Remediation plan:** If gaps exist, specific remediation actions with timeline
- **Industry best practice:** Reference to relevant standards (ISO, ECSS, IADC, NIST, CCSDS as applicable)

Do NOT just list requirements — provide substantive professional analysis for each.

---

**## SECTION: Technical Implementation**

- Detailed description of how the operator meets or plans to meet each requirement
- Technical specifications, parameters, procedures, and controls
- Industry standard references (ISO, ECSS, IADC, NIST, CCSDS as applicable)
- Tables for structured technical data with descriptive captions
- Where operator data is not provided: include industry benchmarks, NCA expectations, and [ACTION REQUIRED] markers for specific data needed
- Cross-references to related documents in the NCA package

---

**## SECTION: Compliance Verification Matrix**

Generate a comprehensive compliance matrix at sub-article granularity following the Compliance Matrix Standard from the Quality Rules.

Required columns:
| Req. ID | Provision | Requirement Description | Compliance Status | Implementation Description | Evidence Reference | Gap Description | Remediation Action | Target Date |

Include ALL applicable sub-articles from ${meta.articleRef}. Also include rows for relevant standard compliance (ISO, ECSS, IADC, NIST as applicable to the category).

Use the standard compliance status values: Compliant / Substantially Compliant / Partially Compliant / Non-Compliant / Not Applicable

---

**## SECTION: Gap Analysis & Remediation Roadmap**

- Summary table of ALL identified gaps from the Compliance Matrix
- Risk rating per gap: High / Medium / Low (based on regulatory and operational impact)
- Remediation actions table:
  | Gap ID | Remediation Action | Responsible Party | Target Date | Dependencies | Priority | Status |
- Phased implementation timeline:
  - Phase 1 (Pre-submission): Authorization-blocking gaps
  - Phase 2 (During review): Gaps addressable during NCA review
  - Phase 3 (Post-authorization): Gaps as authorization conditions
- Resource requirements summary

---

**## SECTION: Conclusions & Recommendations**

- Restate applicable regulatory requirements (${meta.articleRef})
- Summarize compliance posture with clear determination
- Highlight critical action items for operator attention
- Recommended review frequency and update triggers
- Cross-references to related documents for complete package context

### Key Requirements
- Reference ${meta.articleRef} at sub-article granularity throughout
- Cross-reference related documents in the NCA package with format: "See Document [Code] — [Title], Section [X.Y]"
- Include [ACTION REQUIRED: specific description] markers for all missing operator data
- Include [EVIDENCE: specific description] markers for all claims requiring supporting documentation
- Use formal, professional third-person language ("The Operator shall...")
- Use definitive compliance language ("shall", "will", "is required to") — never hedging language`;
}
