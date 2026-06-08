/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the foreground dwell accumulator + scroll-depth tracker
 * (src/lib/analytics/dwell.ts).
 *
 * The dwell timer is FOREGROUND-ONLY: time while the tab is hidden must NOT be
 * counted (a parked tab can't inflate engaged time). The wall clock is injected
 * so the suite is deterministic — a mutable `clock` variable stands in for
 * Date.now(), advanced by hand. No real timers, no `document`, no DOM.
 *
 * Pure module — not executed here; the orchestrator runs the suite centrally.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  DwellAccumulator,
  ScrollDepthTracker,
  computeScrollPct,
} from "./dwell";

/** A hand-advanced fake clock. */
function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    set: (ms: number) => {
      t = ms;
    },
  };
}

// ── DwellAccumulator ─────────────────────────────────────────────────────────

describe("DwellAccumulator — foreground counting", () => {
  it("counts the full elapsed time when visible the whole window", () => {
    const clock = makeClock(1000);
    const dwell = new DwellAccumulator(clock.now, true);

    clock.advance(5000);

    expect(dwell.elapsedMs).toBe(5000);
    expect(dwell.isVisible).toBe(true);
  });

  it("does NOT count time spent while hidden", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, true);

    clock.advance(2000); // visible: +2000
    dwell.markHidden();
    clock.advance(10_000); // hidden: ignored
    dwell.markVisible();
    clock.advance(3000); // visible: +3000

    expect(dwell.elapsedMs).toBe(5000); // 2000 + 3000, NOT 15000
  });

  it("banks the in-progress visible run when read mid-window", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, true);

    clock.advance(1500);
    // Read without any transition — the live run must be included.
    expect(dwell.elapsedMs).toBe(1500);
    clock.advance(500);
    expect(dwell.elapsedMs).toBe(2000);
  });

  it("starts paused when constructed startVisible=false", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, false);

    clock.advance(4000); // hidden the whole time
    expect(dwell.elapsedMs).toBe(0);
    expect(dwell.isVisible).toBe(false);

    dwell.markVisible();
    clock.advance(1000);
    expect(dwell.elapsedMs).toBe(1000);
  });
});

describe("DwellAccumulator — idempotent transitions", () => {
  it("markVisible while already visible does not double-count", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, true);

    clock.advance(1000);
    dwell.markVisible(); // no-op
    dwell.markVisible(); // no-op
    clock.advance(1000);

    expect(dwell.elapsedMs).toBe(2000);
  });

  it("markHidden while already hidden is a no-op", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, true);

    clock.advance(1000); // +1000 visible
    dwell.markHidden();
    clock.advance(1000); // hidden
    dwell.markHidden(); // no-op (already hidden)
    clock.advance(1000); // still hidden

    expect(dwell.elapsedMs).toBe(1000);
  });
});

describe("DwellAccumulator — reset + integer/non-negative guarantees", () => {
  it("reset() starts a fresh window at the current clock", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, true);

    clock.advance(3000);
    expect(dwell.elapsedMs).toBe(3000);

    dwell.reset(true);
    expect(dwell.elapsedMs).toBe(0);
    clock.advance(1200);
    expect(dwell.elapsedMs).toBe(1200);
  });

  it("reset(false) starts the new window paused", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, true);
    clock.advance(1000);

    dwell.reset(false);
    clock.advance(5000); // hidden
    expect(dwell.elapsedMs).toBe(0);
  });

  it("elapsedMs is always a non-negative integer even with a non-monotonic clock", () => {
    const clock = makeClock(10_000);
    const dwell = new DwellAccumulator(clock.now, true);

    // Clock jumps BACKWARDS (NTP correction / suspend). Must clamp to >= 0.
    clock.set(9000);
    expect(dwell.elapsedMs).toBe(0);
    expect(Number.isInteger(dwell.elapsedMs)).toBe(true);
  });

  it("floors fractional milliseconds to an integer", () => {
    const clock = makeClock(0);
    const dwell = new DwellAccumulator(clock.now, true);
    clock.advance(1234.9);
    expect(dwell.elapsedMs).toBe(1234);
  });
});

// ── ScrollDepthTracker / computeScrollPct ────────────────────────────────────

describe("computeScrollPct", () => {
  it("returns 100 when the page is not scrollable (document <= viewport)", () => {
    expect(computeScrollPct(0, 1000, 800)).toBe(100);
    expect(computeScrollPct(0, 1000, 1000)).toBe(100);
  });

  it("computes a partial depth from scrollTop + viewport over document height", () => {
    // viewport 500, document 2000, scrolled 0 → (0+500)/2000 = 25%
    expect(computeScrollPct(0, 500, 2000)).toBe(25);
    // scrolled 500 → (500+500)/2000 = 50%
    expect(computeScrollPct(500, 500, 2000)).toBe(50);
    // scrolled to bottom (1500) → (1500+500)/2000 = 100%
    expect(computeScrollPct(1500, 500, 2000)).toBe(100);
  });

  it("clamps to [0,100] and floors to an integer", () => {
    // Over-scroll (bounce) cannot exceed 100.
    expect(computeScrollPct(5000, 500, 2000)).toBe(100);
    // Fractional: (0+333)/1000 = 33.3 → 33
    expect(computeScrollPct(0, 333, 1000)).toBe(33);
  });

  it("treats non-finite / negative geometry defensively", () => {
    expect(computeScrollPct(NaN, NaN, NaN)).toBe(100); // dh=0 → fully seen
    expect(computeScrollPct(-50, 500, 2000)).toBe(25); // negative scrollTop → 0
  });
});

describe("ScrollDepthTracker", () => {
  it("tracks the maximum depth monotonically (scrolling back up cannot lower it)", () => {
    const t = new ScrollDepthTracker();

    t.record(0, 500, 2000); // 25%
    expect(t.maxScrollPct).toBe(25);
    t.record(500, 500, 2000); // 50%
    expect(t.maxScrollPct).toBe(50);
    t.record(0, 500, 2000); // back to 25% — max stays 50
    expect(t.maxScrollPct).toBe(50);
  });

  it("reset() returns the max to 0 for a new screen", () => {
    const t = new ScrollDepthTracker();
    t.record(1500, 500, 2000); // 100%
    expect(t.maxScrollPct).toBe(100);

    t.reset();
    expect(t.maxScrollPct).toBe(0);
  });
});
