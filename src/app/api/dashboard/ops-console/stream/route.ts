/**
 * GET /api/dashboard/ops-console/stream — Sprint 7D
 *
 * Server-Sent-Events endpoint that powers the Mission-Operations
 * Console. Combines:
 *
 *   - Sprint 7A's `createSseStream()` for safe SSE delivery
 *   - Sprint 7B's `listenForDbEvents()` for cross-process pub-sub
 *
 * Every DB event the operator's processes emit (proposal created/
 * applied, mission phase update, astra reasoning) gets forwarded
 * straight to this stream so the V2 console renders them live.
 *
 * # Why a single endpoint subscribed to ALL channels
 *
 * The console is a unified ops surface — operators want to see
 * everything happening in one place. Filtering happens client-side
 * (the UI tabs by event type). Server-side fan-out per-channel
 * would mean N concurrent SSE connections per viewer; one
 * connection covers all.
 *
 * # Auth
 *
 * Requires an authenticated session. No org-scoping in 7D — every
 * authenticated user sees every event for now. Sprint 7E may add
 * org-filtered subscription (filter by event.payload.organizationId).
 *
 * # Initial event
 *
 * On connect we emit `connected` with a server timestamp so the
 * client can show "Connected since 14:32:08" in the status bar.
 *
 * # Heartbeat
 *
 * Sprint 7A's createSseStream does a 15s heartbeat by default.
 * Suitable for long-lived ops dashboards left open all day.
 */

import "server-only";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createSseStream } from "@/lib/sse";
import { listenForDbEvents, type DbChannel } from "@/lib/db-events.server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALL_CHANNELS: DbChannel[] = [
  "comply.proposal.created",
  "comply.proposal.applied",
  "comply.mission.phase_updated",
  "astra.reasoning",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return createSseStream({
    signal: request.signal,
    onError: (err) => logger.error("[ops-console-stream] orchestration", err),
    async onStart(channel) {
      // 1. Initial handshake event so the client can confirm a
      //    successful subscription and start its "connected since"
      //    timer.
      channel.send("connected", {
        userId: session.user!.id,
        connectedAt: new Date().toISOString(),
        channels: ALL_CHANNELS,
      });

      // 2. Subscribe to every DB channel; each notification gets
      //    forwarded as a same-named SSE event so the client can
      //    addEventListener("comply.proposal.created", …).
      const dispose = await listenForDbEvents(
        ALL_CHANNELS,
        {
          onMessage: (msg) => {
            channel.send(msg.channel, {
              channel: msg.channel,
              payload: msg.payload,
              receivedAt: new Date().toISOString(),
            });
          },
          onError: (err) => {
            logger.warn("[ops-console-stream] db-event error", {
              error: err.message,
            });
            // Tell the client; they can decide whether to reconnect.
            channel.send("db-error", { message: err.message });
          },
        },
        { signal: request.signal },
      );

      // 3. Keep the stream open until either the client aborts or
      //    the listener disposes. createSseStream's onStart contract
      //    closes the stream when this function resolves; we want it
      //    to stay open, so we await the abort signal explicitly.
      await new Promise<void>((resolve) => {
        if (request.signal.aborted) {
          resolve();
          return;
        }
        request.signal.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });

      // 4. Clean up the listener if it hasn't already disposed via
      //    its own signal hook.
      await dispose();
    },
  });
}
