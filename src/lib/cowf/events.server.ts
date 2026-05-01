/**
 * COWF Event Service — append-only with hash-chain (Sprint 3A)
 *
 * Mirrors `src/lib/operator-profile/evidence.server.ts` and
 * `src/lib/audit-hash.server.ts` for the WorkflowEvent stream. Every
 * state change in a COWF workflow appends an event row. The chain is
 * per-workflow-instance — `prevHash = previous WorkflowEvent.entryHash`
 * for that workflowId, or `GENESIS_<workflowId>` if it's the first.
 *
 * **Why this exists:** COWF replaces Inngest/Temporal for Caelex. The
 * compliance audit-trail therefore needs to be MORE tamper-evident than
 * those vendors provide, not less. Hash-chained event-sourcing per
 * workflow gives us:
 *
 *   - Replay-safe state reconstruction (verify chain → trust currentState)
 *   - Time-travel: "what was the workflow state on date X" = SQL query
 *   - Tamper detection: any retroactive edit breaks the chain
 *   - Cross-platform witness: Pharos / Atlas can verify Comply chains
 *
 * **Atomicity:** append runs in a Serializable transaction with the
 * sequence-number lock. Concurrent events that try to append at the
 * same sequence get serialised by the txn boundary.
 *
 * **Defence-in-depth:** if the Serializable txn fails, the service
 * raises a CRITICAL `WORKFLOW_HASH_CHAIN_DEGRADED` SecurityEvent and
 * writes a deterministic fallback-hash row so the chain is never null.
 * Same pattern as audit-hash.server.ts and evidence.server.ts.
 *
 * Reference: docs/CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md (Section 4 + 8)
 */

import "server-only";

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  type AppendWorkflowEventInput,
  type AppendWorkflowEventResult,
  type VerifyChainResult,
  type WorkflowEventRow,
} from "./types";

// ─── Prisma escape-hatch ───────────────────────────────────────────────────
// Generated client lags until `prisma generate` runs in CI; same pattern as
// evidence.server.ts and derivation-trace-service.ts.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const workflowEvent = (prisma as any).workflowEvent;

// ─── Canonical Serialisation ───────────────────────────────────────────────

/**
 * Canonical JSON serialiser — identical contract to
 * `evidence.server.ts.canonicalize` (sorted keys, no whitespace, ISO-8601
 * dates, Buffer→hex). Two callers with the same logical value produce
 * the same byte string regardless of object-key order.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Buffer.isBuffer(value)) return JSON.stringify(value.toString("hex"));
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map((k) => {
      const v = (value as Record<string, unknown>)[k];
      return JSON.stringify(k) + ":" + canonicalize(v);
    });
    return "{" + entries.join(",") + "}";
  }
  return JSON.stringify(String(value));
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ─── Genesis + Chain Lookup ────────────────────────────────────────────────

/** Genesis sentinel for the first event in a workflow instance's chain. */
export function genesisHashForWorkflow(workflowId: string): string {
  return `GENESIS_${workflowId}`;
}

/**
 * Look up the latest entry hash + sequence for a workflow. Returns the
 * genesis sentinel + sequence=-1 if no events exist yet (next sequence
 * is therefore 0 for the first event).
 */
export async function getLatestEvent(workflowId: string): Promise<{
  entryHash: string;
  sequence: number;
}> {
  try {
    const latest = await workflowEvent.findFirst({
      where: { workflowId },
      orderBy: [{ sequence: "desc" }],
      select: { entryHash: true, sequence: true },
    });
    if (!latest) {
      return {
        entryHash: genesisHashForWorkflow(workflowId),
        sequence: -1,
      };
    }
    return { entryHash: latest.entryHash, sequence: latest.sequence };
  } catch (error) {
    logger.error("Failed to fetch latest workflow event", error);
    return {
      entryHash: genesisHashForWorkflow(workflowId),
      sequence: -1,
    };
  }
}

// ─── Entry-Hash Computation ────────────────────────────────────────────────

interface EntryHashInput {
  workflowId: string;
  sequence: number;
  eventType: string;
  causedBy: string;
  payload: Record<string, unknown>;
  resultingState: string | null;
  occurredAt: Date;
  prevHash: string;
}

