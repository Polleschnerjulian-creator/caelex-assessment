// ═══════════════════════════════════════════════════════════════════════════════
// CASCADE ENGINE — Cross-Jurisdiction Conflict Detection
// ═══════════════════════════════════════════════════════════════════════════════
//
// Compares regulatory requirements across jurisdictions for the same satellite.
// Detects three relationship types:
//   CONFLICT  — Mutually exclusive requirements (e.g., DE requires X, FR forbids X)
//   OVERLAP   — Same domain, similar intent → can unify compliance effort
//   COMPATIBLE — Different domains, no interaction
// ═══════════════════════════════════════════════════════════════════════════════

import type { ModuleKey, AlertSeverity } from "../core/types";
import type { RegulatoryFramework } from "./dependency-graph";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConflictType = "CONFLICT" | "OVERLAP" | "COMPATIBLE";

export interface RequirementSpec {
  id: string;
  framework: RegulatoryFramework;
  article: string;
  domain: ModuleKey;
  description: string;
  /** Quantitative threshold if applicable (e.g., deorbit years, fuel %) */
  threshold?: { value: number; unit: string; direction: "ABOVE" | "BELOW" };
  /** Deadline in ISO format if applicable */
  deadline?: string;
}

export interface ConflictPair {
  type: ConflictType;
  severity: AlertSeverity;
  requirementA: RequirementSpec;
  requirementB: RequirementSpec;
  reason: string;
  recommendation: string;
}

export interface ConflictReport {
  satellite: { noradId: string; name: string };
  jurisdictions: string[];
  conflicts: ConflictPair[];
  overlaps: ConflictPair[];
  compatible: ConflictPair[];
  summary: {
    totalPairs: number;
    conflictCount: number;
    overlapCount: number;
    compatibleCount: number;
    worstSeverity: AlertSeverity | null;
    /** Estimated weeks saved by unifying overlapping requirements */
    estimatedOverlapSavingsWeeks: number;
  };
  generatedAt: string;
}

// ─── Known Regulatory Requirements ──────────────────────────────────────────
//
// Static registry of requirements with quantitative thresholds for comparison.
// This is the "knowledge base" the conflict detector uses.

const KNOWN_REQUIREMENTS: RequirementSpec[] = [
  // ── Debris / Disposal ──
  {
    id: "EU-SA-68-deorbit",
    framework: "EU Space Act",
    article: "Art. 68",
    domain: "orbital",
    description: "25-year orbital lifetime limit",
    threshold: { value: 25, unit: "years", direction: "BELOW" },
  },
  {
    id: "FR-LOS-deorbit",
    framework: "FR-LOS",
    article: "Art. 7",
    domain: "orbital",
    description: "25-year deorbit (CNES technical requirement)",
    threshold: { value: 25, unit: "years", direction: "BELOW" },
  },
  {
    id: "UK-SIA-deorbit",
    framework: "UK-SIA",
    article: "s.7(1)",
    domain: "orbital",
    description:
      "UK debris mitigation — deorbit within mission lifetime + 25yr",
    threshold: { value: 25, unit: "years", direction: "BELOW" },
  },
  {
    id: "DE-WRG-disposal",
    framework: "DE-SatDSiG",
    article: "§12 WRG",
    domain: "orbital",
    description: "German disposal within 25 years (EU Space Act alignment)",
    threshold: { value: 25, unit: "years", direction: "BELOW" },
  },

  // ── Fuel Reserve ──
  {
    id: "EU-SA-70-fuel",
    framework: "EU Space Act",
    article: "Art. 70",
    domain: "fuel",
    description: "15% fuel reserve for passivation",
    threshold: { value: 15, unit: "%", direction: "ABOVE" },
  },
  {
    id: "EU-SA-72-fuel",
    framework: "EU Space Act",
    article: "Art. 72",
    domain: "fuel",
    description: "25% fuel reserve for disposal",
    threshold: { value: 25, unit: "%", direction: "ABOVE" },
  },
  {
    id: "IADC-fuel",
    framework: "IADC",
    article: "Guideline 5.3.1",
    domain: "fuel",
    description: "10% passivation fuel reserve (IADC guideline)",
    threshold: { value: 10, unit: "%", direction: "ABOVE" },
  },
  {
    id: "FR-CNES-fuel",
    framework: "FR-LOS",
    article: "CNES Reg",
    domain: "fuel",
    description: "CNES requires fuel reserve for controlled reentry",
    threshold: { value: 20, unit: "%", direction: "ABOVE" },
  },

  // ── Cybersecurity ──
  {
    id: "EU-SA-cyber",
    framework: "EU Space Act",
    article: "Art. 74-95",
    domain: "cyber",
    description: "EU Space Act cybersecurity requirements",
  },
  {
    id: "NIS2-21-cyber",
    framework: "NIS2",
    article: "Art. 21",
    domain: "cyber",
    description: "NIS2 cybersecurity risk management measures",
  },
  {
    id: "DE-SatDSiG-cyber",
    framework: "DE-SatDSiG",
    article: "§4",
    domain: "cyber",
    description: "German satellite data security requirements",
  },

  // ── Insurance ──
  {
    id: "EU-SA-44-insurance",
    framework: "EU Space Act",
    article: "Art. 44-51",
    domain: "insurance",
    description: "EU Space Act third-party liability insurance",
  },
  {
    id: "FR-LOS-5-insurance",
    framework: "FR-LOS",
    article: "Art. 5-6",
    domain: "insurance",
    description: "French state guarantee + TPL insurance",
  },
  {
    id: "UK-SIA-12-insurance",
    framework: "UK-SIA",
    article: "s.12",
    domain: "insurance",
    description: "UK compulsory third-party liability insurance",
  },

  // ── Registration ──
  {
    id: "EU-SA-24-reg",
    framework: "EU Space Act",
    article: "Art. 24",
    domain: "registration",
    description: "URSO registration obligation",
  },
  {
    id: "DE-WRG-5-reg",
    framework: "DE-SatDSiG",
    article: "§5 WRG",
    domain: "registration",
    description: "German national registry obligation",
  },
  {
    id: "NO-SA-4-reg",
    framework: "NO-SpaceAct",
    article: "§4",
    domain: "registration",
    description: "Norwegian space object registration",
  },

  // ── Incident Reporting ──
  {
    id: "NIS2-23-incident",
    framework: "NIS2",
    article: "Art. 23",
    domain: "cyber",
    description: "NIS2 incident reporting: 24h early warning, 72h notification",
    threshold: { value: 72, unit: "hours", direction: "BELOW" },
  },
  {
    id: "EU-SA-supervision",
    framework: "EU Space Act",
    article: "Art. 26-31",
    domain: "documentation",
    description: "EU Space Act supervision & reporting obligations",
  },
];

