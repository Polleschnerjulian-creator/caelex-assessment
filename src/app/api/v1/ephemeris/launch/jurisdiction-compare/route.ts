import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { simulateLaunchJurisdictionChange } from "@/lib/ephemeris/simulation/jurisdiction-simulator";

/**
 * POST /api/v1/ephemeris/launch/jurisdiction-compare
 * Compare launch jurisdictions for a launch vehicle entity.
 *
 * Input: { entityId: string, jurisdictionA: string, jurisdictionB: string }
 * Auth: Session-based + org membership
 * Response: LaunchJurisdictionSimulation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = (await request.json()) as {
      entityId?: string;
      jurisdictionA?: string;
      jurisdictionB?: string;
    };

    if (!body.entityId || !body.jurisdictionA || !body.jurisdictionB) {
      return NextResponse.json(
        {
          error: "entityId, jurisdictionA, and jurisdictionB are required",
        },
        { status: 400 },
      );
    }

    const orgId = membership.organizationId;

    // Look up entity
    const db = prisma as unknown as {
      operatorEntity: {
        findFirst: (args: Record<string, unknown>) => Promise<{
          id: string;
          name: string;
          identifiers: Record<string, unknown>;
        } | null>;
      };
    };

    const entity = await db.operatorEntity.findFirst({
      where: {
        id: body.entityId,
        organizationId: orgId,
      },
    });

    if (!entity) {
      return NextResponse.json(
        { error: "Entity not found in your organization" },
        { status: 404 },
      );
    }

    const vehicleId =
      (entity.identifiers as Record<string, string>).vehicleId ?? entity.id;

    const result = simulateLaunchJurisdictionChange(
      body.jurisdictionA,
      body.jurisdictionB,
      { vehicleId, name: entity.name },
      70, // Default baseline score for comparison
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
