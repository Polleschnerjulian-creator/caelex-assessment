/**
 * Generate 2.0 — Auto-Fix Engine
 *
 * Applies automatic fixes for consistency findings marked as autoFixable.
 * Returns updated sections + list of applied fixes. Never mutates input.
 */

import type { ParsedSection } from "./parse-sections";
import type { ConsistencyFinding } from "./consistency-check";

export interface AutoFixResult {
  updatedSections: ParsedSection[];
  appliedFixes: Array<{ findingId: string; description: string }>;
}

export function applyAutoFixes(
  sections: ParsedSection[],
  findings: ConsistencyFinding[],
  assessmentData: Record<string, unknown>,
): AutoFixResult {
  // Deep clone sections to avoid mutation
  let updated: ParsedSection[] = JSON.parse(JSON.stringify(sections));
  const appliedFixes: Array<{ findingId: string; description: string }> = [];

  for (const finding of findings) {
    if (!finding.autoFixable) continue;

    if (finding.category === "internal" && finding.sectionIndex !== null) {
      // Number inconsistency fix — replace wrong numbers with canonical values
      const canonicalAltitude = assessmentData.altitudeKm as number | undefined;
      if (
        canonicalAltitude &&
        finding.description.toLowerCase().includes("altitude")
      ) {
        updated = replaceSectionText(
          updated,
          finding.sectionIndex,
          // Match numbers followed by km that aren't the canonical value
          new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*km\\b`, "gi"),
          (match, num) => {
            const n = parseFloat(num);
            if (
              n !== canonicalAltitude &&
              Math.abs(n - canonicalAltitude) < 200
            ) {
              return `${canonicalAltitude}km`;
            }
            return match;
          },
        );
        appliedFixes.push({
          findingId: finding.id,
          description:
            finding.autoFixDescription || "Fixed number inconsistency",
        });
      }
    }

    if (
      finding.category === "formatting" &&
      finding.autoFixDescription?.includes("Normalize")
    ) {
      // Article reference normalization
      updated = replaceAllSectionsText(
        updated,
        /\bArticle\s+(\d+(?:\([^)]*\))*)/g,
        (_, ref) => `Art. ${ref}`,
      );
      appliedFixes.push({
        findingId: finding.id,
        description:
          finding.autoFixDescription || "Normalized article references",
      });
    }
  }

  return { updatedSections: updated, appliedFixes };
}

function replaceSectionText(
  sections: ParsedSection[],
  sectionIndex: number,
  pattern: RegExp,
  replacer: (match: string, ...args: string[]) => string,
): ParsedSection[] {
  return sections.map((section, idx) => {
    if (idx !== sectionIndex) return section;
    return {
      ...section,
      content: section.content.map((block) => {
        if (block.type === "text") {
          return { ...block, value: block.value.replace(pattern, replacer) };
        }
        return block;
      }),
    };
  });
}

function replaceAllSectionsText(
  sections: ParsedSection[],
  pattern: RegExp,
  replacer: (match: string, ...args: string[]) => string,
): ParsedSection[] {
  return sections.map((section) => ({
    ...section,
    content: section.content.map((block) => {
      if (block.type === "text") {
        return { ...block, value: block.value.replace(pattern, replacer) };
      }
      return block;
    }),
  }));
}
