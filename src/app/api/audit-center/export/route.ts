/**
 * Audit Center Export API
 * POST: Generate audit package (PDF report or ZIP with evidence documents)
 */

export const maxDuration = 60; // Allow up to 60s for PDF generation

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import {
  generateAuditPackageData,
  getAcceptedEvidenceDocuments,
} from "@/lib/services/audit-package-service.server";
import { AuditCenterReport } from "@/lib/pdf/reports/audit-center-report";
import { exportAuditLogs } from "@/lib/audit";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  getR2Client,
  getR2BucketName,
  isR2Configured,
} from "@/lib/storage/r2-client";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit
    const rateLimitResult = await checkRateLimit("export", userId);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Resolve organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const format = body.format || "pdf";

    const ctx = getRequestContext(request);

    if (format === "pdf") {
      // Generate PDF report
      const reportData = await generateAuditPackageData(
        membership.organizationId,
        userId,
      );

      const element = React.createElement(AuditCenterReport, {
        data: reportData,
      });
      const buffer = await renderToBuffer(
        element as unknown as Parameters<typeof renderToBuffer>[0],
      );

      // Log export
      await logAuditEvent({
        userId,
        action: "audit_package_exported",
        entityType: "compliance_evidence",
        entityId: membership.organizationId,
        newValue: {
          format: "pdf",
          complianceScore: reportData.complianceScore,
        },
        description: "Generated Audit Center PDF report",
        ...ctx,
      });

      const filename = `Audit-Center-Report-${new Date().toISOString().split("T")[0]}.pdf`;
      return new NextResponse(Buffer.from(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": buffer.length.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });
    }

    if (format === "zip") {
      // Generate ZIP with PDF report + evidence documents + audit trail CSV
      const archiver = (await import("archiver")).default;

      const reportData = await generateAuditPackageData(
        membership.organizationId,
        userId,
      );

      // Generate PDF buffer
      const pdfElement = React.createElement(AuditCenterReport, {
        data: reportData,
      });
      const pdfBuffer = await renderToBuffer(
        pdfElement as unknown as Parameters<typeof renderToBuffer>[0],
      );

      // Generate CSV audit trail
      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const csvData = await exportAuditLogs(userId, threeMonthsAgo, now, "csv");

      // Build ZIP
      const archive = archiver("zip", { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => chunks.push(chunk));

      // Add PDF report
      archive.append(Buffer.from(pdfBuffer), {
        name: "report/Audit-Center-Report.pdf",
      });

      // Add audit trail CSV
      if (typeof csvData === "string") {
        archive.append(csvData, { name: "audit-trail/audit-log.csv" });
      }

      // Add evidence documents from R2
      if (isR2Configured()) {
        const r2Client = getR2Client();
        const bucketName = getR2BucketName();
        const evidenceDocs = await getAcceptedEvidenceDocuments(
          membership.organizationId,
        );

        for (const evDoc of evidenceDocs) {
          if (evDoc.document.storagePath && r2Client) {
            try {
              const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: evDoc.document.storagePath,
              });
              const response = await r2Client.send(command);
              if (response.Body) {
                const bodyBytes = await response.Body.transformToByteArray();
                const folder = evDoc.regulationType
                  .toLowerCase()
                  .replace(/_/g, "-");
                archive.append(Buffer.from(bodyBytes), {
                  name: `evidence/${folder}/${evDoc.document.fileName}`,
                });
              }
            } catch {
              // Skip files that can't be downloaded — don't break the ZIP
            }
          }
        }
      }

      await archive.finalize();

      // Wait for all chunks
      await new Promise<void>((resolve) => archive.on("end", resolve));

      const zipBuffer = Buffer.concat(chunks);

      // Log export
      await logAuditEvent({
        userId,
        action: "audit_package_exported",
        entityType: "compliance_evidence",
        entityId: membership.organizationId,
        newValue: {
          format: "zip",
          complianceScore: reportData.complianceScore,
          sizeBytes: zipBuffer.length,
        },
        description: "Generated Audit Center ZIP package",
        ...ctx,
      });

      const filename = `Audit-Package-${new Date().toISOString().split("T")[0]}.zip`;
      return new NextResponse(zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": zipBuffer.length.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format. Use 'pdf' or 'zip'" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Audit export error:", error);
    return NextResponse.json(
      { error: "Failed to generate audit package" },
      { status: 500 },
    );
  }
}
