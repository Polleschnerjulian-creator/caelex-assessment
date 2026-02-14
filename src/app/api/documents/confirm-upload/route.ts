/**
 * Confirm Document Upload API
 * POST - Confirms upload completed and creates database record
 */

import { NextRequest, NextResponse } from "next/server";
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

    const body: ConfirmUploadRequest = await request.json();
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
      accessLevel = "INTERNAL",
      tags = [],
    } = body;

    // Validate required fields
    if (!fileKey || !name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: fileKey, name, category" },
        { status: 400 },
      );
    }

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
    console.error("Error confirming upload:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to confirm upload") },
      { status: 500 },
    );
  }
}
