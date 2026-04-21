/**
 * DerivationTraceService — append-only provenance ledger.
 *
 * Every derived value on any entity (OperatorProfile, workflow-step,
 * module-requirement, …) gets a DerivationTrace row explaining WHERE it
 * came from. The UI reads these to render causal breadcrumbs, trust
 * chips, side-peeks, and what-if simulations.
 *
 * **Append-only by design.** There is no update() and no delete() exposed.
 * A new value for the same (entityType, entityId, fieldName) creates a new
 * trace; the newer one wins via `derivedAt DESC`. This mirrors the
 * audit-log pattern and keeps the historical chain intact for regulators
 * who need to answer "what did you believe on date X?".
 *
 * See docs/CONTEXT-OMNIPRESENCE-INTEGRATION.md for the concept.
 */

import "server-only";
import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Where a derived value came from. Drives Trust-Chip color in the UI.
 *
 *   deterministic  — directly from a regulation/spec; immutable
 *   source-backed  — explicit source document/article; re-verifiable
 *   assessment     — operator's answer from an assessment wizard
 *   user-asserted  — operator asserted via edit, no source
 *   ai-inferred    — produced by Astra/LLM; needs confidence + modelVersion
 */
export type DerivationOrigin =
  | "deterministic"
  | "source-backed"
  | "assessment"
  | "user-asserted"
  | "ai-inferred";

/**
 * Structured pointer to the upstream source. Free-form JSON so we can
 * accommodate assessment answers, legal-source articles, external feeds,
 * etc. without schema churn. Consumers MUST handle `undefined` gracefully.
 */
export type SourceRef =
  | {
      kind: "assessment";
      assessmentId: string;
      questionId: string;
      answerSnapshot?: unknown; // value the user selected/typed
      answeredAt?: string; // ISO
    }
  | {
      kind: "legal-source";
      legalSourceId: string;
      articleRef?: string;
      verifiedAt?: string; // ISO; matches LegalSource.last_verified
    }
  | {
      kind: "regulatory-feed";
      updateId: string;
      publishedAt?: string;
    }
  | {
      kind: "ai-inference";
      astraConversationId?: string;
      prompt?: string; // short form / hash for audit
    }
  | {
      kind: "user-edit";
      userId: string;
      editedAt: string; // ISO
    }
  | {
      kind: "other";
      note: string;
      [k: string]: unknown;
    };

export interface WriteTraceInput {
  organizationId: string;
  entityType: string; // "operator_profile" | "workflow_step" | ...
  entityId: string;
  fieldName: string;
  value: unknown; // anything JSON-serialisable; scalars preserved
  origin: DerivationOrigin;
  sourceRef?: SourceRef;
  confidence?: number; // [0,1]
  modelVersion?: string;
  expiresAt?: Date | null;
  upstreamTraceIds?: string[];
}

export interface DerivationTrace {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: string; // serialised — read via readTraceValue()
  origin: DerivationOrigin;
  sourceRef: SourceRef | null;
  confidence: number | null;
  modelVersion: string | null;
  derivedAt: Date;
  expiresAt: Date | null;
  upstreamTraceIds: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────

/** Default TTL for assessment-origin traces: 365 days.
 *  After this, the trace is flagged as "stale" in the UI until re-verified. */
export const DEFAULT_ASSESSMENT_TTL_DAYS = 365;

/** Default TTL for ai-inferred traces: 180 days. Shorter because model
 *  versions drift faster than operator answers. */
export const DEFAULT_AI_TTL_DAYS = 180;

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Serialise any JSON-compatible value for the `value` column in a way
 * that roundtrips cleanly. Scalars become their string form; objects and
 * arrays become canonical JSON. `null` is preserved as the literal "null"
 * so we can distinguish "no value" from "value was null".
 */
export function serializeTraceValue(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // object / array / Date — JSON.stringify with sorted keys for determinism
  return JSON.stringify(v, (_k, val) =>
    val &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    !(val instanceof Date)
      ? Object.keys(val as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = (val as Record<string, unknown>)[k];
            return acc;
          }, {})
      : val,
  );
}