// ─── Conflict Detection Engine ──────────────────────────────────────────────

export class ConflictDetector {
  private requirements: RequirementSpec[];

  constructor(requirements?: RequirementSpec[]) {
    this.requirements = requirements ?? KNOWN_REQUIREMENTS;
  }

  /**
   * Detect conflicts for a satellite operating under multiple jurisdictions.
   */
  detectConflicts(
    satellite: { noradId: string; name: string },
    jurisdictions: RegulatoryFramework[],
  ): ConflictReport {
    // Always include EU-level frameworks
    const allFrameworks = new Set<RegulatoryFramework>([
      "EU Space Act",
      "NIS2",
      "IADC",
      ...jurisdictions,
    ]);

    // Filter requirements to relevant frameworks
    const relevantReqs = this.requirements.filter((r) =>
      allFrameworks.has(r.framework),
    );

    // Compare all pairs within the same domain
    const conflicts: ConflictPair[] = [];
    const overlaps: ConflictPair[] = [];
    const compatible: ConflictPair[] = [];

    for (let i = 0; i < relevantReqs.length; i++) {
      for (let j = i + 1; j < relevantReqs.length; j++) {
        const a = relevantReqs[i]!;
        const b = relevantReqs[j]!;

        // Skip same-framework comparisons
        if (a.framework === b.framework) continue;

        const pair = compareRequirements(a, b);
        if (!pair) continue;

        switch (pair.type) {
          case "CONFLICT":
            conflicts.push(pair);
            break;
          case "OVERLAP":
            overlaps.push(pair);
            break;
          case "COMPATIBLE":
            compatible.push(pair);
            break;
        }
      }
    }

    // Sort by severity
    conflicts.sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity),
    );
    overlaps.sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity),
    );

    const worstSeverity =
      conflicts.length > 0
        ? conflicts[0]!.severity
        : overlaps.length > 0
          ? overlaps[0]!.severity
          : null;

    // Estimate savings: each overlap saves ~2 weeks of duplicate compliance work
    const estimatedOverlapSavingsWeeks = overlaps.length * 2;

    return {
      satellite,
      jurisdictions: Array.from(allFrameworks),
      conflicts,
      overlaps,
      compatible,
      summary: {
        totalPairs: conflicts.length + overlaps.length + compatible.length,
        conflictCount: conflicts.length,
        overlapCount: overlaps.length,
        compatibleCount: compatible.length,
        worstSeverity,
        estimatedOverlapSavingsWeeks,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

// ─── Comparison Logic ───────────────────────────────────────────────────────

function compareRequirements(
  a: RequirementSpec,
  b: RequirementSpec,
): ConflictPair | null {
  // Different domains → COMPATIBLE (no interaction)
  if (a.domain !== b.domain) {
    return null; // Skip — too many noise pairs
  }

  // Same domain — check for overlap or conflict
  if (a.threshold && b.threshold) {
    return compareThresholds(a, b);
  }

  // Same domain, no thresholds — likely overlap
  return {
    type: "OVERLAP",
    severity: "LOW",
    requirementA: a,
    requirementB: b,
    reason: `Both regulate ${a.domain}: "${a.description}" and "${b.description}"`,
    recommendation: `Unify compliance: satisfy the stricter requirement to cover both. Review ${a.article} (${a.framework}) alongside ${b.article} (${b.framework}).`,
  };
}

function compareThresholds(
  a: RequirementSpec,
  b: RequirementSpec,
): ConflictPair {
  const ta = a.threshold!;
  const tb = b.threshold!;

  // Different units → overlap (qualitative comparison only)
  if (ta.unit !== tb.unit) {
    return {
      type: "OVERLAP",
      severity: "MEDIUM",
      requirementA: a,
      requirementB: b,
      reason: `Both regulate ${a.domain} but with different metrics (${ta.unit} vs ${tb.unit})`,
      recommendation: `Review both requirements for potential unified compliance approach.`,
    };
  }

  // Same direction — overlap, stricter one dominates
  if (ta.direction === tb.direction) {
    const stricterValue =
      ta.direction === "ABOVE"
        ? Math.max(ta.value, tb.value)
        : Math.min(ta.value, tb.value);

    const stricterReq = stricterValue === ta.value ? a : b;
    const lenientReq = stricterValue === ta.value ? b : a;
    const delta = Math.abs(ta.value - tb.value);

    return {
      type: "OVERLAP",
      severity: delta > 10 ? "HIGH" : delta > 0 ? "MEDIUM" : "LOW",
      requirementA: a,
      requirementB: b,
      reason:
        ta.value === tb.value
          ? `Identical threshold: both require ${ta.direction === "ABOVE" ? "≥" : "≤"} ${ta.value}${ta.unit}`
          : `${stricterReq.framework} is stricter (${stricterValue}${ta.unit}) vs ${lenientReq.framework} (${stricterValue === ta.value ? tb.value : ta.value}${ta.unit})`,
      recommendation:
        ta.value === tb.value
          ? `Aligned thresholds — single compliance effort covers both.`
          : `Meet the stricter ${stricterReq.framework} ${stricterReq.article} requirement (${stricterValue}${ta.unit}) to satisfy both.`,
    };
  }

  // Opposite directions — potential conflict
  // ABOVE X and BELOW Y: conflict if ranges don't overlap
  const aboveReq = ta.direction === "ABOVE" ? a : b;
  const belowReq = ta.direction === "ABOVE" ? b : a;
  const aboveVal = ta.direction === "ABOVE" ? ta.value : tb.value;
  const belowVal = ta.direction === "ABOVE" ? tb.value : ta.value;

  if (aboveVal > belowVal) {
    // True conflict: must be above X AND below Y, but X > Y → impossible
    return {
      type: "CONFLICT",
      severity: "CRITICAL",
      requirementA: a,
      requirementB: b,
      reason: `Irreconcilable: ${aboveReq.framework} requires ≥${aboveVal}${ta.unit} but ${belowReq.framework} requires ≤${belowVal}${ta.unit}`,
      recommendation: `Regulatory conflict requires legal consultation. Seek exemption or clarification from ${aboveReq.framework} or ${belowReq.framework} authority.`,
    };
  }

  // Ranges overlap — tight but feasible
  return {
    type: "OVERLAP",
    severity: "HIGH",
    requirementA: a,
    requirementB: b,
    reason: `Narrow feasible range: must be ≥${aboveVal}${ta.unit} (${aboveReq.framework}) and ≤${belowVal}${ta.unit} (${belowReq.framework})`,
    recommendation: `Target the midpoint (~${Math.round((aboveVal + belowVal) / 2)}${ta.unit}) to satisfy both requirements with safety margin.`,
  };
}

function severityRank(severity: AlertSeverity): number {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _defaultDetector: ConflictDetector | null = null;

export function getDefaultDetector(): ConflictDetector {
  if (!_defaultDetector) {
    _defaultDetector = new ConflictDetector();
  }
  return _defaultDetector;
}

export { KNOWN_REQUIREMENTS };
