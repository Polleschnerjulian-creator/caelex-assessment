/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — foreground dwell accumulator + scroll-depth tracker (PURE).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * "Dwell" = how long a screen was actually IN FRONT of the user. We measure
 * FOREGROUND-ONLY engaged time so a tab parked in the background does NOT inflate
 * the figure (spec §3.6): the timer pauses on `document.visibilitychange → hidden`
 * and resumes on `→ visible`. The accumulated `durationMs` (the existing-but-unused
 * `AnalyticsEvent.durationMs` / `analytics.timing()` sink) flushes as a
 * `screen_dwelled` event on the NEXT route change AND on `pagehide` / hidden.
 *
 * This module owns ONLY the pure arithmetic of that state machine — the wall
 * clock is injected (`now: () => number`), so it is unit-testable without timers,
 * `document`, or `window`. The browser glue (registering the visibilitychange /
 * pagehide listeners, calling `markVisible/markHidden`, emitting the event) lives
 * in the client provider.
 *
 * INVARIANTS (covered by dwell.test.ts):
 *   - A fresh accumulator that is visible the whole time reports elapsed = Δnow.
 *   - Time spent while hidden is NOT counted.
 *   - markVisible while already visible, and markHidden while already hidden, are
 *     idempotent (no negative/double counting).
 *   - reset() starts a clean window at the current clock.
 *   - elapsedMs is always a non-negative integer (the wire schema requires int≥0).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Accumulates foreground (engaged) milliseconds across visibility transitions.
 *
 * Model: we keep `accumulatedMs` (engaged time already banked) plus, when the
 * screen is currently visible, the timestamp `visibleSince` at which the current
 * visible run began. Banking happens on every transition to hidden and on every
 * read, so a read never has to assume the current run has ended.
 */
export class DwellAccumulator {
  private readonly now: () => number;
  private accumulatedMs = 0;
  /** Wall-clock ms at which the current VISIBLE run began, or null if hidden. */
  private visibleSince: number | null;

  /**
   * @param now            Injectable clock (defaults to Date.now).
   * @param startVisible   Whether the screen is visible at construction
   *                       (default true — a route renders while in foreground).
   */
  constructor(now: () => number = Date.now, startVisible = true) {
    this.now = now;
    this.visibleSince = startVisible ? this.now() : null;
  }

  /** Transition to visible (resume the timer). Idempotent if already visible. */
  markVisible(): void {
    if (this.visibleSince !== null) return; // already running
    this.visibleSince = this.now();
  }

  /** Transition to hidden (pause the timer, banking the current run). Idempotent. */
  markHidden(): void {
    if (this.visibleSince === null) return; // already paused
    this.bank();
    this.visibleSince = null;
  }

  /**
   * Total engaged (foreground) milliseconds so far, as a non-negative integer.
   * Includes the in-progress visible run without ending it.
   */
  get elapsedMs(): number {
    const live =
      this.visibleSince !== null
        ? Math.max(0, this.now() - this.visibleSince)
        : 0;
    const total = this.accumulatedMs + live;
    // Clamp to a non-negative integer (wire schema: int ≥ 0). Guards against a
    // non-monotonic clock returning a smaller value than a prior reading.
    return Math.max(0, Math.floor(total));
  }

  /** Whether the screen is currently counted as visible. */
  get isVisible(): boolean {
    return this.visibleSince !== null;
  }

  /**
   * Start a fresh dwell window for a new screen. Banks nothing — the caller is
   * expected to have already read {@link elapsedMs} for the outgoing screen.
   */
  reset(startVisible = true): void {
    this.accumulatedMs = 0;
    this.visibleSince = startVisible ? this.now() : null;
  }

  /** Bank the current visible run into `accumulatedMs` and restart its origin. */
  private bank(): void {
    if (this.visibleSince === null) return;
    const delta = Math.max(0, this.now() - this.visibleSince);
    this.accumulatedMs += delta;
    this.visibleSince = this.now();
  }
}

/**
 * Tracks the deepest scroll position reached on a screen, as an integer
 * percentage 0–100. Pure: the page geometry is fed in via {@link record}
 * (`scrollTop`, `viewportHeight`, `documentHeight`) so it is testable without a
 * DOM. The provider wires a throttled `scroll` listener that calls `record`.
 *
 * INVARIANTS (covered by dwell.test.ts):
 *   - maxPct is monotonic non-decreasing (a scroll back up cannot lower it).
 *   - A page shorter than the viewport (nothing to scroll) reports 100.
 *   - The result is always clamped to the integer range [0, 100].
 */
export class ScrollDepthTracker {
  private maxPct = 0;

  /** Greatest scroll depth reached, integer 0–100. */
  get maxScrollPct(): number {
    return this.maxPct;
  }

  /**
   * Fold one scroll measurement into the running maximum.
   * @param scrollTop       px scrolled from the top (`window.scrollY`).
   * @param viewportHeight  visible viewport height (`window.innerHeight`).
   * @param documentHeight  full scrollable document height
   *                        (`document.documentElement.scrollHeight`).
   */
  record(
    scrollTop: number,
    viewportHeight: number,
    documentHeight: number,
  ): number {
    const pct = computeScrollPct(scrollTop, viewportHeight, documentHeight);
    if (pct > this.maxPct) this.maxPct = pct;
    return this.maxPct;
  }

  /** Reset to 0 for a new screen. */
  reset(): void {
    this.maxPct = 0;
  }
}

/**
 * Compute the integer scroll-depth percentage for one measurement. Exported so
 * it can be unit-tested directly and reused by the provider.
 *
 * - The scrollable distance is `documentHeight - viewportHeight`.
 * - When there is nothing to scroll (document ≤ viewport), the screen is fully
 *   seen → 100.
 * - Otherwise `(scrollTop + viewportHeight) / documentHeight`, clamped to [0,100]
 *   and floored to an integer.
 */
export function computeScrollPct(
  scrollTop: number,
  viewportHeight: number,
  documentHeight: number,
): number {
  // Defensive: non-finite / negative geometry → treat as "top of a full page".
  const vh = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;
  const dh = Number.isFinite(documentHeight) ? Math.max(0, documentHeight) : 0;
  const st = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;

  if (dh <= vh || dh === 0) return 100; // nothing to scroll → fully seen
  const seen = st + vh;
  const pct = (seen / dh) * 100;
  return Math.max(0, Math.min(100, Math.floor(pct)));
}
