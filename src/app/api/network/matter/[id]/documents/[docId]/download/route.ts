/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/network/matter/:id/documents/:docId/download
 *
 * Matter-scoped document download. The existing endpoint at
 * /api/documents/:id/download requires the caller to be a member of
 * the document's organization — that's the operator's flow. Atlas
 * lawyers are NOT operator-org members; they're matter counter-
 * parties. This route bridges that: scope-gate via the matter handshake,
 * issue an R2-presigned download URL, double-write the audit log.
 *
 * Authorization:
 *   1. requireActiveMatter with DOCUMENTS / EXPORT — listing a doc
 *      requires READ, downloading IT requires EXPORT (more privileged).
 *   2. Document must belong to matter.clientOrgId — otherwise 404.
 *      (Two-step ownership check: matter scope + per-doc tenant check.)
 *   3. Document.accessLevel respected — same RBAC as the operator's
 *      own download endpoint, scaled to the law-firm reading from
 *      outside the org.
 *
 * Audit:
 *   - emitAccessLog (matter hash-chain) with action=EXPORT_DOCUMENT,
 *     matterScope=DOCUMENTS. Operator sees this in the matter audit-log.
 *   - documentAccessLog row with action=DOWNLOAD. Operator sees this
 *     on the per-document detail page.
 *
 * Presigned URL TTL: 300s (mirrors the operator-side endpoint's
 * H-D4 fix — short-lived URLs limit damage from leaks).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  generatePresignedDownloadUrl,
  isR2Configured,
} from "@/lib/storage/upload-service";
import {
  requireActiveMatter,
  emitAccessLog,
  MatterAccessError,
} from "@/lib/legal-network/require-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESIGN_TTL_SECONDS = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id: matterId, docId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }

    // Step 1: matter scope-gate (DOCUMENTS / EXPORT)
    let matter;
    try {
      const result = await requireActiveMatter({
        matterId,
        callerOrgId: membership.organizationId,
        callerSide: "ATLAS",
        category: "DOCUMENTS",
        permission: "EXPORT",
      });
      matter = result.matter;
    } catch (err) {
      if (err instanceof MatterAccessError) {
        const status =
          err.code === "MATTER_NOT_FOUND"
            ? 404
            : err.code === "MATTER_NOT_ACTIVE"
              ? 409
              : 403;
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status },
        );
      }
      throw err;
    }

    // Step 2: tenant ownership check + accessLevel
    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        accessLevel: true,
        storagePath: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        name: true,
        isLatest: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }
    if (document.organizationId !== matter.clientOrgId) {
      // Doc exists but doesn't belong to this matter's client. Treat
      // as 404 — never leak that a doc id exists in another tenant.
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Step 3: respect Document.accessLevel — Atlas-side caller is
    // NEVER the document owner (different org), so RESTRICTED and
    // TOP_SECRET are categorically off-limits regardless of matter
    // scope. CONFIDENTIAL requires explicit matter EXPORT (already
    // checked above). PUBLIC + INTERNAL flow through.
    if (
      document.accessLevel === "TOP_SECRET" ||
      document.accessLevel === "RESTRICTED"
    ) {
      logger.warn("Atlas-side download forbidden by accessLevel", {
        documentId: document.id,
        accessLevel: document.accessLevel,
        matterId,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error:
            "Document access level forbids cross-org download. Ask the operator to lower the classification or share via data-room.",
          code: "ACCESS_LEVEL_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    // Step 4: storage sanity
    if (!document.storagePath) {
      return NextResponse.json(
        { error: "Document has no file attached" },
        { status: 400 },
      );
    }
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "File storage not configured" },
        { status: 503 },
      );
    }

    // Step 5: presigned URL
    const result = await generatePresignedDownloadUrl(
      document.storagePath,
      PRESIGN_TTL_SECONDS,
      document.fileName || document.name,
    );

    // Step 6: dual audit-log
    //   a) matter hash-chain (operator sees from the matter view)
    //   b) per-document log (operator sees from the document view)
    await emitAccessLog({
      matter,
      actorUserId: session.user.id,
      actorOrgId: membership.organizationId,
      actorSide: "ATLAS",
      action: "EXPORT_DOCUMENT",
      resourceType: "Document",
      resourceId: document.id,
      matterScope: "DOCUMENTS",
      context: {
        tool: "matter-scoped-download",
        fileName: document.fileName,
        fileSize: document.fileSize,
        accessLevel: document.accessLevel,
      },
      ipAddress:
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-real-ip") ??
        null,
      userAgent: request.headers.get("user-agent"),
    });

    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: "DOWNLOAD",
        details: JSON.stringify({
          via: "legal-network/matter",
          matterId,
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Matter-scoped document download failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}
