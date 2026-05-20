/**
 * Item Generator (Sprint A3)
 *
 * Transforms ontology obligations into GeneratedComplianceItems. This is
 * the bridge between the regulatory knowledge graph and the user-facing
 * compliance roadmap.
 *
 * Pipeline:
 *   ApplicabilityContext  ─▶  getObligationsForOperator()  ─▶  ResolvedObligation[]
 *                                                                      │
 *                                                                      ▼
 *                                                            mapToGeneratedItem()
 *                                                                      │
 *                                                                      ▼
 *                                                       GeneratedComplianceItem[]
 *
 * No DB writes. The caller (orchestrator or Astra tool) decides what to
 * persist (AstraProposal, *RequirementStatus, in-memory display).
 */

import "server-only";

import { getObligationsForOperator } from "@/lib/ontology/traverse";
import type { ObligationResult } from "@/lib/ontology/types";
import {
  isLargeConstellationObligation,
  isLeoSpecific,
} from "./applicability-resolver";
import type {
  ApplicabilityContext,
  GeneratedComplianceItem,
  Priority,
  RegulationRef,
} from "./types";

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Walk the ontology for each applicable jurisdiction × operator-type combo,
 * dedupe by obligation code, and map each obligation to a
 * GeneratedComplianceItem.
 *
 * Heuristics applied:
 *  - Priority bump for constellation operators on Art. 70 obligations
 *  - LEO-specific obligations filtered out for non-LEO operators
 *  - Confidence floors per regulation (different sources have different
 *    epistemic quality — EU Space Act > national space laws)
 */
