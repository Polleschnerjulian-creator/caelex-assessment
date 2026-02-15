import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { calculateComplianceScore } from "@/lib/services/compliance-scoring-service";
import {
  ComplianceSummaryPDF,
  type ComplianceSummaryData,
} from "@/lib/pdf/reports/compliance-summary";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scoreData = await calculateComplianceScore(session.user.id);

    // Get organization name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        organization: true,
        organizationMemberships: {
          select: {
            organization: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    const orgName =
      user?.organizationMemberships?.[0]?.organization?.name ||
      user?.organization ||
      "My Organization";

    const reportData: ComplianceSummaryData = {
      reportNumber: `CSR-${Date.now().toString(36).toUpperCase()}`,
      reportDate: new Date(),
      organization: orgName,
      generatedBy: user?.name || "Caelex Platform",
      overall: scoreData.overall,
      grade: scoreData.grade,
      status: scoreData.status,
      breakdown: scoreData.breakdown,
      recommendations: scoreData.recommendations || [],
    };

    const pdfBuffer = await renderToBuffer(
      <ComplianceSummaryPDF data={reportData} />,
    );

    const filename = `compliance-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating compliance PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
