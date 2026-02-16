/**
 * Shared auto-assessment logic.
 *
 * Evaluates a ComplianceRule against user responses and suggests a compliance status.
 *
 * Options:
 *  - supportPartial (default false): when true and some checks pass but not all,
 *    returns "partial" instead of null.
 */

import type { ComplianceRule } from "./types";

export type SuggestedStatus = "compliant" | "partial" | "non_compliant" | null;

export function suggestComplianceStatus(
  rule: ComplianceRule | undefined,
  responses: Record<string, unknown> | null,
  options?: { supportPartial?: boolean },
): SuggestedStatus {
  if (!rule || !responses) return null;

  const hasAnyResponse = Object.values(responses).some(
    (v) => v !== null && v !== undefined && v !== "",
  );
  if (!hasAnyResponse) return null;

  let totalChecks = 0;
  let passedChecks = 0;
  let anyExplicitFail = false;

  // Check requiredTrue booleans
  if (rule.requiredTrue) {
    for (const fieldId of rule.requiredTrue) {
      totalChecks++;
      const val = responses[fieldId];
      if (val === true) {
        passedChecks++;
      } else if (val === false) {
        anyExplicitFail = true;
      }
    }
  }

  // Check requiredNotEmpty fields
  if (rule.requiredNotEmpty) {
    for (const fieldId of rule.requiredNotEmpty) {
      totalChecks++;
      const val = responses[fieldId];
      if (val !== undefined && val !== null && val !== "") {
        passedChecks++;
      }
    }
  }

  // Check number thresholds
  if (rule.numberThresholds) {
    for (const [fieldId, threshold] of Object.entries(rule.numberThresholds)) {
      totalChecks++;
      const val = responses[fieldId];
      if (val !== undefined && val !== null && val !== "") {
        const num = Number(val);
        if (!isNaN(num)) {
          let passes = true;
          if (threshold.min !== undefined && num < threshold.min) {
            passes = false;
            anyExplicitFail = true;
          }
          if (threshold.max !== undefined && num > threshold.max) {
            passes = false;
            anyExplicitFail = true;
          }
          if (passes) passedChecks++;
        }
      }
    }
  }

  if (totalChecks > 0 && passedChecks === totalChecks) return "compliant";
  if (anyExplicitFail) return "non_compliant";

  // Partial support: some checks pass but not all
  if (
    options?.supportPartial &&
    passedChecks > 0 &&
    passedChecks < totalChecks
  ) {
    return "partial";
  }

  return null;
}
