/**
 * Regulatory Ontology — Post-Seed Validation
 *
 * Checks graph consistency after seeding: orphaned nodes, missing edges,
 * duplicates, suspicious edge counts, and invalid proposal edges.
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import type { SeedValidation } from "./types";

export async function validateOntology(): Promise<SeedValidation> {
  // 1. Obligations without BELONGS_TO domain edge
  const obligationsWithoutDomain = await prisma.$queryRaw<
    Array<{ code: string }>
  >`
    SELECT n.code FROM "OntologyNode" n
    WHERE n.type = 'OBLIGATION' AND n."validUntil" IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM "OntologyEdge" e
      WHERE e."fromNodeId" = n.id AND e.type = 'BELONGS_TO'
    )
  `;

  // 2. Jurisdictions without ADMINISTERED_BY edge
  const jurisdictionsWithoutAuthority = await prisma.$queryRaw<
    Array<{ code: string }>
  >`
    SELECT n.code FROM "OntologyNode" n
    WHERE n.type = 'JURISDICTION' AND n."validUntil" IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM "OntologyEdge" e
      WHERE e."fromNodeId" = n.id AND e.type = 'ADMINISTERED_BY'
    )
  `;

  // 3. Orphaned nodes (zero edges in either direction)
  const orphanedNodes = await prisma.$queryRaw<Array<{ code: string }>>`
    SELECT n.code FROM "OntologyNode" n
    WHERE n."validUntil" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "OntologyEdge" e WHERE e."fromNodeId" = n.id)
    AND NOT EXISTS (SELECT 1 FROM "OntologyEdge" e WHERE e."toNodeId" = n.id)
  `;

  // 4. Duplicate codes (should be caught by unique constraint, but double-check)
  const duplicateCodes = await prisma.$queryRaw<Array<{ code: string }>>`
    SELECT code FROM "OntologyNode" GROUP BY code HAVING COUNT(*) > 1
  `;

  // 5. Invalid proposal edges (confidence >= 0.9 node pointing via CODIFIES/EXTENDS to confidence < 0.9 node)
  // CODIFIES/EXTENDS should go FROM proposal (low confidence) TO enacted (high confidence).
  // If it goes FROM enacted TO proposal, that's backwards.
  const invalidProposalEdges = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT e.id FROM "OntologyEdge" e
    JOIN "OntologyNode" fn ON fn.id = e."fromNodeId"
    JOIN "OntologyNode" tn ON tn.id = e."toNodeId"
    WHERE e.type IN ('CODIFIES', 'EXTENDS')
    AND fn.confidence >= 0.9 AND tn.confidence < 0.9
  `;

  // 6. Obligations with suspicious edge count (0 APPLIES_TO or >20 APPLIES_TO)
  const suspiciousEdgeCounts = await prisma.$queryRaw<
    Array<{ code: string; count: bigint }>
  >`
    SELECT n.code, COUNT(e.id) as count FROM "OntologyNode" n
    LEFT JOIN "OntologyEdge" e ON e."fromNodeId" = n.id AND e.type = 'APPLIES_TO'
    WHERE n.type = 'OBLIGATION' AND n."validUntil" IS NULL
    GROUP BY n.code
    HAVING COUNT(e.id) = 0 OR COUNT(e.id) > 20
  `;

  const valid =
    obligationsWithoutDomain.length === 0 &&
    jurisdictionsWithoutAuthority.length === 0 &&
    orphanedNodes.length === 0 &&
    duplicateCodes.length === 0 &&
    invalidProposalEdges.length === 0 &&
    suspiciousEdgeCounts.length === 0;

  return {
    valid,
    obligationsWithoutDomain: obligationsWithoutDomain.map((r) => r.code),
    jurisdictionsWithoutAuthority: jurisdictionsWithoutAuthority.map(
      (r) => r.code,
    ),
    orphanedNodes: orphanedNodes.map((r) => r.code),
    duplicateCodes: duplicateCodes.map((r) => r.code),
    invalidProposalEdges: invalidProposalEdges.map((r) => r.id),
    obligationsWithSuspiciousEdgeCount: suspiciousEdgeCounts.map((r) => ({
      code: r.code,
      edgeCount: Number(r.count),
    })),
  };
}
