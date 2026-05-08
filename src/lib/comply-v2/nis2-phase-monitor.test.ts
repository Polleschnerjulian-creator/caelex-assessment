/**
 * Tests for the NIS2 phase deadline monitor.
 *
 * The pure threshold-picker (`pickNextAction`) is the testable part —
 * it covers:
 *
 *   1. T-12h "approaching" tier
 *   2. T-2h "critical" tier (overrides approaching)
 *   3. T+0 "overdue" tier (when deadline has passed)
 *   4. T+24h "escalated" tier (when 24h past deadline)
 *   5. Idempotency: returns null when the relevant timestamp is set
 *   6. Tier ordering: highest unfired tier wins
 */

import { describe, it, expect } from "vitest";
import {
  pickNextAction,
  APPROACHING_THRESHOLD_MS,
  CRITICAL_THRESHOLD_MS,
  ESCALATION_AFTER_OVERDUE_MS,
} from "./nis2-phase-monitor.server";

const NOW = new Date("2026-05-08T12:00:00Z");

function makePhase(
  overrides: Partial<{
    deadline: Date;
    warnedApproachingAt: Date | null;
    warnedCriticalAt: Date | null;
    markedOverdueAt: Date | null;
    escalatedAt: Date | null;
  }> = {},
) {
  return {
    deadline: new Date(NOW.getTime() + 11 * 60 * 60 * 1000), // 11h ahead
    warnedApproachingAt: null,
    warnedCriticalAt: null,
    markedOverdueAt: null,
    escalatedAt: null,
    ...overrides,
  };
}

// ─── T-12h approaching ────────────────────────────────────────────────────

describe("pickNextAction — T-12h approaching", () => {
  it("returns 'approaching' when deadline is 11h away and no warning fired", () => {
    expect(pickNextAction(makePhase(), NOW)).toBe("approaching");
  });

  it("returns null when deadline is >12h away", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() + 13 * 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("returns null when warnedApproachingAt is already set and deadline still >2h", () => {
    expect(
      pickNextAction(makePhase({ warnedApproachingAt: new Date() }), NOW),
    ).toBeNull();
  });

  it("APPROACHING_THRESHOLD_MS = 12h", () => {
    expect(APPROACHING_THRESHOLD_MS).toBe(12 * 60 * 60 * 1000);
  });
});

// ─── T-2h critical ────────────────────────────────────────────────────────

describe("pickNextAction — T-2h critical", () => {
  it("returns 'critical' when deadline is 1.5h away", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() + 1.5 * 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBe("critical");
  });

  it("returns 'critical' even when approaching warning has already fired", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() + 1 * 60 * 60 * 1000),
          warnedApproachingAt: new Date(NOW.getTime() - 1000),
        }),
        NOW,
      ),
    ).toBe("critical");
  });

  it("returns null when critical warning is set and deadline still future", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() + 1 * 60 * 60 * 1000),
          warnedCriticalAt: new Date(),
          warnedApproachingAt: new Date(NOW.getTime() - 1000),
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("CRITICAL_THRESHOLD_MS = 2h", () => {
    expect(CRITICAL_THRESHOLD_MS).toBe(2 * 60 * 60 * 1000);
  });
});

// ─── T+0 overdue ──────────────────────────────────────────────────────────

describe("pickNextAction — T+0 overdue", () => {
  it("returns 'overdue' when deadline is in the past and no overdue marker", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() - 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBe("overdue");
  });

  it("overdue takes precedence over critical/approaching even if those are unset", () => {
    // 1 hour past deadline — critical window is gone, overdue wins
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() - 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBe("overdue");
  });
});

// ─── T+24h escalated ──────────────────────────────────────────────────────

describe("pickNextAction — T+24h escalated", () => {
  it("returns 'escalated' when 24h past deadline and no escalation yet", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBe("escalated");
  });

  it("escalated wins even if overdue marker is set", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() - 26 * 60 * 60 * 1000),
          markedOverdueAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBe("escalated");
  });

  it("returns 'overdue' (not escalated) when only 12h past deadline", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() - 12 * 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBe("overdue");
  });

  it("returns null when escalation is already done", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() - 26 * 60 * 60 * 1000),
          markedOverdueAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
          escalatedAt: new Date(),
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("ESCALATION_AFTER_OVERDUE_MS = 24h", () => {
    expect(ESCALATION_AFTER_OVERDUE_MS).toBe(24 * 60 * 60 * 1000);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────

describe("pickNextAction — edge cases", () => {
  it("returns null for a fresh phase whose deadline is months away", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("returns null for a phase with all timestamps already set", () => {
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
          warnedApproachingAt: new Date(),
          warnedCriticalAt: new Date(),
          markedOverdueAt: new Date(),
          escalatedAt: new Date(),
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("approaching does not fire when deadline is exactly at t (zero ms remaining)", () => {
    // Edge: deadline === now means we're past the approaching window
    // (ms=0, but `ms > 0` filter excludes it). Falls through to overdue.
    expect(
      pickNextAction(
        makePhase({
          deadline: new Date(NOW.getTime()),
        }),
        NOW,
      ),
    ).toBeNull();
    // Note: deadlineMs < nowMs is false when equal, so neither overdue
    // nor approaching fires. The next hourly cron will catch it as
    // overdue once 1ms passes — acceptable boundary behaviour.
  });
});