export async function generateItems(
  context: ApplicabilityContext,
  options?: {
    includeProposals?: boolean;
    /** Skip ontology call (test-only). When set, used in lieu of a live query. */
    obligationsOverride?: ObligationResult[];
  },
): Promise<{
  items: GeneratedComplianceItem[];
  warnings: string[];
}> {
  const warnings: string[] = [];

  // 1. Fetch obligations from the ontology (or use the test override).
  const obligations =
    options?.obligationsOverride ??
    (await getObligationsForOperator({
      operatorType: context.operatorType,
      jurisdictions: context.jurisdictions,
      domain: context.domainFilter,
      includeProposals: options?.includeProposals,
    }));

  // 2. Map + filter.
  const items: GeneratedComplianceItem[] = [];
  const seenIds = new Set<string>();

  for (const obligation of obligations) {
    // Filter: LEO-specific obligations only apply if operator has primaryOrbit
    // set to LEO. If primaryOrbit is undefined, we keep them but lower confidence.
    if (
      isLeoSpecific(obligation.code) &&
      context.primaryOrbit &&
      !/LEO|LOW[-_ ]?EARTH/i.test(context.primaryOrbit)
    ) {
      warnings.push(
        `Skipped LEO-specific obligation ${obligation.code} (primaryOrbit=${context.primaryOrbit})`,
      );
      continue;
    }

    const item = mapToGeneratedItem(obligation, context);

    // Idempotency: skip if we've already emitted this id (e.g. obligation
    // returned twice for two jurisdictions; the ontology dedupes at code
    // level but we double-guard here).
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    items.push(item);
  }

  return { items, warnings };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function mapToGeneratedItem(
  obligation: ObligationResult,
  context: ApplicabilityContext,
): GeneratedComplianceItem {
  const regulationRef = inferRegulationRef(obligation);
  const articleRef = obligation.euSpaceActMapping?.articleRef ?? "";

  const baseConfidence = obligation.confidence;
  let effectiveConfidence = baseConfidence;

  // Confidence downgrade: LEO-specific obligation with no orbit signal.
  if (isLeoSpecific(obligation.code) && !context.primaryOrbit) {
    effectiveConfidence = Math.min(effectiveConfidence, 0.7);
  }

  // Determine which match-type produced this obligation. The ontology
  // dedupes across operator-APPLIES_TO + jurisdiction-SCOPED_TO results,
  // so we check whether THIS obligation's jurisdiction list intersects the
  // operator's jurisdictions: if yes, "both" or "jurisdiction"; if no, the
  // match must have come from APPLIES_TO.
  const obligationJurisdictions = obligation.jurisdictions.map((j) =>
    j.replace(/^JUR-/, "").toUpperCase(),
  );
  const jurisdictionIntersect = obligationJurisdictions.some((j) =>
    context.jurisdictions.includes(j),
  );
  const match: GeneratedComplianceItem["origin"]["match"] =
    jurisdictionIntersect
      ? obligation.jurisdictions.length > 0
        ? "both"
        : "operator-type"
      : "operator-type";

  // Priority calculation.
  const priority = computePriority(obligation, context);

  // Stable id: regulationRef:code.
  const id = `${regulationRef}:${obligation.code}`;

  return {
    id,
    title: obligation.label,
    requirementCode: obligation.code,
    regulationRef,
    domain: obligation.domain.replace(/^DOMAIN-/, ""),
    jurisdictions:
      obligationJurisdictions.length > 0
        ? obligationJurisdictions
        : context.jurisdictions,
    articleRef,
    confidence: effectiveConfidence,
    priority,
    targetDate: null, // computed by time-backward-planner downstream
    startDate: null, // computed by time-backward-planner downstream
    evidenceRequired: obligation.evidenceRequired,
    dependsOn: [], // populated by dependency-resolver downstream
    origin: {
      ontologyNodeId: obligation.nodeId,
      framework: obligation.source.framework,
      reference: obligation.source.reference,
      match,
    },
  };
}

/**
 * Compute a coarse priority bucket for an obligation. The Today inbox + the
 * triage queue use this for sorting / coloring.
 */
function computePriority(
  obligation: ObligationResult,
  context: ApplicabilityContext,
): Priority {
  const code = obligation.code.toUpperCase();
  const framework = obligation.source.framework.toUpperCase();

  // URGENT bucket: NIS2 incidents, authorization-blocking obligations,
  // constellation-specific obligations for constellation operators.
  if (/INCIDENT|BREACH|AUTHORIZATION|LAUNCH[-_ ]?LICENSE/.test(code)) {
    return "URGENT";
  }
  if (
    context.constellationSize &&
    context.constellationSize >= 12 &&
    isLargeConstellationObligation(code)
  ) {
    return "URGENT";
  }

  // HIGH bucket: any obligation tied to a planned launch in the next 12 months.
  if (context.plannedLaunchDate) {
    const monthsToLaunch =
      (context.plannedLaunchDate.getTime() - Date.now()) /
      (30 * 24 * 60 * 60 * 1000);
    if (monthsToLaunch > 0 && monthsToLaunch <= 12) {
      return "HIGH";
    }
  }

  // MEDIUM bucket: EU Space Act + NIS2 baseline obligations.
  if (framework === "EU_SPACE_ACT" || framework === "NIS2") {
    return "MEDIUM";
  }

  // LOW bucket: national space laws (other than the operator's home jurisdiction)
  if (
    framework.startsWith("NATIONAL_") ||
    framework.startsWith("DE_") ||
    framework.startsWith("FR_") ||
    framework.startsWith("UK_")
  ) {
    return "LOW";
  }

  // Default — WATCHING (visible but not actionable).
  return "WATCHING";
}

/**
 * Infer the canonical RegulationRef from an ontology obligation. The ontology
 * stores framework strings that may include version suffixes; we normalize to
 * the union member set defined in types.ts.
 */
function inferRegulationRef(obligation: ObligationResult): RegulationRef {
  const f = obligation.source.framework.toUpperCase();
  if (f.includes("EU_SPACE_ACT") || f.includes("EU SPACE ACT")) {
    return "EU_SPACE_ACT";
  }
  if (f.includes("NIS2") || f.includes("NIS 2") || f.includes("NIS-2")) {
    return "NIS2";
  }
  if (f.includes("CRA") || f.includes("CYBER_RESILIENCE")) return "CRA";
  if (f.includes("COPUOS") || f.includes("IADC")) return "COPUOS";
  if (f.includes("ITU") || f.includes("SPECTRUM")) return "ITU_SPECTRUM";
  if (f.includes("ITAR") || f.includes("EAR")) return "ITAR_EAR";
  if (f.includes("DUAL_USE") || f.includes("DUAL-USE")) return "EU_DUAL_USE";
  if (f.startsWith("DE_") || f.includes("BWRG") || f.includes("BUNDES")) {
    return "DE_BWRG";
  }
  if (f.startsWith("FR_") || f.includes("LOS")) return "FR_LOS";
  if (f.startsWith("UK_") || f.includes("SIA")) return "UK_SIA";
  if (f.startsWith("US_") || f.includes("FCC") || f.includes("FAA")) {
    return "US_FCC_FAA";
  }
  return "OTHER";
}
