/**
 * Caelex Comply — Precision Engine (Sprint A3)
 *
 * Public entry point. Composes the four pipeline stages:
 *   1. resolveApplicability — validate + normalize inputs
 *   2. generateItems        — walk the ontology, map obligations to items
 *   3. resolveDependencies  — populate dependsOn + topo-sort
 *   4. planTimeBackward     — compute targetDate + startDate per item
 *
 * Never throws. Returns PrecisionRunResult with status discriminator.
 */

import "server-only";

import { resolveApplicability } from "./applicability-resolver";
import { generateItems } from "./item-generator";
import { resolveDependencies } from "./dependency-resolver";
import { planTimeBackward } from "./time-backward-planner";
import type {
  GeneratedComplianceItem,
  PrecisionRunInput,
  PrecisionRunResult,
  PrecisionRunStats,
  Priority,
} from "./types";

export type {
  PrecisionRunInput,
  PrecisionRunResult,
  GeneratedComplianceItem,
  Priority,
} from "./types";

// ─── Public API ────────────────────────────────────────────────────────────

export async function runPrecisionEngine(
  input: PrecisionRunInput,
): Promise<PrecisionRunResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const warnings: string[] = [];

  // 1. Resolve applicability context.
  const resolved = resolveApplicability(
    input.applicability,
    input.enrichedProfile,
  );
  if (!resolved) {
    return {
      status: "EMPTY",
      items: [],
      itemsByDomain: {},
      stats: emptyStats(),
      startedAt,
      durationMs: Date.now() - t0,
      warnings: [
        "Precision-engine skipped: input lacks operatorType or any jurisdiction signal",
      ],
    };
  }

  warnings.push(...resolved.warnings);

  // Apply optional domain filter from input.
  const context = {
    ...resolved.context,
    domainFilter: input.domain ?? resolved.context.domainFilter,
  };

  // 2. Generate items from ontology.
  let generated: { items: GeneratedComplianceItem[]; warnings: string[] };
  try {
    generated = await generateItems(context, {
      includeProposals: input.includeProposals,
    });
  } catch (err) {
    return {
      status: "FAILED",
      items: [],
      itemsByDomain: {},
      stats: emptyStats(),
      startedAt,
      durationMs: Date.now() - t0,
      warnings: [
        ...warnings,
        `item-generator failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
  warnings.push(...generated.warnings);

  if (generated.items.length === 0) {
    return {
      status: "EMPTY",
      items: [],
      itemsByDomain: {},
      stats: emptyStats(),
      startedAt,
      durationMs: Date.now() - t0,
      warnings,
    };
  }

  // 3. Resolve dependencies + topo-sort.
  const withDeps = resolveDependencies(generated.items);

  // 4. Plan time-backward for target + start dates.
  const withDates = planTimeBackward(withDeps, context, { now: input.now });

  // 5. Compute stats + grouping.
  const stats = computeStats(withDates);
  const itemsByDomain = groupByDomain(withDates);

  return {
    status: "SUCCESS",
    items: withDates,
    itemsByDomain,
    stats,
    startedAt,
    durationMs: Date.now() - t0,
    warnings,
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function emptyStats(): PrecisionRunStats {
  return {
    obligationsFromOntology: 0,
    itemsGenerated: 0,
    itemsByPriority: {
      URGENT: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      WATCHING: 0,
    },
    itemsByRegulation: {},
    itemsWithDependencies: 0,
  };
}

function computeStats(items: GeneratedComplianceItem[]): PrecisionRunStats {
  const byPriority: Record<Priority, number> = {
    URGENT: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    WATCHING: 0,
  };
  const byRegulation: Record<string, number> = {};
  let withDeps = 0;

  for (const item of items) {
    byPriority[item.priority]++;
    byRegulation[item.regulationRef] =
      (byRegulation[item.regulationRef] ?? 0) + 1;
    if (item.dependsOn.length > 0) withDeps++;
  }

  return {
    obligationsFromOntology: items.length,
    itemsGenerated: items.length,
    itemsByPriority: byPriority,
    itemsByRegulation: byRegulation,
    itemsWithDependencies: withDeps,
  };
}

function groupByDomain(
  items: GeneratedComplianceItem[],
): Record<string, GeneratedComplianceItem[]> {
  const out: Record<string, GeneratedComplianceItem[]> = {};
  for (const item of items) {
    if (!out[item.domain]) out[item.domain] = [];
    out[item.domain]!.push(item);
  }
  return out;
}
