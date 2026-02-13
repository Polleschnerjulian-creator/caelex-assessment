import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { RedactedUnifiedResult } from "@/lib/unified-assessment-types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { result } = (await request.json()) as {
      result: RedactedUnifiedResult;
    };

    if (!result) {
      return NextResponse.json(
        { error: "Missing assessment result" },
        { status: 400 },
      );
    }

    // Get or create user's organization
    let organization = await prisma.organization.findFirst({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (!organization) {
      // Create a new organization with FREE plan
      const orgName = result.companySummary.name || "My Organization";
      const slug =
        orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Date.now().toString(36);

      organization = await prisma.organization.create({
        data: {
          name: orgName,
          slug: slug,
          plan: "FREE",
          members: {
            create: {
              userId: userId,
              role: "OWNER",
            },
          },
        },
      });
    }

    // Determine primary operator type from activities
    const activityToOperatorType: Record<string, string> = {
      "Spacecraft Operator": "SCO",
      "Launch Operator": "LO",
      "Launch Site Operator": "LSO",
      "In-Space Service Operator": "ISOS",
      "Collision Avoidance Provider": "CAP",
      "Positional Data Provider": "PDP",
      "Third Country Operator": "TCO",
    };

    const primaryActivity = result.companySummary.activities[0];
    const operatorType = primaryActivity
      ? activityToOperatorType[primaryActivity] || "SCO"
      : "SCO";

    // Update user with assessment data
    await prisma.user.update({
      where: { id: userId },
      data: {
        operatorType: operatorType,
        // Store the full unified assessment result
        unifiedAssessmentResult: JSON.stringify(result),
        unifiedAssessmentCompletedAt: new Date(),
      },
    });

    // Create article statuses based on EU Space Act applicability
    if (result.euSpaceAct.applies) {
      // Import the articles to set up tracking
      const { articles } = await import("@/data/articles");

      const articleUpdates = articles.map((article) => {
        const applies =
          article.appliesTo.includes("ALL") ||
          article.appliesTo.includes(
            operatorType as
              | "SCO"
              | "LO"
              | "LSO"
              | "ISOS"
              | "CAP"
              | "PDP"
              | "TCO",
          );

        return {
          userId,
          articleId: article.id,
          status: applies ? "not_started" : "not_applicable",
        };
      });

      // Bulk upsert
      await prisma.$transaction(
        articleUpdates.map((update) =>
          prisma.articleStatus.upsert({
            where: {
              userId_articleId: {
                userId: update.userId,
                articleId: update.articleId,
              },
            },
            update: { status: update.status },
            create: update,
          }),
        ),
      );
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "unified_assessment_saved",
      entityType: "user",
      entityId: userId,
      newValue: {
        assessmentId: result.assessmentId,
        operatorType,
        euSpaceActApplies: result.euSpaceAct.applies,
        nis2Applies: result.nis2.applies,
        jurisdictionsAnalyzed: result.nationalSpaceLaw.analyzedCount,
        organizationPlan: "FREE",
      },
      description: `Saved unified assessment with FREE tier access`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      organizationId: organization.id,
      plan: "FREE",
    });
  } catch (error) {
    console.error("Error saving unified assessment:", error);
    return NextResponse.json(
      { error: "Failed to save assessment" },
      { status: 500 },
    );
  }
}
