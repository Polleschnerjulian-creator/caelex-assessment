import type {
  JurisdictionSimulation,
  JurisdictionRequirement,
  JurisdictionRequirementChange,
  LaunchVehicleProfile,
  LaunchJurisdictionSimulation,
} from "../core/types";
import { JURISDICTIONS, getJurisdiction } from "./jurisdiction-data";
import { LAUNCH_JURISDICTIONS } from "@/data/launch-operator-requirements";

/**
 * Jurisdiction Simulator
 *
 * Compares compliance requirements across jurisdictions to help operators
 * evaluate the impact of re-flagging their satellite to a different jurisdiction.
 */

/**
 * Simulate re-flagging a satellite from one jurisdiction to another.
 */
export function simulateJurisdictionChange(
  fromCode: string,
  toCode: string,
  satellite: { noradId: string; name: string },
  currentScore: number,
): JurisdictionSimulation {
  const from = getJurisdiction(fromCode);
  const to = getJurisdiction(toCode);

  if (!from || !to) {
    throw new Error(`Unknown jurisdiction: ${!from ? fromCode : toCode}`);
  }

  const fromReqs = from.specificRequirements;
  const toReqs = to.specificRequirements;

  // Diff requirements
  const { added, removed, changed, unchanged } = diffRequirements(
    fromReqs,
    toReqs,
  );

  // Score delta estimate: each added requirement costs ~5 points, removed gains ~3
  const addedImpact = added.length * -5;
  const removedImpact = removed.length * 3;
  const changedImpact = changed.reduce((sum, c) => {
    if (c.changeType === "STRICTER") return sum - 3;
    if (c.changeType === "LOOSER") return sum + 2;
    return sum;
  }, 0);

  const scoreDelta = addedImpact + removedImpact + changedImpact;
  const scoreAfter = Math.max(0, Math.min(100, currentScore + scoreDelta));

  // Determine documents needed
  const documentsNeeded = generateDocumentsList(to.code, added);
  const documentsRemoved = generateDocumentsList(from.code, removed);

  return {
    fromJurisdiction: fromCode,
    toJurisdiction: toCode,
    satellite,
    complianceDelta: {
      scoreBefore: currentScore,
      scoreAfter,
      scoreDelta,
    },
    requirementsAdded: added,
    requirementsRemoved: removed,
    requirementsChanged: changed,
    requirementsUnchanged: unchanged,
    documentsNeeded,
    documentsRemoved,
    documentsModified: changed.map(
      (c) => `${c.name}: ${c.before} → ${c.after}`,
    ),
    estimatedTimeline: {
      approvalDuration: to.approvalDuration,
      additionalComplianceWork: estimateComplianceWork(added.length),
    },
    regulatoryAuthority: {
      current: from.authority,
      new: to.authority,
    },
  };
}

/**
 * Compare all jurisdictions for a satellite and rank by favorability.
 */
export function compareAllJurisdictions(
  currentCode: string,
  satellite: { noradId: string; name: string },
  currentScore: number,
): JurisdictionSimulation[] {
  const results: JurisdictionSimulation[] = [];

  for (const code of Object.keys(JURISDICTIONS)) {
    if (code === currentCode.toUpperCase()) continue;
    results.push(
      simulateJurisdictionChange(currentCode, code, satellite, currentScore),
    );
  }

  // Sort by score delta (best improvement first)
  results.sort(
    (a, b) => b.complianceDelta.scoreDelta - a.complianceDelta.scoreDelta,
  );

  return results;
}

// ─── Internal ────────────────────────────────────────────────────────────────

interface RequirementsDiff {
  added: JurisdictionRequirement[];
  removed: JurisdictionRequirement[];
  changed: JurisdictionRequirementChange[];
  unchanged: number;
}

function diffRequirements(
  fromReqs: JurisdictionRequirement[],
  toReqs: JurisdictionRequirement[],
): RequirementsDiff {
  const fromCategories = new Map(fromReqs.map((r) => [r.category, r]));
  const toCategories = new Map(toReqs.map((r) => [r.category, r]));

  const added: JurisdictionRequirement[] = [];
  const removed: JurisdictionRequirement[] = [];
  const changed: JurisdictionRequirementChange[] = [];
  let unchanged = 0;

  // Find added and changed
  for (const [category, toReq] of toCategories) {
    const fromReq = fromCategories.get(category);
    if (!fromReq) {
      added.push(toReq);
    } else if (fromReq.regulationRef !== toReq.regulationRef) {
      changed.push({
        regulationRef: toReq.regulationRef,
        name: toReq.name,
        changeType: "DIFFERENT",
        before: fromReq.name,
        after: toReq.name,
      });
    } else {
      unchanged++;
    }
  }

  // Find removed
  for (const [category, fromReq] of fromCategories) {
    if (!toCategories.has(category)) {
      removed.push(fromReq);
    }
  }

  return { added, removed, changed, unchanged };
}

function generateDocumentsList(
  jurisdictionCode: string,
  requirements: JurisdictionRequirement[],
): string[] {
  const docs: string[] = [];

  for (const req of requirements) {
    switch (req.category) {
      case "authorization":
        docs.push(`${jurisdictionCode} Space Activity License Application`);
        break;
      case "insurance":
        docs.push(`${jurisdictionCode} Insurance Certificate`);
        break;
      case "debris":
        docs.push(`${jurisdictionCode} Debris Mitigation Plan`);
        break;
      case "frequency":
        docs.push(`${jurisdictionCode} Frequency Authorization`);
        break;
      case "data_security":
        docs.push(`${jurisdictionCode} Data Security Clearance`);
        break;
      case "technical":
        docs.push(`${jurisdictionCode} Technical Compliance Report`);
        break;
      case "environmental":
        docs.push(`${jurisdictionCode} Environmental Impact Assessment`);
        break;
      default:
        docs.push(`${jurisdictionCode} ${req.name}`);
    }
  }

  return docs;
}

