import type {
  JurisdictionSimulation,
  JurisdictionRequirement,
  JurisdictionRequirementChange,
} from "../core/types";
import { JURISDICTIONS, getJurisdiction } from "./jurisdiction-data";

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
