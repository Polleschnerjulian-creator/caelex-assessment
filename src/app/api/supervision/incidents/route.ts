import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateIncidentNumber } from "@/data/national-authorities";

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

    return NextResponse.json({ incidents, total });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 },
    );
  }
}

// POST /api/supervision/incidents - Create new incident
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
      severity,
      title,
      description,
      detectedAt,
      detectedBy,
      detectionMethod,
      affectedAssets,
      immediateActions,
      impactAssessment,
    } = body;

    // Validate required fields
    if (
      !category ||
      !severity ||
      !title ||
      !description ||
      !detectedAt ||
      !detectedBy
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Generate incident number
    const year = new Date().getFullYear();
    const incidentCount = await prisma.incident.count({
      where: {
        incidentNumber: { startsWith: `INC-${year}` },
      },
    });
    const incidentNumber = generateIncidentNumber(year, incidentCount + 1);

    const incident = await prisma.incident.create({
      data: {
        supervisionId: config.id,
        incidentNumber,
        category,
        severity,
        status: "detected",
        title,
        description,
        detectedAt: new Date(detectedAt),
        detectedBy,
        detectionMethod: detectionMethod || "manual",
        immediateActions: immediateActions || [],
        impactAssessment,
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
        }),
        description: `Created incident ${incidentNumber}: ${title}`,
      },
    });

    return NextResponse.json({ success: true, incident });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 },
    );
  }
}