function estimateComplianceWork(addedRequirements: number): string {
  if (addedRequirements === 0) return "Minimal (document updates only)";
  if (addedRequirements <= 2) return "2-4 weeks";
  if (addedRequirements <= 4) return "1-2 months";
  return "3-6 months";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Launch Operator Jurisdiction Comparison
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare launch jurisdictions for a launch vehicle.
 * Evaluates insurance, approval timeline, orbit access, and environmental requirements.
 */
export function simulateLaunchJurisdictionChange(
  currentJurisdiction: string,
  targetJurisdiction: string,
  vehicle: { vehicleId: string; name: string },
  currentScore: number,
): LaunchJurisdictionSimulation {
  const current = LAUNCH_JURISDICTIONS[currentJurisdiction.toUpperCase()];
  const target = LAUNCH_JURISDICTIONS[targetJurisdiction.toUpperCase()];

  if (!current || !target) {
    throw new Error(
      `Unknown launch jurisdiction: ${!current ? currentJurisdiction : targetJurisdiction}`,
    );
  }

  // Insurance delta
  const insuranceDeltaEur =
    target.insuranceMinimumEur - current.insuranceMinimumEur;

  // Approval timeline delta
  const approvalDeltaMonths =
    target.approvalTimelineMonths - current.approvalTimelineMonths;

  // Score delta estimate based on multiple factors
  let scoreDelta = 0;

  // Insurance impact: higher = worse (-2 per €5M increase)
  scoreDelta += Math.round((-insuranceDeltaEur / 5_000_000) * 2);

  // Approval timeline: longer = worse (-1 per 2 months)
  scoreDelta += Math.round((-approvalDeltaMonths / 2) * 1);

  // Environmental complexity comparison
  const envComplexity: Record<string, number> = {
    "EIA, limited scope": 1,
    "EIA, moderate scope": 2,
    "EIA + Habitats Regulations Assessment": 3,
    "VIA (Valutazione Impatto Ambientale)": 3,
    "UVP (Environmental Impact Assessment), strict": 4,
    "Full ICPE, strict (ESA/CNES standards)": 5,
  };
  const currentEnvScore = envComplexity[current.environmentalAssessment] ?? 2;
  const targetEnvScore = envComplexity[target.environmentalAssessment] ?? 2;
  scoreDelta += (currentEnvScore - targetEnvScore) * 2;

  // Launch rate capacity
  if (target.maxLaunchRateYear > current.maxLaunchRateYear) {
    scoreDelta += 2;
  } else if (target.maxLaunchRateYear < current.maxLaunchRateYear) {
    scoreDelta -= 2;
  }

  const scoreAfter = Math.max(0, Math.min(100, currentScore + scoreDelta));

  // Build narrative
  const narrativeParts: string[] = [];
  if (insuranceDeltaEur > 0) {
    narrativeParts.push(
      `Insurance minimum increases by €${(insuranceDeltaEur / 1_000_000).toFixed(0)}M`,
    );
  } else if (insuranceDeltaEur < 0) {
    narrativeParts.push(
      `Insurance minimum decreases by €${(Math.abs(insuranceDeltaEur) / 1_000_000).toFixed(0)}M`,
    );
  }
  if (approvalDeltaMonths > 0) {
    narrativeParts.push(
      `Approval timeline extends by ${approvalDeltaMonths} months`,
    );
  } else if (approvalDeltaMonths < 0) {
    narrativeParts.push(
      `Approval timeline shortens by ${Math.abs(approvalDeltaMonths)} months`,
    );
  }
  narrativeParts.push(
    `Moving from ${current.primaryLaunchSite} (${current.latitude}°N) to ${target.primaryLaunchSite} (${target.latitude}°N)`,
  );

  return {
    fromJurisdiction: currentJurisdiction.toUpperCase(),
    toJurisdiction: targetJurisdiction.toUpperCase(),
    vehicle,
    complianceDelta: {
      scoreBefore: currentScore,
      scoreAfter,
      scoreDelta,
    },
    insuranceDelta: {
      currentMinEur: current.insuranceMinimumEur,
      newMinEur: target.insuranceMinimumEur,
      deltaEur: insuranceDeltaEur,
    },
    approvalTimelineDelta: {
      currentMonths: current.approvalTimelineMonths,
      newMonths: target.approvalTimelineMonths,
      deltaMonths: approvalDeltaMonths,
    },
    orbitAccessComparison: {
      polar: {
        current: current.polarOrbitAccess,
        new: target.polarOrbitAccess,
      },
      equatorial: {
        current: current.equatorialAccess,
        new: target.equatorialAccess,
      },
    },
    environmentalComparison: {
      current: current.environmentalAssessment,
      new: target.environmentalAssessment,
    },
    strengths: target.strengths,
    challenges: target.challenges,
    narrative: narrativeParts.join(". ") + ".",
  };
}

/**
 * Compare all launch jurisdictions for a vehicle and rank by favorability.
 */
export function compareAllLaunchJurisdictions(
  currentCode: string,
  vehicle: { vehicleId: string; name: string },
  currentScore: number,
): LaunchJurisdictionSimulation[] {
  const results: LaunchJurisdictionSimulation[] = [];

  for (const code of Object.keys(LAUNCH_JURISDICTIONS)) {
    if (code === currentCode.toUpperCase()) continue;
    results.push(
      simulateLaunchJurisdictionChange(
        currentCode,
        code,
        vehicle,
        currentScore,
      ),
    );
  }

  results.sort(
    (a, b) => b.complianceDelta.scoreDelta - a.complianceDelta.scoreDelta,
  );

  return results;
}
