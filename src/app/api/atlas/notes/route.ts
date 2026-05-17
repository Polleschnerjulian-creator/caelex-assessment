/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Notes / Highlights API.
 *
 *   GET    /api/atlas/notes              list user's own notes
 *   POST   /api/atlas/notes              create new note
 *
 * Private per-user — no org-shared list. Each note can optionally
 * reference a chat + mandate so the lawyer can re-locate the source
 * of the highlight later.
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
});

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: createRateLimitHeaders(rl) },
    );
  }
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    mandateId: url.searchParams.get("mandateId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const notes = await prisma.atlasNote.findMany({
      where: {
        userId: atlas.userId,
        ...(parsed.data.mandateId && { mandateId: parsed.data.mandateId }),
        ...(parsed.data.q && parsed.data.q.trim()
          ? {
              OR: [
                { excerpt: { contains: parsed.data.q, mode: "insensitive" } },
                { note: { contains: parsed.data.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        chatId: true,
        mandateId: true,
        excerpt: true,
        note: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(
      { notes },
      { headers: createRateLimitHeaders(rl) },
    );
  } catch (err) {
    logger.error("[atlas/notes] list failed", {
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }
}

const PostBody = z.object({
  excerpt: z.string().min(1).max(4000),
  note: z.string().max(2000).optional(),
  chatId: z.string().cuid().optional(),
  mandateId: z.string().cuid().optional(),
  tags: z.array(z.string().max(40)).max(10).default([]),
});

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: createRateLimitHeaders(rl) },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const created = await prisma.atlasNote.create({
      data: {
        userId: atlas.userId,
        excerpt: parsed.data.excerpt,
        note: parsed.data.note ?? null,
        chatId: parsed.data.chatId ?? null,
        mandateId: parsed.data.mandateId ?? null,
        tags: parsed.data.tags,
      },
      select: {
        id: true,
        excerpt: true,
        note: true,
        chatId: true,
        mandateId: true,
        tags: true,
        createdAt: true,
      },
    });
    logger.info("[atlas/notes] created", {
      userId: atlas.userId,
      noteId: created.id,
      excerptLen: parsed.data.excerpt.length,
    });
    return NextResponse.json({ note: created });
  } catch (err) {
    logger.error("[atlas/notes] create failed", {
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
