/**
 * COWF — WorkflowSchedule service (Sprint 3C)
 *
 * Schedules are time-based wakeups: "wake the workflow `wfId` at `fireAt`
 * and run step `stepKey`." They are created by:
 *
 *   - `step.approval`'s SLA derivation (Sprint 3D wires this)
 *   - `step.waitForEvent`'s `timeout` (Sprint 3D)
 *   - The W3 cron itself when it spawns daily heartbeat instances
 *   - Hand-written workflow definitions calling `createSchedule()`
 *
 * Sprint 3C scope:
 *   - createSchedule / cancelSchedule / listDueSchedules CRUD
 *   - Hard cap on attemptCount before marking FAILED
 *   - Idempotent cancellation (already-FIRED returns gracefully)
 *
 * The HEARTBEAT cron (in `heartbeat.server.ts`) consumes these — the
 * scheduling layer here only writes/reads rows; firing logic lives there.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ScheduleStatus } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const workflowSchedule = (prisma as any).workflowSchedule;

/** Default attempt-cap before marking a schedule FAILED. */
export const MAX_SCHEDULE_ATTEMPTS = 5;

/** Soft cap on rows returned per heartbeat tick. */
export const MAX_DUE_PER_TICK = 200;

// ─── Create / Cancel ───────────────────────────────────────────────────────

export interface CreateScheduleInput {
  workflowId: string;
  stepKey: string;
  fireAt: Date;
}

/**
 * Create a PENDING schedule row. Returns the row id. Multiple schedules
 * for the same (workflow, step) are allowed — the engine treats them as
 * independent reminders (e.g. "remind every 7 days").
 */
export async function createSchedule(
  input: CreateScheduleInput,
): Promise<{ id: string; fireAt: Date }> {
  const row = await workflowSchedule.create({
    data: {
      workflowId: input.workflowId,
      stepKey: input.stepKey,
      fireAt: input.fireAt,
      status: ScheduleStatus.PENDING,
    },
    select: { id: true, fireAt: true },
  });
  logger.info("[cowf] schedule created", {
    id: row.id,
    workflowId: input.workflowId,
    stepKey: input.stepKey,
    fireAt: input.fireAt.toISOString(),
  });
  return row;
}

/**
 * Cancel a PENDING schedule (idempotent — already-FIRED schedules return
 * `{ cancelled: false }` without throwing). Used when a workflow advances
 * past the state where the schedule's step was relevant.
 */
export async function cancelSchedule(
  scheduleId: string,
  reason?: string,
): Promise<{ cancelled: boolean }> {
  const result = await workflowSchedule.updateMany({
    where: { id: scheduleId, status: ScheduleStatus.PENDING },
    data: {
      status: ScheduleStatus.CANCELLED,
      lastError: reason ?? null,
    },
  });
  return { cancelled: (result?.count ?? 0) > 0 };
}

/**
 * Cancel ALL pending schedules for a (workflow, step) — used when a step
 * completes and any reminders / SLA-watchdogs for that step should stop.
 */
export async function cancelSchedulesForStep(
  workflowId: string,
  stepKey: string,
): Promise<{ cancelled: number }> {
  const result = await workflowSchedule.updateMany({
    where: { workflowId, stepKey, status: ScheduleStatus.PENDING },
    data: { status: ScheduleStatus.CANCELLED },
  });
  return { cancelled: result?.count ?? 0 };
}

// ─── Read ──────────────────────────────────────────────────────────────────

export interface DueSchedule {
  id: string;
  workflowId: string;
  stepKey: string;
  fireAt: Date;
  attemptCount: number;
}

/**
 * Find PENDING schedules whose `fireAt` is in the past — i.e. due to
 * fire NOW. Bounded by `MAX_DUE_PER_TICK` to keep cron runtime predictable.
 *
 * Ordered by `fireAt ASC` so older overdue schedules fire first
 * (preserving operator-perceived chronology).
 */
export async function listDueSchedules(
  options: { now?: Date; limit?: number } = {},
): Promise<DueSchedule[]> {
  const now = options.now ?? new Date();
  const rows = await workflowSchedule.findMany({
    where: {
      status: ScheduleStatus.PENDING,
      fireAt: { lte: now },
      attemptCount: { lt: MAX_SCHEDULE_ATTEMPTS },
    },
    orderBy: [{ fireAt: "asc" }, { id: "asc" }],
    take: options.limit ?? MAX_DUE_PER_TICK,
    select: {
      id: true,
      workflowId: true,
      stepKey: true,
      fireAt: true,
      attemptCount: true,
    },
  });
  return rows;
}

// ─── State Transitions (called by heartbeat) ───────────────────────────────

/**
 * Mark a schedule as FIRED — called by the heartbeat after it has
 * successfully emitted the SCHEDULE_FIRED workflow event.
 *
 * Atomic-by-status: only flips PENDING → FIRED. If two heartbeats race
 * on the same schedule (shouldn't happen with cron-at-most-once but
 * defensive), the second updateMany affects 0 rows.
 */
export async function markScheduleFired(
  scheduleId: string,
): Promise<{ fired: boolean }> {
  const result = await workflowSchedule.updateMany({
    where: { id: scheduleId, status: ScheduleStatus.PENDING },
    data: { status: ScheduleStatus.FIRED, firedAt: new Date() },
  });
  return { fired: (result?.count ?? 0) > 0 };
}

/**
 * Record a fire-attempt failure. Increments `attemptCount`, stores the
 * error message, and — if attempts have reached the cap — flips status
 * to FAILED so the cron stops retrying.
 */
export async function recordScheduleFailure(
  scheduleId: string,
  errorMessage: string,
): Promise<{ status: "PENDING_RETRY" | "FAILED" }> {
  // Read current attempt count to decide the new status
  const current = await workflowSchedule.findUnique({
    where: { id: scheduleId },
    select: { attemptCount: true, status: true },
  });
  if (!current) return { status: "FAILED" };

  const nextAttempt = (current.attemptCount ?? 0) + 1;
  const finalStatus =
    nextAttempt >= MAX_SCHEDULE_ATTEMPTS
      ? ScheduleStatus.FAILED
      : ScheduleStatus.PENDING;

  await workflowSchedule.update({
    where: { id: scheduleId },
    data: {
      status: finalStatus,
      attemptCount: nextAttempt,
      lastError: errorMessage,
    },
  });
  return {
    status: finalStatus === ScheduleStatus.FAILED ? "FAILED" : "PENDING_RETRY",
  };
}
