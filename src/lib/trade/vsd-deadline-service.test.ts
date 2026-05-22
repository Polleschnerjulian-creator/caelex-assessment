/**
 * Tests for src/lib/trade/vsd-deadline-service.ts — Sprint W1.
 *
 * The most important tests in this file are the OFAC 60-day clock
 * thresholds — those map directly to statutory consequences. Get
 * those wrong and operators miss the disclosure deadline.
 *
 * Coverage (16 cases):
 *
 *  Authority clocks (OFAC):
 *   1. OFAC + 29d → no rule (under INFO threshold)
 *   2. OFAC + 30d → INFO (clock at midpoint)
 *   3. OFAC + 45d → WARNING (act-now bucket)
 *   4. OFAC + 60d → CRITICAL (statutory clock crossed)
 *   5. OFAC + 90d → CRITICAL (still critical, max severity)
 *
 *  Authority clocks (BIS):
 *   6. BIS + 60d → WARNING
 *   7. BIS + 90d → CRITICAL
 *   8. BIS + 59d → null (under threshold)
 *
 *  Authority clocks (DDTC/BAFA/EU/OTHER — same rules):
 *   9. DDTC + 90d → WARNING
 *  10. BAFA + 180d → CRITICAL
 *
 *  Terminal status — no rule fires:
 *  11. RESOLVED VSD with 200d delay → null
 *  12. SUBMITTED VSD with 200d delay → null
 *  13. WITHDRAWN VSD → null
 *
 *  Lifecycle-stuck rules:
 *  14. DRAFTED >14d ago → WARNING (DRAFTED_STUCK)
 *  15. DRAFTED >30d ago → CRITICAL (DRAFTED_STUCK wins over authority)
 *  16. INVESTIGATING >60d ago → INFO (status check)
 */

import { describe, it, expect } from "vitest";
import { findDeadlineForVsd } from "./vsd-deadline-service";

const NOW = new Date("2026-06-01T00:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

function buildVsd(
  overrides: Partial<{
    authority:
      | "OFAC"
      | "BIS"
      | "DDTC"
      | "BAFA"
      | "EU_COMPETENT_AUTHORITY"
      | "OTHER";
    status:
      | "DISCOVERED"
      | "INVESTIGATING"
      | "DRAFTED"
      | "SUBMITTED"
      | "ACKNOWLEDGED"
      | "RESOLVED"
      | "WITHDRAWN";
    discoveredAt: Date;
    draftedAt: Date | null;
    investigatingAt: Date | null;
  }>,
) {
  return {
    authority: "OFAC" as const,
    status: "DISCOVERED" as const,
    discoveredAt: NOW,
    draftedAt: null,
    investigatingAt: null,
    ...overrides,
  };
}

describe("OFAC 60-day clock", () => {
  it("29 days since discovery → no rule (below INFO threshold)", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "OFAC", discoveredAt: daysAgo(29) }),
      NOW,
    );
    expect(m).toBeNull();
  });

  it("30 days since discovery → INFO (clock at midpoint)", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "OFAC", discoveredAt: daysAgo(30) }),
      NOW,
    );
    expect(m?.severity).toBe("INFO");
    expect(m?.reasonKey).toBe("OFAC_CLOCK_30");
  });

  it("45 days since discovery → WARNING (act-now bucket)", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "OFAC", discoveredAt: daysAgo(45) }),
      NOW,
    );
    expect(m?.severity).toBe("WARNING");
    expect(m?.reasonKey).toBe("OFAC_CLOCK_45");
  });

  it("60 days since discovery → CRITICAL (statutory clock crossed)", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "OFAC", discoveredAt: daysAgo(60) }),
      NOW,
    );
    expect(m?.severity).toBe("CRITICAL");
    expect(m?.reasonKey).toBe("OFAC_CLOCK_CROSSED");
  });

  it("90 days since discovery → still CRITICAL", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "OFAC", discoveredAt: daysAgo(90) }),
      NOW,
    );
    expect(m?.severity).toBe("CRITICAL");
  });
});

