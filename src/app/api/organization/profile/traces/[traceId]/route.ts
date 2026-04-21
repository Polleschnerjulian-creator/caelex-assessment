/**
 * Single-trace detail + upstream chain.
 *
 * GET /api/organization/profile/traces/:traceId
 *
 *   → { trace: {...}, upstream: [...] }
 *
 * Powers the <SidePeek /> popover. Enforces org-scope: a trace can only
 * be read by a member of the organization that owns it, never by
 * another tenant.
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
import {
  getUpstreamChain,
  readTraceValue,
  type DerivationTrace,
} from "@/lib/services/derivation-trace-service";

// ─── Helpers ───

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

/**
 * Shape a DerivationTrace row for the wire — deserialise value, convert
 * Date → ISO, narrow to what the client actually needs. Keeps org id out
 * of the response; the client already knows its own org.
 */
function shapeTraceForWire(t: DerivationTrace) {
  return {
    id: t.id,
    entityType: t.entityType,
    entityId: t.entityId,
    fieldName: t.fieldName,
    value: readTraceValue(t.value),
    origin: t.origin,
    sourceRef: t.sourceRef,
    confidence: t.confidence,
    modelVersion: t.modelVersion,
    derivedAt: t.derivedAt.toISOString(),
    expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
    upstreamTraceIds: t.upstreamTraceIds,
  };
}

// ─── GET ───

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> },
) {
  try {
    const rateLimit = await checkRateLimit("api", getIdentifier(request));
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    const result = await getSessionAndOrg();
    if ("error" in result) return result.error;

    const { traceId } = await params;
    if (!traceId || typeof traceId !== "string") {
      return NextResponse.json({ error: "Invalid trace id" }, { status: 400 });
    }

    // Org-scope the lookup: a user can only read traces that belong to
    // their own organization. Single query with both id + org gate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (await (prisma as any).derivationTrace.findFirst({
      where: { id: traceId, organizationId: result.organizationId },
    })) as DerivationTrace | null;

    if (!row) {
      // Return 404 for both "doesn't exist" and "exists but not yours" to
      // avoid leaking the existence of other tenants' traces.
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    // Upstream chain includes the trace itself at index 0 — consumer can
    // skip it or show it as the "current" anchor.
    const chain = await getUpstreamChain(traceId, 10);

    // Defensive org-scope: even though the chain-walk uses only the
    // upstreamTraceIds array (which is user-controlled metadata), filter
    // anything that doesn't belong to this org. Belt + suspenders.
    const orgScopedChain = chain.filter(
      (t) => t.organizationId === result.organizationId,
    );

    return NextResponse.json({
      trace: shapeTraceForWire(row),
      upstream: orgScopedChain.map(shapeTraceForWire),
    });
  } catch (err) {
    logger.error("Error fetching derivation trace", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
