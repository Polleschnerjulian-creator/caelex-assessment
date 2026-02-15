import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";

// GET /api/supervision/reports - List reports
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ reports: [], total: 0 });
    }

    const where: Record<string, unknown> = { supervisionId: config.id };
    if (reportType) where.reportType = reportType;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.supervisionReport.findMany({
        where,
        orderBy: { dueDate: "asc" },
        take: limit,
      }),
      prisma.supervisionReport.count({ where }),
    ]);

    // Decrypt sensitive fields
    const decryptedReports = await Promise.all(
      reports.map(async (report) => ({
        ...report,
        content:
          report.content && isEncrypted(report.content)
            ? await decrypt(report.content)
            : report.content,
        rejectionReason:
          report.rejectionReason && isEncrypted(report.rejectionReason)
            ? await decrypt(report.rejectionReason)
            : report.rejectionReason,
      })),
    );

    return NextResponse.json({ reports: decryptedReports, total });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}

// POST /api/supervision/reports - Create new report
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
        { error: "Supervision not configured" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { reportType, reportPeriod, title, dueDate, content } = body;

    if (!reportType || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Encrypt content before storage
    const contentString = content ? JSON.stringify(content) : null;
    const encryptedContent = contentString
      ? await encrypt(contentString)
      : null;

    const report = await prisma.supervisionReport.create({
      data: {
        supervisionId: config.id,
        reportType,
        reportPeriod,
        title,
        dueDate: new Date(dueDate),
        content: encryptedContent,
        status: "draft",
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        content: contentString, // Return plaintext, not encrypted
      },
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 },
    );
  }
}
