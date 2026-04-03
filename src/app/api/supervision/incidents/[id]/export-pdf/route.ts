import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/encryption";
import { generateDocumentPDF } from "@/lib/pdf/jspdf-generator";
import {
  buildNCAIncidentReportConfig,
  type NCAIncidentReportData,
} from "@/lib/pdf/reports/nca-incident-report";
import {
  INCIDENT_CLASSIFICATION,
  type IncidentCategory,
} from "@/lib/services/incident-response-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/supervision/incidents/[id]/export-pdf
 *
 * Generate and download a PDF report for an incident.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    // Fetch incident with all relations and verify ownership
    const incident = await prisma.incident.findFirst({
      where: { id },
      include: {
        supervision: {
          include: {
            user: {
              select: { name: true, email: true, organization: true },
            },
          },
        },
        affectedAssets: true,
        attachments: true,
        nis2Phases: { orderBy: { deadline: "asc" } },
      },
    });

    if (!incident) {
      return new Response("Not found", { status: 404 });
    }

    // Verify ownership
    if (incident.supervision.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const category = incident.category as IncidentCategory;
    const classification = INCIDENT_CLASSIFICATION[category];

    // Decrypt sensitive fields
    const decryptedDescription =
      incident.description && isEncrypted(incident.description)
        ? await decrypt(incident.description)
        : incident.description;
    const decryptedRootCause =
      incident.rootCause && isEncrypted(incident.rootCause)
        ? await decrypt(incident.rootCause)
        : incident.rootCause;
    const decryptedImpactAssessment =
      incident.impactAssessment && isEncrypted(incident.impactAssessment)
        ? await decrypt(incident.impactAssessment)
        : incident.impactAssessment;
    const decryptedLessonsLearned =
      incident.lessonsLearned && isEncrypted(incident.lessonsLearned)
        ? await decrypt(incident.lessonsLearned)
        : incident.lessonsLearned;

    // Build report data for the NCA incident report template
    const reportData: NCAIncidentReportData = {
      incidentNumber: incident.incidentNumber,
      reportDate: new Date(),
      organization: incident.supervision.user?.organization || undefined,
      generatedBy: session.user.name || session.user.email || "Unknown",

      title: incident.title,
      category: incident.category,
      categoryDescription: classification?.description || incident.category,
      severity: incident.severity,
      status: incident.status,
      articleReference: classification?.articleRef || "N/A",

      detectedAt: incident.detectedAt,
      detectedBy: incident.detectedBy,
      detectionMethod: incident.detectionMethod,
      containedAt: incident.containedAt || undefined,
      resolvedAt: incident.resolvedAt || undefined,

      description: decryptedDescription || "",
      rootCause: decryptedRootCause || undefined,
      impactAssessment: decryptedImpactAssessment || undefined,

      affectedAssets: incident.affectedAssets.map((a) => ({
        name: a.assetName,
        cosparId: a.cosparId || undefined,
        noradId: a.noradId || undefined,
      })),

      immediateActions: incident.immediateActions as string[],
      containmentMeasures: incident.containmentMeasures as string[],
      resolutionSteps: incident.resolutionSteps as string[],
      lessonsLearned: decryptedLessonsLearned || undefined,

      requiresNCANotification: incident.requiresNCANotification,
      ncaDeadlineHours: classification?.ncaDeadlineHours || 72,
      reportedToNCA: incident.reportedToNCA,
      ncaReportDate: incident.ncaReportDate || undefined,
      ncaReferenceNumber: incident.ncaReferenceNumber || undefined,
      reportedToEUSPA: incident.reportedToEUSPA,

      contactName: incident.supervision.designatedContactName || undefined,
      contactEmail: incident.supervision.designatedContactEmail || undefined,
      contactPhone: incident.supervision.designatedContactPhone || undefined,
      contactRole: incident.supervision.designatedContactRole || undefined,
    };

    // Build report config and generate PDF
    const config = buildNCAIncidentReportConfig(reportData);
    const pdfBlob = generateDocumentPDF(
      config.metadata.title,
      config.sections,
      {
        documentCode: incident.incidentNumber,
        organizationName: reportData.organization,
        classification: "OFFICIAL - SENSITIVE",
        version: "1.0",
      },
    );

    // Convert Blob to ArrayBuffer for response
    const arrayBuffer = await pdfBlob.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="incident-${incident.incidentNumber || id}.pdf"`,
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    logger.error("Error generating incident PDF", error);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
