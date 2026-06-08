/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — in-memory micro-batch emitter (PURE, framework-free).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * High-frequency behavioural events (page_viewed, screen_dwelled, element_clicked,
 * scroll milestones) multiply request volume if each is POSTed individually. This
 * module buffers {@link WireEvent}s in memory and flushes them as ONE array to
 * `/api/analytics/track` — cutting ingestion writes ~5–20× (spec §5.1.2). It is a
 * deliberately PURE module:
 *   - no React, no `server-only`, no Prisma;
 *   - no `window`/`navigator`/`document` access at import time;
 *   - the actual transport is injected (a `BatchSink`) so the buffer can be
 *     unit-tested with a fake sink and a fake clock (timers are injected too).
 *
 * The browser wiring (sendBeacon transport, real timers, pagehide/visibilitychange
 * flush) lives in `src/lib/analytics.ts`, which constructs ONE emitter with the
 * real sink. This file only owns the buffering/flushing STATE MACHINE so it stays
 * testable without a DOM.
 *
 * INVARIANTS (covered by batch-emitter.test.ts):
 *   1. enqueue() accumulates; nothing is sent until a flush trigger.
 *   2. Reaching `maxBatch` events triggers an immediate auto-flush.
 *   3. A flush sends a SNAPSHOT array and clears the buffer (no double-send).
 *   4. flush() on an empty buffer is a no-op (never calls the sink).
 *   5. A single buffer never exceeds `maxBatch`; the array handed to the sink is
 *      capped to `maxBatch` so the server-side `batchEventsSchema.max()` never
 *      rejects a flush (overflow stays buffered for the next flush).
 *   6. The interval timer is armed lazily on first enqueue and disarmed after a
 *      flush empties the buffer (no idle timer churn).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { MAX_BATCH_EVENTS, type WireEvent } from "./events";

/**
 * The transport the emitter flushes through. Returns `true` if the batch was
 * handed off successfully (so the emitter can clear it), `false` if the sink
 * could not accept it (so the emitter re-buffers the snapshot for a later try).
 * The browser sink wraps `navigator.sendBeacon` (which itself returns a boolean).
 */
export type BatchSink = (events: WireEvent[]) => boolean;

