/**
 * Server-side File Upload API
 * POST - Receives file via FormData, uploads to R2 server-side (bypasses CORS)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  uploadFileServerSide,
  isR2Configured,
  type DocumentCategory,
} from "@/lib/storage/upload-service";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/storage/r2-client";
import { logger } from "@/lib/logger";

// Allow up to 50MB uploads
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "File storage not configured" },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 },
      );
    }

    // Resolve organization ID
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    const ownerId = orgMember?.organizationId || session.user.id;

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2 server-side
    const { fileKey } = await uploadFileServerSide(
      ownerId,
      category.toLowerCase() as DocumentCategory,
      file.name,
      file.type,
      buffer,
    );

    return NextResponse.json({ fileKey });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[upload-file] Error:", errMsg, error);
    return NextResponse.json(
      { error: errMsg || "Failed to upload file" },
      { status: 500 },
    );
  }
}
