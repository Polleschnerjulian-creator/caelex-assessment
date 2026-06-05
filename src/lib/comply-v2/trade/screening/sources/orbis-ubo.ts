/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Orbis (Bureau van Dijk) Ultimate Beneficial Owner data layer (Sprint Z9b).
 *
 * Orbis is the de-facto industry standard corporate-ownership database,
 * licensed from Moody's / Bureau van Dijk. It covers ~500M companies
 * globally with ownership chains traced to ultimate beneficial owners
 * (UBOs) — the natural persons who ultimately own or control a legal
 * entity through whatever chain of intermediate vehicles.
 *
 * Why UBO data matters for trade compliance:
 *   1. The OFAC 50%-rule, plus OFAC's 31 March 2026 sham-transaction
 *      guidance on indirect control, apply to ULTIMATE ownership (not just
 *      direct ownership). A counterparty
 *      with no sanctioned direct owner can still be sanctioned-by-cascade
 *      if their grand-grand-parent is on the SDN list.
 *   2. Publicly-declared ownership (what a counterparty discloses on a
 *      KYC form) often differs from the actual UBO chain. Orbis sees the
 *      registry filings + shareholder updates that the counterparty may
 *      not have disclosed.
 *   3. Shell companies, trust structures, and "control without equity"
 *      arrangements (the post-Dec-2025 OFAC trustee doctrine) are only
 *      visible in commercial UBO databases.
 *
 * Scope of THIS file (Z9b):
 *   - Define the contract: `UboTree`, `UboNode`, `UboEdge` types
 *   - Define the adapter interface: `fetchUboTree(entityId): Promise<UboTree>`
 *   - Provide a fixture-based MOCK implementation for offline development
 *     and tests
 *
 * Out of scope for Z9b:
 *   - A real Orbis API client. Orbis is a paid subscription and licence
 *     terms forbid storing the API key in this repo. The mock satisfies
 *     all downstream consumers; swap-in for the real client happens
 *     when an operator provides credentials at runtime.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * A single node in the UBO tree. Could be a legal entity (intermediate
 * holding company) or a natural person (terminal UBO). The `kind`
 * discriminator drives the downstream cascade logic — natural persons
 * cannot themselves be owned, so they always terminate a chain.
 */
export interface UboNode {
  /**
   * Stable identifier WITHIN this UBO tree. Format:
   *   "ORBIS-{country}-{bvdId}" for legal entities (BvD ID is Orbis's
   *     stable cross-jurisdiction ID, e.g. "DE12345678")
   *   "ORBIS-PERSON-{hash}" for natural persons (Orbis sometimes
   *     anonymizes natural persons under PSC / equivalent legislation,
   *     so we use a stable hash rather than a name+DOB tuple)
   */
  id: string;

  /**
   * "entity" — legal entity (corporation, partnership, fund, trust...)
   * "person" — natural person (terminal UBO)
   * "unknown" — Orbis returns a node but redacts kind under privacy
   *   rules; treat as a black box that we cannot recurse through
   */
  kind: "entity" | "person" | "unknown";

  /** Display name (legal name for entities, full name for persons). */
  name: string;

  /**
   * ISO 3166-1 alpha-2 country of incorporation (for entities) or
   * nationality (for persons). "XX" if unknown.
   */
  countryCode: string;

  /**
   * Whether Orbis flags this node as a PEP (Politically Exposed Person)
   * via their compliance overlay. Only meaningful for `kind === "person"`.
   */
  isPep?: boolean;

  /**
   * Whether Orbis flags this node as appearing on any sanctions list
   * via their compliance overlay. Independent of our OpenSanctions
   * screening — this is Orbis's own integration.
   */
  isSanctioned?: boolean;

  /**
   * Orbis BvD ID — only present for entities, stable across re-fetches.
   * Used as join key when we materialize this UBO chain into our own
   * TradePartyOwnership records.
   */
  bvdId?: string;
}

