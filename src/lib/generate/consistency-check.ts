/**
 * Generate 2.0 — Deterministic Consistency Check Engine
 *
 * Two capabilities:
 * 1. runDeterministicChecks() — regex/pattern-based validation (~100ms, no AI)
 * 2. buildConsistencyCheckPrompt() — builds a Claude prompt for deeper analysis
 */

import type { ParsedSection, ParsedSectionContent } from "./parse-sections";
import type { ReasoningPlan } from "./reasoning-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsistencyFinding {
  id: string;
  category:
    | "internal"
    | "cross_document"
    | "regulatory"
    | "evidence"
    | "formatting";
  severity: "error" | "warning" | "info";
  documentType: string;
  sectionIndex: number | null;
  title: string;
  description: string;
  autoFixable: boolean;
  autoFixDescription: string | null;
}

export interface RelatedDocumentSummary {
  type: string;
  summary: string;
}

// ─── Text Extraction Helpers ──────────────────────────────────────────────────

/**
 * Extract all plain text from section content (text nodes, table cells).
 */
function extractText(content: ParsedSectionContent[]): string {
  const parts: string[] = [];
  for (const item of content) {
    if (item.type === "text") {
      parts.push(item.value);
    } else if (item.type === "heading") {
      parts.push(item.value);
    } else if (item.type === "list") {
      parts.push(...item.items);
    } else if (item.type === "table") {
      parts.push(...item.headers);
      for (const row of item.rows) {
        parts.push(...row);
      }
    } else if (item.type === "keyValue") {
      for (const kv of item.items) {
        parts.push(kv.key, kv.value);
      }
    } else if (item.type === "alert") {
      parts.push(item.message);
    }
  }
  return parts.join(" ");
}

/**
 * Extract only table rows from section content.
 */
function extractTableRows(
  content: ParsedSectionContent[],
): Array<{ headers: string[]; rows: string[][] }> {
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];
  for (const item of content) {
    if (item.type === "table") {
      tables.push({ headers: item.headers, rows: item.rows });
    }
  }
  return tables;
}

// ─── Check 1: Number Consistency ─────────────────────────────────────────────

interface NumberOccurrence {
  value: number;
  unit: string;
  sectionIndex: number;
  sectionTitle: string;
  context: string;
}

const NUMBER_PATTERNS: Array<{ unit: string; regex: RegExp }> = [
  { unit: "km", regex: /(\d+(?:\.\d+)?)\s*km/gi },
  { unit: "satellite|spacecraft", regex: /(\d+)\s*(?:satellite|spacecraft)/gi },
  { unit: "year", regex: /(\d+(?:\.\d+)?)\s*(?:years?|yr)/gi },
  { unit: "kg", regex: /(\d+(?:\.\d+)?)\s*kg/gi },
  { unit: "MHz", regex: /(\d+(?:\.\d+)?)\s*MHz/gi },
  { unit: "GHz", regex: /(\d+(?:\.\d+)?)\s*GHz/gi },
  { unit: "dB", regex: /(\d+(?:\.\d+)?)\s*dB/gi },
];

function checkNumberConsistency(
  sections: ParsedSection[],
  documentType: string,
  findings: ConsistencyFinding[],
  counter: { n: number },
): void {
  // Group occurrences by unit type
  const occurrencesByUnit = new Map<string, NumberOccurrence[]>();

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    const text = extractText(section.content);

    for (const { unit, regex } of NUMBER_PATTERNS) {
      // Reset lastIndex for global regexes
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const value = parseFloat(match[1]);
        const existing = occurrencesByUnit.get(unit) ?? [];
        existing.push({
          value,
          unit,
          sectionIndex: sIdx,
          sectionTitle: section.title,
          context: match[0],
        });
        occurrencesByUnit.set(unit, existing);
      }
    }
  }

  // Flag units where multiple distinct values appear across sections
  for (const [unit, occurrences] of occurrencesByUnit.entries()) {
    if (occurrences.length < 2) continue;

    const uniqueValues = [...new Set(occurrences.map((o) => o.value))];
    if (uniqueValues.length <= 1) continue;

    // Only flag if the occurrences come from different sections
    const sectionIndices = [...new Set(occurrences.map((o) => o.sectionIndex))];
    if (sectionIndices.length <= 1) continue;

    const valueList = occurrences
      .map((o) => `${o.value}${unit} (section "${o.sectionTitle}")`)
      .join(", ");

    findings.push({
      id: `f-internal-${counter.n++}`,
      category: "internal",
      severity: "error",
      documentType,
      sectionIndex: null,
      title: `Inconsistent number values (${unit})`,
      description: `Different numeric values found for the same unit across sections: ${valueList}`,
      autoFixable: false,
      autoFixDescription: null,
    });
  }
}

