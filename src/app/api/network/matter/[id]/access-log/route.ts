/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/network/matter/:id/access-log
 *
 * Returns the tamper-evident audit trail for a matter, paginated.
 * Both parties can read — the operator for oversight, the firm for
 * self-audit. Verifies the hash chain on read (fails if broken).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { computeAccessLogEntryHash } from "@/lib/legal-network/handshake";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "legal_matter_audit_read",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      since: url.searchParams.get("since") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }

    const matter = await prisma.legalMatter.findUnique({
      where: { id },
      select: {
        id: true,
        lawFirmOrgId: true,
        clientOrgId: true,
        handshakeHash: true,
      },
    });
    if (!matter) {
      return NextResponse.json({ error: "Matter not found" }, { status: 404 });
    }
    if (
      matter.lawFirmOrgId !== membership.organizationId &&
      matter.clientOrgId !== membership.organizationId
    ) {
      return NextResponse.json({ error: "Not a party" }, { status: 403 });
    }

    const entries = await prisma.legalMatterAccessLog.findMany({
      where: {
        matterId: id,
        ...(parsed.data.since
          ? { createdAt: { gte: new Date(parsed.data.since) } }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: parsed.data.limit,
    });

    // Verify the chain end-to-end. First entry's previousHash must
    // match the matter's handshakeHash; each subsequent entry chains
    // off the previous.
    let expectedPrev = matter.handshakeHash;
    let chainValid = true;
    const verified: Array<{ id: string; valid: boolean; reason?: string }> = [];
    for (const entry of entries) {
      if (entry.previousHash !== expectedPrev) {
        chainValid = false;
        verified.push({
          id: entry.id,
          valid: false,
          reason: "previousHash does not match expected chain head",
        });
      } else {
        const recomputed = computeAccessLogEntryHash({
          previousHash: entry.previousHash ?? "",
          matterId: entry.matterId,
          actorUserId: entry.actorUserId,
          actorOrgId: entry.actorOrgId,
          actorSide: entry.actorSide,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          matterScope: entry.matterScope,
          context: entry.context ?? null,
          createdAt: entry.createdAt,
        });
        if (recomputed !== entry.entryHash) {
          chainValid = false;
          verified.push({
            id: entry.id,
            valid: false,
            reason: "entry hash does not match recomputed value",
          });
        } else {
          verified.push({ id: entry.id, valid: true });
        }
      }
      expectedPrev = entry.entryHash;
    }

    return NextResponse.json({
      entries,
      chainValid,
      verifications: verified,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Access-log read failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load access log" },
      { status: 500 },
    );
  }
}
