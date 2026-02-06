import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  INCIDENT_CLASSIFICATION,
  calculateSeverity,
  calculateNCADeadline,
  generateIncidentNumber,
  type IncidentCategory,
  type SeverityFactors,
} from "@/lib/services/incident-response-service";

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
    const limit = parseInt(searchParams.get("limit") || "50");
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
        },
        orderBy: { detectedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.incident.count({ where }),
    ]);

    // Add computed fields
    const incidentsWithDeadlines = incidents.map((incident) => {
      const classification =
        INCIDENT_CLASSIFICATION[incident.category as IncidentCategory];
      const ncaDeadline = calculateNCADeadline(
        incident.category as IncidentCategory,
        incident.detectedAt,
      );
      const isOverdue = !incident.reportedToNCA && new Date() > ncaDeadline;

      return {
        ...incident,
        ncaDeadline,
        ncaDeadlineHours: classification?.ncaDeadlineHours || 72,
        isOverdue,
        requiresNCANotification: incident.requiresNCANotification,
      };
    });

    return NextResponse.json({ incidents: incidentsWithDeadlines, total });
  } catch (error) {
    console.error("Error fetching incidents:", error);
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

    const body = await req.json();
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
    } = body;

    // Validate required fields
    if (!category || !title || !description || !detectedAt || !detectedBy) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: category, title, description, detectedAt, detectedBy",
        },
        { status: 400 },
      );
    }

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
      const factors: SeverityFactors = severityFactors || {
        affectedSpacecraft: affectedAssets?.length || 1,
        hasDataLoss: false,
        affectsThirdParty: false,
        isRecurring: false,
        estimatedFinancialImpact: 0,
      };
      severity = calculateSeverity(incidentCategory, factors);
    }

    // Generate incident number
    const incidentNumber = await generateIncidentNumber();

    // Calculate NCA deadline
    const detectionTime = new Date(detectedAt);
    const ncaDeadline = calculateNCADeadline(incidentCategory, detectionTime);

    // Create incident with auto-classification
    const incident = await prisma.incident.create({
      data: {
        supervisionId: config.id,
        incidentNumber,
        category,
        severity,
        status: "detected",
        title,
        description,
        detectedAt: detectionTime,
        detectedBy,
        detectionMethod: detectionMethod || "manual",
        immediateActions: immediateActions || [],
        impactAssessment,
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
      await prisma.supervisionCalendarEvent.create({
        data: {
          supervisionId: config.id,
          eventType: "regulatory_deadline",
          title: `NCA Notification Deadline: ${incidentNumber}`,
          description: `${classification.ncaDeadlineHours}-hour deadline for NCA notification of ${incidentCategory} incident. Severity: ${severity}`,
          dueDate: ncaDeadline,
          status: "pending",
          notes: JSON.stringify({
            incidentId: incident.id,
            incidentNumber,
            category,
            severity,
          }),
        },
      });
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "incident_created",
        entityType: "incident",
        entityId: incident.id,
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

    return NextResponse.json({
      success: true,
      incident: {
        ...incident,
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
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 },
    );
  }
}
