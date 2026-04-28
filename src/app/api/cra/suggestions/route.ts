/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CRA Assessment Suggestions API
 *
 * GET /api/cra/suggestions — Suggest CRA assessments based on registered spacecraft
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSpaceProductById } from "@/data/cra-taxonomy";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

// Mapping: spacecraft mission type → likely CRA product types needed
const MISSION_TYPE_COMPONENTS: Record<string, string[]> = {
  communication: [
    "obc",
    "aocs_flight_sw",
    "ttc_ground_system",
    "sdr",
    "mission_control_sw",
    "ground_station_sw",
  ],
  earth_observation: [
    "obc",
    "aocs_flight_sw",
    "ttc_ground_system",
    "payload_processor",
    "ground_station_sw",
    "data_handling_unit",
  ],
  navigation: [
    "obc",
    "aocs_flight_sw",
    "ttc_ground_system",
    "gnss_receiver",
    "ground_station_sw",
  ],
  scientific: [
    "obc",
    "aocs_flight_sw",
    "ttc_ground_system",
    "payload_processor",
    "data_handling_unit",
  ],
  technology_demonstration: [
    "obc",
    "flight_software",
    "ground_monitoring_tool",
  ],
  default: ["obc", "aocs_flight_sw", "ttc_ground_system", "ground_station_sw"],
};

// GET /api/cra/suggestions
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;

    // Resolve organization context
    const orgContext = await getCurrentOrganization(userId);
    const organizationId = orgContext?.organizationId;

    if (!organizationId) {
      return createSuccessResponse({
        suggestions: [],
        totalSuggested: 0,
        totalCompleted: 0,
      });
    }

    // Fetch all spacecraft for this org
    const spacecraft = await prisma.spacecraft.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        missionType: true,
        status: true,
      },
    });

    if (spacecraft.length === 0) {
      return createSuccessResponse({
        suggestions: [],
        totalSuggested: 0,
        totalCompleted: 0,
      });
    }

    // Fetch existing CRA assessments for the org (by spaceProductTypeId)
    const existingAssessments = await prisma.cRAAssessment.findMany({
      where: {
        organizationId,
        spaceProductTypeId: { not: null },
      },
      select: {
        id: true,
        spaceProductTypeId: true,
      },
    });

    // Build a lookup: productTypeId → assessmentId
    const assessmentByProductType = new Map<string, string>();
    for (const a of existingAssessments) {
      if (a.spaceProductTypeId) {
        assessmentByProductType.set(a.spaceProductTypeId, a.id);
      }
    }

    let totalSuggested = 0;
    let totalCompleted = 0;

    const suggestions = spacecraft.map((sc) => {
      const missionType = sc.missionType?.toLowerCase() ?? "default";
      const componentIds =
        MISSION_TYPE_COMPONENTS[missionType] ?? MISSION_TYPE_COMPONENTS.default;

      const suggestedProducts = componentIds.flatMap((productTypeId) => {
        const taxonomy = getSpaceProductById(productTypeId);
        if (!taxonomy) return [];

        const assessmentId = assessmentByProductType.get(productTypeId);
        const hasAssessment = !!assessmentId;

        return [
          {
            productTypeId,
            productName: taxonomy.name,
            classification: taxonomy.classification as string,
            hasAssessment,
            assessmentId: assessmentId ?? undefined,
          },
        ];
      });

      const completed = suggestedProducts.filter((p) => p.hasAssessment).length;
      const total = suggestedProducts.length;
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      totalSuggested += total;
      totalCompleted += completed;

      return {
        spacecraft: {
          id: sc.id,
          name: sc.name,
          missionType: sc.missionType ?? "default",
          status: sc.status,
        },
        suggestedProducts,
        completionRate,
      };
    });

    // Only return spacecraft that have at least one missing assessment
    const actionableSuggestions = suggestions.filter(
      (s) => s.completionRate < 100,
    );

    return createSuccessResponse({
      suggestions: actionableSuggestions,
      totalSuggested,
      totalCompleted,
    });
  } catch (error) {
    logger.error("Error fetching CRA suggestions", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
