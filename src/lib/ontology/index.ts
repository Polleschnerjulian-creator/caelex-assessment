/**
 * Regulatory Ontology — Barrel Exports
 *
 * Public API for the ontology module:
 * - Types (node, edge, query results, validation)
 * - Seed (ETL pipeline for building the knowledge graph)
 * - Seed Validation (post-seed graph consistency checks)
 * - Traverse (graph query functions)
 */

export type {
  OntologyNodeType,
  OntologyEdgeType,
  ObligationResult,
  ConflictResult,
  EvidenceGapResult,
  ImpactResult,
  SubgraphResult,
  NodeDetailResult,
  OntologyStats,
  SeedValidation,
} from "./types";

export { seedOntology } from "./seed";
export type { SeedResult } from "./seed";

export { validateOntology } from "./seed-validation";

export {
  getObligationsForOperator,
  getSubgraph,
  getNodeDetail,
} from "./traverse";
