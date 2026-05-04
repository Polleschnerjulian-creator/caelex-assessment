/**
 * Compliance Operations Engine — Dependency-Engine (Sprint 9A)
 *
 * The first of six COE sub-engines per the master plan. This engine
 * answers two questions:
 *
 *   1. "Given an obligation X, what other obligations must complete
 *       first?"  →  `getPrerequisites(moduleKey)`
 *   2. "Given the operator's full obligation set, in what order
 *       should they tackle them?" →  `topologicalSort(modules)`
 *
 * Plus a third — the critical-path traversal — that surfaces the
 * longest dependency chain so we can highlight it in the eventual
 * Sprint 9X force-graph UI (Wow-Pattern #4).
 *
 * # Why a static graph (vs. learnt / inferred)
 *
 * Regulatory dependencies are written in law — Art. X "before
 * registration", Art. Y "before launch". They don't drift between
 * tenants. A static graph that we curate in source is more
 * defensible (we can cite the article that establishes the
 * dependency) and zero-cost at runtime.
 *
 * Per-tenant *applicability* (which obligations apply at all) is a
 * separate concern handled by the existing assessment engines
 * (eu-space-act, nis2, etc.). The Dependency Engine assumes the
 * applicable set is given and only orders it.
 *
 * # Pure module — no I/O, no `server-only`
 *
 * The engine is pure logic over a static graph. Putting it in a
 * non-server file means client components (the eventual force-graph
 * UI) can import it directly without a server-only fence. The
 * orchestrator that fetches the operator's applicable obligations
 * + then calls into this engine WILL be server-only — that lives
 * elsewhere (Sprint 9C orchestrator).
 *
 * # Why not a real workflow engine
 *
 * COWF (Sprint 3) handles per-instance workflow execution. COE sits
 * on top of COWF: COE decides which workflows to spawn + in what
 * order; COWF runs each one. Don't confuse the two.
 */

import type { ComplianceModule } from "@/data/articles";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Hard vs. soft dependency. Hard = X cannot start until Y completes.
 * Soft = X is more efficient if Y is in progress, but isn't blocked.
 *
 * Real-world example: Insurance is HARD-blocked by Authorization
 * (insurers need the license number). Cybersecurity is SOFT-aligned
 * with Authorization (you can run cyber audits in parallel, but the
 * authorization filing benefits from having cyber findings ready).
 */
export type DependencyKind = "hard" | "soft";

export interface DependencyEdge {
  from: ComplianceModule;
  to: ComplianceModule;
  kind: DependencyKind;
  /** Citation supporting this dependency (regulation + article). */
  citation: string;
  /** Plain-English rationale shown in tooltips. */
  rationale: string;
}

export interface DependencyGraph {
  /** Stable enumeration of nodes in declaration order. */
  nodes: ComplianceModule[];
  /** All edges, deduplicated. */
  edges: DependencyEdge[];
}

export interface TopologicalSortResult {
  /** Modules in dependency-respecting order. */
  ordered: ComplianceModule[];
  /** True only when the input subset has no cycles. */
  acyclic: boolean;
  /** When acyclic=false, the modules that participate in a cycle. */
  cycle: ComplianceModule[];
  /** Modules referenced as prerequisites but not in the input set. */
  missingPrereqs: ComplianceModule[];
}

export interface CriticalPathResult {
  /** Modules along the longest dependency chain (sources → sinks). */
  path: ComplianceModule[];
  /** Length of the path (number of modules). */
  length: number;
}

// ─── Static dependency graph ──────────────────────────────────────────────

/**
 * Curated dependency edges between EU Space Act compliance modules.
 *
 * Conventions:
 *   - "from" must complete before "to" can start (when kind=hard)
 *   - Citations reference the EU Space Act draft (COM(2025) 335)
 *     unless prefixed with another regulation
 *   - "soft" edges represent best-practice ordering, not a legal
 *     prerequisite — the engine surfaces them in tooltips but does
 *     NOT enforce them in `topologicalSort` (only hard edges block)
 */
