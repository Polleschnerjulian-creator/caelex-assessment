import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nationalAuthorities } from "@/data/national-authorities";

// GET /api/supervision - Get supervision config and overview
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
      include: {
        incidents: {
          orderBy: { detectedAt: "desc" },
          take: 5,
        },
        reports: {
          orderBy: { dueDate: "asc" },
          where: {
            status: { in: ["draft", "ready"] },
          },
          take: 5,
        },
        calendarEvents: {
          orderBy: { dueDate: "asc" },
          where: {
            status: { in: ["upcoming", "in_progress"] },
            dueDate: { gte: new Date() },
          },
          take: 10,
        },
      },
    });

    if (!config) {
      return NextResponse.json({ configured: false });
    }

    // Get NCA details
    const primaryNCA = nationalAuthorities[config.primaryCountry];
    const additionalNCAs = config.additionalCountries
      .map((code) => nationalAuthorities[code])
      .filter(Boolean);

    // Get statistics
    const [totalIncidents, openIncidents, pendingReports, upcomingEvents] =
      await Promise.all([
        prisma.incident.count({ where: { supervisionId: config.id } }),
        prisma.incident.count({
          where: {
            supervisionId: config.id,
            status: { in: ["detected", "investigating", "contained"] },
          },
        }),
        prisma.supervisionReport.count({
          where: {
            supervisionId: config.id,
            status: { in: ["draft", "ready"] },
          },
        }),
        prisma.supervisionCalendarEvent.count({
          where: {
            supervisionId: config.id,
            status: "upcoming",
            dueDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    return NextResponse.json({
      configured: true,
      config: {
        ...config,
        primaryNCA,
        additionalNCAs,
      },
      stats: {
        totalIncidents,
        openIncidents,
        pendingReports,
        upcomingEvents,
      },
    });
  } catch (error) {
    console.error("Error fetching supervision config:", error);
    return NextResponse.json(
      { error: "Failed to fetch supervision configuration" },
      { status: 500 },
    );
  }
}

// POST /api/supervision - Create or update supervision config
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      primaryCountry,
      additionalCountries,
      designatedContactName,
      designatedContactEmail,
      designatedContactPhone,
      designatedContactRole,
      communicationLanguage,
      notificationMethod,
      enableAutoReminders,
      reminderDaysAdvance,
    } = body;

    // Validate primary country
    if (!primaryCountry || !nationalAuthorities[primaryCountry]) {
      return NextResponse.json(
        { error: "Invalid primary country" },
        { status: 400 },
      );
    }

    const config = await prisma.supervisionConfig.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        primaryCountry,
        additionalCountries: additionalCountries || [],
        designatedContactName,
        designatedContactEmail,
        designatedContactPhone,
        designatedContactRole,
        communicationLanguage: communicationLanguage || "en",
        notificationMethod: notificationMethod || "email",
        enableAutoReminders: enableAutoReminders ?? true,
        reminderDaysAdvance: reminderDaysAdvance || 14,
      },
      update: {
        primaryCountry,
        additionalCountries: additionalCountries || [],
        designatedContactName,
        designatedContactEmail,
        designatedContactPhone,
        designatedContactRole,
        communicationLanguage: communicationLanguage || "en",
        notificationMethod: notificationMethod || "email",
        enableAutoReminders: enableAutoReminders ?? true,
        reminderDaysAdvance: reminderDaysAdvance || 14,
      },
    });

    // Create default calendar events for annual report
    const existingAnnualReport =
      await prisma.supervisionCalendarEvent.findFirst({
        where: {
          supervisionId: config.id,
          eventType: "report_due",
          title: { contains: "Annual Compliance Report" },
        },
      });

    if (!existingAnnualReport) {
      const nextYear = new Date().getFullYear() + 1;
      await prisma.supervisionCalendarEvent.create({
        data: {
          supervisionId: config.id,
          eventType: "report_due",
          title: `Annual Compliance Report ${nextYear}`,
          description:
            "Comprehensive yearly report on authorization compliance per EU Space Act Art. 45",
          dueDate: new Date(`${nextYear}-01-31`),
          reminderDays: [30, 14, 7],
          status: "upcoming",
        },
      });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error saving supervision config:", error);
    return NextResponse.json(
      { error: "Failed to save supervision configuration" },
      { status: 500 },
    );
  }
}
