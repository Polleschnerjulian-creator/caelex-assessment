/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/mandate/[id]/files/[fileId]/extract-deadlines
 *
 * Sprint 6b (2026-05-18). Thin auth-wrapper around the shared
 * `extractDeadlineSuggestionsForFile` helper in
 * `src/lib/atlas/deadline-extraction.server.ts`.
 *
 * Auth: chat-owner OR mandate-member (über AtlasMandate-relation).
 * Rate-Limit: document_generation tier (5/hr) — verhindert wiederholte
 * AI-Calls auf das gleiche file.
 *
 * Idempotency: das @@unique-Constraint auf [mandateId, sourceFileId,
 * title] verhindert duplikate. createMany mit skipDuplicates fängt
 * Wiederholungen ohne 500-Error.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { extractDeadlineSuggestionsForFile } from "@/lib/atlas/deadline-extraction.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANDATE_ID_SCHEMA = z.string().cuid();
const FILE_ID_SCHEMA = z.string().cuid();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; fileId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateIdRaw, fileId: fileIdRaw } = await ctx.params;
  const m = MANDATE_ID_SCHEMA.safeParse(mandateIdRaw);
  const f = FILE_ID_SCHEMA.safeParse(fileIdRaw);
  if (!m.success || !f.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const mandateId = m.data;
  const fileId = f.data;

  /* Rate-Limit: 5/hr per user — extraktion ist teuer (AI call). */
  const rl = await checkRateLimit(
    "document_generation",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded — bitte später erneut versuchen." },
      { status: 429 },
    );
  }

  /* Mandate-membership gate — confirms the caller can see this mandate
     before we load the file. The shared helper also checks org-scoping
     but does NOT check userId membership (it's reused by the auto-
     trigger which runs without a user context). This explicit check
     is the user-facing IDOR guard. */
  const mandate = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId: atlas.organizationId,
      OR: [
        { ownerUserId: atlas.userId },
        { members: { some: { userId: atlas.userId } } },
      ],
    },
    select: { id: true },
  });
  if (!mandate) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const result = await extractDeadlineSuggestionsForFile({
      fileId,
      mandateId,
      organizationId: atlas.organizationId,
    });

    /* The shared fn returns { created:0, deadlines:[] } when there is no
       text — surface a helpful message instead of a silent empty response. */
    if (result.created === 0 && result.deadlines.length === 0) {
      /* Check if the file actually exists and has text so we can give
         a precise user-facing error vs. just "no deadlines found". */
      const fileExists = await prisma.atlasMandateFile.findFirst({
        where: { id: fileId, mandateId },
        select: { extractedText: true },
      });
      if (!fileExists || !fileExists.extractedText) {
        return NextResponse.json(
          {
            error:
              "Datei enthält keinen extrahierten Text (oder zu kurz). Bitte erst PDF/DOCX-Extraktion abwarten.",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    logger.error("[extract-deadlines/route] extraction failed", {
      mandateId,
      fileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "AI-Extraktion fehlgeschlagen" },
      { status: 500 },
    );
  }
}
