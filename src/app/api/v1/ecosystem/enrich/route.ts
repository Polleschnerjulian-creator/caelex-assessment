/**
 * POST /api/v1/ecosystem/enrich (Sprint E2)
 *
 * Run the Sprint A1 Pre-Knowledge Engine on the authenticated
 * organization. Walks VIES + GLEIF + BRIS country-router in parallel
 * and returns the merged EnrichedProfile.
 *
 * Requires API key with `read:compliance` scope.
 *
 * Body (all fields optional — orchestrator decides which adapters
 * to dispatch from what it receives):
 *   {
 *     "vatId": "DE123456789",
 *     "lei": "529900T8BM49AURSDO55",
 *     "legalName": "Caelex GmbH",
 *     "countryCode": "DE",
 *     "skipSources": ["bris"],
 *     "persistToAssureProfile": true
 *   }
 *
 * Response:
 *   {
 *     "status": "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED",
 *     "profile": EnrichedProfile,
 *     "sourceAttempts": SourceAttempt[],
 *     "durationMs": number,
 *     "persisted": { updated: number, created: boolean } | null
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import {
  enrichOperatorProfile,
  persistEnrichmentToAssureProfile,
} from "@/lib/profile-enrichment/orchestrator";
import type { EnrichmentSource } from "@/lib/profile-enrichment/types";

export const POST = withApiAuth(
  async (request: NextRequest, context: ApiContext) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Empty body is fine — caller may just want to re-enrich from
      // existing org metadata (handled by enrichOperatorProfile fallbacks).
    }

    const skipSources = Array.isArray(body.skipSources)
      ? (body.skipSources.filter(
          (s) => typeof s === "string",
        ) as EnrichmentSource[])
      : undefined;

    const result = await enrichOperatorProfile({
      organizationId: context.organizationId,
      vatId: typeof body.vatId === "string" ? body.vatId : undefined,
      lei: typeof body.lei === "string" ? body.lei : undefined,
      legalName:
        typeof body.legalName === "string" ? body.legalName : undefined,
      countryCode:
        typeof body.countryCode === "string" ? body.countryCode : undefined,
      skipSources,
    });

    let persisted: { updated: number; created: boolean } | null = null;
    if (
      body.persistToAssureProfile === true &&
      (result.status === "SUCCESS" || result.status === "PARTIAL")
    ) {
      persisted = await persistEnrichmentToAssureProfile(
        context.organizationId,
        result.profile,
      );
    }

    return apiSuccess({
      status: result.status,
      profile: result.profile,
      sourceAttempts: result.sourceAttempts,
      durationMs: result.durationMs,
      startedAt: result.startedAt,
      persisted,
    });
  },
  { requiredScopes: ["read:compliance"] },
);