export const DEPENDENCY_EDGES: DependencyEdge[] = [
  // ─── Authorization is the hub ──────────────────────────────────────────
  {
    from: "environmental",
    to: "authorization",
    kind: "hard",
    citation: "EU Space Act Art. 96–100",
    rationale:
      "Environmental Footprint Declaration must be filed before authorization can be granted.",
  },
  {
    from: "debris",
    to: "authorization",
    kind: "hard",
    citation: "EU Space Act Art. 58–72",
    rationale:
      "Debris-mitigation plan and end-of-life disposal strategy are required attachments to the authorization application.",
  },
  {
    from: "insurance",
    to: "authorization",
    kind: "hard",
    citation: "EU Space Act Art. 44–51",
    rationale:
      "Third-party liability insurance and financial guarantees must be in place before authorization issuance.",
  },

  // ─── Registration follows authorization ────────────────────────────────
  {
    from: "authorization",
    to: "registration",
    kind: "hard",
    citation: "EU Space Act Art. 24",
    rationale:
      "Registration in the Union Register of Space Objects requires a granted authorization.",
  },

  // ─── Supervision follows authorization + registration ──────────────────
  {
    from: "authorization",
    to: "supervision",
    kind: "hard",
    citation: "EU Space Act Art. 26–31",
    rationale:
      "Ongoing supervisory obligations begin only after the authorization is active.",
  },
  {
    from: "registration",
    to: "supervision",
    kind: "hard",
    citation: "EU Space Act Art. 26",
    rationale:
      "Supervisory reporting cadence is keyed off the registered space-object identifier.",
  },

  // ─── NIS2 + CRA — parallel cybersecurity tracks ────────────────────────
  {
    from: "cybersecurity",
    to: "nis2",
    kind: "soft",
    citation: "NIS2 (EU) 2022/2555 Art. 21",
    rationale:
      "EU Space Act cybersecurity controls and NIS2 risk-management measures share evidence; doing the broader EU Space Act cyber assessment first reduces NIS2 effort.",
  },
  {
    from: "nis2",
    to: "cra",
    kind: "soft",
    citation: "CRA (EU) 2024/2847 Annex I",
    rationale:
      "CRA product-cyber requirements inherit from NIS2 organisational controls; sequencing CRA after NIS2 lets the operator reuse the SBOM and risk register.",
  },

  // ─── Regulatory intelligence is a soft-prereq for everything ─────────
  {
    from: "regulatory",
    to: "authorization",
    kind: "soft",
    citation: "EU Space Act Art. 104",
    rationale:
      "Tracking delegated/implementing acts before filing the authorization application catches last-minute amendment risk.",
  },
];

/**
 * The 10 EU Space Act + cybersecurity modules in declaration order.
 * Mirrors `src/data/modules.ts` so callers don't have to import both.
 */
export const ALL_MODULES: ComplianceModule[] = [
  "authorization",
  "registration",
  "environmental",
  "cybersecurity",
  "debris",
  "insurance",
  "supervision",
  "regulatory",
  "nis2",
  "cra",
];

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Build the full dependency graph (all nodes + all edges).
 */
export function buildDependencyGraph(): DependencyGraph {
  return {
    nodes: [...ALL_MODULES],
    edges: [...DEPENDENCY_EDGES],
  };
}

/**
 * Get all hard prerequisites for one module — i.e. the modules that
 * must complete before this one can start.
 *
 * Soft edges are excluded. Use `getPrerequisites(m, "all")` to get
 * both hard + soft.
 */
export function getPrerequisites(
  moduleKey: ComplianceModule,
  filter: "hard" | "all" = "hard",
): ComplianceModule[] {
  const seen = new Set<ComplianceModule>();
  for (const e of DEPENDENCY_EDGES) {
    if (e.to !== moduleKey) continue;
    if (filter === "hard" && e.kind !== "hard") continue;
    seen.add(e.from);
  }
  return Array.from(seen);
}

/**
 * Get all hard dependents of one module — i.e. the modules that are
 * blocked until this one completes.
 */
export function getDependents(
  moduleKey: ComplianceModule,
  filter: "hard" | "all" = "hard",
): ComplianceModule[] {
  const seen = new Set<ComplianceModule>();
  for (const e of DEPENDENCY_EDGES) {
    if (e.from !== moduleKey) continue;
    if (filter === "hard" && e.kind !== "hard") continue;
    seen.add(e.to);
  }
  return Array.from(seen);
}

/**
 * Topological sort — Kahn's algorithm (BFS-flavoured, in-degree
 * driven). Only hard edges contribute to ordering; soft edges are
 * informational.
 *
 * Returns:
 *   - `ordered` — modules in a valid build order
 *   - `acyclic` — true if no cycles among hard edges
 *   - `cycle` — when acyclic=false, the modules that participate
 *   - `missingPrereqs` — modules referenced as prerequisites but
 *     not in the input subset (caller can decide whether to flag
 *     these as "you have an obligation gap" or "you've assessed
 *     this is N/A")
 *
 * Stable: when multiple modules have in-degree 0 simultaneously,
 * the one declared first in `ALL_MODULES` wins. This makes the
 * output deterministic across reads — important for force-graph
 * layouts that key positions off the order.
 */