/**
 * Ownership edge in the UBO tree. Direction: owner → owned (parent
 * holds equity/voting in child). Mirrors `TradePartyOwnership` shape
 * so the cross-screening layer can map this 1:1 to our own ownership
 * graph without translation.
 */
export interface UboEdge {
  /** ID of the owning node (further up the tree). */
  ownerId: string;
  /** ID of the owned node (closer to the queried entity). */
  ownedId: string;
  /** Direct equity percent as decimal (0.0 – 1.0). */
  percent: number;
  /**
   * "voting" | "economic" | "control_no_equity"
   * Mirrors TradePartyOwnership.controlType — only "voting" and
   * "economic" participate in the 50%-rule aggregate, "control_no_equity"
   * is the post-Dec-2025 OFAC trustee/no-equity-control doctrine and
   * is surfaced separately.
   */
  controlType: "voting" | "economic" | "control_no_equity";

  /**
   * Optional provenance note. Examples:
   *   - "Orbis filing 2024-Q3"
   *   - "BvD registry sync 2026-04-15"
   *   - "Inferred via PSC declaration"
   */
  source?: string;
}

/**
 * Complete UBO tree rooted at the queried entity. The tree includes
 * EVERY ancestor (direct + indirect) traceable in Orbis, capped at
 * `depth`. Cycles are pre-broken by Orbis's data team — a node never
 * appears twice in `nodes`, and edges form a DAG.
 *
 * Empty-tree case: `nodes = [target only]`, `edges = []` — Orbis has
 * the entity on file but no ownership information.
 *
 * Not-found case: the adapter throws `OrbisEntityNotFoundError`. The
 * caller decides whether that's a 404 or a "no UBO available" UI state.
 */
export interface UboTree {
  /** The entity originally queried (the leaf of the tree). */
  rootEntityId: string;

  /** Every node in the tree, indexed for O(1) lookup downstream. */
  nodes: UboNode[];

  /** Every ownership edge. owner → owned direction. */
  edges: UboEdge[];

  /**
   * Maximum traversal depth Orbis returned. Useful for UI ("UBO
   * resolved to depth N"). Orbis caps at 10 by default; we ask for
   * 5 in production calls (deeper trees are rarely meaningful).
   */
  depth: number;

  /**
   * Provenance: when Orbis last refreshed this tree. ISO-8601 UTC.
   * Hours/days old is normal; weeks/months stale should prompt the
   * caller to surface a "data freshness" warning.
   */
  fetchedAt: string;

  /**
   * Orbis's own data-confidence score (0.0 – 1.0). Below 0.5 means
   * the tree is reconstructed from incomplete filings — treat with
   * caution. 1.0 means fully-disclosed registry data.
   */
  confidence: number;
}

// ─── Errors ─────────────────────────────────────────────────────────

export class OrbisEntityNotFoundError extends Error {
  constructor(public readonly entityId: string) {
    super(`Orbis entity not found: ${entityId}`);
    this.name = "OrbisEntityNotFoundError";
  }
}

export class OrbisAuthError extends Error {
  constructor() {
    super("Orbis API authentication failed — check ORBIS_API_KEY");
    this.name = "OrbisAuthError";
  }
}

// ─── Adapter contract ────────────────────────────────────────────────

/**
 * The contract every Orbis-or-equivalent UBO adapter implements. The
 * runtime selects between:
 *   - `mockOrbisUboAdapter` (default; fixture-driven; no network)
 *   - `realOrbisUboAdapter` (only when ORBIS_API_KEY is configured;
 *     not implemented in Z9b — placeholder for a future sprint)
 */
