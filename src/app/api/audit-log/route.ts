/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/audit-log  — org-scoped chronological audit log
 *
 * Query params:
 *   limit       (1-100, default 50)
 *   offset      (default 0)
 *   action      (exact-match audit verb)
 *   entityType  (exact-match)
 *   actor       (userId — exact-match)
 *   from        (ISO date)
 *   to          (ISO date)
 *   q           (free text — searches description + entityId)
 *
 * Auth: session required, primary-org resolved server-side. Any
 * member of the org with the implicit "audit:read" permission can
 * view (every member, regulators expect transparency by default).
 *
 * Sprint E2 — closes the gap between the existing audit-chain
 * visualizer (block-style hash chain) and the operational filterable
 * list view that auditors actually use day-to-day.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getOrganizationAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(request, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    // Resolve primary org
    const member = await prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      select: { organizationId: true },
    });
    if (!member) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(100, Math.max(1, limitRaw));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
    const action = searchParams.get("action") ?? undefined;
    const entityType = searchParams.get("entityType") ?? undefined;
    const actor = searchParams.get("actor") ?? undefined;
    const fromRaw = searchParams.get("from");
    const toRaw = searchParams.get("to");
    const startDate = fromRaw ? new Date(fromRaw) : undefined;
    const endDate = toRaw ? new Date(toRaw) : undefined;
    const query = searchParams.get("q") ?? undefined;

    const result = await getOrganizationAuditLog(member.organizationId, {
      limit,
      offset,
      action,
      entityType,
      actorUserId: actor,
      startDate,
      endDate,
      query,
    });

    return NextResponse.json({
      logs: result.logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        description: l.description,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        timestamp: l.timestamp.toISOString(),
        entryHash: l.entryHash,
        previousHash: l.previousHash,
        actor: {
          userId: l.user?.id ?? null,
          name: l.user?.name ?? null,
          email: l.user?.email ?? null,
        },
      })),
      total: result.total,
      distinctActors: result.distinctActors,
      limit,
      offset,
    });
  } catch (err) {
    logger.error("GET /api/audit-log failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
