/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/missions/[missionId]/spacecraft  — assign a spacecraft to a mission
 *
 * Body: { spacecraftId, role?, startedAt?, constellationSlot?, notes? }
 *
 * Spacecraft must belong to the same organization as the mission.
 * Duplicate active assignments (same s/c, mission, no endedAt) are
 * rejected with 409. Use POST + DELETE to "move" a spacecraft.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";

import { assignSpacecraft } from "@/lib/comply-v2/missions.server";
import { logAuditEvent } from "@/lib/audit";

const AssignSpacecraftSchema = z.object({
  spacecraftId: z.string().cuid(),
  role: z.string().min(1).max(50).optional(),
  startedAt: z.coerce.date().optional(),
  constellationSlot: z.number().int().min(1).max(10000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ missionId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { missionId } = await context.params;

    const body = await req.json();
    const parsed = AssignSpacecraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const mission = await assignSpacecraft(userId, missionId, parsed.data);

    // The detail response includes assignedSpacecraft — find the
    // freshly created assignment for the audit-log entityId.
    const newAssignment = mission.assignedSpacecraft.find(
      (a) => a.spacecraftId === parsed.data.spacecraftId,
    );

    await logAuditEvent({
      userId,
      action: "mission_spacecraft_assigned",
      entityType: "mission_spacecraft",
      entityId: newAssignment?.assignmentId ?? mission.id,
      newValue: {
        missionId,
        spacecraftId: parsed.data.spacecraftId,
        role: newAssignment?.role ?? "primary",
        constellationSlot: newAssignment?.constellationSlot ?? null,
      },
      description: `${newAssignment?.spacecraftName ?? "Spacecraft"} assigned to mission "${mission.name}" (role: ${newAssignment?.role ?? "primary"})`,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ mission }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/missions/[missionId]/spacecraft failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("not found")
      ? 404
      : message.includes("already assigned")
        ? 409
        : message.includes("primary organization")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