export interface OrbisUboAdapter {
  /**
   * Resolve the UBO tree for an entity. The `entityId` format is
   * whatever the adapter accepts — for Orbis it's the BvD ID (e.g.
   * "DE12345678") OR a legal name + country pair encoded as
   * "name:Acme Corp|country:DE" for fuzzy-resolve.
   *
   * Throws `OrbisEntityNotFoundError` if the entity isn't in Orbis.
   * Throws `OrbisAuthError` if credentials are missing/invalid.
   */
  fetchUboTree(
    entityId: string,
    options?: FetchUboTreeOptions,
  ): Promise<UboTree>;

  /**
   * Adapter name for diagnostics + audit logging. Examples:
   *   "mock" | "orbis-v1" | "opencorporates-fallback"
   */
  readonly name: string;
}

export interface FetchUboTreeOptions {
  /** Max traversal depth. Default 5. Capped at 10 by the underlying API. */
  maxDepth?: number;

  /**
   * When true, include nodes Orbis flags as `kind: "unknown"` (privacy-
   * redacted PSC declarations). Default false — caller usually wants
   * actionable data only. Set true when generating the full audit dump.
   */
  includeRedacted?: boolean;
}

// ─── Mock adapter (fixture-driven) ───────────────────────────────────

/**
 * Bundled fixtures for offline development. The adapter looks up
 * `entityId` against this map; an entity with no fixture throws
 * `OrbisEntityNotFoundError` (mimicking real Orbis behaviour).
 *
 * Add new fixtures here as test scenarios demand them. Keep them
 * realistic — 3-level chain with a mix of jurisdictions + a sanctioned
 * UBO at the top is the canonical "interesting" case.
 */
