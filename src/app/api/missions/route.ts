/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/missions  — list missions for the caller's primary org
 * POST /api/missions  — create a new mission
 *
 * Auth: session required, org-scoped via missions.server.ts.
 * Rate: "api" tier (100 req/min).
 *
 * Sprint Mission-2 — first-class Mission entity. Replaces the old
 * Spacecraft=Mission collapse. Each mission groups N spacecraft
 * (constellations, sequential customers, single-asset) and tracks
 * its own lifecycle independently of the hardware.
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
  createMission,
  getMissionsForUser,
} from "@/lib/comply-v2/missions.server";
import { logAuditEvent } from "@/lib/audit";

const CreateMissionSchema = z.object({
  name: z.string().min(1).max(200),
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

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const missions = await getMissionsForUser(userId);
    return NextResponse.json({ missions });
  } catch (err) {
    logger.error("GET /api/missions failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json();
    const parsed = CreateMissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const mission = await createMission(userId, parsed.data);

    await logAuditEvent({
      userId,
      action: "mission_created",
      entityType: "mission",
      entityId: mission.id,
      newValue: {
        name: mission.name,
        reference: mission.reference,
        missionType: mission.missionType,
        programPhase: mission.programPhase,
        status: mission.status,
      },
      description: `Mission "${mission.name}" created`,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ mission }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/missions failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    // Reference-collision is a 409, validation handled above is 400, rest 500.
    const status = message.includes("already exists")
      ? 409
      : message.includes("required") || message.includes("too long")
        ? 400
        : message.includes("primary organization")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
