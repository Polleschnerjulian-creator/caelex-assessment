/**
 * Cross-Verifier — Sprint 2A
 *
 * Runs every adapter that `canDetect()` against the input, collects results,
 * merges per-field with conflict resolution, and writes T2-source-verified
 * evidence rows via `bulkSetVerifiedFields()`.
 *
 * **Confidence-tier mapping (Sprint 2A baseline):**
 *
 *   - 1 adapter agrees                 → tier T2_SOURCE_VERIFIED
 *   - 2+ adapters agree                → tier T2_SOURCE_VERIFIED + boosted confidence
 *   - 2+ adapters conflict             → highest-priority adapter wins,
 *                                        conflict logged on the evidence row's
 *                                        `evidenceText`, warning surfaced
 *
 * Sprint 2E will refine this with weighted source authority — for now, the
 * order in `ADAPTERS` (registry.ts) IS the priority.
 *
 * **Why not bump to T3+ on multi-source agreement:** T3 = counsel-attested,
 * T4 = authority-verified, T5 = cryptographic-proof. Those tiers require
 * a human in the loop or a cryptographic signature. Multi-source agreement
 * is still "machines told us" — staying at T2 with higher confidence is
 * honest. Per the user directive: "wir dürfen ja niemals machen oder
 * Demos. Das muss immer alles korrekt und echt sein."
 */

import "server-only";

import { logger } from "@/lib/logger";
import type {
  AdapterInput,
  AdapterOutcome,
  AdapterResult,
  AutoDetectionAdapter,
  CrossVerificationResult,
  DetectedField,
  MergedField,
  SourceKey,
} from "./types";
import { ADAPTERS } from "./registry";
import {
  bulkSetVerifiedFields,
  type WritableVerifiedField,
} from "../profile.server";

export interface RunOptions {
  /** Override adapter list — used by tests + targeted re-verification. */
  adapters?: AutoDetectionAdapter[];

  /**
   * If true, write evidence to the chain via bulkSetVerifiedFields. Default
   * true. Set false for a "dry-run" — useful for the public-pulse-tool
   * (Sprint 4) which previews detection without persisting.
   */
  persist?: boolean;

  /**
   * Run adapters concurrently or sequentially. Default: concurrent. Set to
   * false when you want a deterministic order (debugging, replay tests).
   */
  concurrent?: boolean;
}

/**
 * Run auto-detection. Returns a structured cross-verification result that
 * can be inspected, surfaced to UI, or fed into a snapshot.
 */
