/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/network/oversight/stream
 *
 * Operator-Mirror Live-Stream — Server-Sent Events (SSE).
 *
 * Wenn eine Behörde via Pharos auf Operator-Daten zugreift, wird ein
 * Eintrag in OversightAccessLog geschrieben. Diese Route polled die
 * neuesten AccessLog-Einträge für alle Aufsichten in denen der callende
 * Operator-User Mitglied ist und streamt sie als SSE-Events. Das
 * Operator-Dashboard zeigt das live: "BAFA · Eva M. · 14:23 · Doc X".
 *
 * Implementierung: kein Redis, kein WebSocket-Server — nur Postgres
 * Polling alle 5s via setInterval im Stream-Handler. Auf Vercel
 * Functions: maxDuration 600s, danach reconnect der Client. Cost:
 * exakt das, was Pharos eh kostet (kein Marginal-Cost).
 *
 * Architektur-Trade-off: Vercel Workflow wäre durabler (Pause/Resume,
 * Retries), würde aber Workflow-Quota verbrauchen. Für die "no external
 * cost"-Phase ist Polling OK weil:
 *   - Audit-Events sind permanent in OversightAccessLog persistiert
 *   - SSE liefert nur Live-Delivery, kein State
 *   - Client-Reconnect mit cursorAt deckt jede Lücke (>10min) ab
 * Phase 2 (wenn Behörden produktiv): Migration auf Workflow + Postgres
 * LISTEN/NOTIFY für sub-second-latency.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

const POLL_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 25_000;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Resolve all orgs the user is in. We stream events for every
  // OversightRelationship where one of these orgs is the operatorOrg.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, organization: { isActive: true } },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length === 0) {
    return NextResponse.json({ error: "No orgs" }, { status: 403 });
  }

  // Find all oversights in which this user's orgs are operator-side.
  const oversights = await prisma.oversightRelationship.findMany({
    where: {
      operatorOrgId: { in: orgIds },
      status: { in: ["ACTIVE", "DISPUTED", "PENDING_OPERATOR_ACCEPT"] },
    },
    select: { id: true },
  });
  const oversightIds = oversights.map((o) => o.id);

  if (oversightIds.length === 0) {
    return new NextResponse(
      `event: empty\ndata: {"reason":"no-active-oversights"}\n\n`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      },
    );
  }

  // Cursor: last entryId we already streamed. Start from "now".
  const startCursor = await prisma.oversightAccessLog.findFirst({
    where: { oversightId: { in: oversightIds } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  let lastSeenAt = startCursor?.createdAt ?? new Date();

  const encoder = new TextEncoder();
  const abortSignal = request.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          // Stream already closed.
        }
      };

      // Initial hello with the chain-positions the client should
      // confirm on the next reconnect.
      send("hello", {
        oversightIds,
        cursorAt: lastSeenAt.toISOString(),
        ts: Date.now(),
      });

      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const cleanup = () => {
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      abortSignal.addEventListener("abort", cleanup);

      heartbeatTimer = setInterval(() => {
        // Comment-only line keeps the connection warm without affecting
        // event consumers.
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);

      pollTimer = setInterval(async () => {
        try {
          const fresh = await prisma.oversightAccessLog.findMany({
            where: {
              oversightId: { in: oversightIds },
              createdAt: { gt: lastSeenAt },
            },
            orderBy: { createdAt: "asc" },
            take: 100,
            select: {
              id: true,
              oversightId: true,
              actorOrgId: true,
              action: true,
              resourceType: true,
              resourceId: true,
              createdAt: true,
              entryHash: true,
            },
          });

          for (const entry of fresh) {
            send("audit", {
              entryId: entry.id,
              oversightId: entry.oversightId,
              actorOrgId: entry.actorOrgId,
              action: entry.action,
              resourceType: entry.resourceType,
              resourceId: entry.resourceId,
              createdAt: entry.createdAt.toISOString(),
              entryHashShort: entry.entryHash.slice(0, 16),
              // Receipt-Verify-URL — Operator kann jeden AI-Zugriff
              // selbst signaturprüfen.
              verifyUrl:
                entry.resourceType === "PharosAstraReceipt"
                  ? `/api/pharos/receipt/${entry.id}`
                  : null,
            });
            if (entry.createdAt > lastSeenAt) lastSeenAt = entry.createdAt;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`[oversight-stream] poll failed: ${msg}`);
          // Don't kill the stream on a transient DB error; next tick
          // will retry. We do send a soft warning so the UI can show
          // a "reconnecting…" indicator.
          send("warning", { reason: "transient-db-error" });
        }
      }, POLL_INTERVAL_MS);
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