/** Parse a `value` string back into its original JSON form. */
export function readTraceValue(s: string): unknown {
  if (s === "null") return null;
  try {
    return JSON.parse(s);
  } catch {
    // Primitive that wasn't wrapped in JSON (shouldn't happen via
    // serializeTraceValue but defensive for hand-written rows)
    return s;
  }
}

function defaultExpiryForOrigin(origin: DerivationOrigin): Date | null {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (origin) {
    case "assessment":
      return new Date(now + DEFAULT_ASSESSMENT_TTL_DAYS * day);
    case "ai-inferred":
      return new Date(now + DEFAULT_AI_TTL_DAYS * day);
    case "user-asserted":
      return new Date(now + DEFAULT_ASSESSMENT_TTL_DAYS * day);
    case "source-backed":
    case "deterministic":
      return null; // hard regulation; expires when the source itself changes
  }
}

/**
 * Validate origin-specific invariants. Throws if invalid. Call before hitting DB.
 */
export function assertValidTrace(input: WriteTraceInput): void {
  if (!input.organizationId) throw new Error("organizationId required");
  if (!input.entityType) throw new Error("entityType required");
  if (!input.entityId) throw new Error("entityId required");
  if (!input.fieldName) throw new Error("fieldName required");

  switch (input.origin) {
    case "ai-inferred":
      if (input.confidence === undefined || input.confidence === null) {
        throw new Error("ai-inferred traces require confidence");
      }
      if (input.confidence < 0 || input.confidence > 1) {
        throw new Error("confidence must be in [0, 1]");
      }
      if (!input.modelVersion) {
        throw new Error("ai-inferred traces require modelVersion");
      }
      break;

    case "source-backed":
      if (!input.sourceRef) {
        throw new Error("source-backed traces require sourceRef");
      }
      if (
        input.sourceRef.kind !== "legal-source" &&
        input.sourceRef.kind !== "regulatory-feed"
      ) {
        throw new Error(
          "source-backed sourceRef must be of kind 'legal-source' or 'regulatory-feed'",
        );
      }
      break;

    case "assessment":
      if (!input.sourceRef || input.sourceRef.kind !== "assessment") {
        throw new Error(
          "assessment traces require sourceRef of kind 'assessment'",
        );
      }
      break;

    case "user-asserted":
      if (!input.sourceRef || input.sourceRef.kind !== "user-edit") {
        throw new Error(
          "user-asserted traces require sourceRef of kind 'user-edit'",
        );
      }
      break;

    case "deterministic":
      // No extra invariants; sourceRef optional (might point to a law).
      break;
  }

  if (input.expiresAt && input.expiresAt.getTime() < Date.now()) {
    throw new Error("expiresAt must be in the future");
  }
}

// ─── Prisma accessor (escape hatch — matches operator-profile-service) ──
// The generated Prisma types lag until `prisma generate` runs in CI. Other
// services in this project use the same (prisma as any) pattern for newly-
// added models. Centralised here so there's one `any` to find & remove
// once the types are universally available.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const derivationTrace = (prisma as any).derivationTrace;

// ─── Write API ──────────────────────────────────────────────────────────

/**
 * Append a new derivation trace. Never updates existing rows — if you
 * want to "change" a field's value, write a new trace and the newer one
 * wins on read via `derivedAt DESC`.
 *
 * Validates origin-specific invariants before writing. Auto-sets
 * `expiresAt` based on origin defaults if not provided.
 */
export async function writeTrace(
  input: WriteTraceInput,
): Promise<DerivationTrace> {
  assertValidTrace(input);

  const expiresAt =
    input.expiresAt === undefined
      ? defaultExpiryForOrigin(input.origin)
      : input.expiresAt;

  const row = await derivationTrace.create({
    data: {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldName: input.fieldName,
      value: serializeTraceValue(input.value),
      origin: input.origin,
      sourceRef: (input.sourceRef ?? null) as unknown as object | null,
      confidence: input.confidence ?? null,
      modelVersion: input.modelVersion ?? null,
      expiresAt,
      upstreamTraceIds: input.upstreamTraceIds ?? [],
    },
  });

  return row as DerivationTrace;
}

// ─── Read API ───────────────────────────────────────────────────────────

