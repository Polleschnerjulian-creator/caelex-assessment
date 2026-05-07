/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Helpers for emitting trade-related events to the Mission Ops Console
 * SSE stream. Wraps `emitDbEvent()` with payload-shape conventions
 * specific to trade events:
 *
 *   - Always includes organizationId so the future per-org filter
 *     (Sprint 7E) can scope events to the right viewer
 *   - Always includes a `summary` short-text the UI can render without
 *     parsing the full payload — speeds up the live-feed render
 *   - Wraps emitDbEvent in try/catch so a failed NOTIFY (e.g. payload
 *     too big, channel name typo) never blocks the user-facing API
 *     response. The audit trail is the legal source of truth; the
 *     Ops Console feed is informational.
 *
 * Used by every trade API route + cron job to keep the live feed
 * populated. Pairs naturally with logAuditEvent calls — both run
 * after the DB write succeeds.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { logger } from "@/lib/logger";
import { emitDbEvent, type DbChannel } from "@/lib/db-events.server";

export interface TradeEventEnvelope {
  organizationId: string;
  /** Short text the UI renders in the event card header. */
  summary: string;
  /** Full event-specific payload (entity ids, before/after, etc). */
  data: Record<string, unknown>;
}

/**
 * Fire-and-log emit of a trade event. Never throws — caller's API
 * response is unaffected by SSE failures.
 */
export async function emitTradeEvent(
  channel: DbChannel,
  envelope: TradeEventEnvelope,
): Promise<void> {
  try {
    await emitDbEvent(channel, {
      organizationId: envelope.organizationId,
      summary: envelope.summary,
      ...envelope.data,
      emittedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(
      {
        channel,
        err: err instanceof Error ? err.message : String(err),
      },
      "[trade-ops-event] emit failed (non-fatal — audit-log is canonical)",
    );
  }
}