/** Minimal injectable timer surface so tests can use fake timers / a fake clock. */
export interface BatchTimers {
  setInterval: (handler: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

export interface BatchEmitterOptions {
  /** The transport. */
  sink: BatchSink;
  /** Flush automatically once this many events are buffered. Default + hard
   *  cap = {@link MAX_BATCH_EVENTS}; values above it are clamped so a flush can
   *  never exceed the server's `batchEventsSchema.max()`. */
  maxBatch?: number;
  /** Periodic flush cadence in ms (the "idle/interval" flush). Default 8000. */
  flushIntervalMs?: number;
  /** Injectable timers (defaults to global setInterval/clearInterval when present). */
  timers?: BatchTimers;
}

const DEFAULT_FLUSH_INTERVAL_MS = 8000;

/**
 * A no-op timer surface — used when no real timers are available (e.g. SSR) or
 * when none are injected in a test that does not exercise the interval path.
 */
const NOOP_TIMERS: BatchTimers = {
  setInterval: () => null,
  clearInterval: () => {},
};

function resolveDefaultTimers(): BatchTimers {
  // Guard so importing this module never touches a missing global.
  if (
    typeof setInterval === "function" &&
    typeof clearInterval === "function"
  ) {
    return {
      setInterval: (handler, ms) => setInterval(handler, ms),
      clearInterval: (handle) =>
        clearInterval(handle as ReturnType<typeof setInterval>),
    };
  }
  return NOOP_TIMERS;
}

/**
 * In-memory micro-batch buffer for analytics wire events. Single-instance per
 * browser tab in production; freely instantiable (with a fake sink/timers) in
 * tests.
 */
export class BatchEmitter {
  private readonly sink: BatchSink;
  private readonly maxBatch: number;
  private readonly flushIntervalMs: number;
  private readonly timers: BatchTimers;

  private buffer: WireEvent[] = [];
  private intervalHandle: unknown = null;

  constructor(options: BatchEmitterOptions) {
    this.sink = options.sink;
    // Clamp to [1, MAX_BATCH_EVENTS] so a flush can never exceed the wire cap.
    const requested = options.maxBatch ?? MAX_BATCH_EVENTS;
    this.maxBatch = Math.max(1, Math.min(MAX_BATCH_EVENTS, requested));
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.timers = options.timers ?? resolveDefaultTimers();
  }

  /** Number of events currently buffered (test/debug aid). */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Buffer one event. Arms the interval flush lazily on the first event, and
   * auto-flushes immediately once the buffer reaches `maxBatch`.
   */
  enqueue(event: WireEvent): void {
    this.buffer.push(event);
    this.arm();
    if (this.buffer.length >= this.maxBatch) {
      this.flush();
    }
  }

  /**
   * Flush up to `maxBatch` buffered events through the sink as ONE array.
   *
   * - No-op when the buffer is empty (never calls the sink).
   * - Sends a SNAPSHOT and removes exactly the events sent, so a same-tick
   *   enqueue cannot be dropped and nothing is double-sent.
   * - If the sink reports failure, the snapshot is re-buffered (prepended) so it
   *   is retried on the next flush — analytics is best-effort but should not drop
   *   silently when the transport is momentarily unavailable.
   * - Overflow beyond `maxBatch` stays buffered; if anything remains after a
   *   flush the interval timer stays armed, otherwise it is disarmed.
   *
   * @returns `true` if a batch was sent (sink accepted), `false` otherwise.
   */
  flush(): boolean {
    if (this.buffer.length === 0) {
      this.disarm();
      return false;
    }
    // Take a SNAPSHOT of up to maxBatch events but DO NOT mutate the buffer yet.
    // The events are only removed once the sink has CONFIRMED acceptance — so a
    // reject (or a throw) leaves the buffer exactly as it was (the snapshot
    // stays buffered, in its original position/order) and is retried on the
    // next flush. This is the "re-buffer on reject, resend on success, never
    // drop" invariant: nothing is cleared before the send is known to succeed,
    // so a transient network failure cannot silently lose events.
    const batch = this.buffer.slice(0, this.maxBatch);

    let accepted = false;
    try {
      accepted = this.sink(batch) === true;
    } catch {
      // A throwing transport (e.g. sendBeacon blowing up) is a failed flush,
      // not a crash — treat it exactly like a reject and keep the snapshot.
      accepted = false;
    }

    if (accepted) {
      // Remove ONLY the events that were actually handed off & accepted; any
      // overflow beyond maxBatch (and any same-tick enqueue) stays buffered.
      this.buffer = this.buffer.slice(batch.length);
    }
    // On reject we intentionally leave this.buffer untouched — the snapshot is
    // still at its head, ready for the next flush.

    // Keep the timer armed only while events remain.
    if (this.buffer.length === 0) {
      this.disarm();
    } else {
      this.arm();
    }
    return accepted;
  }

  /**
   * Best-effort terminal flush — used on `pagehide` / visibility-hidden. Drains
   * the WHOLE buffer in `maxBatch`-sized chunks (a tab being unloaded may hold
   * more than one batch). Stops early if the sink starts rejecting so the unload
   * path never spins. Always disarms the timer.
   */
  flushAll(): void {
    // Bound the loop by the number of full batches present at entry so a
    // persistently-rejecting sink cannot loop forever during unload.
    let guard = Math.ceil(this.buffer.length / this.maxBatch) + 1;
    while (this.buffer.length > 0 && guard-- > 0) {
      const sent = this.flush();
      if (!sent) break;
    }
    this.disarm();
  }

  /** Drop all buffered events without sending (test cleanup / hard reset). */
  reset(): void {
    this.buffer = [];
    this.disarm();
  }

  /** Arm the periodic flush timer if not already armed. */
  private arm(): void {
    if (this.intervalHandle !== null) return;
    this.intervalHandle = this.timers.setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  /** Disarm the periodic flush timer if armed. */
  private disarm(): void {
    if (this.intervalHandle === null) return;
    this.timers.clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }
}
