/**
 * Generate 2.0 — NCA Targeting
 *
 * Modifies a ReasoningPlan based on the target NCA's profile.
 * Adjusts depth, adds NCA-specific warnings, and recognizes evidence shortcuts.
 */

import type {
  ReasoningPlan,
  SectionPlan,
  PlanWarning,
} from "./reasoning-types";
import type { NCAProfile, DocumentCategory } from "@/data/nca-profiles";
import { NCA_DOC_TYPE_MAP } from "./types";

/**
 * Apply NCA-specific targeting to a reasoning plan.
 * Returns a new plan — does NOT mutate the original.
 */
export function applyNCATargeting(
  plan: ReasoningPlan,
  nca: NCAProfile,
): ReasoningPlan {
  const meta = NCA_DOC_TYPE_MAP[plan.documentType];
  const category = meta?.category as DocumentCategory | undefined;
  const categoryRigor = category ? nca.rigor[category] : 3;
  const guidance = nca.documentGuidance[plan.documentType];

  const modifiedSections = plan.sections.map((section): SectionPlan => {
    const newWarnings: PlanWarning[] = [...section.warnings];
    let newStrategy = section.writingStrategy;

    // 1. Depth adjustment for high-rigor categories
    if (categoryRigor >= 4) {
      newWarnings.push({
        type: "nca_specific",
        message: `${nca.name} has high scrutiny (${categoryRigor}/5) for ${category} — provide maximum detail and quantitative evidence`,
        actionable: false,
        suggestion: null,
      });
    }

    // 2. Document-specific guidance
    if (guidance) {
      // Depth expectation
      if (guidance.depthExpectation === "extensive") {
        newStrategy +=
          " Use maximum detail — this NCA expects extensive coverage.";
      } else if (guidance.depthExpectation === "detailed") {
        newStrategy += " Provide detailed analysis — above standard depth.";
      }

      // Specific requirements as warnings
      for (const req of guidance.specificRequirements) {
        newWarnings.push({
          type: "nca_specific",
          message: `NCA requirement: ${req}`,
          actionable: false,
          suggestion: null,
        });
      }

      // Common rejection reasons
      if (guidance.commonRejectionReasons.length > 0) {
        newWarnings.push({
          type: "nca_specific",
          message: `Common rejection reasons to prevent: ${guidance.commonRejectionReasons.join("; ")}`,
          actionable: false,
          suggestion: null,
        });
      }
    }

    // 3. Focus area warnings
    for (const focus of nca.focusAreas) {
      // Check if this section's article refs overlap with the focus area
      const sectionArticles = section.availableData
        .map((d) => d.articleRef)
        .concat(section.missingData.map((d) => d.articleRef));

      const focusMatches = sectionArticles.some((ref) =>
        ref.includes(focus.articleRange.replace("Art. ", "")),
      );

      if (focusMatches && focus.weight === "critical") {
        newWarnings.push({
          type: "nca_specific",
          message: `NCA focus area (${focus.articleRange}): ${focus.description}`,
          actionable: false,
          suggestion: null,
        });
      }
    }

    return {
      ...section,
      warnings: newWarnings,
      writingStrategy: newStrategy,
    };
  });

  return {
    ...plan,
    targetNCA: nca.id,
    sections: modifiedSections,
  };
}
