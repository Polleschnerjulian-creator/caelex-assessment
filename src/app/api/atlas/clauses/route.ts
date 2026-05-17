/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Klausel-Bibliothek API.
 *
 *   GET   /api/atlas/clauses               list firm-wide + mandate-scoped clauses
 *   POST  /api/atlas/clauses               create new clause
 *
 * Per-organisation scope. Every Atlas user in the org can read; only
 * org-admins + owners can write (curated catalog avoids
 * inconsistencies). Mandate-scoped clauses can be created by anyone
 * with mandate membership.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(req.url);
  const mandateId = url.searchParams.get("mandateId");
  const category = url.searchParams.get("category");
  const jurisdiction = url.searchParams.get("jurisdiction");

  try {
    const clauses = await prisma.atlasClause.findMany({
      where: {
        organizationId: atlas.organizationId,
        archivedAt: null,
        ...(mandateId === "firm-wide"
          ? { mandateId: null }
          : mandateId
            ? { OR: [{ mandateId }, { mandateId: null }] }
            : {}),
        ...(category && { category }),
        ...(jurisdiction && { jurisdiction }),
      },
      orderBy: [{ category: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        jurisdiction: true,
        riskLevel: true,
        tags: true,
        mandateId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    // AUDIT-FIX M23: mask userId (CUID) before logging
    logger.info("[atlas/clauses] list ok", {
      userId: maskId(atlas.userId),
      count: clauses.length,
    });
    return NextResponse.json({ clauses });
  } catch (err) {
    logger.error("[atlas/clauses] list failed", {
      userId: maskId(atlas.userId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }
}

const PostBody = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
  category: z.string().min(1).max(64),
  jurisdiction: z.string().min(1).max(8),
  riskLevel: z.enum(["neutral", "aggressive", "defensive"]).default("neutral"),
  tags: z.array(z.string().max(40)).max(20).default([]),
  mandateId: z.string().cuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
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

  /* If mandateId is set, verify membership. Otherwise (firm-wide
     clause), require org-admin/owner role. */
  if (parsed.data.mandateId) {
    const mem = await prisma.atlasMandate.findFirst({
      where: {
        id: parsed.data.mandateId,
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
      select: { id: true },
    });
    if (!mem) {
      return NextResponse.json(
        { error: "Mandate access denied" },
        { status: 403 },
      );
    }
  } else {
    /* Firm-wide clause: org-admin gate. */
    if (atlas.role !== "OWNER" && atlas.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Firm-wide clauses require admin role" },
        { status: 403 },
      );
    }
  }

  try {
    const created = await prisma.atlasClause.create({
      data: {
        organizationId: atlas.organizationId,
        mandateId: parsed.data.mandateId ?? null,
        title: parsed.data.title,
        body: parsed.data.body,
        category: parsed.data.category,
        jurisdiction: parsed.data.jurisdiction,
        riskLevel: parsed.data.riskLevel,
        tags: parsed.data.tags,
        createdByUserId: atlas.userId,
      },
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        jurisdiction: true,
        riskLevel: true,
        tags: true,
        mandateId: true,
        createdAt: true,
      },
    });
    logger.info("[atlas/clauses] created", {
      userId: maskId(atlas.userId),
      clauseId: created.id,
    });
    return NextResponse.json({ clause: created });
  } catch (err) {
    logger.error("[atlas/clauses] create failed", {
      userId: maskId(atlas.userId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
