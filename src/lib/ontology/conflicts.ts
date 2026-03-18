/**
 * Regulatory Ontology — Conflict Detection
 *
 * Detects conflicts between jurisdictions for an operator.
 * Two layers:
 * 1. Explicit: manually seeded CONFLICTS_WITH edges
 * 2. Auto-detected: same domain obligations from different jurisdictions
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ConflictResult } from "./types";

/**
 * Find regulatory conflicts between jurisdictions.
 *
 * A conflict exists when two obligations from different jurisdictions
 * cover the same domain but specify different requirements (different thresholds,
 * different approaches, different timelines).
 *
 * Phase 1: Return manually seeded CONFLICTS_WITH edges.
 * Phase 2 (future): Auto-detect conflicts by comparing obligation properties.
 */
export async function detectConflicts(params: {
  jurisdictions: string[];
  operatorType: string;
  domain?: string;
}): Promise<ConflictResult[]> {
  if (params.jurisdictions.length < 2) return [];

  // 1. Get explicitly seeded CONFLICTS_WITH edges
  const explicitConflicts = await prisma.$queryRaw<
    Array<{
      fromCode: string;
      fromLabel: string;
      toCode: string;
      toLabel: string;
      properties: any;
    }>
  >`
    SELECT
      fn.code as "fromCode", fn.label as "fromLabel",
      tn.code as "toCode", tn.label as "toLabel",
      e.properties
    FROM "OntologyEdge" e
    JOIN "OntologyNode" fn ON fn.id = e."fromNodeId"
    JOIN "OntologyNode" tn ON tn.id = e."toNodeId"
    WHERE e.type = 'CONFLICTS_WITH'
      AND e."validUntil" IS NULL
  `;

  // 2. Auto-detect: find obligations from different jurisdictions in the same domain
  // that might conflict (different thresholds, approaches, etc.)
  const potentialConflicts = await prisma.$queryRaw<
    Array<{
      codeA: string;
      labelA: string;
      jurA: string;
      codeB: string;
      labelB: string;
      jurB: string;
      domain: string;
      propsA: any;
      propsB: any;
    }>
  >`
    SELECT
      nA.code as "codeA", nA.label as "labelA", jA.code as "jurA",
      nB.code as "codeB", nB.label as "labelB", jB.code as "jurB",
      dom.code as domain,
      nA.properties as "propsA", nB.properties as "propsB"
    FROM "OntologyNode" nA
    JOIN "OntologyEdge" eJurA ON eJurA."fromNodeId" = nA.id AND eJurA.type = 'SCOPED_TO'
    JOIN "OntologyNode" jA ON jA.id = eJurA."toNodeId" AND jA.code IN (${Prisma.join(params.jurisdictions)})
    JOIN "OntologyEdge" eDomA ON eDomA."fromNodeId" = nA.id AND eDomA.type = 'BELONGS_TO'
    JOIN "OntologyNode" dom ON dom.id = eDomA."toNodeId"
    JOIN "OntologyEdge" eDomB ON eDomB."toNodeId" = dom.id AND eDomB.type = 'BELONGS_TO'
    JOIN "OntologyNode" nB ON nB.id = eDomB."fromNodeId" AND nB.id != nA.id
    JOIN "OntologyEdge" eJurB ON eJurB."fromNodeId" = nB.id AND eJurB.type = 'SCOPED_TO'
    JOIN "OntologyNode" jB ON jB.id = eJurB."toNodeId" AND jB.code IN (${Prisma.join(params.jurisdictions)}) AND jB.code != jA.code
    WHERE nA.type = 'OBLIGATION' AND nB.type = 'OBLIGATION'
      AND nA."validUntil" IS NULL AND nB."validUntil" IS NULL
      AND nA.code < nB.code  -- prevent duplicates (A,B) and (B,A)
      ${params.domain ? Prisma.sql`AND dom.code = ${params.domain}` : Prisma.empty}
    ORDER BY dom.code, nA.code
  `;

  const results: ConflictResult[] = [];

  // Add explicit conflicts
  for (const c of explicitConflicts) {
    const props = (c.properties as Record<string, unknown>) || {};
    results.push({
      obligationA: {
        code: c.fromCode,
        label: c.fromLabel,
        jurisdiction: String(props.jurisdictionA || ""),
      },
      obligationB: {
        code: c.toCode,
        label: c.toLabel,
        jurisdiction: String(props.jurisdictionB || ""),
      },
      domain: String(props.domain || ""),
      conflictType: String(props.conflictType || "regulatory_divergence"),
      description: String(
        props.description || "Explicit conflict between these obligations",
      ),
    });
  }

  // Add auto-detected potential conflicts (same domain, different jurisdictions)
  // These are "potential" — same domain obligations from different jurisdictions
  // A human or AI must evaluate whether they actually conflict
  for (const c of potentialConflicts) {
    results.push({
      obligationA: { code: c.codeA, label: c.labelA, jurisdiction: c.jurA },
      obligationB: { code: c.codeB, label: c.labelB, jurisdiction: c.jurB },
      domain: c.domain,
      conflictType: "potential_divergence",
      description: `Both jurisdictions (${c.jurA}, ${c.jurB}) have obligations in the ${c.domain} domain — review for conflicting requirements`,
    });
  }

  return results;
}
