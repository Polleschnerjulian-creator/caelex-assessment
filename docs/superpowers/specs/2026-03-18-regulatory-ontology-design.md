# Regulatory Ontology — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

## Overview

Transform Caelex's flat regulatory data layer into a property graph (Ontology) stored in PostgreSQL. The existing 22 regulatory data files become the seed source. The graph enables: obligation traversal, cross-jurisdictional conflict detection, evidence gap analysis, regulatory impact propagation, and deterministic ASTRA queries.

**Approach:** Hybrid (C) — New Prisma schema for the graph, seeded from existing `src/data/regulatory/` files which remain as the source of truth for data maintenance.

**Storage:** Same Neon PostgreSQL DB — new tables alongside existing 188 models.

### Key Design Decisions

- EU Space Act nodes get `confidence=0.5` (proposals), enacted standards get `confidence=1.0`
- `includeProposals=false` as default on all queries — no user sees unenacted obligations without explicitly asking
- Seed includes a post-seed validation step to catch mapping errors
- PostgreSQL raw queries for graph traversals (Prisma can't do recursive CTEs)

---

## Prisma Schema

### OntologyNode

```prisma
model OntologyNode {
  id            String   @id @default(cuid())
  type          String
  code          String   @unique
  label         String
  properties    Json
  validFrom     DateTime @default(now())
  validUntil    DateTime?
  confidence    Float    @default(1.0)
  sourceFile    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  outEdges      OntologyEdge[] @relation("FromNode")
  inEdges       OntologyEdge[] @relation("ToNode")

  @@index([type])
  @@index([type, code])
  @@index([validFrom, validUntil])
}
```

Node types: `REGULATION`, `OBLIGATION`, `JURISDICTION`, `OPERATOR_TYPE`, `EVIDENCE_REQ`, `STANDARD`, `AUTHORITY`, `DOMAIN`

### OntologyEdge

```prisma
model OntologyEdge {
  id            String   @id @default(cuid())
  type          String
  fromNodeId    String
  toNodeId      String
  properties    Json?
  weight        Float    @default(1.0)
  validFrom     DateTime @default(now())
  validUntil    DateTime?

  fromNode      OntologyNode @relation("FromNode", fields: [fromNodeId], references: [id], onDelete: Cascade)
  toNode        OntologyNode @relation("ToNode", fields: [toNodeId], references: [id], onDelete: Cascade)

  @@unique([fromNodeId, toNodeId, type])
  @@index([fromNodeId])
  @@index([toNodeId])
  @@index([type])
  @@index([fromNodeId, type])
  @@index([toNodeId, type])
}
```

Edge types: `IMPLEMENTS`, `APPLIES_TO`, `REQUIRES_EVIDENCE`, `CONFLICTS_WITH`, `SUPERSEDES`, `CODIFIES`, `EXTENDS`, `NEW_OBLIGATION`, `ADMINISTERED_BY`, `BELONGS_TO`, `SCOPED_TO`, `CONTAINS`

### OntologyVersion

```prisma
model OntologyVersion {
  id            String   @id @default(cuid())
  version       String
  description   String
  nodeCount     Int
  edgeCount     Int
  seededFrom    String
  seededAt      DateTime @default(now())

  @@index([version])
}
```

---

## Seed Logic

### Source → Node Mapping

| Source                                        | Node Type     | Confidence | Count        |
| --------------------------------------------- | ------------- | ---------- | ------------ |
| 8 Standards files (EnactedRequirement[])      | OBLIGATION    | 1.0        | ~95          |
| 10 Jurisdiction files (NationalRequirement[]) | OBLIGATION    | 1.0        | ~80          |
| 10 Jurisdiction files (JurisdictionData)      | JURISDICTION  | 1.0        | 10           |
| 10 Jurisdiction files (nca)                   | AUTHORITY     | 1.0        | ~12          |
| EU Space Act Proposal (EUSpaceActArticle[])   | OBLIGATION    | 0.5        | ~78          |
| Domains (category values)                     | DOMAIN        | 1.0        | 9            |
| Operator types                                | OPERATOR_TYPE | 1.0        | 7            |
| Standards/Frameworks                          | REGULATION    | 1.0        | ~15          |
| Evidence types from NCA knowledge             | EVIDENCE_REQ  | 1.0        | ~50          |
| **Total**                                     |               |            | **~350-400** |

### Source → Edge Mapping

| Source Field                                           | Edge Type                            | From → To                               |
| ------------------------------------------------------ | ------------------------------------ | --------------------------------------- |
| EnactedRequirement.nationalImplementations             | IMPLEMENTS                           | NationalObligation → StandardObligation |
| EnactedRequirement.euSpaceActProposal (codifies)       | CODIFIES                             | ProposalObligation → StandardObligation |
| EnactedRequirement.euSpaceActProposal (extends)        | EXTENDS                              | ProposalObligation → StandardObligation |
| EnactedRequirement.euSpaceActProposal (new_obligation) | NEW_OBLIGATION                       | ProposalObligation → (no target)        |
| EnactedRequirement.applicableTo                        | APPLIES_TO                           | Obligation → OperatorType               |
| EnactedRequirement.category                            | BELONGS_TO                           | Obligation → Domain                     |
| NationalRequirement.standardsMapping                   | IMPLEMENTS                           | NationalObligation → StandardObligation |
| JurisdictionData.nca                                   | ADMINISTERED_BY                      | Jurisdiction → Authority                |
| NationalRequirement (scoping)                          | SCOPED_TO                            | NationalObligation → Jurisdiction       |
| RegulatoryMapping.references                           | Multiple edge types connecting Nodes |
| NCA requiredTools/acceptedEvidence                     | REQUIRES_EVIDENCE                    | Obligation → EvidenceReq                |
| **Total**                                              |                                      | **~2,000-3,000**                        |

### Post-Seed Validation (CRITICAL)

After seeding, run these consistency checks — fail the seed if any check fails:

```typescript
interface SeedValidation {
  // Every OBLIGATION must have at least one BELONGS_TO domain edge
  obligationsWithoutDomain: string[];
  // Every JURISDICTION must have at least one ADMINISTERED_BY edge
  jurisdictionsWithoutAuthority: string[];
  // No orphaned nodes (nodes with zero edges in either direction)
  orphanedNodes: string[];
  // No duplicate codes
  duplicateCodes: string[];
  // All CODIFIES/EXTENDS edges from proposal nodes (confidence < 1) to enacted nodes (confidence >= 0.9)
  invalidProposalEdges: string[];
  // Edge count sanity: each obligation should have 1-5 APPLIES_TO edges (not 0, not 100)
  obligationsWithSuspiciousEdgeCount: string[];
}
```

If any array is non-empty, the seed aborts and logs the issues.

---

## Graph Query API

### File Structure

```
src/lib/ontology/
├── types.ts              — Result types for all queries
├── seed.ts               — Seed logic: data files → graph
├── seed-validation.ts    — Post-seed consistency checks
├── traverse.ts           — Core graph traversal functions
├── conflicts.ts          — Cross-jurisdictional conflict detection
├── evidence.ts           — Evidence gap analysis
├── impact.ts             — Regulatory change impact propagation
└── index.ts              — Barrel exports
```

### Core Functions

```typescript
// traverse.ts

/** Get all obligations for an operator profile */
export async function getObligationsForOperator(params: {
  operatorType: string;
  jurisdictions: string[];
  domain?: string;
  includeProposals?: boolean; // default: false
}): Promise<ObligationResult[]>;

/** Get subgraph around a node, N hops deep */
export async function getSubgraph(params: {
  nodeId: string;
  depth: number; // 1-3 recommended
  edgeTypes?: string[]; // filter by edge type
}): Promise<SubgraphResult>;
```

```typescript
// conflicts.ts

/** Find conflicts between jurisdictions for an operator */
export async function detectConflicts(params: {
  jurisdictions: string[];
  operatorType: string;
  domain?: string;
}): Promise<ConflictResult[]>;
```

```typescript
// evidence.ts

/** Get evidence requirements and identify gaps */
export async function getEvidenceGaps(params: {
  operatorType: string;
  jurisdictions: string[];
  existingEvidence?: string[];
}): Promise<EvidenceGapResult[]>;
```

```typescript
// impact.ts

/** Compute downstream impact of a regulatory change */
export async function propagateChange(params: {
  nodeId: string;
  changeType: "amended" | "repealed" | "new";
}): Promise<ImpactResult[]>;
```

### SQL Implementation Note

Graph traversals use `prisma.$queryRaw` with recursive CTEs:

```sql
WITH RECURSIVE reachable AS (
  -- Base: direct edges from starting node
  SELECT e."toNodeId" as "nodeId", e."type" as "edgeType", 1 as depth
  FROM "OntologyEdge" e
  WHERE e."fromNodeId" = $1
    AND e."validUntil" IS NULL

  UNION ALL

  -- Recursive: follow edges from reached nodes
  SELECT e."toNodeId", e."type", r.depth + 1
  FROM "OntologyEdge" e
  JOIN reachable r ON e."fromNodeId" = r."nodeId"
  WHERE r.depth < $2  -- max depth
    AND e."validUntil" IS NULL
)
SELECT DISTINCT n.*, r."edgeType", r.depth
FROM reachable r
JOIN "OntologyNode" n ON n.id = r."nodeId"
WHERE n."validUntil" IS NULL
```

---

## API Endpoints

| Route                         | Method | Purpose                               |
| ----------------------------- | ------ | ------------------------------------- |
| `/api/ontology/obligations`   | GET    | Get obligations for operator profile  |
| `/api/ontology/conflicts`     | GET    | Detect cross-jurisdictional conflicts |
| `/api/ontology/evidence-gaps` | GET    | Find missing evidence                 |
| `/api/ontology/impact`        | POST   | Compute regulatory change impact      |
| `/api/ontology/graph`         | GET    | Get subgraph around a node (depth=N)  |
| `/api/ontology/stats`         | GET    | Node/edge counts, last seed date      |
| `/api/ontology/seed`          | POST   | Admin-only: re-seed from data files   |

All endpoints: auth → org check → rate limit → query → return.

The `/api/ontology/graph?nodeId=xxx&depth=2` endpoint returns the subgraph N hops around a node — this powers the future Graph Explorer UI where clicking a node loads its neighborhood.

---

## ASTRA Integration

New tool for deterministic graph queries:

```typescript
{
  name: "query_ontology",
  description: "Query the regulatory knowledge graph. Returns deterministic results from structured traversal, not text search.",
  parameters: {
    query_type: "obligations" | "conflicts" | "evidence_gaps" | "subgraph",
    operator_type: string | null,
    jurisdictions: string[] | null,
    domain: string | null,
    include_proposals: boolean,  // default: false
    node_id: string | null,     // for subgraph queries
    depth: number | null,       // for subgraph queries, default: 1
  }
}
```

**Hybrid architecture:**

- Structural queries (obligations, conflicts, evidence) → Graph traversal → deterministic, no hallucination
- Interpretive queries (explain, advise, compare) → LLM with graph context → grounded in structured data

When user asks "Was muss ich als SCO in Frankreich für Debris beachten?":

1. ASTRA calls `query_ontology({ query_type: "obligations", operator_type: "SCO", jurisdictions: ["FR"], domain: "debris" })`
2. Gets deterministic list of obligations with provenance
3. Formats the answer with natural language, citing exact nodes and edges

---

## Implementation Phases

**Phase 1: Schema + Seed (1 week)**

- Add 3 Prisma models
- Build seed script that transforms all 22 data files into nodes/edges
- Post-seed validation
- Seed admin endpoint
- Stats endpoint

**Phase 2: Query API (1 week)**

- `getObligationsForOperator()` — the core traversal
- `getSubgraph()` — for UI exploration
- `detectConflicts()` — cross-jurisdictional
- `getEvidenceGaps()` — evidence analysis
- 5 API endpoints

**Phase 3: ASTRA Integration (3-5 days)**

- `query_ontology` tool definition
- Tool executor integration
- Hybrid query routing (structural vs interpretive)

**Phase 4: Impact Propagation (3-5 days)**

- `propagateChange()` — downstream impact computation
- Integration with existing Impact Analysis system

---

## Files to Create

| Path                                          | Purpose               |
| --------------------------------------------- | --------------------- |
| `prisma/schema.prisma` (modify)               | Add 3 ontology models |
| `src/lib/ontology/types.ts`                   | Result types          |
| `src/lib/ontology/seed.ts`                    | Seed logic            |
| `src/lib/ontology/seed-validation.ts`         | Post-seed checks      |
| `src/lib/ontology/traverse.ts`                | Core graph traversal  |
| `src/lib/ontology/conflicts.ts`               | Conflict detection    |
| `src/lib/ontology/evidence.ts`                | Evidence gap analysis |
| `src/lib/ontology/impact.ts`                  | Change propagation    |
| `src/lib/ontology/index.ts`                   | Barrel exports        |
| `src/app/api/ontology/obligations/route.ts`   | Obligations API       |
| `src/app/api/ontology/conflicts/route.ts`     | Conflicts API         |
| `src/app/api/ontology/evidence-gaps/route.ts` | Evidence API          |
| `src/app/api/ontology/impact/route.ts`        | Impact API            |
| `src/app/api/ontology/graph/route.ts`         | Subgraph API          |
| `src/app/api/ontology/stats/route.ts`         | Stats API             |
| `src/app/api/ontology/seed/route.ts`          | Admin seed API        |
| `src/lib/ontology/seed.test.ts`               | Seed tests            |
| `src/lib/ontology/traverse.test.ts`           | Traversal tests       |
| `src/lib/ontology/conflicts.test.ts`          | Conflict tests        |
