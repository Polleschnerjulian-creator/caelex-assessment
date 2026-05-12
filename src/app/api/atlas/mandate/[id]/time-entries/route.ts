/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Time-Entries API.
 *
 *   GET   /api/atlas/mandate/[id]/time-entries        list entries
 *   POST  /api/atlas/mandate/[id]/time-entries        create entry
 *
 * Used both for in-app time-tracking + DATEV-export aggregation.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkMembership(
  mandateId: string,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const hit = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!hit;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;
  if (!(await checkMembership(mandateId, atlas.userId, atlas.organizationId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const entries = await prisma.atlasTimeEntry.findMany({
    where: { mandateId },
    orderBy: { workedOn: "desc" },
    take: 200,
    select: {
      id: true,
      minutes: true,
      description: true,
      billable: true,
      hourlyRateEur: true,
      workedOn: true,
      chatId: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  /* Aggregations: total minutes (this user / all users), billable
     vs non-billable, total billable € (using snapshot rate). */
  const aggregateAll = entries.reduce(
    (acc, e) => {
      acc.minutes += e.minutes;
      if (e.billable) {
        acc.billableMinutes += e.minutes;
        acc.billableEur += (e.minutes / 60) * (e.hourlyRateEur ?? 0);
      }
      return acc;
    },
    { minutes: 0, billableMinutes: 0, billableEur: 0 },
  );
  return NextResponse.json({ entries, totals: aggregateAll });
}

const PostBody = z.object({
  minutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24),
  description: z.string().min(1).max(500),
  billable: z.boolean().default(true),
  hourlyRateEur: z.number().min(0).max(5000).optional(),
  workedOn: z.string().datetime().optional(),
  chatId: z.string().cuid().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;
  if (!(await checkMembership(mandateId, atlas.userId, atlas.organizationId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  try {
    const created = await prisma.atlasTimeEntry.create({
      data: {
        userId: atlas.userId,
        mandateId,
        minutes: parsed.data.minutes,
        description: parsed.data.description,
        billable: parsed.data.billable,
        hourlyRateEur: parsed.data.hourlyRateEur ?? null,
        workedOn: parsed.data.workedOn
          ? new Date(parsed.data.workedOn)
          : new Date(),
        chatId: parsed.data.chatId ?? null,
      },
      select: { id: true, minutes: true, description: true, workedOn: true },
    });
    logger.info("[atlas/time-entries] created", {
      userId: atlas.userId,
      mandateId,
      entryId: created.id,
      minutes: parsed.data.minutes,
    });
    return NextResponse.json({ entry: created });
  } catch (err) {
    logger.error("[atlas/time-entries] create failed", {
      userId: atlas.userId,
      mandateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
