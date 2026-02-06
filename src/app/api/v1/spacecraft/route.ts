/**
 * Public API - Spacecraft
 * GET - List spacecraft for organization
 *
 * Requires: read:spacecraft scope
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";

async function handler(request: NextRequest, context: ApiContext) {
  try {
    const { organizationId } = context;
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "20"),
      100,
    );

    // Filters
    const status = searchParams.get("status") as
      | "PRE_LAUNCH"
      | "LAUNCHED"
      | "OPERATIONAL"
      | "DECOMMISSIONING"
      | "DEORBITED"
      | "LOST"
      | null;
    const orbitType = searchParams.get("orbitType");

    const where: {
      organizationId: string;
      status?:
        | "PRE_LAUNCH"
        | "LAUNCHED"
        | "OPERATIONAL"
        | "DECOMMISSIONING"
        | "DEORBITED"
        | "LOST";
      orbitType?: string;
    } = {
      organizationId,
    };

    if (status) where.status = status;
    if (orbitType) where.orbitType = orbitType;

    const [spacecraft, total] = await Promise.all([
      prisma.spacecraft.findMany({
        where,
        select: {
          id: true,
          name: true,
          cosparId: true,
          noradId: true,
          missionType: true,
          orbitType: true,
          altitudeKm: true,
          inclinationDeg: true,
          status: true,
          launchDate: true,
          endOfLifeDate: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.spacecraft.count({ where }),
    ]);

    return apiSuccess(
      {
        spacecraft,
      },
      200,
      {
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    );
  } catch (error) {
    console.error("Error fetching spacecraft:", error);
    return apiError("Failed to fetch spacecraft", 500);
  }
}

export const GET = withApiAuth(handler, {
  requiredScopes: ["read:spacecraft"],
});
