import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateToken } from "@/lib/services/stakeholder-engagement";
import { logger } from "@/lib/logger";

// GET /api/stakeholder/profile — Return stakeholder engagement details
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      (process.env.NODE_ENV === "development"
        ? url.searchParams.get("token")
        : null);

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const xff = request.headers.get("x-forwarded-for");
    const ipAddress = xff
      ? xff.split(",").pop()?.trim() || "unknown"
      : request.headers.get("x-real-ip") || "unknown";

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    return NextResponse.json({
      engagement: {
        id: engagement.id,
        type: engagement.type,
        companyName: engagement.companyName,
        contactName: engagement.contactName,
        contactEmail: engagement.contactEmail,
        contactPhone: engagement.contactPhone,
        jurisdiction: engagement.jurisdiction,
        licenseNumber: engagement.licenseNumber,
        website: engagement.website,
        scope: engagement.scope,
        status: engagement.status,
        contractRef: engagement.contractRef,
        retainerStart: engagement.retainerStart,
        retainerEnd: engagement.retainerEnd,
        tokenExpiresAt: engagement.tokenExpiresAt,
        lastAccessAt: engagement.lastAccessAt,
        accessCount: engagement.accessCount,
        createdAt: engagement.createdAt,
      },
      organization: engagement.organization,
    });
  } catch (error) {
    logger.error("Stakeholder profile error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
