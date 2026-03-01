/**
 * GET /api/v1/compliance/articles
 *
 * Paginated, filterable EU Space Act articles.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";
import { parsePaginationLimit } from "@/lib/validations";
import { loadSpaceActDataFromDisk } from "@/lib/engine.server";
import { withCache } from "@/lib/cache.server";
import type { Article, OperatorAbbreviation } from "@/lib/types";

function flattenAllArticles(
  data: ReturnType<typeof loadSpaceActDataFromDisk>,
): Article[] {
  const articles: Article[] = [];

  function extract(
    items: {
      articles_detail?: Article[];
      sections?: Array<{ articles_detail?: Article[] }>;
      chapters?: Array<{
        articles_detail?: Article[];
        sections?: Array<{ articles_detail?: Article[] }>;
      }>;
    }[],
  ) {
    for (const item of items) {
      if (item.articles_detail) articles.push(...item.articles_detail);
      if ("sections" in item && item.sections) extract(item.sections);
      if ("chapters" in item && item.chapters) extract(item.chapters);
    }
  }

  extract(data.titles);
  return articles;
}

export const GET = withApiAuth(
  async (request: NextRequest, _context: ApiContext) => {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = parsePaginationLimit(url.searchParams.get("limit"), 20);
    const operatorType = url.searchParams.get(
      "operatorType",
    ) as OperatorAbbreviation | null;
    const complianceType = url.searchParams.get("complianceType");

    // Validate operator type early (before cache check)
    if (operatorType) {
      const validTypes: OperatorAbbreviation[] = [
        "SCO",
        "LO",
        "LSO",
        "ISOS",
        "CAP",
        "PDP",
        "TCO",
        "ALL",
      ];
      if (!validTypes.includes(operatorType)) {
        return apiError(
          `Invalid operatorType. Must be one of: ${validTypes.join(", ")}`,
          400,
        );
      }
    }

    // Build cache key from query parameters
    const cacheKey = `articles:page=${page}:limit=${limit}:operator=${operatorType || "none"}:compliance=${complianceType || "none"}`;

    const result = await withCache(
      cacheKey,
      async () => {
        const data = loadSpaceActDataFromDisk();
        let articles = flattenAllArticles(data);

        // Filter by operator type
        if (operatorType) {
          articles = articles.filter(
            (a) =>
              a.applies_to.includes("ALL") ||
              a.applies_to.includes(operatorType),
          );
        }

        // Filter by compliance type
        if (complianceType) {
          articles = articles.filter(
            (a) => a.compliance_type === complianceType,
          );
        }

        const total = articles.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedArticles = articles.slice(offset, offset + limit);

        // Redact sensitive fields
        const redacted = paginatedArticles.map((a) => ({
          number: a.number,
          title: a.title,
          compliance_type: a.compliance_type,
          applies_to: a.applies_to,
          excludes: a.excludes,
        }));

        return {
          articles: redacted,
          pagination: { page, limit, total, totalPages },
        };
      },
      600, // 10 minutes TTL
    );

    return apiSuccess(result.articles, 200, {
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: ["read:compliance"] },
);
