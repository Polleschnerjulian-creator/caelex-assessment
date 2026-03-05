/**
 * Assure Investor Update Generation API
 * POST: Generate an investor update (return JSON structure with metrics,
 *       milestones, financials). Stored as AssureMaterial with type CUSTOM.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

const generateUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  period: z.string().min(1).max(100).optional(),
  highlights: z.array(z.string()).optional(),
  customSections: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const parsed = generateUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // Fetch current profile data
    const profile = await prisma.assureCompanyProfile.findUnique({
      where: { organizationId },
      include: {
        financialProfile: true,
        tractionProfile: true,
        teamProfile: true,
        techProfile: true,
      },
    });

    // Fetch recent milestones
    const milestones = await prisma.assureMilestone.findMany({
      where: {
        organizationId,
        isInvestorVisible: true,
      },
      orderBy: { targetDate: "desc" },
      take: 10,
    });

    // Fetch latest IRS
    const latestIRS = await prisma.investmentReadinessScore.findFirst({
      where: { organizationId },
      orderBy: { computedAt: "desc" },
    });

    // Build the investor update content
    const now = new Date();
    const period =
      input.period ||
      `${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`;
    const title = input.title || `Investor Update — ${period}`;

    const updateContent = {
      title,
      period,
      generatedAt: now.toISOString(),
      organizationName: membership.organization.name,
      highlights: input.highlights || [],
      metrics: {
        irsScore: latestIRS?.overallScore ?? null,
        irsGrade: latestIRS?.grade ?? null,
        employeeCount: profile?.employeeCount ?? null,
        annualRevenue: profile?.financialProfile?.annualRevenue ?? null,
        revenueGrowthYoY: profile?.financialProfile?.revenueGrowthYoY ?? null,
        runway: profile?.financialProfile?.runway ?? null,
        cashPosition: profile?.financialProfile?.cashPosition ?? null,
        customerCount: profile?.tractionProfile?.signedContracts ?? null,
        trlLevel: profile?.techProfile?.trlLevel ?? null,
      },
      milestones: milestones.map((m) => ({
        title: m.title,
        category: m.category,
        status: m.status,
        targetDate: m.targetDate,
        completedDate: m.completedDate,
        investorNote: m.investorNote,
      })),
      financials: profile?.financialProfile
        ? {
            annualRevenue: profile.financialProfile.annualRevenue,
            revenueGrowthYoY: profile.financialProfile.revenueGrowthYoY,
            monthlyBurnRate: profile.financialProfile.monthlyBurnRate,
            runway: profile.financialProfile.runway,
            grossMargin: profile.financialProfile.grossMargin,
            cashPosition: profile.financialProfile.cashPosition,
            isRaising: profile.financialProfile.isRaising,
            targetRaise: profile.financialProfile.targetRaise,
          }
        : null,
      customSections: input.customSections || [],
    };

    // Store as AssureMaterial with type CUSTOM
    const existingCount = await prisma.assureMaterial.count({
      where: { organizationId, type: "CUSTOM" },
    });

    const material = await prisma.assureMaterial.create({
      data: {
        organizationId,
        createdById: session.user.id,
        type: "CUSTOM",
        title,
        version: existingCount + 1,
        includedSections: ["metrics", "milestones", "financials"],
        customizations: input.customSections
          ? JSON.parse(JSON.stringify(input.customSections))
          : null,
        profileSnapshot: JSON.parse(JSON.stringify(updateContent)),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_update_generated",
      entityType: "assure_material",
      entityId: material.id,
      metadata: {
        title,
        period,
        type: "investor_update",
      },
      organizationId,
    });

    return NextResponse.json({
      id: material.id,
      title: material.title,
      version: material.version,
      content: updateContent,
      createdBy: material.createdBy,
      createdAt: material.createdAt,
    });
  } catch (error) {
    logger.error("Assure investor update generation error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
