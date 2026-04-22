import { NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/atlas/settings/context
 *
 * Returns everything the Atlas settings banner needs in one shot — the
 * signed-in user, their org binding, their role, and the org's plan /
 * license state. Populated from the scoped Atlas auth + a single read
 * of the Organization row, so the banner never needs multiple requests.
 */

export const runtime = "nodejs";

export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pull only the plan-related fields so we don't over-serialise the
    // full Organization row (billing address etc. are private).
    const org = await prisma.organization.findUnique({
      where: { id: atlas.organizationId },
      select: {
        plan: true,
        planExpiresAt: true,
        maxUsers: true,
        maxSpacecraft: true,
        isActive: true,
      },
    });

    // Current member count — used by the banner to render "3 / 5 seats"
    // context without a second round-trip.
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: atlas.organizationId },
    });

    return NextResponse.json({
      user: {
        id: atlas.userId,
        name: atlas.userName,
        email: atlas.userEmail,
      },
      organization: {
        id: atlas.organizationId,
        name: atlas.organizationName,
        slug: atlas.organizationSlug,
        logoUrl: atlas.organizationLogo,
        isActive: org?.isActive ?? true,
      },
      role: atlas.role,
      isPlatformAdmin: atlas.isPlatformAdmin,
      plan: {
        tier: org?.plan ?? "FREE",
        expiresAt: org?.planExpiresAt ?? null,
        maxUsers: org?.maxUsers ?? 0,
        maxSpacecraft: org?.maxSpacecraft ?? 0,
        memberCount,
      },
    });
  } catch (err) {
    logger.error("atlas context fetch failed", {
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
