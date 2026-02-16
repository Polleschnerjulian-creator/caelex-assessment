import type {
  ComplianceRule,
  RequirementStatus,
} from "@/data/debris-requirements";

/**
 * Pure function: evaluates complianceRule against user responses
 * and suggests a compliance status.
 *
 * Returns:
 * - "compliant" if all rule conditions pass
 * - "non_compliant" if any critical condition explicitly fails
 * - null if insufficient data to determine
 */
export function suggestComplianceStatus(
  rule: ComplianceRule | undefined,
  responses: Record<string, unknown> | null,
): RequirementStatus | null {
  if (!rule || !responses) return null;

  const hasAnyResponse = Object.values(responses).some(
    (v) => v !== null && v !== undefined && v !== "",
  );
  if (!hasAnyResponse) return null;

  let allPass = true;
  let anyExplicitFail = false;

  // Check requiredTrue booleans
  if (rule.requiredTrue) {
    for (const fieldId of rule.requiredTrue) {
      const val = responses[fieldId];
      if (val === undefined || val === null) {
        allPass = false;
      } else if (val === false) {
        allPass = false;
        anyExplicitFail = true;
      }
    }
  }

  // Check requiredNotEmpty fields
  if (rule.requiredNotEmpty) {
    for (const fieldId of rule.requiredNotEmpty) {
      const val = responses[fieldId];
      if (val === undefined || val === null || val === "") {
        allPass = false;
      }
    }
  }

  // Check number thresholds
  if (rule.numberThresholds) {
    for (const [fieldId, threshold] of Object.entries(rule.numberThresholds)) {
      const val = responses[fieldId];
      if (val === undefined || val === null || val === "") {
        allPass = false;
      } else {
        const num = Number(val);
        if (isNaN(num)) {
          allPass = false;
        } else {
          if (threshold.min !== undefined && num < threshold.min) {
            allPass = false;
            anyExplicitFail = true;
          }
          if (threshold.max !== undefined && num > threshold.max) {
            allPass = false;
            anyExplicitFail = true;
          }
        }
      }
    }
  }

  if (allPass) return "compliant";
  if (anyExplicitFail) return "non_compliant";
  return null;
}
