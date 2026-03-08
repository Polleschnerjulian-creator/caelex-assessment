import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEntityComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { toPublicState } from "@/lib/ephemeris/core/types";
import type { OperatorEntityInput } from "@/lib/ephemeris/core/types";

/**
 * POST /api/v1/ephemeris/launch/state
 * Calculate compliance state for a launch vehicle entity.
 *
 * Input: { entityId: string }
 * Auth: Session-based + org membership + entity ownership
 * Response: SatelliteComplianceState (entity-agnostic structure)
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

    const body = (await request.json()) as { entityId?: string };
    if (!body.entityId) {
      return NextResponse.json(
        { error: "entityId is required" },
        { status: 400 },
      );
    }

    const orgId = membership.organizationId;

    // Look up the OperatorEntity
    const db = prisma as unknown as {
      operatorEntity: {
        findFirst: (args: Record<string, unknown>) => Promise<{
          id: string;
          organizationId: string;
          operatorType: string;
          name: string;
          identifiers: Record<string, unknown>;
          metadata: Record<string, unknown>;
          jurisdictions: string[];
          status: string;
        } | null>;
      };
    };

    const entity = await db.operatorEntity.findFirst({
      where: {
        id: body.entityId,
        organizationId: orgId,
        operatorType: "LO",
      },
    });

    if (!entity) {
      return NextResponse.json(
        { error: "Launch vehicle entity not found in your organization" },
        { status: 404 },
      );
    }

    const entityInput: OperatorEntityInput = {
      id: entity.id,
      organizationId: entity.organizationId,
      operatorType: entity.operatorType,
      name: entity.name,
      identifiers:
        entity.identifiers as unknown as OperatorEntityInput["identifiers"],
      metadata: entity.metadata,
      jurisdictions: entity.jurisdictions,
      status: entity.status as OperatorEntityInput["status"],
    };

    const internalState = await calculateEntityComplianceState(
      entityInput,
      prisma,
    );
    const publicState = toPublicState(internalState);

    return NextResponse.json({ data: publicState });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
