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
/* SEC-T0-1 step 4 — vault search across encrypted extractedText.
   Same load-then-decrypt-then-filter pattern as conflict-check +
   mandate/search per Living Doc decision D-6. */
import { decryptAtlasField } from "@/lib/atlas/atlas-encryption";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    /* SEC-T0-1 step 4 — vault search rewrite per D-6. extractedText
       is now encrypted at rest, so `WHERE extractedText { contains: q
       }` no longer matches. We split the search into two phases:

         Phase 1 — DB-side filename search: fast, exact ILIKE on
                   plaintext filename. Returns files whose name
                   matches q.
         Phase 2 — In-memory extractedText search: load all candidate
                   files (membership+mandate+documentType filters at
                   DB), decrypt extractedText per row, filter by
                   substring match in memory. Bounded to 500 files via
                   the existing `take` cap — at scale (>500 files per
                   firm) the result is truncated like before.

       Both phases share the same SELECT shape. Merged by id + sorted
       by createdAt desc + sliced to 500. */
    const baseWhere = {
      mandate: {
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
        ...(mandateId && { id: mandateId }),
      },
      ...(documentType && { documentType }),
    };
    const baseSelect = {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      documentType: true,
      createdAt: true,
      mandate: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true, email: true } },
    };
    let files: Awaited<
      ReturnType<
        typeof prisma.atlasMandateFile.findMany<{
          where: typeof baseWhere;
          select: typeof baseSelect;
        }>
      >
    >;
    if (q && q.trim()) {
      const qLower = q.toLowerCase();
      /* Phase 1: DB-fast filename match. */
      const filenameMatches = await prisma.atlasMandateFile.findMany({
        where: {
          ...baseWhere,
          filename: { contains: q, mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: baseSelect,
      });
      /* Phase 2: load all member-accessible files, decrypt extractedText,
         filter in-memory. We load a separate SELECT that includes
         extractedText for the decrypt step but DON'T include it in the
         response (existing select shape preserved). */
      const candidates = await prisma.atlasMandateFile.findMany({
        where: { ...baseWhere, extractedText: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { ...baseSelect, extractedText: true },
      });
      const textMatches: typeof filenameMatches = [];
      for (const c of candidates) {
        const decrypted = await decryptAtlasField(c.extractedText).catch(
          () => c.extractedText,
        );
        if (decrypted && decrypted.toLowerCase().includes(qLower)) {
          /* Strip extractedText before pushing — response shape
             matches the original (no extractedText leaked client-side). */
          const { extractedText: _et, ...rest } = c;
          void _et;
          textMatches.push(rest);
        }
      }
      /* Merge + dedupe by id, sort by createdAt desc, cap 500. */
      const byId = new Map<string, (typeof filenameMatches)[number]>();
      for (const f of [...filenameMatches, ...textMatches]) {
        if (!byId.has(f.id)) byId.set(f.id, f);
      }
      files = [...byId.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 500);
    } else {
      /* No query — just list all. */
      files = await prisma.atlasMandateFile.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 500,
        select: baseSelect,
      });
    }

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