// ─── Check 2: Compliance Status Contradictions ───────────────────────────────

/**
 * Extract article references from text like "Art. 72", "Art. 72(2)", "Article 72".
 * Returns normalised refs like "72", "72(2)".
 */
function extractArticleRefsFromText(text: string): Map<string, string> {
  // Maps normalised article number → reported status in prose
  const refs = new Map<string, string>();

  // Detect "Compliant" / "Non-Compliant" / "compliant" patterns near article refs
  // Pattern: "Compliant with Art. 72" or "Art. 72 ... Compliant" etc.
  const artPattern = /(?:Art(?:icle)?\.?\s*)(\d+(?:\(\d+\))?)/gi;
  let match: RegExpExecArray | null;
  while ((match = artPattern.exec(text)) !== null) {
    const articleNum = match[1];
    // Look at a window around the match for compliance status
    const start = Math.max(0, match.index - 60);
    const end = Math.min(text.length, match.index + match[0].length + 60);
    const window = text.slice(start, end);

    if (/non[-\s]?compliant/i.test(window)) {
      refs.set(articleNum, "non-compliant");
    } else if (/compliant/i.test(window)) {
      refs.set(articleNum, "compliant");
    }
  }

  return refs;
}

/**
 * Extract compliance statuses from compliance matrix tables.
 * Returns map of article number → status string.
 */
function extractComplianceMatrixStatuses(
  content: ParsedSectionContent[],
): Map<string, string> {
  const statuses = new Map<string, string>();
  const tables = extractTableRows(content);

  for (const table of tables) {
    // Find requirement column and status column indices
    const reqIdx = table.headers.findIndex((h) =>
      /requirement|article|art\./i.test(h),
    );
    const statusIdx = table.headers.findIndex((h) => /status/i.test(h));
    if (reqIdx === -1 || statusIdx === -1) continue;

    for (const row of table.rows) {
      const reqCell = row[reqIdx] ?? "";
      const statusCell = row[statusIdx] ?? "";

      // Extract article number from requirement cell
      const artMatch = reqCell.match(
        /(?:Art(?:icle)?\.?\s*)(\d+(?:\(\d+\))?)/i,
      );
      if (artMatch) {
        const articleNum = artMatch[1];
        const status = /non[-\s]?compliant/i.test(statusCell)
          ? "non-compliant"
          : /compliant/i.test(statusCell)
            ? "compliant"
            : statusCell.toLowerCase();
        statuses.set(articleNum, status);
      }
    }
  }

  return statuses;
}

