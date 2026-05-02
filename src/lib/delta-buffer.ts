/**
 * Delta buffer — Sprint 7E
 *
 * Anthropic streams ~50-100+ text deltas per response. If we
 * forward each one straight into Postgres NOTIFY (Sprint 7B), every
 * Astra reply becomes 50+ DB round-trips — wasteful and slow.
 *
 * This buffer batches deltas and flushes:
 *
 *   1. **on a timer** — every `flushIntervalMs` (default 250ms),
 *      so the consumer sees text appear at a comfortable reading
 *      pace (≈4 updates per second). Faster than that and the UI
 *      is unreadable; slower and it doesn't feel "live."
 *
 *   2. **on a size threshold** — when the buffer reaches
 *      `flushSizeChars` (default 200 chars). A single big delta
 *      (e.g. a paragraph break) shouldn't wait the full timer.
 *
 *   3. **on `flush()`** — explicit final flush at the end of the
 *      stream so the last partial buffer isn't dropped.
 *
 * The flush function is async — `flush()` and `done()` await
 * pending writes so the caller knows everything was forwarded
 * before they return.
 *
 * # Why a generic buffer rather than inlined Astra logic
 *
 * The same shape applies to any streaming source we want to
 * downsample for fan-out: token-by-token LLM output, large
 * orbital-data ingest, etc. Keeping the buffer regulator-agnostic
 * makes Sprint 7+'s producer side reusable.
 */

export interface DeltaBufferOptions {
  /** Max ms a delta may sit before being flushed. Default 250. */
  flushIntervalMs?: number;
  /** Max characters to buffer before forced flush. Default 200. */
  flushSizeChars?: number;
  /**
   * Called for each batched flush with the accumulated string. May
   * be async — buffer awaits returned promises before the next flush
   * so concurrent writes can't race.
   */
  onFlush: (chunk: string) => void | Promise<void>;
}

export interface DeltaBuffer {
  /** Append a delta. Triggers a size-flush if threshold exceeded. */
  append: (delta: string) => void;
  /** Force-flush whatever is buffered now. Awaits onFlush completion. */
  flush: () => Promise<void>;
  /**
   * End-of-stream marker. Stops the timer + does a final flush.
   * Idempotent — calling done() twice is safe.
   */
  done: () => Promise<void>;
}

const FLUSH_INTERVAL_DEFAULT_MS = 250;
const FLUSH_SIZE_DEFAULT_CHARS = 200;

/**
 * Build a buffer that batches incoming deltas and flushes them on
 * a timer or size threshold.
 */
export function createDeltaBuffer(opts: DeltaBufferOptions): DeltaBuffer {
  const flushIntervalMs = opts.flushIntervalMs ?? FLUSH_INTERVAL_DEFAULT_MS;
  const flushSizeChars = opts.flushSizeChars ?? FLUSH_SIZE_DEFAULT_CHARS;

  let pending = "";
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  // Serialize concurrent flushes — append() can fire a size-flush
  // while the timer's flush is still in flight; we don't want two
  // onFlush callbacks racing the same chunk.
  let inFlight: Promise<void> = Promise.resolve();

  async function doFlush(): Promise<void> {
    if (pending.length === 0) return;
    const chunk = pending;
    pending = "";
    inFlight = inFlight.then(() => Promise.resolve(opts.onFlush(chunk)));
    await inFlight;
  }

  function startTimer(): void {
    if (timer !== null || stopped) return;
    timer = setInterval(() => {
      // Discard the returned promise — the caller's `flush()` /
      // `done()` is the synchronisation point. We just need the
      // timer to keep ticking, not to await each tick.
      void doFlush();
    }, flushIntervalMs);
  }

  function stopTimer(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    append(delta) {
      if (stopped || delta.length === 0) return;
      pending += delta;
      startTimer();
      if (pending.length >= flushSizeChars) {
        // Size-triggered flush — same serialisation path.
        void doFlush();
      }
    },
    async flush() {
      await doFlush();
    },
    async done() {
      if (stopped) {
        await inFlight;
        return;
      }
      stopped = true;
      stopTimer();
      await doFlush();
      // Wait for any flushes still in-flight from append().
      await inFlight;
    },
  };
}
