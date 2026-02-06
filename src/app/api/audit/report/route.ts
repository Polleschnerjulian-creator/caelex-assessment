/**
 * Audit Report API
 * POST: Generate audit trail PDF report
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { generateAuditReportData } from "@/lib/services/audit-export-service";
import { AuditReport } from "@/lib/pdf/reports/audit-report";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Parse request body
    const {
      startDate,
      endDate,
      actions,
      entityTypes,
      includeSecurityEvents = false,
    } = body;

    // Get user organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organization: true, name: true, email: true },
    });

    // Generate report data
    const reportData = await generateAuditReportData(
      userId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        actions,
        entityTypes,
        includeSecurityEvents,
      },
      user?.organization || undefined,
    );

    // Generate PDF
    const element = React.createElement(AuditReport, { data: reportData });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0],
    );

    // Log the report generation
    await logAuditEvent({
      userId,
      action: "audit_report_generated",
      entityType: "audit",
      entityId: userId,
      description: `Generated audit report for period ${reportData.period.from.toISOString().split("T")[0]} to ${reportData.period.to.toISOString().split("T")[0]}`,
      newValue: {
        totalEvents: reportData.summary.totalEvents,
        period: {
          from: reportData.period.from.toISOString(),
          to: reportData.period.to.toISOString(),
        },
      },
    });

    // Return PDF
    const filename = `Audit-Report-${reportData.period.from.toISOString().split("T")[0]}-to-${reportData.period.to.toISOString().split("T")[0]}.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating audit report:", error);
    return NextResponse.json(
      { error: "Failed to generate audit report" },
      { status: 500 },
    );
  }
}