function checkComplianceContradictions(
  sections: ParsedSection[],
  documentType: string,
  findings: ConsistencyFinding[],
  counter: { n: number },
): void {
  // Collect all text-level compliance claims
  const textStatuses = new Map<string, string>(); // articleNum → status
  // Collect matrix-level compliance claims
  const matrixStatuses = new Map<string, string>(); // articleNum → status

  for (const section of sections) {
    const text = extractText(section.content);
    const textRefs = extractArticleRefsFromText(text);
    for (const [art, status] of textRefs.entries()) {
      // text-level: keep first seen (or could merge — first wins for simplicity)
      if (!textStatuses.has(art)) {
        textStatuses.set(art, status);
      }
    }

    // Table-level statuses
    const matrixRefs = extractComplianceMatrixStatuses(section.content);
    for (const [art, status] of matrixRefs.entries()) {
      if (!matrixStatuses.has(art)) {
        matrixStatuses.set(art, status);
      }
    }
  }

  // Compare text vs matrix
  for (const [art, textStatus] of textStatuses.entries()) {
    const matrixStatus = matrixStatuses.get(art);
    if (!matrixStatus) continue;

    if (textStatus !== matrixStatus) {
      findings.push({
        id: `f-internal-${counter.n++}`,
        category: "internal",
        severity: "error",
        documentType,
        sectionIndex: null,
        title: `Compliance status contradiction for Art. ${art}`,
        description: `Art. ${art} is described as "${textStatus}" in prose but "${matrixStatus}" in the compliance matrix — these contradict each other.`,
        autoFixable: false,
        autoFixDescription: null,
      });
    }
  }
}

// ─── Check 3: Article Reference Format Consistency ───────────────────────────

function checkArticleReferenceFormats(
  sections: ParsedSection[],
  documentType: string,
  findings: ConsistencyFinding[],
  counter: { n: number },
): void {
  // Detect which formats are used across the entire document
  const formats = new Set<string>();

  // Format A: "Art. 72" or "Art. 72(2)"
  const formatA = /\bArt\.\s*\d+/g;
  // Format B: "Article 72" or "Article 72(2)"
  const formatB = /\bArticle\s+\d+/gi;
  // Format C: "Art.72" (no space)
  const formatC = /\bArt\.\d+/g;

  const allText = sections.map((s) => extractText(s.content)).join(" ");

  // Reset and test
  if (formatA.test(allText)) formats.add("Art. N");
  formatB.lastIndex = 0;
  if (formatB.test(allText)) formats.add("Article N");
  formatC.lastIndex = 0;
  if (formatC.test(allText)) formats.add("Art.N");

  // "Article N" mixed with "Art. N" (or "Art.N") = inconsistent
  const hasFullWord = formats.has("Article N");
  const hasAbbrev = formats.has("Art. N") || formats.has("Art.N");

  if (hasFullWord && hasAbbrev) {
    const formatList = [...formats].join(", ");
    findings.push({
      id: `f-formatting-${counter.n++}`,
      category: "formatting",
      severity: "warning",
      documentType,
      sectionIndex: null,
      title: "Inconsistent article reference format",
      description: `Multiple article reference formats detected: ${formatList}. Use a single consistent format throughout the document.`,
      autoFixable: true,
      autoFixDescription:
        "Normalise all article references to 'Art. N(P)' format.",
    });
  }
}

// ─── Check 4: EVIDENCE Markers ───────────────────────────────────────────────

function checkEvidenceMarkers(
  sections: ParsedSection[],
  documentType: string,
  findings: ConsistencyFinding[],
  counter: { n: number },
): void {
  const evidencePattern = /\[EVIDENCE:\s*([^\]]+)\]/g;
  const found: Array<{
    marker: string;
    sectionTitle: string;
    sectionIndex: number;
  }> = [];

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    const text = extractText(section.content);
    evidencePattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = evidencePattern.exec(text)) !== null) {
      found.push({
        marker: match[1].trim(),
        sectionTitle: section.title,
        sectionIndex: sIdx,
      });
    }
  }

  if (found.length > 0) {
    const markerList = found
      .map((f) => `"${f.marker}" (section "${f.sectionTitle}")`)
      .join("; ");
    findings.push({
      id: `f-evidence-${counter.n++}`,
      category: "evidence",
      severity: "info",
      documentType,
      sectionIndex: null,
      title: `${found.length} unresolved EVIDENCE marker(s)`,
      description: `The document contains ${found.length} [EVIDENCE: ...] placeholder(s) that require supporting documents: ${markerList}`,
      autoFixable: false,
      autoFixDescription: null,
    });
  }
}

// ─── Check 5: ACTION REQUIRED Markers ────────────────────────────────────────

