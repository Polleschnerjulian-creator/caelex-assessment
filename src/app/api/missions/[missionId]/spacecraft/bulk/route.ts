/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/missions/[missionId]/spacecraft/bulk  — assign N spacecraft at once
 *
 * Body: {
 *   spacecraftIds: string[]   (1..100)
 *   role?: string             default "primary"
 *   startedAt?: ISO-8601 date
 *   startingSlot?: number     auto-increments per s/c
 *   notes?: string
 * }
 *
 * Sprint Mission-4 — constellation UX. Replaces the N-round-trip
 * pattern with one transactional create. Idempotent: spacecraft
 * already actively assigned to this mission are skipped, not
 * rejected.
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

import { bulkAssignSpacecraft } from "@/lib/comply-v2/missions.server";
import { logAuditEvent } from "@/lib/audit";

const BulkAssignSchema = z.object({
  spacecraftIds: z.array(z.string().cuid()).min(1).max(100),
  role: z.string().min(1).max(50).optional(),
  startedAt: z.coerce.date().optional(),
  startingSlot: z.number().int().min(1).max(10000).optional().nullable(),
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
    const parsed = BulkAssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await bulkAssignSpacecraft(userId, missionId, parsed.data);

    await logAuditEvent({
      userId,
      action: "mission_spacecraft_assigned",
      entityType: "mission_spacecraft",
      entityId: missionId,
      newValue: {
        bulk: true,
        missionId,
        spacecraftIds: parsed.data.spacecraftIds,
        assigned: result.assigned,
        skipped: result.skipped,
        skippedIds: result.skippedIds,
        role: parsed.data.role ?? "primary",
        startingSlot: parsed.data.startingSlot ?? null,
      },
      description: `Bulk assigned ${result.assigned} spacecraft to mission "${result.mission.name}"${result.skipped > 0 ? ` (${result.skipped} already assigned, skipped)` : ""}`,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(
      {
        mission: result.mission,
        assigned: result.assigned,
        skipped: result.skipped,
        skippedIds: result.skippedIds,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("POST /api/missions/[missionId]/spacecraft/bulk failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    const status =
      message.includes("Mission not found") ||
      message.includes("Spacecraft not found")
        ? 404
        : message.includes("at least one") || message.includes("more than 100")
          ? 400
          : message.includes("primary organization")
            ? 403
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
