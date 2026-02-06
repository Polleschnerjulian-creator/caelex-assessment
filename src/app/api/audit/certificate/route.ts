/**
 * Compliance Certificate API
 * POST: Generate compliance certificate PDF
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { generateComplianceCertificateData } from "@/lib/services/audit-export-service";
import { ComplianceCertificate } from "@/lib/pdf/reports/compliance-certificate";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Get organization name from request or user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organization: true, name: true, email: true },
    });

    const organizationName = body.organizationName || user?.organization;

    if (!organizationName) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 },
      );
    }

    // Generate certificate data
    const certificateData = await generateComplianceCertificateData(
      userId,
      organizationName,
    );

    // Check if compliance score meets minimum threshold
    if (certificateData.complianceScore < 40) {
      return NextResponse.json(
        {
          error: "Compliance score too low for certificate generation",
          score: certificateData.complianceScore,
          minimumRequired: 40,
          modules: certificateData.modules,
        },
        { status: 400 },
      );
    }

    // Generate PDF
    const startTime = Date.now();
    const element = React.createElement(ComplianceCertificate, {
      data: certificateData,
    });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0],
    );
    const generationTimeMs = Date.now() - startTime;

    // Calculate checksum
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Store certificate record
    const certificate = await prisma.reportArchive.create({
      data: {
        userId,
        reportType: "COMPLIANCE_CERTIFICATE",
        title: `Compliance Certificate - ${certificateData.certificateNumber}`,
        fileName: `certificate-${certificateData.certificateNumber}.pdf`,
        fileSize: buffer.length,
        mimeType: "application/pdf",
        storagePath: `certificates/${userId}/${certificateData.certificateNumber}.pdf`,
        checksum,
        generatedAt: new Date(),
        generationTimeMs,
        periodStart: new Date(),
        periodEnd: certificateData.validUntil,
      },
    });

    // Log the certificate generation
    await logAuditEvent({
      userId,
      action: "compliance_certificate_generated",
      entityType: "audit",
      entityId: certificate.id,
      description: `Generated compliance certificate ${certificateData.certificateNumber}`,
      newValue: {
        certificateNumber: certificateData.certificateNumber,
        complianceScore: certificateData.complianceScore,
        validUntil: certificateData.validUntil.toISOString(),
      },
    });

    // Return PDF
    const filename = `Compliance-Certificate-${certificateData.certificateNumber}.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "X-Certificate-Number": certificateData.certificateNumber,
        "X-Compliance-Score": certificateData.complianceScore.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating compliance certificate:", error);
    return NextResponse.json(
      { error: "Failed to generate compliance certificate" },
      { status: 500 },
    );
  }
}

/**
 * GET: Get certificate status and preview data (without generating PDF)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organization: true },
    });

    if (!user?.organization) {
      return NextResponse.json(
        { error: "Organization name not set in profile" },
        { status: 400 },
      );
    }

    // Generate certificate data (for preview)
    const certificateData = await generateComplianceCertificateData(
      userId,
      user.organization,
    );

    // Get existing certificates
    const existingCertificates = await prisma.reportArchive.findMany({
      where: {
        userId,
        reportType: "COMPLIANCE_CERTIFICATE",
      },
      orderBy: { generatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        generatedAt: true,
        periodEnd: true,
        fileName: true,
      },
    });

    return NextResponse.json({
      preview: {
        organizationName: certificateData.organizationName,
        complianceScore: certificateData.complianceScore,
        isEligible: certificateData.complianceScore >= 40,
        modules: certificateData.modules,
        attestations: certificateData.attestations,
      },
      recentCertificates: existingCertificates.map((cert) => ({
        id: cert.id,
        title: cert.title,
        generatedAt: cert.generatedAt,
        validUntil: cert.periodEnd,
        fileName: cert.fileName,
      })),
    });
  } catch (error) {
    console.error("Error fetching certificate status:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificate status" },
      { status: 500 },
    );
  }
}
