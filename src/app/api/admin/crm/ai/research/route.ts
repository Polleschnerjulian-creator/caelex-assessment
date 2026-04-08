/**
 * Admin CRM: AI Research Endpoint
 *
 * POST /api/admin/crm/ai/research
 * Body: { companyId: string }
 *
 * Runs Claude to generate a prospect briefing. Saves the result as a
 * CrmActivity (type=AI_RESEARCH) so it appears in the company's timeline.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { researchCompany } from "@/lib/crm/ai.server";

const schema = z.object({
  companyId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const company = await prisma.crmCompany.findUnique({
      where: { id: parsed.data.companyId, deletedAt: null },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const recentActivities = await prisma.crmActivity.findMany({
      where: { companyId: parsed.data.companyId },
      orderBy: { occurredAt: "desc" },
      take: 20,
      select: { type: true, summary: true, occurredAt: true },
    });

    const result = await researchCompany(company, recentActivities);

    // Persist as an activity on the timeline
    if (!result.error) {
      await prisma.crmActivity.create({
        data: {
          type: "AI_RESEARCH",
          source: "CLAUDE",
          summary: `AI research: ICP fit ${result.icpFit}`,
          body: [
            result.summary,
            "",
            "**Key insights**:",
            ...result.keyInsights.map((i) => `- ${i}`),
            "",
            "**Suggested actions**:",
            ...result.suggestedActions.map((a) => `- ${a}`),
            "",
            "**Likely compliance gaps**:",
            ...result.complianceGaps.map((g) => `- ${g}`),
          ].join("\n"),
          companyId: parsed.data.companyId,
          userId: session.user.id,
          metadata: { ...result } as unknown as object,
        },
      });
    }

    logger.info("CRM research generated", {
      companyId: parsed.data.companyId,
      icpFit: result.icpFit,
      error: result.error,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("CRM AI research failed", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Research failed") },
      { status: 500 },
    );
  }
}
