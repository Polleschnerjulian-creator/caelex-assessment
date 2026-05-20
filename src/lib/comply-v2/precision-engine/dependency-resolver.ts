/**
 * Dependency Resolver (Sprint A3)
 *
 * Orders the GeneratedComplianceItem set into a topologically-sorted DAG
 * so the Today inbox + the roadmap surface show "do A before B".
 *
 * Built-in dependency rules (heuristic, not authoritative):
 *  - Authorization comes before Launch-licensing
 *  - Authorization comes before Spectrum filing
 *  - Risk Assessment comes before Cybersecurity Controls
 *  - Privacy Impact Assessment comes before Data Processing Agreement
 *  - Insurance is required before Authorization
 *
 * These rules are intentionally simple — they encode the dependencies most
 * counsel + NCAs flag in practice. A future sprint can lift them into the
 * ontology as IMPLEMENTS / SUPERSEDES edges and read from there.
 */

import "server-only";

import type { GeneratedComplianceItem } from "./types";

// ─── Rule table ────────────────────────────────────────────────────────────

/**
 * Match rules: if a downstream item matches `downstreamPattern` and any
 * other item in the same set matches `upstreamPattern`, the upstream id is
 * added to the downstream's dependsOn list.
 */
interface DependencyRule {
  /** Plain-text description shown in lineage UI. */
  reason: string;
  /** Regex matched against the upstream item's id. */
  upstreamPattern: RegExp;
  /** Regex matched against the downstream item's id. */
  downstreamPattern: RegExp;
}

const RULES: DependencyRule[] = [
  {
    reason: "Authorization required before launch-licensing",
    upstreamPattern: /AUTHORIZATION/i,
    downstreamPattern: /LAUNCH[-_ ]?LICENSE|LAUNCH[-_ ]?PERMIT/i,
  },
  {
    reason: "Authorization required before spectrum filing",
    upstreamPattern: /AUTHORIZATION/i,
    downstreamPattern: /SPECTRUM[-_ ]?FILING|ITU[-_ ]?FILING/i,
  },
  {
    reason: "Risk assessment must precede cybersecurity controls",
    upstreamPattern: /RISK[-_ ]?ASSESSMENT|ISMS/i,
    downstreamPattern: /CYBER[-_ ]?CONTROL|MFA|ACCESS[-_ ]?CONTROL/i,
  },
  {
    reason: "DPIA required before data-processing agreement",
    upstreamPattern: /DPIA|DATA[-_ ]?PROTECTION[-_ ]?IMPACT/i,
    downstreamPattern: /DATA[-_ ]?PROCESSING[-_ ]?AGREEMENT|DPA/i,
  },
  {
    reason: "Insurance must be in place before authorization is granted",
    upstreamPattern: /INSURANCE|LIABILITY[-_ ]?COVERAGE/i,
    downstreamPattern: /AUTHORIZATION/i,
  },
  {
    reason:
      "Debris-mitigation plan must be approved before deorbit obligations vest",
    upstreamPattern: /DEBRIS[-_ ]?MITIGATION[-_ ]?PLAN/i,
    downstreamPattern: /DEORBIT|PASSIVATION|END[-_ ]?OF[-_ ]?LIFE/i,
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Populate `dependsOn` for each item based on the rule table, then return
 * the items in topological (dependency-respecting) order. Stable: items
 * with no deps preserve their input order.
 */
export function resolveDependencies(
  items: GeneratedComplianceItem[],
): GeneratedComplianceItem[] {
  if (items.length <= 1) return items;

  // 1. Apply rules to populate dependsOn.
  const withDeps = items.map((it) => ({ ...it, dependsOn: [...it.dependsOn] }));

  for (let i = 0; i < withDeps.length; i++) {
    const downstream = withDeps[i]!;
    for (let j = 0; j < withDeps.length; j++) {
      if (i === j) continue;
      const upstream = withDeps[j]!;
      for (const rule of RULES) {
        if (
          rule.upstreamPattern.test(upstream.id) &&
          rule.downstreamPattern.test(downstream.id) &&
          !downstream.dependsOn.includes(upstream.id)
        ) {
          downstream.dependsOn.push(upstream.id);
        }
      }
    }
  }

  // 2. Topological sort (Kahn's algorithm, stable).
  return topoSort(withDeps);
}

// ─── Internals ─────────────────────────────────────────────────────────────

function topoSort(items: GeneratedComplianceItem[]): GeneratedComplianceItem[] {
  const byId = new Map<string, GeneratedComplianceItem>(
    items.map((i) => [i.id, i]),
  );
  const indegree = new Map<string, number>();
  for (const it of items) {
    indegree.set(it.id, it.dependsOn.filter((d) => byId.has(d)).length);
  }

  // Preserve original input order for items with same indegree (stable sort).
  const queue: GeneratedComplianceItem[] = items
    .filter((i) => (indegree.get(i.id) ?? 0) === 0)
    .slice();

  const ordered: GeneratedComplianceItem[] = [];
  while (queue.length > 0) {
    const next = queue.shift()!;
    ordered.push(next);

    // For each item that depends on `next`, decrement its indegree.
    for (const candidate of items) {
      if (!candidate.dependsOn.includes(next.id)) continue;
      const updated = (indegree.get(candidate.id) ?? 1) - 1;
      indegree.set(candidate.id, updated);
      if (updated === 0) {
        queue.push(candidate);
      }
    }
  }

  // Defensive: if we have a dep cycle (shouldn't happen with current rules
  // but be safe), append any remaining items at the end so we never lose
  // data. A future precision-engine telemetry log can flag this.
  if (ordered.length < items.length) {
    const orderedIds = new Set(ordered.map((i) => i.id));
    for (const it of items) {
      if (!orderedIds.has(it.id)) ordered.push(it);
    }
  }

  return ordered;
}

/**
 * Returns the rule that produced the dependency between two items, for the
 * Lineage UI to display "Why is B blocked by A?".
 */
export function explainDependency(
  upstreamId: string,
  downstreamId: string,
): string | null {
  for (const rule of RULES) {
    if (
      rule.upstreamPattern.test(upstreamId) &&
      rule.downstreamPattern.test(downstreamId)
    ) {
      return rule.reason;
    }
  }
  return null;
}
