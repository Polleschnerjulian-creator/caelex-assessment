/**
 * Compliance Health Pulse — Sprint 10D (Wow-Pattern #9)
 *
 * Last-hour time-series of compliance activity, bucketed into 5-min
 * intervals (12 buckets). Drives a heartbeat-style pulse-line on
 * /dashboard/health-pulse that animates whenever a new audit-log
 * row arrives via the Sprint 7D SSE endpoint.
 *
 * # Why 5-min buckets / 12 points
 *
 * - Fine-grained enough that an attestation push from one operator
 *   shows as a visible blip within minutes
 * - Coarse enough that an active org with constant background
 *   activity doesn't drown signal in noise
 * - 12 points = a sparkline that fits in a 600px-wide hero card
 *   without horizontal scroll
 *
 * # Why we don't pull from the realtime stream
 *
 * The SSE endpoint (Sprint 7D) gives the client *new* events as
 * they happen. To paint the *initial* last-hour view the client
 * needs server-side history — that's this snapshot. After mount,
 * the client increments the latest bucket on every SSE event and
 * shifts buckets over time.
 *
 * # Auth scope
 *
 * Per-org. Caller's primary-org membership is the read scope —
 * same convention as Sprint 5A's mission aggregator and 10A's
 * audit-chain visualizer.
 */

import "server-only";

import { prisma } from "@/lib/prisma";

export const PULSE_BUCKET_COUNT = 12;
export const PULSE_BUCKET_MINUTES = 5;
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
  /** ISO timestamp of the most recent audit-log row (any time). Null
   *  when the org has no audit history at all. */
  lastEventAt: string | null;
  /** Average events / hour over the last 24h — context number for
   *  "is this hour quiet or busy?". */
  baselineEventsPerHour: number;
}

export interface GetHealthPulseSnapshotOptions {
  /** Override "now" for deterministic tests. */
  now?: Date;
}

/**
 * Round a Date down to the start of its 5-min bucket (UTC).
 * `2026-05-02T13:07:42Z` → `2026-05-02T13:05:00Z`.
 */
function alignToBucket(date: Date): Date {
  const ms = date.getTime();
  const bucketMs = PULSE_BUCKET_MINUTES * 60 * 1000;
  return new Date(Math.floor(ms / bucketMs) * bucketMs);
}

export async function getHealthPulseSnapshot(
  organizationId: string,
  opts: GetHealthPulseSnapshotOptions = {},
): Promise<HealthPulseSnapshot> {
  const now = opts.now ?? new Date();
  const windowEnd = alignToBucket(now);
  const windowStart = new Date(
    windowEnd.getTime() -
      (PULSE_BUCKET_COUNT - 1) * PULSE_BUCKET_MINUTES * 60 * 1000,
  );
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Pull every audit row in the window. We could `groupBy` on a
  // bucket expression but that requires raw SQL; for a 12-bucket /
  // ~hundreds-of-rows window the in-memory bucketing is cheaper to
  // ship + understand.
  const [rows, lastRow, dayCount] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        organizationId,
        timestamp: { gte: windowStart },
      },
      select: { timestamp: true },
      orderBy: { timestamp: "asc" },
      take: 5000,
    }) as Promise<Array<{ timestamp: Date }>>,
    prisma.auditLog.findFirst({
      where: { organizationId },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    }) as Promise<{ timestamp: Date } | null>,
    prisma.auditLog.count({
      where: {
        organizationId,
        timestamp: { gte: dayAgo },
      },
    }),
  ]);

  // Build the empty-bucket scaffold first so a totally-quiet hour
  // still produces 12 zero-counted buckets (chart never collapses).
  const buckets: HealthPulseBucket[] = [];
  for (let i = 0; i < PULSE_BUCKET_COUNT; i++) {
    const start = new Date(
      windowStart.getTime() + i * PULSE_BUCKET_MINUTES * 60 * 1000,
    );
    buckets.push({ bucketStart: start.toISOString(), count: 0 });
  }

  // Tally rows into the matching bucket. Index = floor(minutes-from-
  // window-start / bucket-size).
  for (const r of rows) {
    const offsetMs = r.timestamp.getTime() - windowStart.getTime();
    if (offsetMs < 0) continue; // safety: row predates window
    const idx = Math.min(
      PULSE_BUCKET_COUNT - 1,
      Math.floor(offsetMs / (PULSE_BUCKET_MINUTES * 60 * 1000)),
    );
    buckets[idx].count += 1;
  }

  return {
    totalEvents: rows.length,
    buckets,
    lastEventAt: lastRow ? lastRow.timestamp.toISOString() : null,
    baselineEventsPerHour: Math.round((dayCount / 24) * 10) / 10,
  };
}