/**
 * Get the latest trace for a specific (entity, field). Returns null if
 * no trace exists. Newest-wins via `derivedAt DESC`.
 */
export async function getLatestTrace(
  entityType: string,
  entityId: string,
  fieldName: string,
): Promise<DerivationTrace | null> {
  const row = await derivationTrace.findFirst({
    where: { entityType, entityId, fieldName },
    orderBy: { derivedAt: "desc" },
  });
  return row as DerivationTrace | null;
}

/**
 * Get the full derivation history for a specific (entity, field), newest
 * first. Useful for "show me every time this value was re-derived".
 */
export async function getTraceHistory(
  entityType: string,
  entityId: string,
  fieldName: string,
  limit = 50,
): Promise<DerivationTrace[]> {
  const rows = await derivationTrace.findMany({
    where: { entityType, entityId, fieldName },
    orderBy: { derivedAt: "desc" },
    take: limit,
  });
  return rows as DerivationTrace[];
}

/**
 * Get the **current state** for an entity — one trace per field
 * (latest per fieldName). Primary read for rendering the Why-Sidebar and
 * Causal-Breadcrumbs on an entity detail page.
 */
export async function getCurrentTracesForEntity(
  entityType: string,
  entityId: string,
): Promise<DerivationTrace[]> {
  // Fetch all traces for entity, then reduce to latest-per-field in JS.
  // At expected scale (≤ ~50 fields per entity, ≤ ~10 traces per field)
  // this is well under 500 rows — no pagination needed. If an entity
  // grows beyond that, swap for a window-function query.
  const rows = (await derivationTrace.findMany({
    where: { entityType, entityId },
    orderBy: { derivedAt: "desc" },
  })) as DerivationTrace[];

  const seen = new Set<string>();
  const latest: DerivationTrace[] = [];
  for (const row of rows) {
    if (seen.has(row.fieldName)) continue;
    seen.add(row.fieldName);
    latest.push(row);
  }
  return latest;
}

/**
 * Find traces that depend on a given trace (i.e. have this trace's id in
 * their `upstreamTraceIds`). Enables "what changes if this upstream
 * answer changes" queries — the foundation of the What-If simulator.
 */
export async function getDownstreamTraces(
  upstreamTraceId: string,
  limit = 200,
): Promise<DerivationTrace[]> {
  const rows = await derivationTrace.findMany({
    where: { upstreamTraceIds: { has: upstreamTraceId } },
    orderBy: { derivedAt: "desc" },
    take: limit,
  });
  return rows as DerivationTrace[];
}

/**
 * Walk upstream from a trace, collecting the full provenance chain.
 * Bounded depth to prevent infinite loops on corrupt data.
 */
export async function getUpstreamChain(
  traceId: string,
  maxDepth = 10,
): Promise<DerivationTrace[]> {
  const chain: DerivationTrace[] = [];
  const visited = new Set<string>();
  let frontier: string[] = [traceId];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const rows = (await derivationTrace.findMany({
      where: { id: { in: frontier } },
    })) as DerivationTrace[];

    const nextFrontier: string[] = [];
    for (const row of rows) {
      if (visited.has(row.id)) continue;
      visited.add(row.id);
      chain.push(row);
      for (const upstreamId of row.upstreamTraceIds) {
        if (!visited.has(upstreamId)) nextFrontier.push(upstreamId);
      }
    }
    frontier = nextFrontier;
  }

  return chain;
}

/**
 * List stale traces for an org — ones whose `expiresAt` is in the past.
 * Drives the "⚠ Stale data" warning chip in the UI.
 */
export async function getStaleTraces(
  organizationId: string,
  now: Date = new Date(),
  limit = 100,
): Promise<DerivationTrace[]> {
  const rows = await derivationTrace.findMany({
    where: {
      organizationId,
      expiresAt: { lt: now, not: null },
    },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });
  return rows as DerivationTrace[];
}

/**
 * Count all traces for an org. Cheap sanity check + used by the
 * onboarding hint "Your profile has N provenance entries".
 */
export async function countTracesForOrg(
  organizationId: string,
): Promise<number> {
  return derivationTrace.count({ where: { organizationId } });
}
