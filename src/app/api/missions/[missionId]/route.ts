/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET    /api/missions/[missionId]  — mission detail with assignments + phases
 * PATCH  /api/missions/[missionId]  — update mission fields
 * DELETE /api/missions/[missionId]  — soft-archive (status=CANCELLED, no hard delete)
 *
 * Org-scoped. Rate: "api" tier for reads, "sensitive" for archive.
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
import {
  MissionType,
  MissionProgramPhase,
  MissionStatus,
} from "@prisma/client";

import {
  archiveMission,
  getMissionDetail,
  updateMission,
} from "@/lib/comply-v2/missions.server";
import { logAuditEvent } from "@/lib/audit";

const UpdateMissionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  missionType: z.nativeEnum(MissionType).optional(),
  programPhase: z.nativeEnum(MissionProgramPhase).optional(),
  status: z.nativeEnum(MissionStatus).optional(),
  primaryEndUser: z.string().max(200).optional().nullable(),
  primaryEndUserCountryCode: z
    .string()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .optional()
    .nullable(),
  plannedStartAt: z.coerce.date().optional().nullable(),
  startedAt: z.coerce.date().optional().nullable(),
  endedAt: z.coerce.date().optional().nullable(),
  authorityRefs: z.array(z.string().max(200)).max(50).optional(),
});

export async function GET(
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
    const mission = await getMissionDetail(userId, missionId);
    if (!mission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ mission });
  } catch (err) {
    logger.error("GET /api/missions/[missionId] failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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

    // Capture before-state for the audit log diff.
    const before = await getMissionDetail(userId, missionId);
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateMissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const mission = await updateMission(userId, missionId, parsed.data);

    const isStatusChange =
      parsed.data.status !== undefined && before.status !== mission.status;
    const action = isStatusChange
      ? "mission_status_changed"
      : "mission_updated";

    await logAuditEvent({
      userId,
      action,
      entityType: "mission",
      entityId: mission.id,
      previousValue: pickAuditFields(before),
      newValue: pickAuditFields(mission),
      description: isStatusChange
        ? `Mission "${mission.name}" status: ${before.status} → ${mission.status}`
        : `Mission "${mission.name}" updated`,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ mission });
  } catch (err) {
    logger.error("PATCH /api/missions/[missionId] failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Mission not found")
      ? 404
      : message.includes("already exists")
        ? 409
        : message.includes("required") ||
            message.includes("too long") ||
            message.includes("cannot be empty")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ missionId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Archive is sensitive — uses the stricter rate-limit tier.
    const rl = await checkRateLimit("sensitive", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { missionId } = await context.params;
    const before = await getMissionDetail(userId, missionId);
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const mission = await archiveMission(userId, missionId);

    await logAuditEvent({
      userId,
      action: "mission_archived",
      entityType: "mission",
      entityId: mission.id,
      previousValue: pickAuditFields(before),
      newValue: pickAuditFields(mission),
      description: `Mission "${mission.name}" archived (status → CANCELLED)`,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ mission });
  } catch (err) {
    logger.error("DELETE /api/missions/[missionId] failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Mission not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Trim down the mission detail to fields worth persisting in the
 * audit-log diff. Excludes computed fields (counts, progress) since
 * those don't reflect a user-driven change.
 */
function pickAuditFields(m: {
  name: string;
  reference: string | null;
  missionType: string;
  programPhase: string;
  status: string;
  primaryEndUser: string | null;
  primaryEndUserCountryCode: string | null;
  plannedStartAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  authorityRefs: string[];
}) {
  return {
    name: m.name,
    reference: m.reference,
    missionType: m.missionType,
    programPhase: m.programPhase,
    status: m.status,
    primaryEndUser: m.primaryEndUser,
    primaryEndUserCountryCode: m.primaryEndUserCountryCode,
    plannedStartAt: m.plannedStartAt,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    authorityRefs: m.authorityRefs,
  };
}
