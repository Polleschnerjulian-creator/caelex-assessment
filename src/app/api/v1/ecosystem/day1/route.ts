/**
 * POST /api/v1/ecosystem/day1 (Sprint Day1)
 *
 * One-shot "Day-1 magic moment" composer. Runs enrichment + trilateral
 * discovery + precision-engine in parallel and returns a single
 * Day1Result payload the onboarding UI / Astra chat / partner clients
 * can render verbatim.
 *
 * Requires API key with `read:compliance` scope.
 *
 * Body (all fields optional):
 *   {
 *     "vatId": "DE123456789",
 *     "lei": "529900T8BM49AURSDO55",
 *     "persist": true,
 *     "maxItems": 25
 *   }
 *
 * Response: see Day1Result in src/lib/day1/run-day1.ts.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import { runDay1MagicMoment } from "@/lib/day1/run-day1";

export const POST = withApiAuth(
  async (request: NextRequest, context: ApiContext) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Empty body OK — composer reads OperatorProfile by default.
    }

    const result = await runDay1MagicMoment({
      organizationId: context.organizationId,
      vatId: typeof body.vatId === "string" ? body.vatId : undefined,
      lei: typeof body.lei === "string" ? body.lei : undefined,
      persist: body.persist === true,
      maxItems:
        typeof body.maxItems === "number"
          ? Math.max(1, Math.min(body.maxItems, 100))
          : undefined,
    });

    return apiSuccess(result);
  },
  { requiredScopes: ["read:compliance"] },
);
