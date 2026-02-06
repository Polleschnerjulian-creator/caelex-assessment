import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBatchOutreach } from "@/lib/services";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

/**
 * POST /api/environmental/suppliers/batch-outreach
 *
 * Send data requests to all pending suppliers for an assessment.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { assessmentId, expirationDays } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId required" },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const assessment = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Send batch outreach
    const result = await sendBatchOutreach(assessmentId, {
      expirationDays,
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "supplier_batch_outreach",
      entityType: "environmental_assessment",
      entityId: assessmentId,
      newValue: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
      },
      description: `Batch outreach sent to ${result.sent} of ${result.total} suppliers`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error("Batch outreach error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
