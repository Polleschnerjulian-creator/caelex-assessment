/**
 * COWF Heartbeat — schedule poller (Sprint 3C)
 *
 * Called by the Vercel cron at `/api/cron/cowf-heartbeat`. Each tick:
 *
 *   1. Fetch up to MAX_DUE_PER_TICK PENDING schedules whose fireAt ≤ now
 *   2. For each, emit a SCHEDULE_FIRED WorkflowEvent (hash-chained)
 *   3. Mark the schedule as FIRED (or record a failure for retry)
 *   4. Return a structured tick-summary for cron-route observability
 *
 * **Sprint 3C scope is intentionally narrow:** this layer emits the
 * SCHEDULE_FIRED event only. Sprint 3D's executor will subscribe to
 * those events, look up the step in the WorkflowDef, and run the
 * step-specific handler (action.run, astra.execute, qes.sign, etc).
 *
 * Splitting Sprint 3C/3D this way keeps the heartbeat path simple and
 * lets the per-step handlers ship behind their own tests.
 *
 * **Resilience:** one failed schedule does NOT halt the tick. Each
 * schedule is processed in a try/catch so the cron continues for the
 * remaining due rows. SecurityEvent + structured log on each failure.
 *
 * **No transactional batching:** schedules are independent. Wrapping
 * the whole tick in a single transaction would (a) not give us
 * meaningful atomicity (we want partial progress) and (b) hold a
 * Serializable lock on the WorkflowSchedule table for too long.
 */

import "server-only";

import { logger } from "@/lib/logger";
import { appendWorkflowEvent } from "./events.server";
import {
  listDueSchedules,
  markScheduleFired,
  recordScheduleFailure,
  type DueSchedule,
} from "./scheduling.server";
import { WorkflowEventType } from "./types";

export interface HeartbeatTickResult {
  tickedAt: string;
  totalDue: number;
  fired: number;
  failed: number;
  retryQueued: number;
  durationMs: number;
  /** First N schedule ids for log sampling (full list omitted to keep logs small). */
  sample: Array<{
    scheduleId: string;
    workflowId: string;
    stepKey: string;
    outcome: "fired" | "retry" | "failed";
  }>;
}

/**
 * Run one heartbeat tick. The cron route invokes this; tests invoke it
 * directly with mocked Prisma. Pure-async — no setTimeout / setInterval.
 */
export async function runHeartbeatTick(
  options: { now?: Date; limit?: number } = {},
): Promise<HeartbeatTickResult> {
  const startedAt = Date.now();
  const tickedAt = new Date().toISOString();
  const due = await listDueSchedules({
    now: options.now,
    limit: options.limit,
  });

  const result: HeartbeatTickResult = {
    tickedAt,
    totalDue: due.length,
    fired: 0,
    failed: 0,
    retryQueued: 0,
    durationMs: 0,
    sample: [],
  };

  for (const schedule of due) {
    const outcome = await processSchedule(schedule);
    if (outcome === "fired") result.fired += 1;
    else if (outcome === "failed") result.failed += 1;
    else result.retryQueued += 1;

    if (result.sample.length < 10) {
      result.sample.push({
        scheduleId: schedule.id,
        workflowId: schedule.workflowId,
        stepKey: schedule.stepKey,
        outcome,
      });
    }
  }

  result.durationMs = Date.now() - startedAt;

  logger.info("[cowf-heartbeat] tick complete", {
    tickedAt,
    totalDue: result.totalDue,
    fired: result.fired,
    failed: result.failed,
    retryQueued: result.retryQueued,
    durationMs: result.durationMs,
  });

  return result;
}

// ─── Single-schedule processing ────────────────────────────────────────────

async function processSchedule(
  schedule: DueSchedule,
): Promise<"fired" | "retry" | "failed"> {
  try {
    // 1. Emit the SCHEDULE_FIRED event into the workflow's chain. This is
    //    the canonical "we noticed your schedule was due" record. Sprint 3D
    //    will subscribe to these events and execute the actual step.
    await appendWorkflowEvent({
      workflowId: schedule.workflowId,
      eventType: WorkflowEventType.SCHEDULE_FIRED,
      causedBy: "cron:cowf-heartbeat",
      payload: {
        scheduleId: schedule.id,
        stepKey: schedule.stepKey,
        scheduledFireAt: schedule.fireAt.toISOString(),
        attemptCount: schedule.attemptCount,
      },
    });

    // 2. Mark schedule FIRED. Idempotent via WHERE status='PENDING' —
    //    if a race makes us call this twice on the same schedule, only
    //    one wins; the other no-ops gracefully.
    const { fired } = await markScheduleFired(schedule.id);
    if (!fired) {
      // Already FIRED by another tick (rare under cron-at-most-once but
      // defensive). The event was emitted twice — Sprint 3D's executor
      // must dedup on (workflowId, scheduleId).
      logger.warn(
        "[cowf-heartbeat] schedule already fired (race) — event was emitted but markFired no-op",
        { scheduleId: schedule.id },
      );
    }
    return "fired";
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    logger.error("[cowf-heartbeat] schedule fire failed", {
      scheduleId: schedule.id,
      workflowId: schedule.workflowId,
      stepKey: schedule.stepKey,
      attemptCount: schedule.attemptCount,
      error: message,
    });
    const { status } = await recordScheduleFailure(schedule.id, message);
    return status === "FAILED" ? "failed" : "retry";
  }
}
