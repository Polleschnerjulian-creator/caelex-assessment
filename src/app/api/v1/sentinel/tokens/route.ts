import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSentinelToken } from "@/lib/services/sentinel-service.server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * POST /api/v1/sentinel/tokens
 * Generate a new Sentinel agent token.
 * Auth: Session-based, OWNER or ADMIN only.
 *
 * Returns the raw token ONCE — it is never stored or retrievable again.
 * The agent uses this token as Bearer auth when calling /register.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "sensitive",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions — OWNER or ADMIN required" },
        { status: 403 },
      );
    }

    const { raw } = generateSentinelToken();

    logger.info("[sentinel/tokens] Token generated", {
      userId: session.user.id,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({
      token: raw,
      organization_id: membership.organizationId,
      message:
        "Save this token now — it will not be shown again. Use it as SENTINEL_TOKEN in your agent configuration.",
    });
  } catch (err) {
    logger.error("[sentinel/tokens] Generation failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
