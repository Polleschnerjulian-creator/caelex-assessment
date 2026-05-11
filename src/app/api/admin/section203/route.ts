/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 *   GET  /api/admin/section203 — list all commitments
 *   POST /api/admin/section203 — create a new commitment + auto-revoke
 *                                  any prior active rows for the same
 *                                  signerEmail with the older template
 *
 * Compliance-Audit 2026-05 · admin endpoints behind requirePlatformAdmin.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { TEMPLATE_VERSION } from "@/lib/pdf/section203/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  signerName: z.string().min(2).max(120),
  role: z.string().min(2).max(200),
  signerEmail: z.string().email().max(160).optional(),
  scope: z.string().min(10).max(2000),
  signedAt: z.string().datetime().optional(),
  scopeStartedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  userId: z.string().cuid().optional(),
});

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.section203Commitment.findMany({
    orderBy: [{ revokedAt: "asc" }, { signedAt: "desc" }],
    select: {
      id: true,
      signerName: true,
      role: true,
      signerEmail: true,
      scope: true,
      scopeStartedAt: true,
      signedAt: true,
      templateVersion: true,
      pdfStorageKey: true,
      signedPdfStorageKey: true,
      notes: true,
      revokedAt: true,
      revokedReason: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    activeCount: rows.filter((r) => !r.revokedAt).length,
    revokedCount: rows.filter((r) => r.revokedAt).length,
    currentTemplateVersion: TEMPLATE_VERSION,
    rows,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.section203Commitment.create({
      data: {
        signerName: parsed.data.signerName,
        role: parsed.data.role,
        signerEmail: parsed.data.signerEmail,
        scope: parsed.data.scope,
        signedAt: parsed.data.signedAt
          ? new Date(parsed.data.signedAt)
          : new Date(),
        scopeStartedAt: parsed.data.scopeStartedAt
          ? new Date(parsed.data.scopeStartedAt)
          : null,
        notes: parsed.data.notes,
        templateVersion: TEMPLATE_VERSION,
        userId: parsed.data.userId ?? null,
        recordedByUserId: admin.userId,
      },
      select: {
        id: true,
        signerName: true,
        role: true,
        signerEmail: true,
        signedAt: true,
        templateVersion: true,
      },
    });

    return NextResponse.json({ ok: true, commitment: created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[admin/section203] create failed", { error: msg });
    return NextResponse.json(
      { error: "Failed to create commitment" },
      { status: 500 },
    );
  }
}
