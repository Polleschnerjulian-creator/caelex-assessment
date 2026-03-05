import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import { parsePaginationLimit } from "@/lib/validations";
import {
  INCIDENT_CLASSIFICATION,
  calculateSeverity,
  calculateNCADeadline,
  generateIncidentNumber,
  type IncidentCategory,
  type SeverityFactors,
} from "@/lib/services/incident-response-service";
import { logger } from "@/lib/logger";

// GET /api/supervision/incidents - List incidents
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const limit = parsePaginationLimit(searchParams.get("limit"));
    const offset = parseInt(searchParams.get("offset") || "0");

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ incidents: [], total: 0 });
    }

    const where: Record<string, unknown> = { supervisionId: config.id };
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          affectedAssets: true,
          attachments: true,
          nis2Phases: {
            orderBy: { deadline: "asc" },
          },
        },
        orderBy: { detectedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.incident.count({ where }),
    ]);

    // Add computed fields and decrypt sensitive fields
    const incidentsWithDeadlines = await Promise.all(
      incidents.map(async (incident) => {
        const classification =
          INCIDENT_CLASSIFICATION[incident.category as IncidentCategory];
        const ncaDeadline = calculateNCADeadline(
          incident.category as IncidentCategory,
          incident.detectedAt,
        );
        const isOverdue = !incident.reportedToNCA && new Date() > ncaDeadline;

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

        // Compute NIS2 phase summary
        const now = Date.now();
        const phases = incident.nis2Phases || [];
        const submittedPhases = phases.filter(
          (p) => p.status === "submitted",
        ).length;
        const overduePhases = phases.filter(
          (p) => p.status !== "submitted" && now > p.deadline.getTime(),
        ).length;
        const nextPending = phases.find(
          (p) => p.status !== "submitted" && p.deadline.getTime() > now,
        );
        const pendingPhases = phases.filter((p) => p.status !== "submitted");
        const urgentDeadlineMs =
          pendingPhases.length > 0
            ? Math.min(...pendingPhases.map((p) => p.deadline.getTime() - now))
            : null;

        return {
          ...incident,
          description: decryptedDescription,
          rootCause: decryptedRootCause,
          impactAssessment: decryptedImpactAssessment,
          lessonsLearned: decryptedLessonsLearned,
          ncaDeadline,
          ncaDeadlineHours: classification?.ncaDeadlineHours || 72,
          isOverdue,
          requiresNCANotification: incident.requiresNCANotification,
          nis2PhasesSummary: {
            total: phases.length,
            submitted: submittedPhases,
            overdue: overduePhases,
            nextDeadline: nextPending?.deadline.toISOString() || null,
            nextPhase: nextPending?.phase || null,
          },
          urgentDeadlineMs,
        };
      }),
    );

    return NextResponse.json({ incidents: incidentsWithDeadlines, total });
  } catch (error) {
    logger.error("Error fetching incidents", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 },
    );
  }
}

