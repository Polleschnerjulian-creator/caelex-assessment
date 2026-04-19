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
import { logger } from "@/lib/logger";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";

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

    // Get organization context for scoped access
    const orgContext = await getCurrentOrganization(session.user.id);

    // Get document — allow personal ownership OR org-level access
    const document = await prisma.document.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // H-API2 fix: enforce Document.accessLevel. Previously the route
    // allowed any MEMBER/VIEWER in the owning org to download every
    // file regardless of its classification. Now:
    //   PUBLIC         — anyone in the org
    //   INTERNAL       — anyone in the org (default)
    //   CONFIDENTIAL   — owner (userId match) OR role ∈ {OWNER, ADMIN, MANAGER}
    //   RESTRICTED     — owner OR role ∈ {OWNER, ADMIN}
    //   TOP_SECRET     — owner ONLY
    const isOwner = document.userId === session.user.id;
    if (
      !isOwner &&
      document.accessLevel !== "PUBLIC" &&
      document.accessLevel !== "INTERNAL"
    ) {
      // Need role lookup for CONFIDENTIAL / RESTRICTED / TOP_SECRET
      const membership = orgContext?.organizationId
        ? await prisma.organizationMember.findFirst({
            where: {
              userId: session.user.id,
              organizationId: orgContext.organizationId,
            },
            select: { role: true },
          })
        : null;

      const role = membership?.role;
      const allowedRoles: Record<string, string[]> = {
        CONFIDENTIAL: ["OWNER", "ADMIN", "MANAGER"],
        RESTRICTED: ["OWNER", "ADMIN"],
        TOP_SECRET: [], // owner only, never role-based
      };
      const allowed = allowedRoles[document.accessLevel] ?? [];

      if (!role || !allowed.includes(role)) {
        // Log the refusal for forensic visibility — this is the signal
        // an attacker is probing a document they shouldn't see.
        logger.warn("Document download forbidden by accessLevel", {
          documentId: document.id,
          accessLevel: document.accessLevel,
          userId: session.user.id,
          role,
        });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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

    // H-D4 fix: TTL reduced from 3600 s to 300 s. A leaked URL
    // (browser history, referrer, sentry breadcrumbs, email forward)
    // is now only valid for 5 minutes instead of a full hour.
    const PRESIGN_TTL_SECONDS = 300;
    const result = await generatePresignedDownloadUrl(
      document.storagePath,
      PRESIGN_TTL_SECONDS,
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
    logger.error("Error generating download URL", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to generate download URL") },
      { status: 500 },
    );
  }
}
