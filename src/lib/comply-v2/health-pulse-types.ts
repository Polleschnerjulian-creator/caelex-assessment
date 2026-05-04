/**
 * Health Pulse — shared types + constants (Sprint 10D, hotfix 2026-05-04)
 *
 * Pure module — no `server-only`. Both the server fetcher
 * (`health-pulse.server.ts`) and the client component
 * (`HealthPulseClient.tsx`) import from here.
 *
 * # Why this exists
 *
 * Pre-hotfix, `HealthPulseClient.tsx` (a `"use client"` component)
 * imported PULSE_BUCKET_COUNT + PULSE_BUCKET_MINUTES + the
 * HealthPulseSnapshot type directly from `health-pulse.server.ts`.
 * That file declares `import "server-only"` — under Next.js 15.5+
 * webpack rejects any client-side import chain that pulls a
 * server-only module, even when the importer only consumes
 * compile-time-removable type exports. The constants are runtime
 * values (numbers), so the type-only import trick wouldn't work.
 *
 * Solution: split the pure data (constants + types) out into this
 * non-server file. The server fetcher re-exports for backward
 * compatibility; the client imports directly.
 */

/** Number of 5-min buckets covering the last hour. */
export const PULSE_BUCKET_COUNT = 12;

/** Bucket width in minutes — drives 5-min wall-clock alignment. */
export const PULSE_BUCKET_MINUTES = 5;

/** Total observation window: 12 × 5 = 60 minutes. */
export const PULSE_WINDOW_MINUTES = PULSE_BUCKET_COUNT * PULSE_BUCKET_MINUTES;

export interface HealthPulseBucket {
  /** ISO timestamp of the bucket's start (5-min aligned, UTC). */
  bucketStart: string;
  /** Count of audit-log rows that landed in this bucket. */
  count: number;
}

export interface HealthPulseSnapshot {
  /** Total events across the last hour. */
  totalEvents: number;
  /** Buckets ordered oldest → newest. Always exactly 12 entries. */
  buckets: HealthPulseBucket[];
  /**
   * ISO timestamp of the most recent audit-log row (any time). Null
   * when the org has no audit history at all.
   */
  lastEventAt: string | null;
  /**
   * Average events / hour over the last 24h — context number for
   * "is this hour quiet or busy?".
   */
  baselineEventsPerHour: number;
}
