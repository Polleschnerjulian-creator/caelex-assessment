import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// MCP Tool definitions
const MCP_TOOLS = [
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

// GET: List available tools (MCP discovery)
export async function GET() {
  return NextResponse.json({
    name: "caelex-compliance",
    version: "1.0.0",
    description:
      "Caelex Space Regulatory Compliance — query compliance status, deadlines, articles, and scores",
    tools: MCP_TOOLS,
  });
}

// POST: Execute a tool
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

  try {
    switch (tool) {
      case "get_compliance_status": {
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

      case "get_deadlines": {
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

      case "get_article_status": {
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
          underReview: articles.filter((a) => a.status === "under_review")
            .length,
          notStarted: articles.filter((a) => a.status === "not_started").length,
          notApplicable: articles.filter((a) => a.status === "not_applicable")
            .length,
        };

        return NextResponse.json({ result: { articles, summary } });
      }

      case "get_rrs_score": {
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

      case "search_requirements": {
        const query = ((input?.query as string) || "").toLowerCase().trim();
        if (!query) {
          return NextResponse.json(
            { error: "Query is required" },
            { status: 400 },
          );
        }

        // Search in article statuses
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

      default:
        return NextResponse.json(
          {
            error: `Unknown tool: ${tool}. Available: ${MCP_TOOLS.map((t) => t.name).join(", ")}`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error(`[MCP] Tool execution error for ${tool}:`, error);
    return NextResponse.json(
      { error: "Tool execution failed" },
      { status: 500 },
    );
  }
}
