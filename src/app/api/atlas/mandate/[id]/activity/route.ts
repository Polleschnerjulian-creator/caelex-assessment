/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Activity Feed.
 *
 *   GET /api/atlas/mandate/[id]/activity?since=<iso>&limit=<n>
 *
 * Answers the audit-finding "was hat sich seit gestern verändert?" by
 * aggregating recent events across all mandate-scoped tables and
 * returning a single chronologically-sorted timeline.
 *
 * Pure read-side aggregation — no new AtlasMandateActivity table.
 * Each source contributes its own event-type. The lawyer doesn't need
 * write-side audit infrastructure; they need the morning question
 * "what changed?" answered in 5 seconds.
 *
 * Sources (all already mandate-scoped + auth-gated via the membership
 * relation filter):
 *   - chats          (createdAt) → "Neuer Chat angelegt"
 *   - files          (createdAt) → "Datei hochgeladen"
 *   - deadlines      (createdAt) → "Frist hinzugefügt"
 *   - timeEntries    (createdAt) → "Zeit erfasst"
 *   - parties        (createdAt) → "Partei hinzugefügt"
 *   - members        (addedAt)   → "Mitglied hinzugefügt"
 *   - agentRuns      (startedAt) → "Agent-Run gestartet"
 *
 * Each source is capped at `PER_SOURCE_LIMIT` to bound the query.
 * After merging we sort + slice to the user's `limit` (default 50).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_SOURCE_LIMIT = 25;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type ActivityKind =
  | "chat_created"
  | "file_uploaded"
  | "deadline_added"
  | "time_logged"
  | "party_added"
  | "member_added"
  | "agent_run";

interface ActivityEvent {
  kind: ActivityKind;
  at: string; // ISO timestamp
  title: string;
  actorName: string | null;
  meta?: Record<string, string | number | null>;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(MAX_LIMIT, Math.floor(limitRaw))
      : DEFAULT_LIMIT;

  /* Membership-gate via a single mandate-fetch — if this returns
     nothing the user has no access OR the mandate doesn't exist
     (collapsed for the same info-leak reason as in the deadlines GET). */
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
    return NextResponse.json({ events: [] });
  }

  try {
    /* Parallel-fetch all sources. Each is bounded to PER_SOURCE_LIMIT
       so the worst case is 7 * 25 = 175 rows before merge. */
    const [chats, files, deadlines, timeEntries, parties, members, agentRuns] =
      await Promise.all([
        prisma.atlasChat.findMany({
          where: { mandateId },
          select: {
            id: true,
            title: true,
            createdAt: true,
            owner: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_SOURCE_LIMIT,
        }),
        prisma.atlasMandateFile.findMany({
          where: { mandateId },
          select: {
            id: true,
            filename: true,
            createdAt: true,
            /* AUDIT-FIX 2026-05-18: war `uploader` (existiert nicht
               in Schema). Echter Relation-Name ist `uploadedBy`. */
            uploadedBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_SOURCE_LIMIT,
        }),
        prisma.atlasMandateDeadline.findMany({
          where: { mandateId },
          select: {
            id: true,
            title: true,
            dueAt: true,
            createdAt: true,
            createdBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_SOURCE_LIMIT,
        }),
        prisma.atlasTimeEntry.findMany({
          where: { mandateId },
          select: {
            id: true,
            description: true,
            minutes: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_SOURCE_LIMIT,
        }),
        prisma.atlasMandateParty.findMany({
          where: { mandateId },
          select: {
            id: true,
            type: true,
            name: true,
            createdAt: true,
            createdBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_SOURCE_LIMIT,
        }),
        prisma.atlasMandateMember.findMany({
          where: { mandateId },
          select: {
            id: true,
            addedAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { addedAt: "desc" },
          take: PER_SOURCE_LIMIT,
        }),
        prisma.atlasAgentRun.findMany({
          where: { mandateId },
          select: {
            id: true,
            goal: true,
            status: true,
            startedAt: true,
            /* AUDIT-FIX 2026-05-18: war `triggeredBy` (existiert nicht
               in Schema). Echter Relation-Name ist `user`. */
            user: { select: { name: true, email: true } },
          },
          orderBy: { startedAt: "desc" },
          take: PER_SOURCE_LIMIT,
        }),
      ]);

    const events: ActivityEvent[] = [];

    for (const c of chats) {
      events.push({
        kind: "chat_created",
        at: c.createdAt.toISOString(),
        title: c.title || "Unbenannter Chat",
        actorName: c.owner?.name ?? c.owner?.email ?? null,
        meta: { chatId: c.id },
      });
    }
    for (const f of files) {
      events.push({
        kind: "file_uploaded",
        at: f.createdAt.toISOString(),
        title: f.filename,
        actorName: f.uploadedBy?.name ?? f.uploadedBy?.email ?? null,
        meta: { fileId: f.id },
      });
    }
    for (const d of deadlines) {
      events.push({
        kind: "deadline_added",
        at: d.createdAt.toISOString(),
        title: d.title,
        actorName: d.createdBy?.name ?? d.createdBy?.email ?? null,
        meta: { deadlineId: d.id, dueAt: d.dueAt.toISOString() },
      });
    }
    for (const t of timeEntries) {
      events.push({
        kind: "time_logged",
        at: t.createdAt.toISOString(),
        title:
          t.description || `${(t.minutes / 60).toFixed(1)} Stunden erfasst`,
        actorName: t.user?.name ?? t.user?.email ?? null,
        meta: { timeEntryId: t.id, minutes: t.minutes },
      });
    }
    for (const p of parties) {
      events.push({
        kind: "party_added",
        at: p.createdAt.toISOString(),
        title: p.name,
        actorName: p.createdBy?.name ?? p.createdBy?.email ?? null,
        meta: { partyId: p.id, type: p.type },
      });
    }
    for (const m of members) {
      events.push({
        kind: "member_added",
        at: m.addedAt.toISOString(),
        title: m.user?.name ?? m.user?.email ?? "Unbekannter Nutzer",
        actorName: null,
        meta: { memberId: m.id },
      });
    }
    for (const r of agentRuns) {
      events.push({
        kind: "agent_run",
        at: r.startedAt.toISOString(),
        title: r.goal?.slice(0, 80) ?? "Agent-Run",
        actorName: r.user?.name ?? r.user?.email ?? null,
        meta: { runId: r.id, status: r.status },
      });
    }

    /* Chronological — newest first. Slice to user's limit so the
       payload stays small. */
    events.sort((a, b) => (a.at < b.at ? 1 : -1));
    const sliced = events.slice(0, limit);

    return NextResponse.json({
      events: sliced,
      hasMore: events.length > sliced.length,
    });
  } catch (err) {
    logger.error("[atlas/activity] aggregation failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load activity" },
      { status: 500 },
    );
  }
}
