/**
 * POST /api/v1/ecosystem/discovery (Sprint E2)
 *
 * Run the Sprint A4 Trilateral Auto-Discovery for the authenticated
 * organization. Returns supervising NCAs + counsel candidates +
 * cross-actor signals for the Day-1 magic moment.
 *
 * Requires API key with `read:compliance` scope.
 *
 * Body (all optional — read from OperatorProfile if omitted):
 *   {
 *     "operatorType": "SCO",
 *     "establishmentCountry": "DE",
 *     "launchCountry": "FR",
 *     "isThirdCountry": false,
 *     "operatingJurisdictions": ["DE", "FR"]
 *   }
 *
 * Response:
 *   {
 *     "authorities": AuthoritySuggestion[],
 *     "counsel": CounselSuggestion[],
 *     "signals": CrossActorSignal[],
 *     "meta": DiscoveryMeta
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { runTrilateralDiscovery } from "@/lib/network-discovery";

export const POST = withApiAuth(
  async (request: NextRequest, context: ApiContext) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Empty body OK.
    }

    let operatorType = "";
    let establishmentCountry = "";
    let launchCountry: string | undefined;
    let isThirdCountry = false;
    let operatingJurisdictions: string[] = [];

    if (typeof body.operatorType === "string") {
      operatorType = body.operatorType;
    }
    if (typeof body.establishmentCountry === "string") {
      establishmentCountry = body.establishmentCountry;
    }
    if (typeof body.launchCountry === "string") {
      launchCountry = body.launchCountry;
    }
    if (body.isThirdCountry === true) isThirdCountry = true;
    if (Array.isArray(body.operatingJurisdictions)) {
      operatingJurisdictions = body.operatingJurisdictions.filter(
        (j): j is string => typeof j === "string",
      );
    }

    // Fallback: read from OperatorProfile if body didn't supply.
    if (!operatorType || !establishmentCountry) {
      const operator = await prisma.operatorProfile.findUnique({
        where: { organizationId: context.organizationId },
        select: {
          euOperatorCode: true,
          operatorType: true,
          establishment: true,
          operatingJurisdictions: true,
        },
      });
      if (!operatorType) {
        operatorType = operator?.euOperatorCode ?? operator?.operatorType ?? "";
      }
      if (!establishmentCountry && operator?.establishment) {
        establishmentCountry = operator.establishment;
      }
      if (operatingJurisdictions.length === 0) {
        operatingJurisdictions = operator?.operatingJurisdictions ?? [];
      }
    }

    const result = await runTrilateralDiscovery({
      organizationId: context.organizationId,
      operatorType,
      establishmentCountry,
      launchCountry,
      isThirdCountry,
      operatingJurisdictions,
    });

    return apiSuccess({
      authorities: result.authorities,
      counsel: result.counsel,
      signals: result.signals,
      meta: result.meta,
    });
  },
  { requiredScopes: ["read:compliance"] },
);
