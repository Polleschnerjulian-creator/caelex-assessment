/**
 * Authenticated single-snapshot read.
 *
 * GET /api/organization/profile/snapshot/:snapshotId
 *
 * Returns the full signed snapshot record for a member of the owning
 * organization. 404s for both "doesn't exist" and "belongs to another
 * org" to avoid tenant-existence leaks.
 *
 * The public verification path is elsewhere:
 *   GET /api/v1/verity/profile-snapshot/:snapshotId
 * which has no auth gate and includes signature verification inline.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getProfileSnapshot } from "@/lib/services/profile-snapshot-service";

async function getSessionAndOrg() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "desc" },
    include: {
      organization: { select: { id: true, isActive: true } },
    },
  });
  if (!membership?.organization?.isActive) {
    return {
      error: NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      ),
    };
  }
  return {
    userId: session.user.id,
    organizationId: membership.organization.id,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  try {
    const rl = await checkRateLimit("api", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const session = await getSessionAndOrg();
    if ("error" in session) return session.error;

    const { snapshotId } = await params;
    if (!snapshotId || typeof snapshotId !== "string") {
      return NextResponse.json(
        { error: "Invalid snapshot id" },
        { status: 400 },
      );
    }

    const row = await getProfileSnapshot(snapshotId, session.organizationId);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      snapshotHash: row.snapshotHash,
      issuerKeyId: row.issuerKeyId,
      signature: row.signature,
      frozenAt: row.frozenAt.toISOString(),
      frozenBy: row.frozenBy,
      purpose: row.purpose,
      canonicalJson: row.canonicalJson,
    });
  } catch (err) {
    logger.error("Error fetching profile snapshot", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
