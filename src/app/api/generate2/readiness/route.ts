/**
 * Generate 2.0 — Readiness API
 *
 * GET /api/generate2/readiness
 *
 * Returns readiness scores for all 16 NCA document types.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { collectGenerate2Data } from "@/lib/generate/data-collector";
import { computeAllReadiness } from "@/lib/generate/readiness";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // H-1: Rate limiting
    const rateLimitResult = await checkRateLimit(
      "generate2",
      `generate2:${userId}`,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: { select: { id: true, isActive: true } },
      },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const dataBundle = await collectGenerate2Data(
      userId,
      membership.organization.id,
    );

    const readiness = computeAllReadiness(dataBundle);

    return NextResponse.json({ readiness });
  } catch (error) {
    logger.error("Readiness check error", error);
    return NextResponse.json(
      { error: "Failed to compute readiness" },
      { status: 500 },
    );
  }
}
