/**
 * Network Activity Feed API
 * GET - Aggregated activity feed for network entities
 * Filters activities by entity types: stakeholder_engagement, data_room, compliance_attestation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { getActivities } from "@/lib/services/activity-service";
import { parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";

const NETWORK_ENTITY_TYPES = [
  "stakeholder_engagement",
  "data_room",
  "compliance_attestation",
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const entityType = searchParams.get("entityType");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parsePaginationLimit(searchParams.get("limit"));

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If a specific entity type is requested, validate it
    let filterEntityType: string | undefined;
    if (entityType) {
      if (!NETWORK_ENTITY_TYPES.includes(entityType)) {
        return NextResponse.json(
          {
            error: `Invalid entityType. Must be one of: ${NETWORK_ENTITY_TYPES.join(", ")}`,
          },
          { status: 400 },
        );
      }
      filterEntityType = entityType;
    }

    // If no specific entity type, we need to query for all network entity types
    // The getActivities function supports a single entityType filter,
    // so we either filter by one or fetch all and filter in the query
    if (filterEntityType) {
      const result = await getActivities(
        organizationId,
        { entityType: filterEntityType },
        { page, limit },
      );

      return NextResponse.json(result);
    }

    // For aggregated feed across all network entity types,
    // query with each type using Prisma directly for combined results
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      entityType: { in: NETWORK_ENTITY_TYPES },
    };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    return NextResponse.json({
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("Failed to fetch network activity", error);
    return NextResponse.json(
      { error: "Failed to fetch network activity" },
      { status: 500 },
    );
  }
}
