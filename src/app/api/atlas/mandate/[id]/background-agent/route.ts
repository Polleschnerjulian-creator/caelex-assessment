/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint D3 — Background-Agent Settings API.
 * ────────────────────────────────────────────────────────────────────
 *   GET  /api/atlas/mandate/[id]/background-agent → current settings
 *   PUT  /api/atlas/mandate/[id]/background-agent → update settings
 *
 * Membership-gated to mandate owner OR member. PUT is the only
 * mutating endpoint for the background-agent feature in v1.
 *
 * Body for PUT:
 *   { enabled: boolean,
 *     schedule?: "daily" | "weekly" | "every-6h" | "every-12h" | null,
 *     goal?: string | null }
 *
 * When enabled flips false→true, `nextRunAt` is computed immediately
 * so the next cron tick picks it up. When schedule changes,
 * `nextRunAt` is recomputed from now.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  computeNextRunAt,
  type BackgroundSchedule,
} from "@/lib/atlas/agent/background-runner.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PutBody = z.object({
  enabled: z.boolean(),
  schedule: z
    .enum(["daily", "weekly", "every-6h", "every-12h"])
    .nullable()
    .optional(),
  goal: z.string().min(10).max(4000).nullable().optional(),
});

async function loadMandateForCaller(
  mandateId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      ownerUserId: true,
      members: { where: { userId }, select: { role: true } },
      backgroundAgentEnabled: true,
      backgroundAgentSchedule: true,
      backgroundAgentGoal: true,
      backgroundAgentLastRunAt: true,
      backgroundAgentNextRunAt: true,
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await ctx.params;
  const mandate = await loadMandateForCaller(
    id,
    atlas.userId,
    atlas.organizationId,
  );
  if (!mandate) {
    return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
  }
  return NextResponse.json({
    enabled: mandate.backgroundAgentEnabled,
    schedule: mandate.backgroundAgentSchedule,
    goal: mandate.backgroundAgentGoal,
    lastRunAt: mandate.backgroundAgentLastRunAt,
    nextRunAt: mandate.backgroundAgentNextRunAt,
  });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PutBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const mandate = await loadMandateForCaller(
    id,
    atlas.userId,
    atlas.organizationId,
  );
  if (!mandate) {
    return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
  }

  /* M5: configuring the background agent (autonomous, billable, injects
     its goal into Claude + can chain tool calls) is owner/reviewer-only —
     a collaborator/viewer must not silently arm firm automation. Mirrors
     the sensitive-field policy in mandate/[id] PATCH (SEC-H7). */
  const isOwner = mandate.ownerUserId === atlas.userId;
  const callerRole = mandate.members[0]?.role ?? null;
  if (!isOwner && callerRole !== "reviewer") {
    return NextResponse.json(
      { error: "Forbidden — owner or reviewer role required" },
      { status: 403 },
    );
  }

  /* Validate combined state: if enabling, schedule + goal both
     required. If disabling, no further fields required. */
  if (parsed.data.enabled) {
    const newSchedule = parsed.data.schedule ?? mandate.backgroundAgentSchedule;
    const newGoal = parsed.data.goal ?? mandate.backgroundAgentGoal;
    if (!newSchedule || !newGoal) {
      return NextResponse.json(
        {
          error:
            "Schedule and goal are both required when enabling background agent",
        },
        { status: 400 },
      );
    }
  }

  /* Recompute nextRunAt when schedule changes OR when enabling fresh.
     Disabling leaves nextRunAt as-is so re-enabling preserves the
     prior cadence. */
  let newNextRunAt: Date | null | undefined = undefined;
  const scheduleChanged =
    parsed.data.schedule !== undefined &&
    parsed.data.schedule !== mandate.backgroundAgentSchedule;
  const enabledFresh = parsed.data.enabled && !mandate.backgroundAgentEnabled;
  if (parsed.data.enabled && (scheduleChanged || enabledFresh)) {
    const effectiveSchedule = (parsed.data.schedule ??
      mandate.backgroundAgentSchedule) as BackgroundSchedule;
    newNextRunAt = computeNextRunAt(effectiveSchedule);
  }

  try {
    const updated = await prisma.atlasMandate.update({
      where: { id },
      data: {
        backgroundAgentEnabled: parsed.data.enabled,
        ...(parsed.data.schedule !== undefined
          ? { backgroundAgentSchedule: parsed.data.schedule }
          : {}),
        ...(parsed.data.goal !== undefined
          ? { backgroundAgentGoal: parsed.data.goal }
          : {}),
        ...(newNextRunAt !== undefined
          ? { backgroundAgentNextRunAt: newNextRunAt }
          : {}),
      },
      select: {
        backgroundAgentEnabled: true,
        backgroundAgentSchedule: true,
        backgroundAgentGoal: true,
        backgroundAgentLastRunAt: true,
        backgroundAgentNextRunAt: true,
      },
    });
    logger.info("[atlas/mandate/background-agent] updated", {
      userId: atlas.userId,
      mandateId: id,
      enabled: updated.backgroundAgentEnabled,
      schedule: updated.backgroundAgentSchedule,
    });
    return NextResponse.json({
      enabled: updated.backgroundAgentEnabled,
      schedule: updated.backgroundAgentSchedule,
      goal: updated.backgroundAgentGoal,
      lastRunAt: updated.backgroundAgentLastRunAt,
      nextRunAt: updated.backgroundAgentNextRunAt,
    });
  } catch (err) {
    logger.error("[atlas/mandate/background-agent] update failed", {
      userId: atlas.userId,
      mandateId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: getSafeErrorMessage(err, "Update failed") },
      { status: 500 },
    );
  }
}
