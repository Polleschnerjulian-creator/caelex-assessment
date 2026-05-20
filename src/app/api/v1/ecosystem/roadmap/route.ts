/**
 * POST /api/v1/ecosystem/roadmap (Sprint E2)
 *
 * Run the Sprint A3 Precision Engine for the authenticated
 * organization. Reads OperatorProfile, walks the regulatory ontology,
 * and returns a dependency-resolved, time-planned roadmap.
 *
 * Requires API key with `read:compliance` scope.
 *
 * Body (all fields optional):
 *   {
 *     "domain": "AUTHORIZATION",
 *     "includeProposals": false,
 *     "maxItems": 25,
 *     "overrides": {
 *       "operatorType": "SCO",
 *       "jurisdictions": ["DE", "FR"],
 *       "primaryOrbit": "LEO",
 *       "constellationSize": 6,
 *       "plannedLaunchDate": "2028-01-01T00:00:00Z",
 *       "missionDurationMonths": 60
 *     }
 *   }
 *
 * If `overrides` is omitted, the engine reads from the stored
 * OperatorProfile. Useful for sandbox/what-if calls.
 *
 * Response:
 *   {
 *     "status": "SUCCESS" | "PARTIAL" | "EMPTY" | "FAILED",
 *     "items": GeneratedComplianceItem[],
 *     "itemsByDomain": Record<string, GeneratedComplianceItem[]>,
 *     "stats": PrecisionRunStats,
 *     "warnings": string[]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { runPrecisionEngine } from "@/lib/comply-v2/precision-engine";

export const POST = withApiAuth(
  async (request: NextRequest, context: ApiContext) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Empty body OK — engine reads OperatorProfile.
    }

    const domain = typeof body.domain === "string" ? body.domain : undefined;
    const includeProposals = body.includeProposals === true;
    const maxItemsRaw = typeof body.maxItems === "number" ? body.maxItems : 25;
    const maxItems = Math.max(1, Math.min(maxItemsRaw, 100));

    // Build applicability — overrides win when present, otherwise read
    // from the stored OperatorProfile for the authenticated organization.
    let operatorType = "";
    let jurisdictions: string[] = [];
    let primaryOrbit: string | undefined;
    let constellationSize: number | undefined;
    let plannedLaunchDate: Date | undefined;
    let missionDurationMonths: number | undefined;

    const overrides =
      body.overrides && typeof body.overrides === "object"
        ? (body.overrides as Record<string, unknown>)
        : null;

    if (overrides) {
      operatorType =
        typeof overrides.operatorType === "string"
          ? overrides.operatorType
          : "";
      jurisdictions = Array.isArray(overrides.jurisdictions)
        ? (overrides.jurisdictions.filter(
            (j) => typeof j === "string",
          ) as string[])
        : [];
      primaryOrbit =
        typeof overrides.primaryOrbit === "string"
          ? overrides.primaryOrbit
          : undefined;
      constellationSize =
        typeof overrides.constellationSize === "number"
          ? overrides.constellationSize
          : undefined;
      missionDurationMonths =
        typeof overrides.missionDurationMonths === "number"
          ? overrides.missionDurationMonths
          : undefined;
      if (typeof overrides.plannedLaunchDate === "string") {
        const d = new Date(overrides.plannedLaunchDate);
        if (!isNaN(d.getTime())) plannedLaunchDate = d;
      }
    } else {
      const operator = await prisma.operatorProfile.findUnique({
        where: { organizationId: context.organizationId },
        select: {
          euOperatorCode: true,
          operatorType: true,
          primaryOrbit: true,
          constellationSize: true,
          missionDurationMonths: true,
          plannedLaunchDate: true,
          operatingJurisdictions: true,
          establishment: true,
        },
      });
      operatorType = operator?.euOperatorCode ?? operator?.operatorType ?? "";
      jurisdictions = Array.from(
        new Set(
          [
            ...(operator?.operatingJurisdictions ?? []),
            operator?.establishment,
          ].filter((j): j is string => Boolean(j)),
        ),
      );
      primaryOrbit = operator?.primaryOrbit ?? undefined;
      constellationSize = operator?.constellationSize ?? undefined;
      missionDurationMonths = operator?.missionDurationMonths ?? undefined;
      plannedLaunchDate = operator?.plannedLaunchDate ?? undefined;
    }

    const result = await runPrecisionEngine({
      organizationId: context.organizationId,
      applicability: {
        operatorType,
        jurisdictions,
        primaryOrbit,
        constellationSize,
        missionDurationMonths,
        plannedLaunchDate,
      },
      domain,
      includeProposals,
    });

    const trimmed = result.items.slice(0, maxItems);

    return apiSuccess({
      status: result.status,
      items: trimmed,
      itemsByDomain: result.itemsByDomain,
      stats: result.stats,
      warnings: result.warnings,
      durationMs: result.durationMs,
    });
  },
  { requiredScopes: ["read:compliance"] },
);