// POST /api/supervision/incidents - Create new incident with auto-classification
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Supervision not configured. Please set up your NCA first." },
        { status: 400 },
      );
    }

    const incidentSchema = z.object({
      category: z.string().min(1),
      severity: z.string().optional(),
      title: z.string().min(1),
      description: z.string().min(1),
      detectedAt: z.string().min(1),
      detectedBy: z.string().min(1),
      detectionMethod: z.string().optional(),
      affectedAssets: z
        .array(
          z.object({
            cosparId: z.string().optional(),
            noradId: z.string().optional(),
            assetName: z.string(),
          }),
        )
        .optional(),
      immediateActions: z.array(z.string()).optional(),
      impactAssessment: z.string().optional(),
      severityFactors: z
        .object({
          affectedSpacecraft: z.number().optional(),
          hasDataLoss: z.boolean().optional(),
          affectsThirdParty: z.boolean().optional(),
          isRecurring: z.boolean().optional(),
          estimatedFinancialImpact: z.number().optional(),
        })
        .optional(),
    });

    const body = await req.json();
    const parsed = incidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      category,
      severity: providedSeverity,
      title,
      description,
      detectedAt,
      detectedBy,
      detectionMethod,
      affectedAssets,
      immediateActions,
      impactAssessment,
      // Severity factors for auto-classification
      severityFactors,
    } = parsed.data;

    // Validate category
    const validCategories = Object.keys(INCIDENT_CLASSIFICATION);
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const incidentCategory = category as IncidentCategory;
    const classification = INCIDENT_CLASSIFICATION[incidentCategory];

    // Auto-calculate severity if not provided
    let severity = providedSeverity;
    if (!severity) {
      const factors: SeverityFactors = {
        affectedAssetCount:
          severityFactors?.affectedSpacecraft ?? affectedAssets?.length ?? 1,
        hasDebrisGenerated: false,
        hasDataBreach: severityFactors?.hasDataLoss ?? false,
        hasThirdPartyImpact: severityFactors?.affectsThirdParty ?? false,
        hasMediaAttention: false,
        isRecurring: severityFactors?.isRecurring ?? false,
      };
      severity = calculateSeverity(incidentCategory, factors);
    }

    // Generate incident number
    const incidentNumber = await generateIncidentNumber();

    // Calculate NCA deadline
    const detectionTime = new Date(detectedAt);
    const ncaDeadline = calculateNCADeadline(incidentCategory, detectionTime);

    // Encrypt sensitive fields before storage
    const encryptedDescription = await encrypt(description);
    const encryptedImpactAssessment = impactAssessment
      ? await encrypt(impactAssessment)
      : undefined;

    // Create incident + calendar event + audit log atomically
    const incident = await prisma.$transaction(async (tx) => {
      // Create incident with auto-classification
      const newIncident = await tx.incident.create({
        data: {
          supervisionId: config.id,
          incidentNumber,
          category,
          severity,
          status: "detected",
          title,
          description: encryptedDescription,
          detectedAt: detectionTime,
          detectedBy,
          detectionMethod: detectionMethod || "manual",
          immediateActions: immediateActions || [],
          impactAssessment: encryptedImpactAssessment,
          requiresNCANotification: classification.requiresNCANotification,
          affectedAssets: affectedAssets?.length
            ? {
                create: affectedAssets.map(
                  (asset: {
                    cosparId?: string;
                    noradId?: string;
                    assetName: string;
                  }) => ({
                    cosparId: asset.cosparId,
                    noradId: asset.noradId,
                    assetName: asset.assetName,
                  }),
                ),
              }
            : undefined,
        },
        include: {
          affectedAssets: true,
        },
      });

      // Create calendar event for NCA deadline if notification required
      if (classification.requiresNCANotification) {
        await tx.supervisionCalendarEvent.create({
          data: {
            supervisionId: config.id,
            eventType: "regulatory_deadline",
            title: `NCA Notification Deadline: ${incidentNumber}`,
            description: `${classification.ncaDeadlineHours}-hour deadline for NCA notification of ${incidentCategory} incident. Severity: ${severity}`,
            dueDate: ncaDeadline,
            status: "pending",
            notes: JSON.stringify({
              incidentId: newIncident.id,
              incidentNumber,
              category,
              severity,
            }),
          },
        });
      }

      // Log audit event
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "incident_created",
          entityType: "incident",
          entityId: newIncident.id,
          newValue: JSON.stringify({
            incidentNumber,
            category,
            severity,
            title,
            autoClassified: !providedSeverity,
            requiresNCANotification: classification.requiresNCANotification,
            ncaDeadline: ncaDeadline.toISOString(),
          }),
          description: `Created incident ${incidentNumber}: ${title} (${severity} severity, ${classification.ncaDeadlineHours}h NCA deadline)`,
        },
      });

      return newIncident;
    });

    return NextResponse.json({
      success: true,
      incident: {
        ...incident,
        description, // Return plaintext, not encrypted
        impactAssessment: impactAssessment || null, // Return plaintext, not encrypted
        ncaDeadline,
        ncaDeadlineHours: classification.ncaDeadlineHours,
        autoClassified: !providedSeverity,
      },
      classification: {
        severity,
        ncaDeadlineHours: classification.ncaDeadlineHours,
        requiresNCANotification: classification.requiresNCANotification,
        articleReference: classification.articleRef,
      },
    });
  } catch (error) {
    logger.error("Error creating incident", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 },
    );
  }
}
