import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { articles, OperatorType } from "@/data/articles";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

// Map assessment operator type to article OperatorType
const operatorTypeMap: Record<string, OperatorType> = {
  spacecraft_operator: "SCO",
  launch_operator: "LO",
  launch_site_operator: "LSO",
  isos_provider: "ISOS",
  collision_avoidance_provider: "CAP",
  primary_data_provider: "PDP",
  third_country_operator: "TCO",
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { operatorType } = await request.json();

    if (!operatorType) {
      return NextResponse.json(
        { error: "Missing operatorType" },
        { status: 400 },
      );
    }

    const opType = operatorTypeMap[operatorType] || operatorType;

    // Determine which articles apply
    const updates: { articleId: string; status: string }[] = [];
    let applicable = 0;
    let notApplicable = 0;

    for (const article of articles) {
      const applies =
        article.appliesTo.includes("ALL") ||
        article.appliesTo.includes(opType as OperatorType);

      if (applies) {
        updates.push({ articleId: article.id, status: "not_started" });
        applicable++;
      } else {
        updates.push({ articleId: article.id, status: "not_applicable" });
        notApplicable++;
      }
    }

    // Bulk upsert all article statuses
    await prisma.$transaction(
      updates.map((update) =>
        prisma.articleStatus.upsert({
          where: {
            userId_articleId: {
              userId: userId,
              articleId: update.articleId,
            },
          },
          update: {
            status: update.status,
          },
          create: {
            userId: userId,
            articleId: update.articleId,
            status: update.status,
          },
        }),
      ),
    );

    // Update user's operator type
    await prisma.user.update({
      where: { id: userId },
      data: { operatorType: opType },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "assessment_imported",
      entityType: "user",
      entityId: userId,
      newValue: {
        operatorType: opType,
        applicable,
        notApplicable,
        total: updates.length,
      },
      description: `Imported assessment: ${applicable} applicable articles, ${notApplicable} not applicable`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      imported: updates.length,
      applicable,
      notApplicable,
    });
  } catch (error) {
    console.error("Error importing assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
