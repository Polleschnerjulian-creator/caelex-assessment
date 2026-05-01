import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import {
  runHeartbeatTick,
  type HeartbeatTickResult,
} from "@/lib/cowf/heartbeat.server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * COWF Heartbeat Cron — Sprint 3C
 *
 * Runs the heartbeat tick: polls WorkflowSchedule for due rows and emits
 * SCHEDULE_FIRED events into each workflow's chain. The actual step
 * execution lands in Sprint 3D (executor subscribes to SCHEDULE_FIRED
 * events and runs handlers).
 *
 * **Schedule cadence:** every 5 minutes (`*\/5 * * * *`). The COWF spec
 * envisages a 1-minute cron, but compliance workflows have day/week
 * deadlines so 5 minutes is a sensible production starting point. Vercel
 * Pro+ supports per-minute crons; we'll bump this once Sprint 3D's
 * executors are vetted under load.
 *
 * **Auth:** CRON_SECRET bearer header with timing-safe equality check.
 *
 * **Bounded execution:** runHeartbeatTick caps at MAX_DUE_PER_TICK (200)
 * schedules per call — keeps function-execution within the Vercel
 * Hobby/Pro budget.
 *
 * **Env-flag gate:** `COWF_HEARTBEAT_ENABLED=1` activates the tick
 * (default OFF in production until 3D's executor lands so we don't emit
 * SCHEDULE_FIRED events that nothing consumes). Toggle via Vercel env.
 */

interface CronResponseBody {
  success: boolean;
  enabled: boolean;
  result?: HeartbeatTickResult;
  message?: string;
}

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(`Bearer ${secret}`);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function heartbeatEnabled(): boolean {
  return process.env.COWF_HEARTBEAT_ENABLED === "1";
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = heartbeatEnabled();
  if (!enabled) {
    // Default-off in production. Cron still runs but no-ops.
    logger.info("[cowf-heartbeat] disabled by env flag (no-op tick)");
    const body: CronResponseBody = {
      success: true,
      enabled: false,
      message:
        "COWF heartbeat is disabled — set COWF_HEARTBEAT_ENABLED=1 to activate.",
    };
    return NextResponse.json(body);
  }

  try {
    const result = await runHeartbeatTick();
    const body: CronResponseBody = {
      success: true,
      enabled: true,
      result,
    };
    return NextResponse.json(body);
  } catch (err) {
    logger.error("[cowf-heartbeat] tick failed", err);
    return NextResponse.json(
      {
        success: false,
        enabled: true,
        message: (err as Error).message ?? "internal",
      },
      { status: 500 },
    );
  }
}
