/**
 * Caelex MCP Server (Sprint E1 — expansion 5 → 50+ tools)
 *
 * Two-tier dispatch:
 *
 *   1. Legacy tier (5 tools)
 *      - get_compliance_status, get_deadlines, get_article_status,
 *        get_rrs_score, search_requirements
 *      - Bespoke handlers below; preserved for backward compatibility
 *        with any client already calling the old shapes.
 *
 *   2. Astra tier (every tool in src/lib/astra/tool-definitions.ts)
 *      - generate_compliance_roadmap, runGapAnalysis, etc.
 *      - Dispatched through the existing Astra tool-executor so MCP
 *        clients get the full surface (Cursor / Claude Desktop / Warp).
 *
 * Discovery: GET returns the merged tool list.
 * Execution: POST tries legacy switch first; falls through to Astra
 *            tool-executor if the name is not in the legacy set.
 *
 * Auth: session-based (next-auth) for now. External MCP clients
 *       (no browser session) would need API-key auth — tracked as
 *       a Sprint E2 follow-up.
 */

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_TOOLS } from "@/lib/astra/tool-definitions";
import { executeTool } from "@/lib/astra/tool-executor";

// ─── Legacy tool catalogue (Sprint A1; unchanged) ──────────────────────────

const LEGACY_MCP_TOOLS = [
  {
    name: "get_compliance_status",
    description:
      "Get the current compliance status across all modules for the authenticated user. Returns scores for debris, cybersecurity, insurance, NIS2, and overall RRS.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_deadlines",
    description:
      "Get upcoming and overdue compliance deadlines. Returns title, due date, priority, and status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        daysAhead: {
          type: "number",
          description: "Number of days to look ahead (default: 30, max: 365)",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_article_status",
    description:
      "Get the compliance status for EU Space Act articles. Returns which articles are compliant, in progress, or not started.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description:
            "Filter by status: not_started, in_progress, under_review, compliant, not_applicable",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_rrs_score",
    description:
      "Get the Regulatory Readiness Score (RRS) with component breakdown. Returns overall score, grade, and per-component scores.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "search_requirements",
    description:
      "Search compliance requirements by keyword. Returns matching articles, regulations, and requirements.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term (e.g., 'debris', 'encryption', 'Art. 58')",
        },
      },
      required: ["query"],
    },
  },
];

const LEGACY_NAMES = new Set(LEGACY_MCP_TOOLS.map((t) => t.name));

// ─── Discovery (GET) ──────────────────────────────────────────────────────

/**
 * Returns the merged tool list. Legacy tools preserve their existing
 * shape; Astra tools are translated to the same {name, description,
 * inputSchema} envelope. Astra tool names are namespaced with the
 * "astra/" prefix so clients can disambiguate them from legacy ones.
 */
export async function GET() {
  // Legacy tools: kept under their original (un-namespaced) names.
  const legacyExposed = LEGACY_MCP_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));

  // Astra tools: namespaced and JSON-Schema-shaped from the
  // AstraToolDefinition.input_schema shape (already JSON-Schema-like).
  const astraExposed = ALL_TOOLS.filter((t) => !LEGACY_NAMES.has(t.name)).map(
    (t) => ({
      name: `astra/${t.name}`,
      description: t.description,
      inputSchema: t.input_schema,
    }),
  );

  return NextResponse.json({
    name: "caelex-compliance",
    version: "2.0.0",
    description:
      "Caelex Space Regulatory Compliance — full Astra tool surface (legacy 5 + ALL Astra tools, namespaced 'astra/<tool>')",
    tools: [...legacyExposed, ...astraExposed],
  });
}