export const ORBIS_FIXTURES: Record<string, UboTree> = {
  // ── Fixture 1 — Clean 3-level chain ─────────────────────────────
  DE12345678: {
    rootEntityId: "DE12345678",
    nodes: [
      {
        id: "ORBIS-DE-12345678",
        kind: "entity",
        name: "Saubere Operations GmbH",
        countryCode: "DE",
        bvdId: "DE12345678",
      },
      {
        id: "ORBIS-NL-22334455",
        kind: "entity",
        name: "Clean Holdings B.V.",
        countryCode: "NL",
        bvdId: "NL22334455",
      },
      {
        id: "ORBIS-LU-99887766",
        kind: "entity",
        name: "Clean Parent S.A.",
        countryCode: "LU",
        bvdId: "LU99887766",
      },
      {
        id: "ORBIS-PERSON-abc123",
        kind: "person",
        name: "Anna Schmidt",
        countryCode: "DE",
        isPep: false,
        isSanctioned: false,
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-NL-22334455",
        ownedId: "ORBIS-DE-12345678",
        percent: 1.0,
        controlType: "economic",
        source: "Orbis filing 2026-Q1",
      },
      {
        ownerId: "ORBIS-LU-99887766",
        ownedId: "ORBIS-NL-22334455",
        percent: 0.75,
        controlType: "economic",
      },
      {
        ownerId: "ORBIS-PERSON-abc123",
        ownedId: "ORBIS-LU-99887766",
        percent: 0.6,
        controlType: "economic",
      },
    ],
    depth: 3,
    fetchedAt: "2026-05-22T10:00:00.000Z",
    confidence: 0.95,
  },

  // ── Fixture 2 — Sanctioned UBO at top of chain ───────────────────
  RU98765432: {
    rootEntityId: "RU98765432",
    nodes: [
      {
        id: "ORBIS-RU-98765432",
        kind: "entity",
        name: "Counterparty Aerospace OOO",
        countryCode: "RU",
        bvdId: "RU98765432",
      },
      {
        id: "ORBIS-CY-11223344",
        kind: "entity",
        name: "Cyprus Intermediate Holdings Ltd",
        countryCode: "CY",
        bvdId: "CY11223344",
      },
      {
        id: "ORBIS-PERSON-sanc001",
        kind: "person",
        name: "Sanctioned Oligarch",
        countryCode: "RU",
        isPep: true,
        isSanctioned: true,
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-CY-11223344",
        ownedId: "ORBIS-RU-98765432",
        percent: 1.0,
        controlType: "economic",
      },
      {
        ownerId: "ORBIS-PERSON-sanc001",
        ownedId: "ORBIS-CY-11223344",
        percent: 0.55,
        controlType: "economic",
        source: "Orbis filing 2025-Q4 (post-Cyprus registry leak)",
      },
    ],
    depth: 2,
    fetchedAt: "2026-05-22T10:00:00.000Z",
    confidence: 0.78,
  },

  // ── Fixture 3 — Diamond ownership (same UBO via two paths) ──────
  GB55667788: {
    rootEntityId: "GB55667788",
    nodes: [
      {
        id: "ORBIS-GB-55667788",
        kind: "entity",
        name: "Diamond Target Ltd",
        countryCode: "GB",
        bvdId: "GB55667788",
      },
      {
        id: "ORBIS-IE-AAA",
        kind: "entity",
        name: "Path A Holdings (Ireland)",
        countryCode: "IE",
        bvdId: "IEAAA",
      },
      {
        id: "ORBIS-IE-BBB",
        kind: "entity",
        name: "Path B Holdings (Ireland)",
        countryCode: "IE",
        bvdId: "IEBBB",
      },
      {
        id: "ORBIS-PERSON-diamond",
        kind: "person",
        name: "Diamond UBO",
        countryCode: "IE",
        isPep: false,
        isSanctioned: false,
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-IE-AAA",
        ownedId: "ORBIS-GB-55667788",
        percent: 0.5,
        controlType: "economic",
      },
      {
        ownerId: "ORBIS-IE-BBB",
        ownedId: "ORBIS-GB-55667788",
        percent: 0.5,
        controlType: "economic",
      },
      {
        ownerId: "ORBIS-PERSON-diamond",
        ownedId: "ORBIS-IE-AAA",
        percent: 0.6,
        controlType: "economic",
      },
      {
        ownerId: "ORBIS-PERSON-diamond",
        ownedId: "ORBIS-IE-BBB",
        percent: 0.6,
        controlType: "economic",
      },
    ],
    depth: 2,
    fetchedAt: "2026-05-22T10:00:00.000Z",
    confidence: 0.92,
  },

  // ── Fixture 4 — Control-without-equity (trustee doctrine) ────────
  US44556677: {
    rootEntityId: "US44556677",
    nodes: [
      {
        id: "ORBIS-US-44556677",
        kind: "entity",
        name: "Trustee-Controlled LLC",
        countryCode: "US",
        bvdId: "US44556677",
      },
      {
        id: "ORBIS-PERSON-trustee",
        kind: "person",
        name: "Designated Trustee",
        countryCode: "US",
        isPep: false,
        isSanctioned: true,
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-PERSON-trustee",
        ownedId: "ORBIS-US-44556677",
        percent: 0.0,
        controlType: "control_no_equity",
        source: "Post-Dec-2025 OFAC trustee doctrine — Orbis flag",
      },
    ],
    depth: 1,
    fetchedAt: "2026-05-22T10:00:00.000Z",
    confidence: 0.85,
  },

  // ── Fixture 5 — Entity with no traceable ownership ───────────────
  FR12121212: {
    rootEntityId: "FR12121212",
    nodes: [
      {
        id: "ORBIS-FR-12121212",
        kind: "entity",
        name: "Orphan Entity SARL",
        countryCode: "FR",
        bvdId: "FR12121212",
      },
    ],
    edges: [],
    depth: 0,
    fetchedAt: "2026-05-22T10:00:00.000Z",
    confidence: 0.4,
  },

  // ── Fixture 6 — Redacted (privacy-protected) UBO ─────────────────
  AT88990011: {
    rootEntityId: "AT88990011",
    nodes: [
      {
        id: "ORBIS-AT-88990011",
        kind: "entity",
        name: "Austrian Target GmbH",
        countryCode: "AT",
        bvdId: "AT88990011",
      },
      {
        id: "ORBIS-PERSON-redacted",
        kind: "unknown",
        name: "REDACTED (privacy filing)",
        countryCode: "XX",
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-PERSON-redacted",
        ownedId: "ORBIS-AT-88990011",
        percent: 0.8,
        controlType: "economic",
        source: "Austrian WiEReG — privacy-redacted",
      },
    ],
    depth: 1,
    fetchedAt: "2026-05-22T10:00:00.000Z",
    confidence: 0.6,
  },
};

