/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the in-memory micro-batch emitter (src/lib/analytics/batch-emitter.ts).
 *
 * The emitter is the cost-control heart of the ingestion path: it must (a) buffer
 * silently, (b) auto-flush at the cap, (c) flush a SNAPSHOT exactly once, (d)
 * never exceed MAX_BATCH_EVENTS per flush, (e) re-buffer on transport failure,
 * and (f) drain fully on unload. All transport + timers are INJECTED so the suite
 * is pure: a fake sink records batches, a fake timer surface exposes the armed
 * callback so we can drive the interval deterministically — no real timers, no
 * DOM, no network.
 *
 * Pure module — not executed here; the orchestrator runs the suite centrally.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";
import { BatchEmitter, type BatchTimers } from "./batch-emitter";
import { MAX_BATCH_EVENTS, type WireEvent } from "./events";

// ── Test doubles ─────────────────────────────────────────────────────────────

/** Build a minimal-but-valid wire event (shape is irrelevant to the buffer). */
function makeEvent(n: number): WireEvent {
  return {
    eventType: "page_viewed",
    eventData: {
      schemaVersion: 1,
      product: "comply",
      surface: "dashboard",
      feature: "index",
      payload: {},
    },
    sessionId: `sess_${n}`,
    path: "/dashboard",
  };
}

/** A fake sink that records every batch it is handed and can be told to fail. */
function makeSink(opts: { fail?: boolean } = {}) {
  const batches: WireEvent[][] = []; // every batch HANDED to the sink (incl. rejected)
  const acceptedBatches: WireEvent[][] = []; // only batches the sink ACCEPTED (returned true)
  let fail = opts.fail ?? false;
  const sink = vi.fn((events: WireEvent[]) => {
    const snapshot = events.slice();
    batches.push(snapshot);
    const ok = !fail;
    // A rejected hand-off was NOT delivered (sendBeacon returning false means
    // the payload was not transmitted), so it must not count toward delivered
    // totals — only accepted batches are "sent".
    if (ok) acceptedBatches.push(snapshot);
    return ok;
  });
  return {
    sink,
    batches,
    setFail: (v: boolean) => {
      fail = v;
    },
    /** Total events across all accepted batches (rejected hand-offs excluded). */
    get totalSent() {
      return acceptedBatches.reduce((sum, b) => sum + b.length, 0);
    },
  };
}

