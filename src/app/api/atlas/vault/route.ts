/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Document Vault API.
 *
 *   GET /api/atlas/vault?q=<query>
 *
 * Returns every AtlasMandateFile the caller can access via mandate
 * membership (owner OR member). Across all mandates in the org —
 * "the lawyer's entire document collection in one view".
 *
 * Optional `q` query: substring-match (case-insensitive) on filename
 * + extractedText so the lawyer can find a doc by name OR by content.
 *
 * Auth: getAtlasAuth (LAW_FIRM/BOTH org-membership).
 * Rate-limit: api tier (cheap reads).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitHeaders,
} from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().max(200).optional(),
  mandateId: z.string().cuid().optional(),
  documentType: z.string().max(64).optional(),
});

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429, headers: createRateLimitHeaders(rl) },
    );
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    mandateId: url.searchParams.get("mandateId") ?? undefined,
    documentType: url.searchParams.get("documentType") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { q, mandateId, documentType } = parsed.data;
  const t0 = Date.now();

  try {
    /* Find files where the file's mandate is owned-by-user OR has
       user as a member. Org scope is implicit via the mandate's
       organizationId — getAtlasAuth has already enforced the org
       boundary at session level. */
    const files = await prisma.atlasMandateFile.findMany({
      where: {
        mandate: {
          organizationId: atlas.organizationId,
          OR: [
            { ownerUserId: atlas.userId },
            { members: { some: { userId: atlas.userId } } },
          ],
          ...(mandateId && { id: mandateId }),
        },
        ...(documentType && { documentType }),
        ...(q && q.trim()
          ? {
              OR: [
                { filename: { contains: q, mode: "insensitive" } },
                { extractedText: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        documentType: true,
        createdAt: true,
        mandate: {
          select: { id: true, name: true },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    /* Stat header: how many distinct mandates have files, plus
       total bytes consumed by this user's accessible vault. Used by
       the page to render a tiny header summary. */
    const totalBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
    const mandateIds = new Set(files.map((f) => f.mandate.id));

    const durationMs = Date.now() - t0;
    logger.info("[atlas/vault] list ok", {
      userId: atlas.userId,
      count: files.length,
      mandates: mandateIds.size,
      queryLen: q?.length ?? 0,
      durationMs,
    });

    return NextResponse.json(
      {
        files,
        totals: {
          count: files.length,
          mandates: mandateIds.size,
          bytes: totalBytes,
        },
      },
      { headers: createRateLimitHeaders(rl) },
    );
  } catch (err) {
    logger.error("[atlas/vault] list failed", {
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Vault listing failed" },
      { status: 500 },
    );
  }
}