describe("BIS prompt-disclosure clock", () => {
  it("59 days since discovery → null (under threshold)", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "BIS", discoveredAt: daysAgo(59) }),
      NOW,
    );
    expect(m).toBeNull();
  });

  it("60 days since discovery → WARNING", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "BIS", discoveredAt: daysAgo(60) }),
      NOW,
    );
    expect(m?.severity).toBe("WARNING");
    expect(m?.reasonKey).toBe("BIS_CLOCK_60");
  });

  it("90 days since discovery → CRITICAL", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "BIS", discoveredAt: daysAgo(90) }),
      NOW,
    );
    expect(m?.severity).toBe("CRITICAL");
    expect(m?.reasonKey).toBe("BIS_CLOCK_OVERDUE");
  });
});

describe("DDTC / BAFA / EU prompt-disclosure clock", () => {
  it("DDTC + 90d → WARNING (general prompt-disclosure)", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "DDTC", discoveredAt: daysAgo(90) }),
      NOW,
    );
    expect(m?.severity).toBe("WARNING");
    expect(m?.reasonKey).toBe("GENERAL_PROMPT_DISCLOSURE");
  });

  it("BAFA + 180d → CRITICAL (long overdue)", () => {
    const m = findDeadlineForVsd(
      buildVsd({ authority: "BAFA", discoveredAt: daysAgo(180) }),
      NOW,
    );
    expect(m?.severity).toBe("CRITICAL");
    expect(m?.reasonKey).toBe("GENERAL_LONG_OVERDUE");
  });
});

describe("Terminal status — no deadline rules fire", () => {
  it("RESOLVED + 200d → null (closed)", () => {
    const m = findDeadlineForVsd(
      buildVsd({
        authority: "OFAC",
        status: "RESOLVED",
        discoveredAt: daysAgo(200),
      }),
      NOW,
    );
    expect(m).toBeNull();
  });

  it("SUBMITTED + 200d → null (clock already crossed at filing)", () => {
    const m = findDeadlineForVsd(
      buildVsd({
        authority: "OFAC",
        status: "SUBMITTED",
        discoveredAt: daysAgo(200),
      }),
      NOW,
    );
    expect(m).toBeNull();
  });

  it("WITHDRAWN → null", () => {
    const m = findDeadlineForVsd(
      buildVsd({
        authority: "OFAC",
        status: "WITHDRAWN",
        discoveredAt: daysAgo(200),
      }),
      NOW,
    );
    expect(m).toBeNull();
  });
});

describe("Lifecycle-stuck rules", () => {
  it("DRAFTED >14d ago → WARNING (DRAFTED_STUCK)", () => {
    const m = findDeadlineForVsd(
      buildVsd({
        authority: "BIS",
        status: "DRAFTED",
        discoveredAt: daysAgo(50), // no authority hit (under 60d for BIS)
        draftedAt: daysAgo(15),
      }),
      NOW,
    );
    expect(m?.severity).toBe("WARNING");
    expect(m?.reasonKey).toBe("DRAFTED_STUCK");
  });

  it("DRAFTED >30d ago → CRITICAL (DRAFTED_STUCK overrides authority)", () => {
    const m = findDeadlineForVsd(
      buildVsd({
        authority: "BIS",
        status: "DRAFTED",
        discoveredAt: daysAgo(50),
        draftedAt: daysAgo(35),
      }),
      NOW,
    );
    expect(m?.severity).toBe("CRITICAL");
    expect(m?.reasonKey).toBe("DRAFTED_STUCK");
  });

  it("INVESTIGATING >60d ago → INFO (status check)", () => {
    const m = findDeadlineForVsd(
      buildVsd({
        authority: "BAFA",
        status: "INVESTIGATING",
        discoveredAt: daysAgo(70), // BAFA threshold is 90d so this doesn't fire
        investigatingAt: daysAgo(65),
      }),
      NOW,
    );
    expect(m?.severity).toBe("INFO");
    expect(m?.reasonKey).toBe("INVESTIGATING_LONG");
  });
});