function checkActionRequiredMarkers(
  sections: ParsedSection[],
  documentType: string,
  findings: ConsistencyFinding[],
  counter: { n: number },
): void {
  const actionPattern = /\[ACTION REQUIRED:\s*([^\]]+)\]/g;
  const found: Array<{ marker: string; sectionTitle: string }> = [];

  for (const section of sections) {
    const text = extractText(section.content);
    actionPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = actionPattern.exec(text)) !== null) {
      found.push({
        marker: match[1].trim(),
        sectionTitle: section.title,
      });
    }
  }

  if (found.length > 0) {
    const markerList = found
      .map((f) => `"${f.marker}" (section "${f.sectionTitle}")`)
      .join("; ");
    findings.push({
      id: `f-internal-${counter.n++}`,
      category: "internal",
      severity: "info",
      documentType,
      sectionIndex: null,
      title: `${found.length} ACTION REQUIRED marker(s) remaining`,
      description: `The document contains ${found.length} [ACTION REQUIRED: ...] placeholder(s) that must be completed before submission: ${markerList}`,
      autoFixable: false,
      autoFixDescription: null,
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run all deterministic (regex/pattern-based) consistency checks.
 * Returns a list of findings. No AI call — designed to complete in ~100ms.
 */
export function runDeterministicChecks(
  sections: ParsedSection[],
  documentType: string,
): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  const counter = { n: 0 };

  checkNumberConsistency(sections, documentType, findings, counter);
  checkComplianceContradictions(sections, documentType, findings, counter);
  checkArticleReferenceFormats(sections, documentType, findings, counter);
  checkEvidenceMarkers(sections, documentType, findings, counter);
  checkActionRequiredMarkers(sections, documentType, findings, counter);

  return findings;
}

/**
 * Build a Claude prompt asking for deep consistency analysis.
 *
 * @param sections          The parsed sections of the document under review.
 * @param documentType      E.g. "DMP", "EOL_DISPOSAL", etc.
 * @param reasoningPlan     Optional pre-generation reasoning plan (may be null).
 * @param relatedDocuments  Summaries of related documents for cross-document checks.
 */
export function buildConsistencyCheckPrompt(
  sections: ParsedSection[],
  documentType: string,
  reasoningPlan: ReasoningPlan | null,
  relatedDocuments: RelatedDocumentSummary[],
): string {
  // Serialise sections to a readable text block
  const serialisedSections = sections
    .map((section, idx) => {
      const text = extractText(section.content);
      return `[Section ${idx + 1}: ${section.title}]\n${text}`;
    })
    .join("\n\n");

  // Serialise related document summaries
  const relatedDocBlock =
    relatedDocuments.length > 0
      ? relatedDocuments.map((rd) => `- ${rd.type}: ${rd.summary}`).join("\n")
      : "(none)";

  // Reasoning plan block (optional)
  const planBlock = reasoningPlan
    ? `\n\n## Reasoning Plan\n${JSON.stringify(reasoningPlan, null, 2)}`
    : "";

  return `You are a regulatory document consistency auditor specialising in space law compliance documents.

## Task
Analyse the following ${documentType} document for internal inconsistencies, cross-document conflicts, regulatory issues, and formatting problems.

## Document Content
${serialisedSections}${planBlock}

## Related Documents
${relatedDocBlock}

## Instructions
For each issue found, output a finding in the following pipe-delimited format:
FINDING|<category>|<severity>|<section_title>|<title>|<description>

Where:
- category: internal | cross_document | regulatory | evidence | formatting
- severity: error | warning | info
- section_title: the section title where the issue occurs, or "DOCUMENT" for document-wide issues
- title: a short title for the finding (max 80 characters)
- description: a detailed explanation of the issue

Focus on:
1. Numeric values that contradict each other (altitudes, masses, counts, durations)
2. Compliance status statements that conflict with the compliance matrix
3. Cross-references to related documents that are inconsistent with provided summaries
4. Missing or contradictory regulatory article citations
5. Statements that conflict with EU Space Act (COM(2025) 335) requirements

Output ONLY the FINDING| lines, one per line. Do not include explanatory text outside this format.`;
}
