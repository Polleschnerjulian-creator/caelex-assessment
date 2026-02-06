/**
 * Document Upload URL API
 * POST - Generate presigned upload URL for direct client upload to R2
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  generatePresignedUploadUrl,
  isR2Configured,
  type DocumentCategory,
} from "@/lib/storage/upload-service";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/storage/r2-client";

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

    const body: UploadUrlRequest = await request.json();
    const {
      filename,
      mimeType,
      fileSize,
      category,
      organizationId,
      documentId,
    } = body;

    // Validate required fields
    if (!filename || !mimeType || !fileSize || !category) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: filename, mimeType, fileSize, category",
        },
        { status: 400 },
      );
    }

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

    // Use user ID or organization ID for file organization
    const ownerId = organizationId || session.user.id;

    // Generate presigned upload URL
    const result = await generatePresignedUploadUrl(
      ownerId,
      category,
      filename,
      mimeType,
      fileSize,
      documentId,
      3600, // 1 hour expiration
    );

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      fileKey: result.fileKey,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to generate upload URL") },
      { status: 500 },
    );
  }
}
