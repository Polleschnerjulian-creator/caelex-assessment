export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

// GET /api/user/export - GDPR Art. 20 data portability export
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit: export tier (20/hr)
    const rateLimitResult = await checkRateLimit("export", userId);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Gather all user personal data in parallel
    const [
      user,
      organizationMemberships,
      cybersecurityAssessments,
      debrisAssessments,
      environmentalAssessments,
      insuranceAssessments,
      nis2Assessments,
      copuosAssessments,
      ukSpaceAssessments,
      usRegulatoryAssessments,
      exportControlAssessments,
      spectrumAssessments,
      documents,
      notificationPreference,
      notifications,
      astraConversations,
      auditLogs,
      deadlines,
      comments,
      articleStatuses,
      checklistStatuses,
      authorizationWorkflows,
      scheduledReports,
      ncaSubmissions,
      missionPhases,
    ] = await Promise.all([
      // User profile (exclude password hash and security tokens)
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          organization: true,
          operatorType: true,
          establishmentCountry: true,
          isThirdCountry: true,
          theme: true,
          language: true,
          unifiedAssessmentResult: true,
          unifiedAssessmentCompletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Organization memberships
      prisma.organizationMember.findMany({
        where: { userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
        },
      }),

      // Cybersecurity assessments
      prisma.cybersecurityAssessment.findMany({
        where: { userId },
        include: { requirements: true },
      }),

      // Debris assessments
      prisma.debrisAssessment.findMany({
        where: { userId },
        include: { requirements: true },
      }),

      // Environmental assessments
      prisma.environmentalAssessment.findMany({
        where: { userId },
        include: {
          impactResults: true,
          supplierRequests: true,
        },
      }),

      // Insurance assessments
      prisma.insuranceAssessment.findMany({
        where: { userId },
        include: { policies: true },
      }),

      // NIS2 assessments
      prisma.nIS2Assessment.findMany({
        where: { userId },
        include: { requirements: true },
      }),

      // COPUOS assessments
      prisma.copuosAssessment.findMany({
        where: { userId },
        include: { guidelineStatuses: true },
      }),

      // UK Space assessments
      prisma.ukSpaceAssessment.findMany({
        where: { userId },
        include: { requirementStatuses: true },
      }),

      // US Regulatory assessments
      prisma.usRegulatoryAssessment.findMany({
        where: { userId },
        include: { requirementStatuses: true },
      }),

      // Export Control assessments
      prisma.exportControlAssessment.findMany({
        where: { userId },
        include: { requirementStatuses: true },
      }),

      // Spectrum assessments
      prisma.spectrumAssessment.findMany({
        where: { userId },
        include: { requirementStatuses: true },
      }),

      // Documents (metadata only, no binary content)
      prisma.document.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          category: true,
          subcategory: true,
          tags: true,
          version: true,
          isLatest: true,
          issueDate: true,
          expiryDate: true,
          isExpired: true,
          moduleType: true,
          regulatoryRef: true,
          accessLevel: true,
          status: true,
          uploadedBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Notification preferences
      prisma.notificationPreference.findUnique({
        where: { userId },
      }),

      // Notifications
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),

      // ASTRA conversations with messages
      prisma.astraConversation.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Audit log entries
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: "desc" },
      }),

      // Deadlines
      prisma.deadline.findMany({
        where: { userId },
        orderBy: { dueDate: "asc" },
      }),

      // Comments
      prisma.comment.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
      }),

      // Article statuses (compliance tracker)
      prisma.articleStatus.findMany({
        where: { userId },
      }),

      // Checklist statuses
      prisma.checklistStatus.findMany({
        where: { userId },
      }),

      // Authorization workflows
      prisma.authorizationWorkflow.findMany({
        where: { userId },
        include: { documents: true },
      }),

      // Scheduled reports
      prisma.scheduledReport.findMany({
        where: { userId },
      }),

      // NCA submissions
      prisma.nCASubmission.findMany({
        where: { userId },
        include: { correspondence: true },
      }),

      // Mission phases
      prisma.missionPhase.findMany({
        where: { userId },
        include: { milestones: true },
      }),
    ]);

    const exportData = {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        dataSubject: userId,
        platform: "Caelex",
        gdprBasis: "Art. 20 GDPR - Right to data portability",
        format: "JSON",
      },
      profile: user,
      organizationMemberships,
      assessments: {
        cybersecurity: cybersecurityAssessments,
        debris: debrisAssessments,
        environmental: environmentalAssessments,
        insurance: insuranceAssessments,
        nis2: nis2Assessments,
        copuos: copuosAssessments,
        ukSpace: ukSpaceAssessments,
        usRegulatory: usRegulatoryAssessments,
        exportControl: exportControlAssessments,
        spectrum: spectrumAssessments,
      },
      complianceTracker: {
        articleStatuses,
        checklistStatuses,
      },
      authorizationWorkflows,
      documents,
      notifications,
      notificationPreference,
      astraConversations,
      auditLogs,
      deadlines,
      missionPhases,
      scheduledReports,
      ncaSubmissions,
      comments,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="caelex-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
