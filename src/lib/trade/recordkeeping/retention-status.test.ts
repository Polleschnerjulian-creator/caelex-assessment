/**
 * Tests for retention-status.ts (Z32 Tier 4).
 *
 * Covers:
 *   1. status = active when > 90 days remain
 *   2. status = expiring-soon when ≤ 90 days remain
 *   3. status = expired when daysRemaining < 0
 *   4. status = pending when no trigger date
 *   5. daysRemaining math is exact at year boundary
 *   6. zero days remaining = expiring-soon (cutoff is today)
 *   7. one day past cutoff = expired
 *   8. basis + description sourced from RETENTION_POLICIES
 *   9. now defaults to current Date when omitted
 *  10. UTC-midnight semantics ignore intra-day clock time
 */

import { describe, it, expect } from "vitest";
import { EXPIRING_SOON_DAYS, getRetentionStatus } from "./retention-status";

const FIXED_NOW = new Date("2026-05-22T12:00:00.000Z");

describe("getRetentionStatus", () => {
  it("returns status=active when more than 90 days remain", () => {
    // export = today → retainUntil = today + 5y → ~1826 days remaining
    const triggerDate = new Date("2026-05-22T00:00:00.000Z");
    const status = getRetentionStatus("OPERATION", triggerDate, FIXED_NOW);
    expect(status.status).toBe("active");
    expect(status.daysRemaining).toBeGreaterThan(EXPIRING_SOON_DAYS);
    expect(status.retainUntil?.toISOString()).toBe("2031-05-22T00:00:00.000Z");
    expect(status.basis).toMatch(/762\.6|122\.5/);
  });

  it("returns status=expiring-soon when ≤ 90 days remain", () => {
    // retainUntil = now + 30 days → triggerDate = now - 5y + 30 days
    const triggerDate = new Date("2021-06-21T00:00:00.000Z"); // ~5y - 30d ago
    const status = getRetentionStatus("OPERATION", triggerDate, FIXED_NOW);
    expect(status.status).toBe("expiring-soon");
    expect(status.daysRemaining).toBeLessThanOrEqual(EXPIRING_SOON_DAYS);
    expect(status.daysRemaining).toBeGreaterThanOrEqual(0);
  });

  it("returns status=expired when daysRemaining is negative", () => {
    // retainUntil 1 year ago → triggerDate 6 years ago
    const triggerDate = new Date("2020-05-22T00:00:00.000Z");
    const status = getRetentionStatus("LICENSE", triggerDate, FIXED_NOW);
    expect(status.status).toBe("expired");
    expect(status.daysRemaining).toBeLessThan(0);
  });

  it("returns status=pending when no trigger date is supplied", () => {
    const status = getRetentionStatus("OPERATION", null, FIXED_NOW);
    expect(status.status).toBe("pending");
    expect(status.daysRemaining).toBeNull();
    expect(status.retainUntil).toBeNull();
    // basis is still surfaced so the UI can explain the policy that
    // WILL apply once the trigger event fires.
    expect(status.basis).toMatch(/762\.6|122\.5/);
  });

  it("computes daysRemaining=0 when today is exactly the cutoff", () => {
    // triggerDate = exactly 5 years before now (UTC midnight)
    const triggerDate = new Date("2021-05-22T00:00:00.000Z");
    const now = new Date("2026-05-22T08:30:00.000Z");
    const status = getRetentionStatus("OPERATION", triggerDate, now);
    expect(status.daysRemaining).toBe(0);
    // cutoff-day-itself is still within the retention window: bucket
    // is expiring-soon, NOT expired (overdue starts the next day).
    expect(status.status).toBe("expiring-soon");
  });

  it("flips to expired one day past the cutoff", () => {
    const triggerDate = new Date("2021-05-22T00:00:00.000Z");
    const now = new Date("2026-05-23T00:00:00.000Z");
    const status = getRetentionStatus("OPERATION", triggerDate, now);
    expect(status.daysRemaining).toBe(-1);
    expect(status.status).toBe("expired");
  });

  it("sources basis + description from RETENTION_POLICIES", () => {
    const triggerDate = new Date("2026-05-22T00:00:00.000Z");
    const opStatus = getRetentionStatus("OPERATION", triggerDate, FIXED_NOW);
    const vsdStatus = getRetentionStatus("VSD", triggerDate, FIXED_NOW);
    expect(opStatus.basis).not.toBe(vsdStatus.basis);
    expect(opStatus.description).not.toBe(vsdStatus.description);
    expect(vsdStatus.basis).toMatch(/764\.5|127\.12/);
  });

  it("defaults `now` to current Date when omitted", () => {
    // We can't assert an exact daysRemaining without controlling now,
    // but the function must not throw and must produce a status.
    const triggerDate = new Date("2026-01-01T00:00:00.000Z");
    const status = getRetentionStatus("OPERATION", triggerDate);
    expect(["active", "expiring-soon", "expired", "pending"]).toContain(
      status.status,
    );
  });

  it("uses UTC-midnight semantics — intra-day clock time is ignored", () => {
    // Two `now` values on the same calendar day yield the same
    // daysRemaining (both compared at UTC midnight).
    const triggerDate = new Date("2026-05-22T00:00:00.000Z");
    const earlyMorning = new Date("2026-05-22T00:00:01.000Z");
    const lateEvening = new Date("2026-05-22T23:59:59.000Z");
    const s1 = getRetentionStatus("OPERATION", triggerDate, earlyMorning);
    const s2 = getRetentionStatus("OPERATION", triggerDate, lateEvening);
    expect(s1.daysRemaining).toBe(s2.daysRemaining);
    expect(s1.status).toBe(s2.status);
  });

  it("future trigger date — clock ticks forward into the retention window", () => {
    // Trigger is in the future (e.g. scheduled export hasn't shipped
    // yet). The retain-until is even further in the future; status
    // must be `active`.
    const triggerDate = new Date("2026-12-31T00:00:00.000Z");
    const status = getRetentionStatus("OPERATION", triggerDate, FIXED_NOW);
    expect(status.status).toBe("active");
    expect(status.daysRemaining).toBeGreaterThan(EXPIRING_SOON_DAYS);
  });
});