/**
 * Mock UBO adapter — fixture-driven, no network. The default adapter
 * exported by this module for offline development + tests.
 *
 * To extend: add an entry to `ORBIS_FIXTURES` keyed by the BvD ID
 * (or whatever your test's `entityId` is) and the mock will serve it.
 */
export const mockOrbisUboAdapter: OrbisUboAdapter = {
  name: "mock",

  async fetchUboTree(
    entityId: string,
    options?: FetchUboTreeOptions,
  ): Promise<UboTree> {
    const fixture = ORBIS_FIXTURES[entityId];
    if (!fixture) {
      throw new OrbisEntityNotFoundError(entityId);
    }

    const maxDepth = Math.min(options?.maxDepth ?? 5, 10);

    let nodes = fixture.nodes;
    let edges = fixture.edges;

    if (!options?.includeRedacted) {
      // Strip redacted/unknown nodes + the edges that reference them.
      const redactedIds = new Set(
        nodes.filter((n) => n.kind === "unknown").map((n) => n.id),
      );
      if (redactedIds.size > 0) {
        nodes = nodes.filter((n) => !redactedIds.has(n.id));
        edges = edges.filter(
          (e) => !redactedIds.has(e.ownerId) && !redactedIds.has(e.ownedId),
        );
      }
    }

    // Truncate to maxDepth via BFS from root. Bypass when fixture
    // depth already ≤ requested depth (common case).
    if (fixture.depth > maxDepth) {
      const truncated = truncateTreeDepth(
        fixture.rootEntityId,
        nodes,
        edges,
        maxDepth,
      );
      return {
        ...fixture,
        nodes: truncated.nodes,
        edges: truncated.edges,
        depth: maxDepth,
      };
    }

    return { ...fixture, nodes, edges };
  },
};

// ─── Tree helpers (exported for tests + cross-screening) ────────────

/**
 * Compute the depth of an ownership chain by BFS upward from the root.
 * Returns 0 for a tree with no edges (root only). Used by the UI chip
 * "UBO-resolved to depth N".
 */
export function computeTreeDepth(tree: UboTree): number {
  if (tree.edges.length === 0) return 0;

  const rootNodeId = findRootNodeId(tree);
  if (!rootNodeId) return 0;

  // BFS upward: rootNode → owners → grand-owners → ...
  const upwardAdj = buildUpwardAdjacency(tree.edges);
  let maxDepth = 0;
  const queue: Array<{ id: string; depth: number; visited: Set<string> }> = [
    { id: rootNodeId, depth: 0, visited: new Set([rootNodeId]) },
  ];
  while (queue.length > 0) {
    const item = queue.shift()!;
    maxDepth = Math.max(maxDepth, item.depth);
    const owners = upwardAdj.get(item.id);
    if (!owners) continue;
    for (const ownerId of owners) {
      if (item.visited.has(ownerId)) continue;
      const newVisited = new Set(item.visited);
      newVisited.add(ownerId);
      queue.push({
        id: ownerId,
        depth: item.depth + 1,
        visited: newVisited,
      });
    }
  }
  return maxDepth;
}

/**
 * Find the node ID matching the tree's rootEntityId. Tolerates both
 * matching by bvdId and by node.id (the latter is what fixtures use).
 */
