import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/verity/audit-chain/chain-verifier";
import type { AuditChainEntry } from "@/lib/verity/audit-chain/types";
import { auth } from "@/lib/auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

/**
 * POST /api/v1/verity/audit-chain/verify
 * Authenticated endpoint — requires a valid session.
 * Rate-limited to prevent abuse.
 * Body: { operatorId: string }
 * Fetches all audit chain entries for the given operatorId and runs a full
 * integrity verification, returning a ChainVerificationResult.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const ip = getIdentifier(request, session.user.id);
    const rl = await checkRateLimit("verity_public", ip);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).operatorId !== "string" ||
      !(body as Record<string, unknown>).operatorId
    ) {
      return NextResponse.json(
        { error: "Missing or invalid 'operatorId' in request body" },
        { status: 400 },
      );
    }

    const { operatorId } = body as { operatorId: string };

    const rows = await prisma.verityAuditChainEntry.findMany({
      where: { organizationId: operatorId },
      orderBy: { sequenceNumber: "asc" },
      select: {
        sequenceNumber: true,
        eventType: true,
        entityId: true,
        entityType: true,
        eventData: true,
        entryHash: true,
        previousHash: true,
        createdAt: true,
      },
    });

    const entries: AuditChainEntry[] = rows.map((row) => ({
      sequenceNumber: row.sequenceNumber,
      eventType: row.eventType as AuditChainEntry["eventType"],
      entityId: row.entityId,
      entityType: row.entityType,
      eventData: row.eventData as Record<string, unknown>,
      entryHash: row.entryHash,
      previousHash: row.previousHash,
      createdAt: row.createdAt.toISOString(),
    }));

    const result = verifyChain(entries);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[audit-chain/verify]", error);
    return NextResponse.json(
      { error: "Failed to verify audit chain" },
      { status: 500 },
    );
  }
}
