/**
 * Generate 2.0 — Key Findings Extraction
 *
 * Extracts key findings from generated document content for use as
 * cross-reference data in subsequently generated documents.
 */

import type { ParsedSection } from "./parse-sections";
import type { NCADocumentType } from "./types";

export interface KeyFinding {
  sectionIndex: number;
  sectionTitle: string;
  findingType:
    | "compliance_determination"
    | "quantitative_result"
    | "strategy_decision"
    | "gap_identified";
  summary: string;
  referenceable: string;
}

export interface DocumentFindings {
  documentType: NCADocumentType;
  keyFindings: KeyFinding[];
}

/**
 * Extract key findings from a generated document's parsed sections.
 * Looks for compliance determinations, quantitative results, and gaps.
 */
export function extractKeyFindings(
  documentType: NCADocumentType,
  sections: ParsedSection[],
): KeyFinding[] {
  const findings: KeyFinding[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const allText = section.content
      .filter((c): c is { type: "text"; value: string } => c.type === "text")
      .map((c) => c.value)
      .join(" ");

    // Extract compliance determinations
    const compliancePatterns = [
      /(?:confirms?|demonstrates?|meets?|achieves?)\s+(?:compliance|conformity)\s+with\s+(Art\.\s*\d+[^.]*)/gi,
      /(?:compliant|compliance confirmed|compliance demonstrated)[^.]*(?:Art\.\s*\d+[^.]*)?/gi,
      /(?:25-year|twenty-five.year)\s+compliance\s+(?:confirmed|demonstrated|achieved)[^.]*/gi,
    ];

    for (const pattern of compliancePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(allText);
      if (match) {
        findings.push({
          sectionIndex: i,
          sectionTitle: section.title,
          findingType: "compliance_determination",
          summary: match[0].trim().substring(0, 200),
          referenceable: `Document ${documentType}, Section ${i + 1}`,
        });
        break; // One compliance finding per section
      }
    }

    // Extract quantitative results from tables
    for (const block of section.content) {
      if (block.type === "table") {
        for (const row of block.rows) {
          // Look for rows with numeric values
          const hasNumber = row.some((cell) =>
            /\d+\.?\d*\s*(?:km|years?|m\/s|kg|%)/i.test(cell),
          );
          if (hasNumber) {
            const summary = row.join(" | ");
            findings.push({
              sectionIndex: i,
              sectionTitle: section.title,
              findingType: "quantitative_result",
              summary: summary.substring(0, 200),
              referenceable: `Document ${documentType}, Section ${i + 1}, Table`,
            });
          }
        }
      }
    }

    // Extract gap identifications
    const gapPatterns = [
      /(?:gap|deficiency|non-compliant|does not (?:yet )?meet)[^.]*/gi,
      /\[ACTION REQUIRED[^\]]*\]/g,
    ];

    for (const pattern of gapPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(allText);
      if (match) {
        findings.push({
          sectionIndex: i,
          sectionTitle: section.title,
          findingType: "gap_identified",
          summary: match[0].trim().substring(0, 200),
          referenceable: `Document ${documentType}, Section ${i + 1}`,
        });
        break;
      }
    }
  }

  return findings;
}

/**
 * Format accumulated package findings into a prompt context block
 * for injection into subsequently generated documents.
 */
export function formatPackageContext(
  documentFindings: DocumentFindings[],
): string {
  if (documentFindings.length === 0) return "";

  const parts: string[] = [];
  parts.push("CROSS-REFERENCE DATA (from previously generated documents):");
  parts.push("");

  for (const doc of documentFindings) {
    if (doc.keyFindings.length === 0) continue;

    for (const finding of doc.keyFindings) {
      parts.push(`${finding.referenceable}: "${finding.summary}"`);
    }
    parts.push("");
  }

  parts.push(
    "Use these SPECIFIC findings when cross-referencing these documents.",
  );
  parts.push(
    "Do NOT use generic references — cite the specific section, table, and finding.",
  );

  return parts.join("\n");
}
