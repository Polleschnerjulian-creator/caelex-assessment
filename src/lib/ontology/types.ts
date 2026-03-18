/**
 * Regulatory Ontology — Type Definitions
 */

// ─── Node Types ──────────────────────────────────────────────────────────────

export type OntologyNodeType =
  | "REGULATION"
  | "OBLIGATION"
  | "JURISDICTION"
  | "OPERATOR_TYPE"
  | "EVIDENCE_REQ"
  | "STANDARD"
  | "AUTHORITY"
  | "DOMAIN";

// ─── Edge Types ──────────────────────────────────────────────────────────────

export type OntologyEdgeType =
  | "IMPLEMENTS"
  | "APPLIES_TO"
  | "REQUIRES_EVIDENCE"
  | "CONFLICTS_WITH"
  | "SUPERSEDES"
  | "CODIFIES"
  | "EXTENDS"
  | "NEW_OBLIGATION"
  | "ADMINISTERED_BY"
  | "BELONGS_TO"
  | "SCOPED_TO"
  | "CONTAINS";

// ─── Query Results ───────────────────────────────────────────────────────────

export interface ObligationResult {
  nodeId: string;
  code: string;
  label: string;
  confidence: number;
  source: {
    framework: string;
    reference: string;
  };
  domain: string;
  jurisdictions: string[];
  evidenceRequired: Array<{ code: string; label: string }>;
  euSpaceActMapping: {
    articleRef: string;
    relationship: string;
  } | null;
}

export interface ConflictResult {
  obligationA: { code: string; label: string; jurisdiction: string };
  obligationB: { code: string; label: string; jurisdiction: string };
  domain: string;
  conflictType: string;
  description: string;
}

export interface EvidenceGapResult {
  obligation: { code: string; label: string };
  evidenceRequired: { code: string; label: string };
  status: "missing" | "present" | "expired";
}

export interface ImpactResult {
  affectedNode: { code: string; label: string; type: string };
  impactLevel: "direct" | "indirect";
  depth: number;
  edgePath: string[];
}

export interface SubgraphResult {
  centerNode: {
    id: string;
    code: string;
    label: string;
    type: string;
    properties: Record<string, unknown>;
  };
  nodes: Array<{
    id: string;
    code: string;
    label: string;
    type: string;
    confidence: number;
    depth: number;
  }>;
  edges: Array<{
    id: string;
    type: string;
    fromCode: string;
    toCode: string;
    weight: number;
  }>;
}

export interface NodeDetailResult {
  id: string;
  code: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
  confidence: number;
  validFrom: Date;
  validUntil: Date | null;
  sourceFile: string | null;
  inEdges: Array<{
    edgeType: string;
    fromCode: string;
    fromLabel: string;
    fromType: string;
  }>;
  outEdges: Array<{
    edgeType: string;
    toCode: string;
    toLabel: string;
    toType: string;
  }>;
}

export interface OntologyStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  lastSeeded: string | null;
  version: string | null;
}

// ─── Seed Validation ─────────────────────────────────────────────────────────

export interface SeedValidation {
  valid: boolean;
  obligationsWithoutDomain: string[];
  jurisdictionsWithoutAuthority: string[];
  orphanedNodes: string[];
  duplicateCodes: string[];
  invalidProposalEdges: string[];
  obligationsWithSuspiciousEdgeCount: Array<{
    code: string;
    edgeCount: number;
  }>;
}