/**
 * Compute SHA-256 of a workflow event including its prevHash. Anyone
 * with the row + prevHash can recompute and verify.
 */
export function computeEntryHash(input: EntryHashInput): string {
  const payload = canonicalize({
    workflowId: input.workflowId,
    sequence: input.sequence,
    eventType: input.eventType,
    causedBy: input.causedBy,
    payload: input.payload,
    resultingState: input.resultingState,
    occurredAt: input.occurredAt.toISOString(),
    prevHash: input.prevHash,
  });
  return sha256Hex(payload);
}

// ─── Append API ────────────────────────────────────────────────────────────

/**
 * Append a new event to the workflow's hash chain. Runs in a Serializable
 * transaction so concurrent appends to the same workflow get serialised
 * (no two events share a sequence number, no two share a prevHash).
 *
 * On failure, raises a CRITICAL SecurityEvent and writes a deterministic
 * fallback-hash row so the chain is never null. Mirrors evidence.server.ts.
 */
export async function appendWorkflowEvent(
  input: AppendWorkflowEventInput,
): Promise<AppendWorkflowEventResult> {
  validateAppendInput(input);

  const occurredAt = new Date();

  try {
    return await prisma.$transaction(
      async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txEvent = (tx as any).workflowEvent;
        const latest = await txEvent.findFirst({
          where: { workflowId: input.workflowId },
          orderBy: [{ sequence: "desc" }],
          select: { entryHash: true, sequence: true },
        });
        const sequence = latest ? latest.sequence + 1 : 0;
        const prevHash =
          latest?.entryHash ?? genesisHashForWorkflow(input.workflowId);

        const entryHash = computeEntryHash({
          workflowId: input.workflowId,
          sequence,
          eventType: input.eventType,
          causedBy: input.causedBy,
          payload: input.payload,
          resultingState: input.resultingState ?? null,
          occurredAt,
          prevHash,
        });

        const row = await txEvent.create({
          data: {
            workflowId: input.workflowId,
            sequence,
            eventType: input.eventType,
            causedBy: input.causedBy,
            payload: input.payload,
            resultingState: input.resultingState ?? null,
            prevHash,
            entryHash,
            occurredAt,
          },
        });

        return {
          id: row.id as string,
          sequence,
          prevHash,
          entryHash,
          occurredAt,
        } satisfies AppendWorkflowEventResult;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    logger.error("[cowf] workflow-event append FAILED — using fallback", {
      workflowId: input.workflowId,
      eventType: input.eventType,
      error,
    });

    try {
      await prisma.securityEvent.create({
        data: {
          type: "WORKFLOW_HASH_CHAIN_DEGRADED",
          severity: "CRITICAL",
          description: `Workflow-event hash-chain append failed for workflow ${input.workflowId} (${input.eventType}).`,
          metadata: JSON.stringify({
            workflowId: input.workflowId,
            eventType: input.eventType,
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      });
    } catch {
      // even SecurityEvent write failed — last-resort, still persist row
    }

    const previousRow = await workflowEvent.findFirst({
      where: { workflowId: input.workflowId },
      orderBy: [{ sequence: "desc" }],
      select: { entryHash: true, sequence: true },
    });
    const sequence = previousRow ? previousRow.sequence + 1 : 0;
    const priorHash =
      previousRow?.entryHash ?? genesisHashForWorkflow(input.workflowId);
    const fallbackHash = sha256Hex(
      [
        "fallback",
        priorHash,
        input.workflowId,
        sequence,
        input.eventType,
        input.causedBy,
        canonicalize(input.payload),
        occurredAt.toISOString(),
      ].join("|"),
    );

    const row = await workflowEvent.create({
      data: {
        workflowId: input.workflowId,
        sequence,
        eventType: input.eventType,
        causedBy: input.causedBy,
        payload: input.payload,
        resultingState: input.resultingState ?? null,
        prevHash: priorHash,
        entryHash: fallbackHash,
        occurredAt,
      },
    });
    return {
      id: row.id as string,
      sequence,
      prevHash: priorHash,
      entryHash: fallbackHash,
      occurredAt,
    };
  }
}

// ─── Read API ──────────────────────────────────────────────────────────────

/**
 * Load all events for a workflow, ordered by sequence ascending. Used by
 * audit-trail UI and replay logic.
 */
export async function loadEvents(
  workflowId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<WorkflowEventRow[]> {
  const rows = await workflowEvent.findMany({
    where: { workflowId },
    orderBy: [{ sequence: "asc" }],
    take: options.limit,
    skip: options.offset,
  });
  return rows.map(toEventRow);
}

/** Get the latest event row for a workflow, or null if none exist. */
export async function getLatestEventRow(
  workflowId: string,
): Promise<WorkflowEventRow | null> {
  const row = await workflowEvent.findFirst({
    where: { workflowId },
    orderBy: [{ sequence: "desc" }],
  });
  return row ? toEventRow(row) : null;
}

// ─── Chain Verification ────────────────────────────────────────────────────

/**
 * Walk the entire workflow's event chain and verify every link. Returns
 * the first broken link if the chain is corrupt. Pagination via batches
 * to bound memory.
 */
export async function verifyChain(
  workflowId: string,
): Promise<VerifyChainResult> {
  const BATCH_SIZE = 1000;
  let offset = 0;
  let totalVerified = 0;
  let lastHash = genesisHashForWorkflow(workflowId);
  let expectedSequence = 0;

  while (true) {
    const batch = await workflowEvent.findMany({
      where: { workflowId },
      orderBy: [{ sequence: "asc" }],
      skip: offset,
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;

    for (const row of batch) {
      // 1. Verify sequence is strictly increasing without gaps
      if (row.sequence !== expectedSequence) {
        return {
          valid: false,
          checkedEvents: totalVerified + 1,
          brokenAt: {
            eventId: row.id,
            sequence: row.sequence,
            expectedPrev: String(expectedSequence),
            actualPrev: String(row.sequence),
            fieldDiffers: "sequence",
          },
        };
      }

      // 2. Verify prevHash points to the previous event's entryHash
      if (row.prevHash !== lastHash) {
        return {
          valid: false,
          checkedEvents: totalVerified + 1,
          brokenAt: {
            eventId: row.id,
            sequence: row.sequence,
            expectedPrev: lastHash,
            actualPrev: row.prevHash,
            fieldDiffers: "prevHash",
          },
        };
      }

      // 3. Recompute and verify the entryHash itself
      const recomputed = computeEntryHash({
        workflowId: row.workflowId,
        sequence: row.sequence,
        eventType: row.eventType,
        causedBy: row.causedBy,
        payload: row.payload as Record<string, unknown>,
        resultingState: row.resultingState ?? null,
        occurredAt: row.occurredAt,
        prevHash: row.prevHash,
      });
      if (recomputed !== row.entryHash) {
        return {
          valid: false,
          checkedEvents: totalVerified + 1,
          brokenAt: {
            eventId: row.id,
            sequence: row.sequence,
            expectedPrev: row.entryHash,
            actualPrev: recomputed,
            fieldDiffers: "entryHash",
          },
        };
      }

      lastHash = row.entryHash;
      expectedSequence += 1;
      totalVerified += 1;
    }

    offset += BATCH_SIZE;
    if (batch.length < BATCH_SIZE) break;
  }

  return { valid: true, checkedEvents: totalVerified };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function validateAppendInput(input: AppendWorkflowEventInput): void {
  if (!input.workflowId) throw new Error("workflowId required");
  if (!input.eventType) throw new Error("eventType required");
  if (!input.causedBy) throw new Error("causedBy required");
  if (!input.payload) throw new Error("payload required");
}

interface RawEventRow {
  id: string;
  workflowId: string;
  sequence: number;
  eventType: string;
  causedBy: string;
  payload: unknown;
  resultingState: string | null;
  prevHash: string;
  entryHash: string;
  occurredAt: Date;
}

function toEventRow(row: RawEventRow): WorkflowEventRow {
  return {
    id: row.id,
    workflowId: row.workflowId,
    sequence: row.sequence,
    eventType: row.eventType,
    causedBy: row.causedBy,
    payload: (row.payload as Record<string, unknown>) ?? {},
    resultingState: row.resultingState,
    prevHash: row.prevHash,
    entryHash: row.entryHash,
    occurredAt: row.occurredAt,
  };
}

// ─── Test-Hook Exports ─────────────────────────────────────────────────────

export const __test = { canonicalize, sha256Hex };