// ─── Execution (POST) ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { tool, input } = body as {
    tool: string;
    input: Record<string, unknown>;
  };

  if (!tool) {
    return NextResponse.json(
      { error: "Missing 'tool' field" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  // ─── Astra tier (namespaced) ─────────────────────────────────────────────
  if (tool.startsWith("astra/")) {
    return executeAstraTool(tool.replace(/^astra\//, ""), input, userId);
  }

  // ─── Legacy tier ─────────────────────────────────────────────────────────
  try {
    switch (tool) {
      case "get_compliance_status":
        return await handleGetComplianceStatus(userId);
      case "get_deadlines":
        return await handleGetDeadlines(userId, input);
      case "get_article_status":
        return await handleGetArticleStatus(userId, input);
      case "get_rrs_score":
        return await handleGetRrsScore(userId);
      case "search_requirements":
        return await handleSearchRequirements(userId, input);
      default:
        // Soft fallback: if the un-namespaced tool name matches an Astra
        // tool, run it. Clients that haven't migrated to the "astra/"
        // namespace still work.
        if (ALL_TOOLS.some((t) => t.name === tool)) {
          return executeAstraTool(tool, input, userId);
        }
        return NextResponse.json(
          {
            error: `Unknown tool: ${tool}. Call GET /api/astra/mcp for the list.`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error(`[MCP] Tool execution error for ${tool}:`, error);
    return NextResponse.json(
      { error: "Tool execution failed" },
      { status: 500 },
    );
  }
}

// ─── Astra dispatch helper ────────────────────────────────────────────────

async function executeAstraTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
): Promise<NextResponse> {
  if (!ALL_TOOLS.some((t) => t.name === toolName)) {
    return NextResponse.json(
      {
        error: `Unknown Astra tool: ${toolName}. Call GET /api/astra/mcp for the list.`,
      },
      { status: 400 },
    );
  }

  // Resolve organizationId + name for the Astra context.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: {
      organizationId: true,
      organization: { select: { name: true } },
    },
    orderBy: { joinedAt: "desc" },
  });
  if (!membership) {
    return NextResponse.json(
      {
        error:
          "User is not a member of any organization. Most Astra tools require an organization context.",
      },
      { status: 403 },
    );
  }

  const result = await executeTool(
    {
      id: crypto.randomUUID(),
      name: toolName,
      input,
    },
    {
      userId,
      organizationId: membership.organizationId,
      organizationName: membership.organization?.name ?? "Unknown",
    },
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Tool failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ result: result.data });
}

// ─── Legacy handlers (Sprint A1 — unchanged) ──────────────────────────────

async function handleGetComplianceStatus(
  userId: string,
): Promise<NextResponse> {
  const [debris, cyber, insurance, nis2] = await Promise.all([
    prisma.debrisAssessment.findFirst({
      where: { userId },
      select: { complianceScore: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cybersecurityAssessment.findFirst({
      where: { userId },
      select: { maturityScore: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.insuranceAssessment.findFirst({
      where: { userId },
      select: { complianceScore: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.nIS2Assessment.findFirst({
      where: { userId },
      select: {
        entityClassification: true,
        complianceScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    result: {
      debris: debris
        ? { score: debris.complianceScore, lastUpdated: debris.createdAt }
        : null,
      cybersecurity: cyber
        ? { score: cyber.maturityScore, lastUpdated: cyber.createdAt }
        : null,
      insurance: insurance
        ? {
            score: insurance.complianceScore,
            lastUpdated: insurance.createdAt,
          }
        : null,
      nis2: nis2
        ? {
            classification: nis2.entityClassification,
            score: nis2.complianceScore,
            lastUpdated: nis2.createdAt,
          }
        : null,
    },
  });
}

async function handleGetDeadlines(
  userId: string,
  input: Record<string, unknown>,
): Promise<NextResponse> {
  const daysAhead = Math.min(Number(input?.daysAhead) || 30, 365);
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

  const deadlines = await prisma.deadline.findMany({
    where: { userId, dueDate: { lte: cutoff } },
    select: {
      title: true,
      dueDate: true,
      priority: true,
      status: true,
      category: true,
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  });

  return NextResponse.json({
    result: { deadlines, count: deadlines.length },
  });
}

async function handleGetArticleStatus(
  userId: string,
  input: Record<string, unknown>,
): Promise<NextResponse> {
  const where: Record<string, unknown> = { userId };
  if (input?.status) where.status = input.status as string;

  const articles = await prisma.articleStatus.findMany({
    where,
    select: {
      articleId: true,
      status: true,
      notes: true,
      updatedAt: true,
    },
    orderBy: { articleId: "asc" },
  });

  const summary = {
    total: articles.length,
    compliant: articles.filter((a) => a.status === "compliant").length,
    inProgress: articles.filter((a) => a.status === "in_progress").length,
    underReview: articles.filter((a) => a.status === "under_review").length,
    notStarted: articles.filter((a) => a.status === "not_started").length,
    notApplicable: articles.filter((a) => a.status === "not_applicable").length,
  };

  return NextResponse.json({ result: { articles, summary } });
}

async function handleGetRrsScore(userId: string): Promise<NextResponse> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!membership) {
    return NextResponse.json({
      result: { error: "No organization found" },
    });
  }

  const rrs = await prisma.rRSSnapshot.findFirst({
    where: { organizationId: membership.organizationId },
    select: {
      overallScore: true,
      authorizationReadiness: true,
      cybersecurityPosture: true,
      operationalCompliance: true,
      jurisdictionalCoverage: true,
      regulatoryTrajectory: true,
      governanceProcess: true,
      grade: true,
      status: true,
      snapshotDate: true,
    },
    orderBy: { snapshotDate: "desc" },
  });

  return NextResponse.json({
    result: rrs || { error: "No RRS data available" },
  });
}

async function handleSearchRequirements(
  userId: string,
  input: Record<string, unknown>,
): Promise<NextResponse> {
  const query = ((input?.query as string) || "").toLowerCase().trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const articles = await prisma.articleStatus.findMany({
    where: {
      userId,
      OR: [
        { articleId: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { articleId: true, status: true, notes: true },
    take: 10,
  });

  return NextResponse.json({ result: { matches: articles, query } });
}
