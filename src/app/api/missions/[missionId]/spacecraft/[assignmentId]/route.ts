/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DELETE /api/missions/[missionId]/spacecraft/[assignmentId]  — detach (set endedAt=now)
 *
 * Soft-detach via setting MissionSpacecraft.endedAt to now. Preserves
 * the historical record of who served the mission and when.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";

import {
  detachSpacecraft,
  getMissionDetail,
} from "@/lib/comply-v2/missions.server";
import { logAuditEvent } from "@/lib/audit";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ missionId: string; assignmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { missionId, assignmentId } = await context.params;

    // Capture the before-state so the audit log knows which s/c was
    // detached (the detail after detach moves it to pastSpacecraft).
    const before = await getMissionDetail(userId, missionId);
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const beforeAssignment = before.assignedSpacecraft.find(
      (a) => a.assignmentId === assignmentId,
    );

    const mission = await detachSpacecraft(userId, missionId, assignmentId);

    await logAuditEvent({
      userId,
      action: "mission_spacecraft_detached",
      entityType: "mission_spacecraft",
      entityId: assignmentId,
      previousValue: beforeAssignment
        ? {
            spacecraftId: beforeAssignment.spacecraftId,
            spacecraftName: beforeAssignment.spacecraftName,
            role: beforeAssignment.role,
            startedAt: beforeAssignment.startedAt,
          }
        : { assignmentId },
      description: `${beforeAssignment?.spacecraftName ?? "Spacecraft"} detached from mission "${mission.name}"`,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ mission });
  } catch (err) {
    logger.error(
      "DELETE /api/missions/[missionId]/spacecraft/[assignmentId] failed",
      err,
    );
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Assignment not found")
      ? 404
      : message.includes("already ended")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
