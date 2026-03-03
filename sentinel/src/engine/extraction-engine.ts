import { REGULATORY_RULES, type RegulatoryRule } from "./rule-definitions.js";
import { getRulesForDataPoint } from "./regulation-mapper.js";
import type { RegulationMapping } from "../types/evidence-packet.js";
import type { CollectorOutput } from "../types/collector-types.js";

const rulesById = new Map<string, RegulatoryRule>(
  REGULATORY_RULES.map((r) => [r.id, r]),
);

/**
 * Extraction Engine — evaluates collector output against regulatory rules
 * and produces regulation mappings for each data point.
 */
export function evaluateCompliance(
  output: CollectorOutput,
): RegulationMapping[] {
  const ruleIds = getRulesForDataPoint(output.data_point);
  const mappings: RegulationMapping[] = [];

  for (const ruleId of ruleIds) {
    const rule = rulesById.get(ruleId);
    if (!rule) continue;

    // Check if this output has the required data points
    const hasRequired = rule.data_points.some(
      (dp) => output.values[dp] !== undefined,
    );
    if (!hasRequired) continue;

    try {
      const status = rule.evaluate(output.values);
      mappings.push({
        ref: `${rule.regulation.toLowerCase().replace(/\s+/g, "_")}_${rule.article
          .toLowerCase()
          .replace(/[\s().]/g, "_")
          .replace(/_+/g, "_")}`,
        status,
        note: `${rule.name}: ${status}`,
      });
    } catch {
      // Rule evaluation failed — skip but don't crash
      mappings.push({
        ref: ruleId,
        status: "MONITORED",
        note: `${rule.name}: evaluation error`,
      });
    }
  }

  return mappings;
}

/**
 * Get summary statistics from regulation mappings.
 */
export function summarizeMappings(
  mappings: RegulationMapping[],
): Record<string, number> {
  const summary: Record<string, number> = {
    COMPLIANT: 0,
    NON_COMPLIANT: 0,
    WARNING: 0,
    MONITORED: 0,
    CRITICAL: 0,
  };
  for (const m of mappings) {
    summary[m.status] = (summary[m.status] ?? 0) + 1;
  }
  return summary;
}
