/**
 * Tests for src/lib/trade/subject-to-ear/rule-corpus-version.ts — Sprint Z21.
 *
 * The Affiliates Rule (90 FR 47201, Sept 30 2025) was stayed by
 * 90 FR 50857 until **November 9, 2026**. The engine must distinguish
 * between text in force vs. stayed vs. proposed per Blueprint 2 § Caveat #4.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  getRuleStatus,
  getRuleWarnings,
  isRuleInForce,
} from "./rule-corpus-version";

// ─── Affiliates Rule (the canonical stay case) ──────────────────────

describe("Affiliates Rule § 744.11 — stay until 2026-11-09", () => {
  it("on 2026-05-22 (mid-stay) → inForce = false, stayedUntil populated", () => {
    const evaluatedAt = new Date("2026-05-22T12:00:00Z");
    const status = getRuleStatus("affiliates-rule-744.11", evaluatedAt);
    expect(status.inForce).toBe(false);
    expect(status.stayedUntil).toBe("2026-11-09");
    expect(status.stayCitation).toMatch(/90 FR 50857/);
  });

  it("on 2026-11-08 (day before stay expires) → still NOT inForce", () => {
    const evaluatedAt = new Date("2026-11-08T23:59:59Z");
    const status = getRuleStatus("affiliates-rule-744.11", evaluatedAt);
    expect(status.inForce).toBe(false);
  });

  it("on 2026-11-09 (stay expiry day) → inForce = true (cliff transition)", () => {
    const evaluatedAt = new Date("2026-11-09T00:00:00Z");
    const status = getRuleStatus("affiliates-rule-744.11", evaluatedAt);
    expect(status.inForce).toBe(true);
  });

  it("on 2027-01-01 (well past stay) → inForce = true", () => {
    const evaluatedAt = new Date("2027-01-01T00:00:00Z");
    const status = getRuleStatus("affiliates-rule-744.11", evaluatedAt);
    expect(status.inForce).toBe(true);
  });

  it("on 2025-09-29 (day before effective) → NOT inForce (pre-effective)", () => {
    const evaluatedAt = new Date("2025-09-29T00:00:00Z");
    const status = getRuleStatus("affiliates-rule-744.11", evaluatedAt);
    expect(status.inForce).toBe(false);
  });

  it("rationale references the stay window and operator action", () => {
    const status = getRuleStatus(
      "affiliates-rule-744.11",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.rationale).toMatch(/2026-11-09|50% look-through/i);
    expect(status.rationale).toMatch(/best practice|positive-knowledge/i);
  });
});

describe("§ 734.9(e) and (g) affiliate sentences — same stay window", () => {
  it("§ 734.9(e) — stayed mid-2026", () => {
    const status = getRuleStatus(
      "affiliates-rule-734.9-e",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.inForce).toBe(false);
    expect(status.stayedUntil).toBe("2026-11-09");
  });

  it("§ 734.9(g) — stayed mid-2026", () => {
    const status = getRuleStatus(
      "affiliates-rule-734.9-g",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.inForce).toBe(false);
    expect(status.stayedUntil).toBe("2026-11-09");
  });

  it("§ 734.9(e) — in force on 2026-11-09 (cliff)", () => {
    const status = getRuleStatus(
      "affiliates-rule-734.9-e",
      new Date("2026-11-09T00:00:00Z"),
    );
    expect(status.inForce).toBe(true);
  });
});

describe("Red Flag 29 — same stay window as the Affiliates Rule", () => {
  it("mid-2026 → stayed", () => {
    const status = getRuleStatus(
      "red-flag-29",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.inForce).toBe(false);
  });
});

// ─── Core FDPR rules — all in force ─────────────────────────────────

describe("Core FDPR rules — in force as of 2026-05-22", () => {
  it("NS-FDPR (b) — in force", () => {
    const status = getRuleStatus(
      "fdpr-734.9-b-ns",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.inForce).toBe(true);
    expect(status.stayedUntil).toBeNull();
  });

  it("9x515-FDPR (c) — in force; effective 2014-06-27", () => {
    const status = getRuleStatus(
      "fdpr-734.9-c-9x515",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.inForce).toBe(true);
    expect(status.effectiveAt).toBe("2014-06-27");
  });

  it("Russia/Belarus FDPR (f) — in force since 2022-02-24", () => {
    const status = getRuleStatus(
      "fdpr-734.9-f-russia-belarus",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.inForce).toBe(true);
    expect(status.effectiveAt).toBe("2022-02-24");
  });

  it("Advanced Computing FDPR (h) — in force since 2022-10-07", () => {
    const status = getRuleStatus(
      "fdpr-734.9-h-advanced-computing",
      new Date("2026-05-22T12:00:00Z"),
    );
    expect(status.inForce).toBe(true);
  });

  it("Russia/Belarus FDPR was NOT in force pre-2022-02-24", () => {
    const status = getRuleStatus(
      "fdpr-734.9-f-russia-belarus",
      new Date("2022-02-23T00:00:00Z"),
    );
    expect(status.inForce).toBe(false);
  });
});

// ─── Warning surface ────────────────────────────────────────────────

describe("getRuleWarnings — stay-expiry warning surface", () => {
  it("on 2026-05-22 (about 170 days before Nov 9 stay expiry) → severity 'info'", () => {
    const warnings = getRuleWarnings(new Date("2026-05-22T12:00:00Z"));
    // All 4 stayed rules surface as info-severity (well > 30 days)
    expect(warnings.length).toBeGreaterThanOrEqual(4);
    for (const w of warnings) {
      expect(w.severity).toBe("info");
      expect(w.daysUntilStayExpiry).toBeGreaterThan(30);
    }
  });

  it("on 2026-10-20 (~20 days before expiry) → severity 'warning'", () => {
    const warnings = getRuleWarnings(new Date("2026-10-20T12:00:00Z"));
    const affiliates = warnings.find(
      (w) => w.ruleId === "affiliates-rule-744.11",
    );
    expect(affiliates?.severity).toBe("warning");
    expect(affiliates!.daysUntilStayExpiry).toBeLessThanOrEqual(30);
    expect(affiliates!.daysUntilStayExpiry).toBeGreaterThan(7);
  });

  it("on 2026-11-05 (4 days before expiry) → severity 'critical'", () => {
    const warnings = getRuleWarnings(new Date("2026-11-05T12:00:00Z"));
    const affiliates = warnings.find(
      (w) => w.ruleId === "affiliates-rule-744.11",
    );
    expect(affiliates?.severity).toBe("critical");
    expect(affiliates!.daysUntilStayExpiry).toBeLessThanOrEqual(7);
  });

  it("on 2026-11-15 (after stay expiry) → severity 'critical' with negative days", () => {
    const warnings = getRuleWarnings(new Date("2026-11-15T12:00:00Z"));
    const affiliates = warnings.find(
      (w) => w.ruleId === "affiliates-rule-744.11",
    );
    expect(affiliates?.severity).toBe("critical");
    expect(affiliates!.daysUntilStayExpiry).toBeLessThanOrEqual(0);
    expect(affiliates?.message).toMatch(/expired|in force/i);
  });

  it("Warnings are sorted by daysUntilStayExpiry ascending (most-urgent first)", () => {
    const warnings = getRuleWarnings(new Date("2026-05-22T12:00:00Z"));
    for (let i = 1; i < warnings.length; i++) {
      expect(warnings[i].daysUntilStayExpiry).toBeGreaterThanOrEqual(
        warnings[i - 1].daysUntilStayExpiry,
      );
    }
  });
});

// ─── Convenience helpers ────────────────────────────────────────────

describe("isRuleInForce — convenience boolean", () => {
  it("Affiliates rule on 2026-05-22 → false", () => {
    expect(
      isRuleInForce("affiliates-rule-744.11", new Date("2026-05-22T12:00:00Z")),
    ).toBe(false);
  });

  it("Affiliates rule on 2026-11-09 (cliff) → true", () => {
    expect(
      isRuleInForce("affiliates-rule-744.11", new Date("2026-11-09T00:00:00Z")),
    ).toBe(true);
  });

  it("9x515 FDPR on 2026-05-22 → true (no stay)", () => {
    expect(
      isRuleInForce("fdpr-734.9-c-9x515", new Date("2026-05-22T12:00:00Z")),
    ).toBe(true);
  });
});

// ─── Error handling ─────────────────────────────────────────────────

describe("getRuleStatus — error handling", () => {
  it("throws for unknown rule id", () => {
    expect(() =>
      getRuleStatus(
        "unknown-rule-id" as never,
        new Date("2026-05-22T12:00:00Z"),
      ),
    ).toThrow(/Unknown corpus rule id/);
  });
});

// ─── Consumer integration scenario ─────────────────────────────────

describe("Consumer integration: Z20 FDPR engine gating", () => {
  it("Mid-2026 evaluation: FDPR § 734.9(e) is in force BUT affiliate-look-through portion is stayed", () => {
    const today = new Date("2026-05-22T12:00:00Z");
    expect(isRuleInForce("fdpr-734.9-e-entity-list", today)).toBe(true);
    expect(isRuleInForce("affiliates-rule-734.9-e", today)).toBe(false);
    // This is the operational implication: cascade fires on direct
    // footnote matches (§ 734.9(e) in force) but does NOT extend to
    // 50%-affiliate look-through (stayed).
  });

  it("Post-2026-11-09 evaluation: 50%-look-through becomes effective alongside the core (e) rule", () => {
    const post = new Date("2026-12-01T00:00:00Z");
    expect(isRuleInForce("fdpr-734.9-e-entity-list", post)).toBe(true);
    expect(isRuleInForce("affiliates-rule-734.9-e", post)).toBe(true);
    // Cascade behavior changes overnight on 2026-11-09 — the warning
    // surface (severity=critical) is the operator's heads-up.
  });
});
