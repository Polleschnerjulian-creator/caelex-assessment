/**
 * Generate 2.0 — Reasoning-Aware Prompt Builder
 *
 * Extends the existing buildSectionPrompt with plan context.
 * When a plan is available, injects precise per-section instructions.
 * When no plan is available, falls back to the existing prompt format.
 */

import type { SectionPlan, CrossReference } from "./reasoning-types";

export function buildSectionPromptWithPlan(
  userMessage: string,
  sectionNumber: number,
  sectionTitle: string,
  sectionPlan: SectionPlan | null,
  crossReferences?: Pick<
    CrossReference,
    "toDocumentType" | "toSection" | "description"
  >[],
  packageContext?: string,
): string {
  // Fall back to existing prompt format when no plan
  if (!sectionPlan) {
    return `${userMessage}\n\n---\n\nCRITICAL: Generate ONLY section ${sectionNumber}: "${sectionTitle}". Start directly with "## SECTION: ${sectionTitle}" and produce comprehensive, detailed, NCA-submission-quality content for this section ONLY. Do not include any other sections. Use formal regulatory language in third person. Use the maximum available output length for this one section.`;
  }

  const parts: string[] = [];

  parts.push(userMessage);
  parts.push("\n\n---\n\n");

  // Section plan block
  parts.push("SECTION PLAN (follow this plan precisely):");
  parts.push(`- Section: ${sectionNumber}. ${sectionTitle}`);
  parts.push(
    `- Compliance Verdict: ${sectionPlan.complianceVerdict.toUpperCase().replace(/_/g, " ")}`,
  );
  parts.push(`- Confidence: ${sectionPlan.confidenceLevel.toUpperCase()}`);
  parts.push(`- Rationale: ${sectionPlan.verdictRationale}`);

  if (sectionPlan.availableData.length > 0) {
    parts.push(
      `- Available Data: ${sectionPlan.availableData.map((d) => `${d.field}=${d.value}`).join(", ")}`,
    );
  }

  if (sectionPlan.missingData.length > 0) {
    parts.push(
      `- Missing Data: ${sectionPlan.missingData.map((d) => `${d.field} (${d.source}, ${d.articleRef})`).join(", ")}`,
    );
  }

  parts.push(`- Writing Strategy: ${sectionPlan.writingStrategy}`);

  if (sectionPlan.warnings.length > 0) {
    parts.push(
      `- Warnings: ${sectionPlan.warnings.map((w) => w.message).join("; ")}`,
    );
  }

  // Cross-references
  if (crossReferences && crossReferences.length > 0) {
    parts.push("- Cross-References to include:");
    for (const ref of crossReferences) {
      const sectionRef =
        ref.toSection != null ? `, Section ${ref.toSection}` : "";
      parts.push(
        `  - "See Document ${ref.toDocumentType}${sectionRef}" (${ref.description})`,
      );
    }
  }

  // Package context from previously generated documents
  if (packageContext) {
    parts.push(`\n${packageContext}`);
  }

  parts.push(
    `\n\nCRITICAL: Generate ONLY section ${sectionNumber}: "${sectionTitle}". Start directly with "## SECTION: ${sectionTitle}" and produce comprehensive, detailed, NCA-submission-quality content for this section ONLY. Do not include any other sections. Use formal regulatory language in third person. Use the maximum available output length for this one section.`,
  );

  return parts.join("\n");
}