/** A fake timer surface that captures the armed callback for manual firing. */
function makeTimers() {
  let armed: (() => void) | null = null;
  let armCount = 0;
  let clearCount = 0;
  const timers: BatchTimers = {
    setInterval: (handler: () => void) => {
      armed = handler;
      armCount += 1;
      return { id: armCount };
    },
    clearInterval: () => {
      armed = null;
      clearCount += 1;
    },
  };
  return {
    timers,
    fire: () => armed?.(),
    get isArmed() {
      return armed !== null;
    },
    get armCount() {
      return armCount;
    },
    get clearCount() {
      return clearCount;
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BatchEmitter — buffering", () => {
  it("accumulates without sending until a flush trigger", () => {
    const { sink, batches } = makeSink();
    const em = new BatchEmitter({ sink, maxBatch: 10 });

    em.enqueue(makeEvent(1));
    em.enqueue(makeEvent(2));

    expect(em.size).toBe(2);
    expect(sink).not.toHaveBeenCalled();
    expect(batches).toHaveLength(0);
  });

  it("flush() sends a single array of the buffered events and clears the buffer", () => {
    const { sink, batches } = makeSink();
    const em = new BatchEmitter({ sink, maxBatch: 10 });

    em.enqueue(makeEvent(1));
    em.enqueue(makeEvent(2));
    const sent = em.flush();

    expect(sent).toBe(true);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
    expect(em.size).toBe(0);
  });

  it("flush() on an empty buffer is a no-op (never calls the sink)", () => {
    const { sink } = makeSink();
    const em = new BatchEmitter({ sink });

    const sent = em.flush();

    expect(sent).toBe(false);
    expect(sink).not.toHaveBeenCalled();
  });
});

describe("BatchEmitter — auto-flush at the cap", () => {
  it("auto-flushes immediately once maxBatch events are buffered", () => {
    const { sink, batches } = makeSink();
    const em = new BatchEmitter({ sink, maxBatch: 3 });

    em.enqueue(makeEvent(1));
    em.enqueue(makeEvent(2));
    expect(sink).not.toHaveBeenCalled();
    em.enqueue(makeEvent(3)); // hits the cap → auto-flush

    expect(sink).toHaveBeenCalledTimes(1);
    expect(batches[0]).toHaveLength(3);
    expect(em.size).toBe(0);
  });

  it("clamps maxBatch to MAX_BATCH_EVENTS so a flush never exceeds the wire cap", () => {
    const { sink, batches } = makeSink();
    // Ask for more than the hard cap; the emitter must clamp.
    const em = new BatchEmitter({ sink, maxBatch: MAX_BATCH_EVENTS + 25 });

    for (let i = 0; i < MAX_BATCH_EVENTS + 10; i++) em.enqueue(makeEvent(i));

    // First batch auto-flushed at exactly MAX_BATCH_EVENTS; remainder buffered.
    expect(batches[0]).toHaveLength(MAX_BATCH_EVENTS);
    expect(em.size).toBe(10);
    expect(batches[0].length).toBeLessThanOrEqual(MAX_BATCH_EVENTS);
  });

  it("never hands the sink more than maxBatch even when over-filled in one go", () => {
    const { sink, batches } = makeSink();
    const em = new BatchEmitter({ sink, maxBatch: 5 });

    for (let i = 0; i < 12; i++) em.enqueue(makeEvent(i));
    em.flush(); // drain remainder

    for (const b of batches) expect(b.length).toBeLessThanOrEqual(5);
    expect(sink).toHaveBeenLastCalledWith(expect.any(Array));
  });
});

describe("BatchEmitter — transport failure handling", () => {
  it("re-buffers the snapshot when the sink rejects, then resends on success", () => {
    const fake = makeSink({ fail: true });
    const em = new BatchEmitter({ sink: fake.sink, maxBatch: 10 });

    em.enqueue(makeEvent(1));
    em.enqueue(makeEvent(2));

    const firstTry = em.flush();
    expect(firstTry).toBe(false);
    expect(em.size).toBe(2); // re-buffered, nothing lost

    fake.setFail(false);
    const secondTry = em.flush();
    expect(secondTry).toBe(true);
    expect(em.size).toBe(0);
    expect(fake.totalSent).toBe(2);
  });

  it("treats a throwing sink as a failed flush (re-buffers, does not crash)", () => {
    const throwing = vi.fn(() => {
      throw new Error("sendBeacon blew up");
    });
    const em = new BatchEmitter({ sink: throwing, maxBatch: 10 });

    em.enqueue(makeEvent(1));
    expect(() => em.flush()).not.toThrow();
    expect(em.size).toBe(1); // re-buffered
  });
});

describe("BatchEmitter — flushAll (unload drain)", () => {
  it("drains the whole buffer in maxBatch-sized chunks", () => {
    const { sink, batches, totalSent } = makeSink();
    void totalSent;
    const em = new BatchEmitter({ sink, maxBatch: 3 });

    for (let i = 0; i < 7; i++) em.enqueue(makeEvent(i));
    // 7 enqueues with cap 3 → one auto-flush of 3 already happened (4 remain).
    em.flushAll();

    expect(em.size).toBe(0);
    const total = batches.reduce((s, b) => s + b.length, 0);
    expect(total).toBe(7);
    for (const b of batches) expect(b.length).toBeLessThanOrEqual(3);
  });

  it("stops draining early if the sink starts rejecting (no infinite unload loop)", () => {
    const fake = makeSink({ fail: true });
    const em = new BatchEmitter({ sink: fake.sink, maxBatch: 2 });

    em.enqueue(makeEvent(1));
    em.enqueue(makeEvent(2)); // auto-flush attempt fails → re-buffered
    fake.sink.mockClear();

    em.flushAll();

    // It tried once and bailed; events remain for a future attempt.
    expect(fake.sink).toHaveBeenCalled();
    expect(em.size).toBeGreaterThan(0);
  });
});

describe("BatchEmitter — interval timer lifecycle", () => {
  it("arms the interval lazily on first enqueue and disarms after draining", () => {
    const { sink } = makeSink();
    const t = makeTimers();
    const em = new BatchEmitter({ sink, maxBatch: 10, timers: t.timers });

    expect(t.isArmed).toBe(false);
    em.enqueue(makeEvent(1));
    expect(t.isArmed).toBe(true);
    expect(t.armCount).toBe(1);

    em.flush(); // empties buffer → disarm
    expect(t.isArmed).toBe(false);
    expect(t.clearCount).toBe(1);
  });

  it("the armed interval callback flushes the buffer when it fires", () => {
    const { sink, batches } = makeSink();
    const t = makeTimers();
    const em = new BatchEmitter({ sink, maxBatch: 10, timers: t.timers });

    em.enqueue(makeEvent(1));
    expect(sink).not.toHaveBeenCalled();

    t.fire(); // simulate the interval firing

    expect(sink).toHaveBeenCalledTimes(1);
    expect(batches[0]).toHaveLength(1);
    expect(em.size).toBe(0);
  });

  it("does not re-arm a second timer while one is already armed", () => {
    const { sink } = makeSink();
    const t = makeTimers();
    const em = new BatchEmitter({ sink, maxBatch: 10, timers: t.timers });

    em.enqueue(makeEvent(1));
    em.enqueue(makeEvent(2));
    em.enqueue(makeEvent(3));

    expect(t.armCount).toBe(1); // armed exactly once
  });

  it("reset() clears the buffer and disarms without sending", () => {
    const { sink } = makeSink();
    const t = makeTimers();
    const em = new BatchEmitter({ sink, maxBatch: 10, timers: t.timers });

    em.enqueue(makeEvent(1));
    em.reset();

    expect(em.size).toBe(0);
    expect(sink).not.toHaveBeenCalled();
    expect(t.isArmed).toBe(false);
  });
});
