/**
 * Document Download API
 * GET - Generate presigned download URL for document
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  generatePresignedDownloadUrl,
  isR2Configured,
} from "@/lib/storage/upload-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get document
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Check if document is stored in R2
    if (!document.storagePath) {
      return NextResponse.json(
        { error: "Document has no file attached" },
        { status: 400 },
      );
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "File storage not configured" },
        { status: 503 },
      );
    }

    // Generate presigned download URL
    const result = await generatePresignedDownloadUrl(
      document.storagePath,
      3600, // 1 hour expiration
      document.fileName || document.name,
    );

    // Log download access
    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: "DOWNLOAD",
        details: JSON.stringify({
          fileName: document.fileName,
          fileSize: document.fileSize,
        }),
      },
    });

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt.toISOString(),
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to generate download URL") },
      { status: 500 },
    );
  }
}