export function topologicalSort(
  applicable: ComplianceModule[],
  edges: readonly DependencyEdge[] = DEPENDENCY_EDGES,
): TopologicalSortResult {
  if (applicable.length === 0) {
    return { ordered: [], acyclic: true, cycle: [], missingPrereqs: [] };
  }

  const applicableSet = new Set<ComplianceModule>(applicable);
  // Hard-edge subgraph restricted to the applicable subset.
  const hardEdges = edges.filter(
    (e) =>
      e.kind === "hard" && applicableSet.has(e.from) && applicableSet.has(e.to),
  );

  // Track edges referencing a non-applicable prereq so callers can warn.
  const missingSet = new Set<ComplianceModule>();
  for (const e of edges) {
    if (e.kind !== "hard") continue;
    if (applicableSet.has(e.to) && !applicableSet.has(e.from)) {
      missingSet.add(e.from);
    }
  }

  // Build in-degree map + adjacency.
  const inDegree = new Map<ComplianceModule, number>();
  const adj = new Map<ComplianceModule, ComplianceModule[]>();
  for (const m of applicable) {
    inDegree.set(m, 0);
    adj.set(m, []);
  }
  for (const e of hardEdges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    adj.get(e.from)!.push(e.to);
  }

  // Kahn: queue all in-degree-0 nodes, pop in declaration order, decrement
  // successors. Re-sort the queue against ALL_MODULES order each pop so
  // the result is stable.
  const ordered: ComplianceModule[] = [];
  const declarationIndex = new Map<ComplianceModule, number>(
    ALL_MODULES.map((m, i) => [m, i]),
  );
  const ready = new Set<ComplianceModule>();
  for (const m of applicable) {
    if ((inDegree.get(m) ?? 0) === 0) ready.add(m);
  }

  while (ready.size > 0) {
    // Pop the declaration-earliest ready node — keeps output stable.
    const next = Array.from(ready).sort(
      (a, b) =>
        (declarationIndex.get(a) ?? 999) - (declarationIndex.get(b) ?? 999),
    )[0];
    ready.delete(next);
    ordered.push(next);
    for (const succ of adj.get(next) ?? []) {
      const newDeg = (inDegree.get(succ) ?? 0) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) ready.add(succ);
    }
  }

  const acyclic = ordered.length === applicable.length;
  // When cyclic, the modules left with inDegree > 0 form (or are part of)
  // the cycle. We report ALL of them — the caller can decide whether to
  // pinpoint the exact loop by walking the residual graph.
  const cycle = acyclic
    ? []
    : applicable.filter((m) => (inDegree.get(m) ?? 0) > 0);

  return {
    ordered: acyclic ? ordered : [],
    acyclic,
    cycle,
    missingPrereqs: Array.from(missingSet),
  };
}

/**
 * Critical path — longest hard-dependency chain in the applicable
 * subset. Used to highlight "the spine of your compliance plan" in
 * the force-graph UI.
 *
 * Algorithm: DAG longest-path. Run topological sort first; for each
 * node in topo order, longest[node] = 1 + max(longest[predecessor]).
 * Track the predecessor that contributed the max so we can rebuild
 * the path. Path is empty if the input is cyclic.
 */
export function getCriticalPath(
  applicable: ComplianceModule[],
  edges: readonly DependencyEdge[] = DEPENDENCY_EDGES,
): CriticalPathResult {
  const topo = topologicalSort(applicable, edges);
  if (!topo.acyclic || topo.ordered.length === 0) {
    return { path: [], length: 0 };
  }

  const applicableSet = new Set<ComplianceModule>(applicable);
  // longest[m] = number of nodes in the longest path ending at m
  const longest = new Map<ComplianceModule, number>();
  // pred[m] = predecessor that contributed the max (for reconstruction)
  const pred = new Map<ComplianceModule, ComplianceModule | null>();

  for (const m of topo.ordered) {
    let best = 1;
    let bestPred: ComplianceModule | null = null;
    for (const e of edges) {
      if (e.kind !== "hard") continue;
      if (e.to !== m) continue;
      if (!applicableSet.has(e.from)) continue;
      const candidate = (longest.get(e.from) ?? 0) + 1;
      if (candidate > best) {
        best = candidate;
        bestPred = e.from;
      }
    }
    longest.set(m, best);
    pred.set(m, bestPred);
  }

  // Find the sink with the longest chain.
  let sink: ComplianceModule | null = null;
  let maxLen = 0;
  for (const [m, len] of longest.entries()) {
    if (len > maxLen) {
      maxLen = len;
      sink = m;
    }
  }
  if (!sink) {
    return { path: [], length: 0 };
  }

  // Walk pred[] back to the source.
  const path: ComplianceModule[] = [];
  let cursor: ComplianceModule | null = sink;
  while (cursor) {
    path.unshift(cursor);
    cursor = pred.get(cursor) ?? null;
  }

  return { path, length: path.length };
}
