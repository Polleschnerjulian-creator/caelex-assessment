import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  validateToken,
  logStakeholderAccess,
} from "@/lib/services/stakeholder-engagement";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

// POST /api/stakeholder/auth — Validate token and return engagement + org info
export async function POST(request: NextRequest) {
  try {
    // Rate limit: auth tier for token validation (strict: 5/min)
    const rl = await checkRateLimit("auth", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const schema = z.object({
      token: z.string().min(1),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { token } = parsed.data;

    const xff = request.headers.get("x-forwarded-for");
    const ipAddress = xff
      ? xff.split(",").pop()?.trim() || "unknown"
      : request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json(
        {
          error: result.error,
          expired: "expired" in result && result.expired === true,
          revoked: "revoked" in result && result.revoked === true,
        },
        { status: 403 },
      );
    }

    const engagement = result.engagement;

    // Log portal login access
    await logStakeholderAccess(engagement.id, "portal_login", {
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      valid: true,
      engagement: {
        id: engagement.id,
        type: engagement.type,
        companyName: engagement.companyName,
        contactName: engagement.contactName,
        contactEmail: engagement.contactEmail,
        scope: engagement.scope,
        status: engagement.status,
        contractRef: engagement.contractRef,
        retainerStart: engagement.retainerStart,
        retainerEnd: engagement.retainerEnd,
        tokenExpiresAt: engagement.tokenExpiresAt,
        mfaRequired: engagement.mfaRequired,
      },
      organization: engagement.organization,
    });
  } catch (error) {
    logger.error("Stakeholder auth error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
