/**
 * Generate 2.0 — Quality Rules Prompt
 *
 * Layer 2 of 4: Formatting standards, marker conventions, and output quality rules
 * applied consistently across all document types.
 */

export function getQualityRules(): string {
  return `## Output Quality Rules & Formatting Standards

### Marker Conventions

Use these markers to flag items requiring operator attention:

- **Missing data:** Insert \`[ACTION REQUIRED: <description of what the operator must provide>]\` wherever specific operator data is needed but not available in the provided assessment data. Be specific about exactly what data is needed and why.
- **Evidence placeholders:** Insert \`[EVIDENCE: <description of evidence document or artifact>]\` wherever a compliance claim should be backed by a specific piece of evidence (test report, certification, procedure document, analysis output, etc.).
- **Disclaimer:** Every generated document MUST begin with the following disclaimer immediately after the cover page section: \`> DISCLAIMER: FOR INFORMATIONAL PURPOSES ONLY — NOT LEGAL ADVICE. This document has been generated using AI-assisted analysis based on the operator's assessment data and applicable regulatory requirements. It should be reviewed by qualified legal and technical professionals before submission to any National Competent Authority. The operator retains full responsibility for the accuracy and completeness of all information contained herein.\`

### Section Structure

- Start each main section with \`## SECTION: Title\`
- Use \`### SUBSECTION: Subsection Title\` for sub-sections within a main section
- Do not include any preamble or closing remarks outside of sections — begin directly with the first \`## SECTION:\`
- Use \`---\` dividers to separate logical blocks within a section

### Formatting Rules

- **Tables:** Use standard markdown table format with \`|\` delimiters. Always include a header row and alignment row. Use tables for compliance matrices, parameter summaries, risk registers, and any structured data.
- **Lists:** Use \`- item\` for unordered lists, \`1. item\` for ordered/sequential lists. Prefer lists for requirements, action items, and procedural steps.
- **Key-value pairs:** Use \`**Key:** Value\` format on separate lines for document metadata, parameter summaries, and configuration details.
- **Alerts/Callouts:** Use \`> WARNING: message\` for critical warnings and \`> INFO: message\` for informational callouts.
- **Cross-references:** Reference other NCA package documents using their code (e.g., "See Document A2 — Orbital Lifetime Analysis for detailed decay modeling results").
- **Article citations:** Always use the format \`Art. XX(Y)(z) of [Regulation Name]\` for regulatory references. Be specific to the paragraph and sub-paragraph level where applicable.

### Language & Tone

- Write in formal, professional third-person language appropriate for regulatory submissions (e.g., "The Operator shall..." or "The Organization maintains...")
- Use active voice and direct, confident statements
- Avoid hedging language ("might", "could possibly") — use definitive compliance language ("shall", "will", "is required to")
- Maintain consistency in terminology throughout the document (e.g., do not alternate between "spacecraft" and "satellite" for the same object)
- Keep regulation article references in their original English form regardless of document language

### Cross-Reference Consistency

- When referencing an article, always use the same format throughout the document
- When referencing another document in the NCA package, include both the document code and title on first reference (e.g., "Document A4 — End-of-Life Disposal Plan"), then the code alone for subsequent references (e.g., "Document A4")
- Ensure compliance status assessments are consistent — if a requirement is marked "Compliant" in a compliance matrix, it must not be described as a gap elsewhere in the same document

### Content Depth

- Use the MAXIMUM output length available — these are comprehensive compliance documents, not summaries
- Every section must contain substantive analysis, not just data listings or bullet points
- Where operator data IS provided: generate deep compliance analysis explaining what it means for regulatory obligations, whether it meets requirements, and cite specific articles
- Where operator data is NOT provided: provide substantive professional content including the regulatory requirement, industry best practices, technical guidance, referenced standards, typical NCA-expected benchmarks, and actionable recommendations
- Never fabricate the operator's specific data (numbers, dates, measurements), but always provide expert analysis, regulatory context, and industry benchmarks`;
}
