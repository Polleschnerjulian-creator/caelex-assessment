/**
 * Tests for src/lib/delta-buffer.ts.
 *
 * Coverage:
 *
 *   1. append(empty) is a no-op
 *   2. Timer-based flush after flushIntervalMs concatenates deltas
 *   3. Size-based flush fires when threshold exceeded mid-interval
 *   4. flush() forces a flush + awaits onFlush completion
 *   5. done() flushes pending + stops the timer
 *   6. done() is idempotent
 *   7. Concurrent size+timer flushes are serialised (no overlap)
 *   8. After done(), append() is a no-op
 *   9. Custom flushIntervalMs / flushSizeChars respected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDeltaBuffer } from "./delta-buffer";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createDeltaBuffer — empty / no-op paths", () => {
  it("append('') is a no-op (no flush)", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({ onFlush });
    buf.append("");
    await vi.advanceTimersByTimeAsync(500);
    expect(onFlush).not.toHaveBeenCalled();
    await buf.done();
  });

  it("flush() with no buffered text is a no-op", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({ onFlush });
    await buf.flush();
    expect(onFlush).not.toHaveBeenCalled();
    await buf.done();
  });
});

describe("createDeltaBuffer — timer-based flush", () => {
  it("concatenates deltas into a single chunk after flushIntervalMs", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 100,
      flushSizeChars: 1000, // very high — won't trigger
      onFlush,
    });
    buf.append("Hello, ");
    buf.append("world");
    expect(onFlush).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush).toHaveBeenCalledWith("Hello, world");
    await buf.done();
  });

  it("emits multiple chunks if deltas span multiple intervals", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 50,
      flushSizeChars: 1000,
      onFlush,
    });
    buf.append("first");
    await vi.advanceTimersByTimeAsync(50);
    buf.append("second");
    await vi.advanceTimersByTimeAsync(50);
    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenNthCalledWith(1, "first");
    expect(onFlush).toHaveBeenNthCalledWith(2, "second");
    await buf.done();
  });

  it("respects custom flushIntervalMs", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 500,
      flushSizeChars: 10000,
      onFlush,
    });
    buf.append("text");
    await vi.advanceTimersByTimeAsync(400);
    expect(onFlush).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150);
    expect(onFlush).toHaveBeenCalledOnce();
    await buf.done();
  });
});

describe("createDeltaBuffer — size-based flush", () => {
  it("flushes immediately when buffer reaches flushSizeChars", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 100_000, // very long — won't fire
      flushSizeChars: 5,
      onFlush,
    });
    buf.append("12345");
    // size-flush fires synchronously (well, micro-task) — let it run
    await Promise.resolve();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush).toHaveBeenCalledWith("12345");
    await buf.done();
  });

  it("multiple deltas accumulate until size threshold", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 100_000,
      flushSizeChars: 6,
      onFlush,
    });
    buf.append("ab");
    buf.append("cd"); // 4 chars total, no flush
    expect(onFlush).not.toHaveBeenCalled();
    buf.append("efg"); // crosses threshold — flush
    await Promise.resolve();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush).toHaveBeenCalledWith("abcdefg");
    await buf.done();
  });

  it("respects custom flushSizeChars", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 100_000,
      flushSizeChars: 50,
      onFlush,
    });
    buf.append("a".repeat(49));
    await Promise.resolve();
    expect(onFlush).not.toHaveBeenCalled();
    buf.append("b");
    await Promise.resolve();
    expect(onFlush).toHaveBeenCalledOnce();
    await buf.done();
  });
});

describe("createDeltaBuffer — done() lifecycle", () => {
  it("done() flushes pending text", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 1000,
      flushSizeChars: 1000,
      onFlush,
    });
    buf.append("trailing");
    await buf.done();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush).toHaveBeenCalledWith("trailing");
  });

  it("done() stops the timer (no further flushes)", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({
      flushIntervalMs: 50,
      flushSizeChars: 1000,
      onFlush,
    });
    buf.append("x");
    await buf.done();
    expect(onFlush).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(500);
    expect(onFlush).toHaveBeenCalledOnce();
  });

  it("done() is idempotent", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({ onFlush });
    buf.append("once");
    await buf.done();
    await buf.done();
    await buf.done();
    expect(onFlush).toHaveBeenCalledOnce();
  });

  it("append() after done() is a no-op", async () => {
    const onFlush = vi.fn();
    const buf = createDeltaBuffer({ onFlush });
    buf.append("a");
    await buf.done();
    expect(onFlush).toHaveBeenCalledTimes(1);
    buf.append("after-done");
    await vi.advanceTimersByTimeAsync(1000);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });
});

describe("createDeltaBuffer — concurrent serialisation", () => {
  it("size + timer flushes don't overlap", async () => {
    const order: string[] = [];
    let resolveFirst: (() => void) | null = null;
    const onFlush = vi.fn(async (chunk: string) => {
      if (chunk === "first-chunk") {
        order.push("first-start");
        // Hold the first onFlush open until told to release.
        await new Promise<void>((r) => {
          resolveFirst = r;
        });
        order.push("first-end");
      } else {
        order.push(`other-${chunk}`);
      }
    });
    const buf = createDeltaBuffer({
      flushIntervalMs: 50,
      flushSizeChars: 1000,
      onFlush,
    });
    buf.append("first-chunk");
    // Force a timer flush
    await vi.advanceTimersByTimeAsync(50);
    // While the first onFlush is held, append more text + advance time.
    buf.append("second-chunk");
    await vi.advanceTimersByTimeAsync(50);
    // Release the first. Cast through unknown — TS narrows the
    // let-bound resolveFirst to null because it can't track callback
    // assignment.
    (resolveFirst as unknown as (() => void) | null)?.();
    await vi.advanceTimersByTimeAsync(0);
    await buf.done();
    // Strict ordering: the second chunk's onFlush must run AFTER the
    // first chunk's onFlush completes.
    expect(order).toEqual(["first-start", "first-end", "other-second-chunk"]);
  });
});
