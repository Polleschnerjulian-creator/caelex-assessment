/**
 * Document Upload URL API
 * POST - Generate presigned upload URL for direct client upload to R2
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  generatePresignedUploadUrl,
  isR2Configured,
  type DocumentCategory,
} from "@/lib/storage/upload-service";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/storage/r2-client";
import { logger } from "@/lib/logger";

interface UploadUrlRequest {
  filename: string;
  mimeType: string;
  fileSize: number;
  category: DocumentCategory;
  organizationId?: string;
  documentId?: string;
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

    const uploadUrlSchema = z.object({
      filename: z.string().min(1, "filename is required"),
      mimeType: z.string().min(1, "mimeType is required"),
      fileSize: z.number().positive("fileSize must be positive"),
      category: z.string().min(1, "category is required"),
      organizationId: z.string().optional(),
      documentId: z.string().optional(),
    });

    const body = await request.json();
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      filename,
      mimeType,
      fileSize,
      category,
      organizationId,
      documentId,
    } = parsed.data;

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 },
      );
    }

    // If organizationId is provided, verify the user is a member of that organization
    if (organizationId) {
      const member = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId },
      });
      if (!member) {
        return NextResponse.json(
          { error: "You do not have access to this organization" },
          { status: 403 },
        );
      }
    }

    // H-API3 fix: if documentId is supplied, verify ownership BEFORE
    // issuing the presigned PUT. Otherwise a user could overwrite any
    // document's R2 blob by naming its id in the body.
    if (documentId) {
      const existing = await prisma.document.findFirst({
        where: {
          id: documentId,
          OR: [
            { userId: session.user.id },
            ...(organizationId ? [{ organizationId }] : []),
          ],
        },
        select: { id: true },
      });
      if (!existing) {
        logger.warn("Upload-URL requested for foreign documentId", {
          documentId,
          userId: session.user.id,
        });
        return NextResponse.json(
          { error: "Document not found or access denied" },
          { status: 404 },
        );
      }
    }

    // Use user ID or organization ID for file organization
    const ownerId = organizationId || session.user.id;

    // H-D4: shorter TTL for presigned URLs — 300s instead of 1h.
    // A leaked URL is only valid for 5 minutes instead of a full hour.
    const PRESIGN_TTL_SECONDS = 300;

    // Generate presigned upload URL
    const result = await generatePresignedUploadUrl(
      ownerId,
      category as DocumentCategory,
      filename,
      mimeType,
      fileSize,
      documentId,
      PRESIGN_TTL_SECONDS,
    );

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      fileKey: result.fileKey,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    logger.error("Error generating upload URL", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to generate upload URL") },
      { status: 500 },
    );
  }
}
