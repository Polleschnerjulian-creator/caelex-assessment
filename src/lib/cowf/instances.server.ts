/**
 * COWF — Definition + Instance CRUD service (Sprint 3A)
 *
 * Sprint 3A scope:
 *   - Register workflow definitions (`registerWorkflowDef`)
 *   - Start a workflow instance (`startWorkflow`) — emits the initial
 *     STATE_TRANSITION event with sequence=0
 *   - Read instance summaries (`loadInstance`, `listActiveInstances`)
 *   - Update materialised state (`advanceState`) — emits a STATE_TRANSITION
 *     event AND updates the OperatorWorkflowInstance.currentState column
 *
 * Sprint 3B will add the DSL (`defineWorkflow`) that produces the
 * StoredStep[] persisted via `registerWorkflowDef`. Sprint 3C will add
 * the heartbeat-cron that drives WorkflowSchedule. Sprint 3D will add
 * the per-step-type executors.
 *
 * **Atomicity rule:** every `advanceState` runs inside a Prisma
 * transaction with the WorkflowEvent append. If the event-append fails,
 * the state-update rolls back — the materialised state never gets ahead
 * of the chain.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { appendWorkflowEvent } from "./events.server";
import {
  type DefineWorkflowInput,
  type StartWorkflowInput,
  type WorkflowInstanceSummary,
  type WorkflowSubject,
  WorkflowEventType,
} from "./types";

// Lazy-imported to avoid circular dependency:
//   instances.server <-> executor.server <-> events.server
//
// The executor module imports from instances.server (advanceState), so
// instances.server cannot statically import executor.server. We resolve
// the import inside `maybeAutoFireInitialStep()` at call time.
type AutoFireResult = { fired: boolean };
async function lazyExecuteStep(input: {
  workflowId: string;
  stepKey: string;
  causedBy: string;
}): Promise<AutoFireResult> {
  const { executeStep } = await import("./executor.server");
  return executeStep(input);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const operatorWorkflowDef = (prisma as any).operatorWorkflowDef;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const operatorWorkflowInstance = (prisma as any).operatorWorkflowInstance;

// ─── Definition CRUD ───────────────────────────────────────────────────────

/**
 * Register (idempotently) a workflow definition. Returns the existing row
 * if `(name, version)` already exists. Bumping `version` creates a new row
 * — old instances stay on their original version, new instances pick the
 * latest. Replay-safe by construction.
 */
