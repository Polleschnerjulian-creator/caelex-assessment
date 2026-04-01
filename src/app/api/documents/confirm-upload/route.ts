/**
 * Confirm Document Upload API
 * POST - Confirms upload completed and creates database record
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { serverAnalytics } from "@/lib/analytics";
import {
  fileExists,
  getFileMetadata,
  isR2Configured,
} from "@/lib/storage/upload-service";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/services/notification-service";

interface ConfirmUploadRequest {
  fileKey: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  moduleType?: string;
  issueDate?: string;
  expiryDate?: string;
  regulatoryRef?: string;
  accessLevel?: string;
  tags?: string[];
  organizationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "File storage not configured" },
        { status: 503 },
      );
    }

    const confirmUploadSchema = z.object({
      fileKey: z.string().min(1, "fileKey is required"),
      name: z.string().min(1, "name is required"),
      description: z.string().optional(),
      category: z.string().min(1, "category is required"),
      subcategory: z.string().optional(),
      moduleType: z.string().optional(),
      issueDate: z.string().optional(),
      expiryDate: z.string().optional(),
      regulatoryRef: z.string().optional(),
      accessLevel: z
        .enum([
          "PUBLIC",
          "INTERNAL",
          "CONFIDENTIAL",
          "RESTRICTED",
          "TOP_SECRET",
        ])
        .optional()
        .default("INTERNAL"),
      tags: z.array(z.string()).optional().default([]),
      organizationId: z.string().optional(),
    });

    const body = await request.json();
    const parsed = confirmUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      fileKey,
      name,
      description,
      category,
      subcategory,
      moduleType,
      issueDate,
      expiryDate,
      regulatoryRef,
      accessLevel,
      tags,
    } = parsed.data;

    // Verify file exists in R2
    const exists = await fileExists(fileKey);
    if (!exists) {
      return NextResponse.json(
        { error: "File not found. Please upload the file first." },
        { status: 404 },
      );
    }

    // Get file metadata from R2
    const metadata = await getFileMetadata(fileKey);
    if (!metadata) {
      return NextResponse.json(
        { error: "Could not retrieve file metadata" },
        { status: 500 },
      );
    }

    // Extract filename from fileKey
    const fileName = fileKey.split("/").pop() || name;

    // Generate checksum from etag (if available)
    const checksum = metadata.etag
      ? metadata.etag.replace(/"/g, "")
      : crypto.createHash("md5").update(fileKey).digest("hex");

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        fileName,
        fileSize: metadata.contentLength,
        mimeType: metadata.contentType,
        category: category as
          | "LICENSE"
          | "PERMIT"
          | "AUTHORIZATION"
          | "CERTIFICATE"
          | "ISO_CERTIFICATE"
          | "SECURITY_CERT"
          | "INSURANCE_POLICY"
          | "INSURANCE_CERT"
          | "COMPLIANCE_REPORT"
          | "AUDIT_REPORT"
          | "INCIDENT_REPORT"
          | "ANNUAL_REPORT"
          | "TECHNICAL_SPEC"
          | "DESIGN_DOC"
          | "TEST_REPORT"
          | "SAFETY_ANALYSIS"
          | "CONTRACT"
          | "NDA"
          | "SLA"
          | "REGULATORY_FILING"
          | "CORRESPONDENCE"
          | "NOTIFICATION"
          | "POLICY"
          | "PROCEDURE"
          | "TRAINING"
          | "OTHER",
        subcategory: subcategory || null,
        tags,
        storagePath: fileKey,
        checksum,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        moduleType: moduleType as
          | "AUTHORIZATION"
          | "DEBRIS"
          | "INSURANCE"
          | "CYBERSECURITY"
          | "ENVIRONMENTAL"
          | "SUPERVISION"
          | "REGISTRATION"
          | "TIMELINE"
          | "DOCUMENTS"
          | null,
        regulatoryRef: regulatoryRef || null,
        accessLevel: accessLevel as
          | "PUBLIC"
          | "INTERNAL"
          | "CONFIDENTIAL"
          | "RESTRICTED"
          | "TOP_SECRET",
        uploadedBy: session.user.id,
        status: "DRAFT",
        storageProvider: "R2",
      },
    });

    // CRA Evidence Auto-Linking (best-effort, does not block the response)
    try {
      const { matchDocumentToCRA } =
        await import("@/lib/cra-evidence-matcher.server");
      const matches = matchDocumentToCRA(
        name,
        category,
        tags || [],
        metadata.contentType,
      );

      if (matches.length > 0 && document.organizationId) {
        // Find org's active CRA assessments
        const craAssessments = await prisma.cRAAssessment.findMany({
          where: {
            organizationId: document.organizationId,
            isOutOfScope: false,
          },
          select: { id: true, productName: true },
        });

        if (craAssessments.length > 0) {
          // Create evidence records for the top matches (max 3 to avoid noise)
          const topMatches = matches.slice(0, 3);
          for (const match of topMatches) {
            try {
              await prisma.complianceEvidence.create({
                data: {
                  organizationId: document.organizationId,
                  createdBy: session.user.id,
                  regulationType: "CYBERSECURITY",
                  requirementId: match.requirementId,
                  title: `Auto-linked: ${name}`,
                  description: match.reason,
                  // Use OTHER since AUTOMATED is not an EvidenceType;
                  // sourceType = DOCUMENT_UPLOAD marks it as auto-generated
                  evidenceType: "OTHER",
                  status: "DRAFT",
                  sourceType: "DOCUMENT_UPLOAD",
                  confidence: match.coveragePercent / 100,
                  metadata: {
                    autoLinked: true,
                    matchConfidence: match.confidence,
                    mappingType: match.mappingType,
                    coveragePercent: match.coveragePercent,
                    documentCategory: category,
                  },
                  documents: {
                    create: { documentId: document.id },
                  },
                },
              });

              // Notify the uploading user about the auto-link
              await createNotification({
                userId: session.user.id,
                type: "COMPLIANCE_UPDATED",
                title: "CRA-Evidenz automatisch verknüpft",
                message: `"${name}" wurde automatisch mit CRA-Requirement ${match.requirementId} verknüpft (${match.confidence} confidence). Bitte überprüfen.`,
                actionUrl: `/dashboard/modules/cra`,
                entityType: "document",
                entityId: document.id,
                severity: "INFO",
                organizationId: document.organizationId,
              });
            } catch (innerErr) {
              // A unique-constraint violation means evidence already exists — skip silently
              logger.warn(
                `CRA auto-link skipped for requirement ${match.requirementId}`,
                innerErr,
              );
            }
          }
        }
      }
    } catch (err) {
      // Silent fail — auto-linking is best-effort and must not break document upload
      logger.warn("CRA evidence auto-linking failed", err);
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "document_uploaded",
        entityType: "document",
        entityId: document.id,
        newValue: JSON.stringify({
          name,
          category,
          fileName,
          fileSize: metadata.contentLength,
          storageProvider: "R2",
        }),
        description: `Uploaded document to R2: ${name}`,
      },
    });

    // Log document access
    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: "VERSION_CREATED",
        details: JSON.stringify({ version: 1, storageProvider: "R2" }),
      },
    });

    // Track document upload
    serverAnalytics.track(
      "document_uploaded",
      {
        category: document.category,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
      },
      { userId: session.user.id, category: "engagement" },
    );

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        category: document.category,
        status: document.status,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    logger.error("Error confirming upload", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to confirm upload") },
      { status: 500 },
    );
  }
}