export async function runAutoDetection(
  input: AdapterInput,
  options: RunOptions = {},
): Promise<CrossVerificationResult> {
  const startedAt = new Date();
  const adaptersToRun = (options.adapters ?? ADAPTERS).filter((a) =>
    a.canDetect(input),
  );

  if (adaptersToRun.length === 0) {
    logger.info("[auto-detection] no adapters can detect with this input", {
      organizationId: input.organizationId,
      hints: {
        hasVatId: !!input.vatId,
        hasLegalName: !!input.legalName,
        hasEstablishment: !!input.establishment,
      },
    });
    return {
      organizationId: input.organizationId,
      startedAt,
      finishedAt: new Date(),
      successfulOutcomes: [],
      failures: [],
      mergedFields: [],
    };
  }

  logger.info("[auto-detection] running adapters", {
    organizationId: input.organizationId,
    adapters: adaptersToRun.map((a) => a.source),
  });

  // Run adapters
  const concurrent = options.concurrent ?? true;
  const outcomes: AdapterOutcome[] = concurrent
    ? await Promise.all(adaptersToRun.map((a) => safelyRun(a, input)))
    : await runSequential(adaptersToRun, input);

  const successful = outcomes.filter(
    (o): o is { ok: true; result: AdapterResult } => o.ok,
  );
  const failures = outcomes.filter(
    (o): o is Extract<AdapterOutcome, { ok: false }> => !o.ok,
  );

  // Merge per-field
  const mergedFields = mergeFields(successful.map((o) => o.result));

  // Persist if requested
  if (options.persist !== false && mergedFields.length > 0) {
    await persistMergedFields(input.organizationId, mergedFields, successful);
  }

  return {
    organizationId: input.organizationId,
    startedAt,
    finishedAt: new Date(),
    successfulOutcomes: successful.map((o) => o.result),
    failures,
    mergedFields,
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function safelyRun(
  adapter: AutoDetectionAdapter,
  input: AdapterInput,
): Promise<AdapterOutcome> {
  try {
    return await adapter.detect(input);
  } catch (err) {
    // Adapters are contractually required not to throw. If one does, we
    // catch + log + treat as failure — keep the cross-verifier resilient.
    logger.error(
      `[auto-detection] adapter ${adapter.source} threw — adapter contract violation`,
      err,
    );
    return {
      ok: false,
      source: adapter.source,
      errorKind: "remote-error",
      message: `Adapter threw: ${(err as Error).message ?? String(err)}`,
    };
  }
}

async function runSequential(
  adapters: AutoDetectionAdapter[],
  input: AdapterInput,
): Promise<AdapterOutcome[]> {
  const out: AdapterOutcome[] = [];
  for (const a of adapters) {
    out.push(await safelyRun(a, input));
  }
  return out;
}

/**
 * Merge field-level outputs from multiple adapters. The algorithm:
 *
 *   1. Group adapter outputs by `fieldName`
 *   2. Within each group, count value-frequencies (deep-equal on serialised JSON)
 *   3. The most-frequent value wins. Ties broken by adapter priority order
 *      from `ADAPTERS` (= registry order).
 *   4. Conflicts (any adapter returning a different value) are recorded so
 *      they can be surfaced to the operator UI.
 *
 * Confidence is NOT averaged across adapters — we use the chosen adapter's
 * own confidence verbatim. Boosting a single-adapter confidence based on
 * "two other adapters agreed" would be misleading.
 */
export function mergeFields(results: AdapterResult[]): MergedField[] {
  const byField = new Map<
    WritableVerifiedField,
    Array<{ value: unknown; source: SourceKey; field: DetectedField }>
  >();

  for (const result of results) {
    for (const field of result.fields) {
      const list = byField.get(field.fieldName) ?? [];
      list.push({ value: field.value, source: result.source, field });
      byField.set(field.fieldName, list);
    }
  }

  const out: MergedField[] = [];
  for (const [fieldName, contributions] of byField.entries()) {
    // Count agreement on canonical-JSON-serialised value
    const valueCounts = new Map<
      string,
      {
        value: unknown;
        sources: SourceKey[];
        firstSource: SourceKey;
        firstField: DetectedField;
      }
    >();
    for (const c of contributions) {
      const key = stableKey(c.value);
      const existing = valueCounts.get(key);
      if (existing) {
        existing.sources.push(c.source);
      } else {
        valueCounts.set(key, {
          value: c.value,
          sources: [c.source],
          firstSource: c.source,
          firstField: c.field,
        });
      }
    }

    // Pick the highest-count value; tie-break on source-priority (= order
    // in ADAPTERS).
    const sorted = [...valueCounts.values()].sort((a, b) => {
      if (b.sources.length !== a.sources.length) {
        return b.sources.length - a.sources.length;
      }
      return adapterPriority(a.firstSource) - adapterPriority(b.firstSource);
    });
    const winner = sorted[0];

    const conflicts: MergedField["conflicts"] = sorted.slice(1).map((c) => ({
      source: c.firstSource,
      conflictingValue: c.value,
    }));

    out.push({
      fieldName,
      chosenValue: winner.value,
      chosenSource: winner.firstSource,
      agreementCount: winner.sources.length,
      conflicts,
      contributingAdapters: winner.sources,
    });
  }
  return out;
}

async function persistMergedFields(
  organizationId: string,
  mergedFields: MergedField[],
  successful: Array<{ ok: true; result: AdapterResult }>,
): Promise<void> {
  // Map source → AdapterResult so we can grab the right attestation per field
  const resultBySource = new Map<SourceKey, AdapterResult>(
    successful.map((s) => [s.result.source, s.result]),
  );

  await bulkSetVerifiedFields(
    organizationId,
    mergedFields.map((m) => {
      const sourceResult = resultBySource.get(m.chosenSource)!;
      return {
        fieldName: m.fieldName,
        value: m.chosenValue,
        tier: "T2_SOURCE_VERIFIED" as const,
        sourceArtifact: sourceResult.rawArtifact,
        attestationRef: sourceResult.attestation,
        verifiedAt: sourceResult.fetchedAt,
        // Override origin for T2_SOURCE_VERIFIED — auto-detected
        origin: "source-backed" as const,
      };
    }),
  );

  logger.info("[auto-detection] persisted merged fields", {
    organizationId,
    fieldCount: mergedFields.length,
    fields: mergedFields.map((m) => ({
      field: m.fieldName,
      source: m.chosenSource,
      agreement: m.agreementCount,
      conflicts: m.conflicts.length,
    })),
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function stableKey(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value instanceof Date) return value.toISOString();
  // Object / array — sort keys for deterministic output
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)
      ? Object.keys(v as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = (v as Record<string, unknown>)[k];
            return acc;
          }, {})
      : v,
  );
}

function adapterPriority(source: SourceKey): number {
  const idx = ADAPTERS.findIndex((a) => a.source === source);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}