export async function registerWorkflowDef(
  input: DefineWorkflowInput,
): Promise<{ id: string; created: boolean }> {
  const existing = await operatorWorkflowDef.findUnique({
    where: { name_version: { name: input.name, version: input.version } },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await operatorWorkflowDef.create({
    data: {
      name: input.name,
      version: input.version,
      description: input.description,
      states: input.states as unknown as object,
      steps: input.steps as unknown as object,
      subjectType: input.subjectType ?? null,
    },
    select: { id: true },
  });
  logger.info("[cowf] registered workflow def", {
    id: created.id,
    name: input.name,
    version: input.version,
  });
  return { id: created.id, created: true };
}

/**
 * Look up a definition by name + version (or name + latest version).
 */
export async function findWorkflowDef(
  name: string,
  version?: number,
): Promise<{ id: string; version: number; states: string[] } | null> {
  if (version !== undefined) {
    const row = await operatorWorkflowDef.findUnique({
      where: { name_version: { name, version } },
      select: { id: true, version: true, states: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      version: row.version,
      states: (row.states as string[]) ?? [],
    };
  }
  // Latest version for this name
  const latest = await operatorWorkflowDef.findFirst({
    where: { name },
    orderBy: { version: "desc" },
    select: { id: true, version: true, states: true },
  });
  if (!latest) return null;
  return {
    id: latest.id,
    version: latest.version,
    states: (latest.states as string[]) ?? [],
  };
}

// ─── Instance CRUD ─────────────────────────────────────────────────────────

/**
 * Start a new workflow instance + emit the initial STATE_TRANSITION event.
 * The instance and the first event are created in a single transaction —
 * either both land or neither does.
 */
export async function startWorkflow(
  input: StartWorkflowInput,
): Promise<{ instanceId: string; eventId: string }> {
  // Validate the def exists
  const def = await operatorWorkflowDef.findUnique({
    where: { id: input.defId },
    select: { id: true, states: true, name: true, version: true },
  });
  if (!def) throw new Error(`OperatorWorkflowDef ${input.defId} not found`);

  const states = (def.states as string[]) ?? [];
  if (states.length > 0 && !states.includes(input.initialState)) {
    throw new Error(
      `initialState "${input.initialState}" not in def states [${states.join(", ")}]`,
    );
  }

  // Create instance — note: we do NOT use Prisma.$transaction here because
  // appendWorkflowEvent already opens its own Serializable txn. We sequence
  // them manually. If the event-append fails, we delete the instance row
  // we just created, restoring atomicity at app-level.
  const subjectType = input.subject?.type ?? null;
  const subjectId =
    input.subject && input.subject.type !== null ? input.subject.id : null;

  const instance = await operatorWorkflowInstance.create({
    data: {
      defId: input.defId,
      userId: input.userId,
      organizationId: input.organizationId,
      subjectType,
      subjectId,
      currentState: input.initialState,
      hardDeadline: input.hardDeadline ?? null,
    },
    select: { id: true },
  });

  try {
    const event = await appendWorkflowEvent({
      workflowId: instance.id,
      eventType: WorkflowEventType.STATE_TRANSITION,
      causedBy: `user:${input.userId}`,
      payload: {
        defName: def.name,
        defVersion: def.version,
        toState: input.initialState,
        subject: input.subject,
        hardDeadline: input.hardDeadline?.toISOString() ?? null,
      },
      resultingState: input.initialState,
    });
    logger.info("[cowf] started workflow", {
      instanceId: instance.id,
      defName: def.name,
      defVersion: def.version,
      initialState: input.initialState,
    });

    // Sprint 3D: if the initial state has an auto-fire step, kick it off
    // immediately. This is what makes a workflow "self-driving" — the
    // operator clicks "start" and the heartbeat / decision chain takes
    // over from there. Failures here are logged but do NOT roll back
    // the instance — the workflow is created, the user can manually
    // trigger steps later if the auto-fire failed transiently.
    await maybeAutoFireInitialStep(
      instance.id,
      input.defId,
      input.initialState,
    );

    return { instanceId: instance.id, eventId: event.id };
  } catch (err) {
    // Roll back the instance row — the chain never got its first event,
    // so the instance is effectively orphaned. Remove it.
    await operatorWorkflowInstance
      .delete({ where: { id: instance.id } })
      .catch(() => {
        /* swallow — best-effort rollback */
      });
    throw err;
  }
}

/**
 * If the initialState has a step with `autoFireOnEnter: true`, run it
 * via the executor. Looks up the registered WorkflowDef (Sprint 3D
 * registry) — if the def is not registered (test environment, code
 * removed, etc.) we silently skip without throwing. The workflow
 * instance still exists and can be advanced manually.
 */
async function maybeAutoFireInitialStep(
  workflowId: string,
  defId: string,
  initialState: string,
): Promise<void> {
  try {
    const { getWorkflowDefById } = await import("./registry.server");
    const def = getWorkflowDefById(defId);
    if (!def) {
      logger.info(
        "[cowf] startWorkflow: def not in registry — skipping auto-fire",
        { workflowId, defId },
      );
      return;
    }
    const { findAutoFireStepFor } = await import("./executor.server");
    const stepKey = findAutoFireStepFor(def.storedInput.steps, initialState);
    if (!stepKey) return;

    await lazyExecuteStep({
      workflowId,
      stepKey,
      causedBy: "system:auto-fire-initial",
    });
  } catch (err) {
    logger.error("[cowf] auto-fire initial step failed (instance kept)", {
      workflowId,
      defId,
      initialState,
      error: (err as Error).message ?? String(err),
    });
  }
}

/**
 * Advance a workflow's materialised state + append a STATE_TRANSITION event.
 * The two writes are NOT inside a single Prisma transaction (because
 * appendWorkflowEvent has its own Serializable txn). On event-append
 * failure we don't update the column; the materialised state stays in
 * sync with the chain.
 *
 * Use this from step-executors when a step completes and the workflow
 * advances. For non-state-changing events (ASTRA_PROPOSED, WAIT_REGISTERED,
 * etc.) call `appendWorkflowEvent` directly — the chain captures them
 * but `currentState` doesn't change.
 */
export async function advanceState(args: {
  workflowId: string;
  toState: string;
  causedBy: string;
  payload?: Record<string, unknown>;
}): Promise<{ eventId: string; sequence: number }> {
  // Append the event first; if the chain rejects (validation / hash-fail),
  // we do NOT update the column.
  const event = await appendWorkflowEvent({
    workflowId: args.workflowId,
    eventType: WorkflowEventType.STATE_TRANSITION,
    causedBy: args.causedBy,
    payload: { ...(args.payload ?? {}), toState: args.toState },
    resultingState: args.toState,
  });

  // Mirror to materialised column.
  await operatorWorkflowInstance.update({
    where: { id: args.workflowId },
    data: { currentState: args.toState },
  });

  return { eventId: event.id, sequence: event.sequence };
}

/**
 * Mark a workflow as completed — sets `completedAt` on the instance row
 * and appends a COMPLETED event. The chain remains queryable forever.
 */
export async function completeWorkflow(args: {
  workflowId: string;
  causedBy: string;
  finalState: string;
}): Promise<{ eventId: string }> {
  const event = await appendWorkflowEvent({
    workflowId: args.workflowId,
    eventType: WorkflowEventType.COMPLETED,
    causedBy: args.causedBy,
    payload: { finalState: args.finalState },
    resultingState: args.finalState,
  });
  await operatorWorkflowInstance.update({
    where: { id: args.workflowId },
    data: { currentState: args.finalState, completedAt: new Date() },
  });
  return { eventId: event.id };
}

/**
 * Soft-pause a workflow until a future date. Heartbeat-cron skips paused
 * instances. An operator can resume manually before pausedUntil.
 */
export async function pauseWorkflow(args: {
  workflowId: string;
  pausedUntil: Date;
  causedBy: string;
  reason?: string;
}): Promise<{ eventId: string }> {
  const event = await appendWorkflowEvent({
    workflowId: args.workflowId,
    eventType: WorkflowEventType.PAUSED,
    causedBy: args.causedBy,
    payload: {
      pausedUntil: args.pausedUntil.toISOString(),
      reason: args.reason ?? null,
    },
  });
  await operatorWorkflowInstance.update({
    where: { id: args.workflowId },
    data: { pausedUntil: args.pausedUntil },
  });
  return { eventId: event.id };
}

/**
 * Read an instance summary including its definition's name + version.
 */
export async function loadInstance(
  workflowId: string,
): Promise<WorkflowInstanceSummary | null> {
  const row = await operatorWorkflowInstance.findUnique({
    where: { id: workflowId },
    include: {
      def: { select: { name: true, version: true } },
    },
  });
  if (!row) return null;
  return toSummary(row);
}

/**
 * List active instances for an organization. Skips archived + completed.
 */
export async function listActiveInstances(
  organizationId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<WorkflowInstanceSummary[]> {
  const rows = await operatorWorkflowInstance.findMany({
    where: {
      organizationId,
      archivedAt: null,
      completedAt: null,
    },
    include: { def: { select: { name: true, version: true } } },
    orderBy: { startedAt: "desc" },
    take: options.limit ?? 50,
    skip: options.offset ?? 0,
  });
  return rows.map(toSummary);
}

/**
 * List instances pending action by a specific user (operator inbox view).
 * For Sprint 3A, "pending action" = currentState matches actionableBy.userIds
 * or actionableBy.roles intersect with userRoles. Sprint 5 will refine.
 */
export async function listInboxForUser(
  userId: string,
  options: { limit?: number } = {},
): Promise<WorkflowInstanceSummary[]> {
  const rows = await operatorWorkflowInstance.findMany({
    where: {
      userId,
      archivedAt: null,
      completedAt: null,
      // Sprint 3A: simple owner-match. Sprint 5 expands to role-based.
    },
    include: { def: { select: { name: true, version: true } } },
    orderBy: [
      { hardDeadline: "asc" }, // tightest deadline first
      { startedAt: "desc" },
    ],
    take: options.limit ?? 25,
  });
  return rows.map(toSummary);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface RawInstanceWithDef {
  id: string;
  defId: string;
  def: { name: string; version: number };
  userId: string;
  organizationId: string;
  subjectType: string | null;
  subjectId: string | null;
  currentState: string;
  actionableBy: unknown;
  pausedUntil: Date | null;
  hardDeadline: Date | null;
  startedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
}

function toSummary(row: RawInstanceWithDef): WorkflowInstanceSummary {
  const subject: WorkflowSubject =
    row.subjectType && row.subjectId
      ? ({
          type: row.subjectType as Exclude<WorkflowSubject["type"], null>,
          id: row.subjectId,
        } as WorkflowSubject)
      : { type: null, id: null };

  return {
    id: row.id,
    defId: row.defId,
    defName: row.def.name,
    defVersion: row.def.version,
    userId: row.userId,
    organizationId: row.organizationId,
    subject,
    currentState: row.currentState,
    actionableBy: (row.actionableBy as Record<string, unknown> | null) ?? null,
    pausedUntil: row.pausedUntil,
    hardDeadline: row.hardDeadline,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    archivedAt: row.archivedAt,
  };
}