function findRootNodeId(tree: UboTree): string | null {
  for (const node of tree.nodes) {
    if (node.bvdId === tree.rootEntityId) return node.id;
  }
  for (const node of tree.nodes) {
    if (node.id === tree.rootEntityId) return node.id;
  }
  // Last resort: pick the node with NO outgoing ownership (it's owned-by
  // others but doesn't own anyone in the tree).
  const owners = new Set(tree.edges.map((e) => e.ownerId));
  for (const node of tree.nodes) {
    if (!owners.has(node.id)) return node.id;
  }
  return null;
}

function buildUpwardAdjacency(edges: UboEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    let bucket = adj.get(e.ownedId);
    if (!bucket) {
      bucket = [];
      adj.set(e.ownedId, bucket);
    }
    bucket.push(e.ownerId);
  }
  return adj;
}

interface TruncateResult {
  nodes: UboNode[];
  edges: UboEdge[];
}

function truncateTreeDepth(
  rootEntityId: string,
  nodes: UboNode[],
  edges: UboEdge[],
  maxDepth: number,
): TruncateResult {
  const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
  // Resolve the root node ID by bvdId first, then by raw id.
  const rootNodeId =
    nodes.find((n) => n.bvdId === rootEntityId)?.id ??
    nodes.find((n) => n.id === rootEntityId)?.id ??
    null;
  if (!rootNodeId) return { nodes, edges };

  const upwardAdj = buildUpwardAdjacency(edges);
  const kept = new Set<string>([rootNodeId]);

  const queue: Array<{ id: string; depthRemaining: number }> = [
    { id: rootNodeId, depthRemaining: maxDepth },
  ];
  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.depthRemaining === 0) continue;
    const owners = upwardAdj.get(item.id);
    if (!owners) continue;
    for (const ownerId of owners) {
      if (kept.has(ownerId)) continue;
      kept.add(ownerId);
      queue.push({ id: ownerId, depthRemaining: item.depthRemaining - 1 });
    }
  }

  const keptNodes = nodes.filter((n) => kept.has(n.id));
  const keptEdges = edges.filter(
    (e) => kept.has(e.ownerId) && kept.has(e.ownedId),
  );

  // Silence unused-warning for nodeIndex — kept for symmetry with the
  // server-side variant which uses it for enrichment lookups.
  void nodeIndex;

  return { nodes: keptNodes, edges: keptEdges };
}

/**
 * Convenience: yield every ancestor of the root (everything above the
 * leaf), in BFS order. Used by cross-screening to enumerate "who
 * actually owns this thing".
 */
export function listAncestors(tree: UboTree): UboNode[] {
  const rootNodeId = findRootNodeId(tree);
  if (!rootNodeId) return [];

  const upwardAdj = buildUpwardAdjacency(tree.edges);
  const nodeIndex = new Map(tree.nodes.map((n) => [n.id, n]));

  const ancestors: UboNode[] = [];
  const visited = new Set<string>([rootNodeId]);

  const queue: string[] = [rootNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const owners = upwardAdj.get(id);
    if (!owners) continue;
    for (const ownerId of owners) {
      if (visited.has(ownerId)) continue;
      visited.add(ownerId);
      const node = nodeIndex.get(ownerId);
      if (node) ancestors.push(node);
      queue.push(ownerId);
    }
  }
  return ancestors;
}

/**
 * Selects the adapter implementation. In production, callers pass a
 * concrete adapter (mock for tests, real for prod). Default export is
 * the mock so unit tests don't need to wire anything up.
 *
 * The real Orbis adapter would be wired up like:
 *   import { realOrbisUboAdapter } from "./orbis-ubo-real";
 *   const adapter = process.env.ORBIS_API_KEY
 *     ? realOrbisUboAdapter
 *     : mockOrbisUboAdapter;
 */
export function getOrbisUboAdapter(): OrbisUboAdapter {
  return mockOrbisUboAdapter;
}
