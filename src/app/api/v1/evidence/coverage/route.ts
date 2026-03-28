/**
 * GET /api/v1/evidence/coverage — Evidence coverage summary per regulation
 *
 * Returns per-requirement coverage status with pagination.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, apiSuccess, type ApiContext } from "@/lib/api-auth";
import { parsePaginationLimit } from "@/lib/validations";
import { getEvidenceCoverage } from "@/lib/services/ace-evidence-service.server";
import type { RegulationType } from "@prisma/client";

async function handler(request: NextRequest, context: ApiContext) {
  try {
    const { organizationId } = context;
    const url = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = parsePaginationLimit(url.searchParams.get("limit"), 20);
    const offset = (page - 1) * limit;

    // Optional filters
    const regulationType = url.searchParams.get(
      "regulationType",
    ) as RegulationType | null;
    const status = url.searchParams.get("status") as
      | "covered"
      | "partial"
      | "missing"
      | "expired"
      | null;
    const category = url.searchParams.get("category");

    const result = await getEvidenceCoverage(organizationId, {
      regulationType: regulationType || undefined,
      status: status || undefined,
      category: category || undefined,
      limit,
      offset,
    });

    const totalPages = Math.ceil(result.total / limit);

    return apiSuccess(result.items, 200, {
      pagination: { page, limit, total: result.total, totalPages },
    });
  } catch (error) {
    console.error("[evidence/coverage]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withApiAuth(handler, {
  requiredScopes: ["read:compliance"],
});
