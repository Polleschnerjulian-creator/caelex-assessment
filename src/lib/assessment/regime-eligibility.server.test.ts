/**
 * Tests for the real Art. 10 light-regime eligibility module (Task 1.8).
 *
 * Codifies the plan's regime test list:
 *  - org_type research → `eligible` (Art 10)
 *  - small bands + group `no` → `eligible` with reasoning chain
 *  - small bands + group `yes` + group bands large → `not_eligible`
 *  - small bands + group unsure OR balance sheet unsure → `likely_eligible_verify`
 *  - quick tier (group question not asked) → `likely_eligible_verify` with the
 *    note "regime direction pending group verification" (§7.3 trim semantics —
 *    never a silent eligible)
 */

import { describe, it, expect, vi } from "vitest";
import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";

// ─── Mock server-only so the module can be imported in Vitest ───
vi.mock("server-only", () => ({}));

const { determineLightRegime } =
  await import("@/lib/assessment/regime-eligibility.server");

const RB = "1.0.0";

const answered = (value: string): TriStateAnswer => ({
  state: "answered",
  value,
});
const unsure = (): TriStateAnswer => ({ state: "unsure" });

/** Full-tier small commercial entity, standalone (no group). */
function smallCommercial(overrides: AnswerMap = {}): AnswerMap {
  return {
    q1_4_org_type: answered("commercial"),
    q1_5_headcount: answered("h_10_49"),
    q1_5_turnover: answered("t_2_10m"),
    q1_6_balance_sheet: answered("bs_le_10m"),
    q1_7_group: answered("no"),
    ...overrides,
  };
}

describe("determineLightRegime — research prong (Art 10)", () => {
  it("org_type research_edu → eligible, DETERMINED, regardless of size bands", () => {
    const result = determineLightRegime(
      { q1_4_org_type: answered("research_edu") },
      "full",
      RB,
    );
    expect(result.eligibility).toBe("eligible");
    expect(result.finding.confidence).toBe("DETERMINED");
    expect(result.finding.value).toBe("eligible");
    expect(result.reasoning.some((r) => r.basis.includes("Art. 10"))).toBe(
      true,
    );
  });
});

describe("determineLightRegime — small-enterprise prong with group aggregation", () => {
  it("small bands + group 'no' → eligible with a shown reasoning chain", () => {
    const result = determineLightRegime(smallCommercial(), "full", RB);
    expect(result.eligibility).toBe("eligible");
    expect(result.finding.confidence).toBe("DETERMINED");
    expect(result.reasoning.length).toBeGreaterThanOrEqual(3);
    // chain covers headcount, financial leg, and the group step
    expect(
      result.reasoning.some((r) => r.step.toLowerCase().includes("headcount")),
    ).toBe(true);
    expect(
      result.reasoning.some((r) => r.step.toLowerCase().includes("group")),
    ).toBe(true);
    expect(result.reasoning.some((r) => r.basis.includes("2003/361"))).toBe(
      true,
    );
  });

  it("small bands + group 'yes' + group bands large → not_eligible (aggregation closes the subsidiary hole)", () => {
    const result = determineLightRegime(
      smallCommercial({
        q1_7_group: answered("yes"),
        q1_7_group_headcount: answered("h_250_plus"),
        q1_7_group_turnover: answered("t_gt_50m"),
      }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("not_eligible");
    expect(result.finding.confidence).toBe("DETERMINED");
    expect(result.finding.verdict).toBe("not_applicable");
    expect(
      result.reasoning.some((r) => r.step.toLowerCase().includes("aggregat")),
    ).toBe(true);
  });

  it("small bands + group 'yes' + group bands small → eligible", () => {
    const result = determineLightRegime(
      smallCommercial({
        q1_7_group: answered("yes"),
        q1_7_group_headcount: answered("h_10_49"),
        q1_7_group_turnover: answered("t_2_10m"),
      }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("eligible");
  });

  it("small bands + group unsure → likely_eligible_verify (never silent eligible)", () => {
    const result = determineLightRegime(
      smallCommercial({ q1_7_group: unsure() }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("likely_eligible_verify");
    expect(result.finding.confidence).toBe("PROBABLE");
    expect(result.finding.verdict).toBe("conditional");
    expect(result.finding.wherefore.toLowerCase()).toContain("group");
  });

  it("small bands + balance sheet unsure → likely_eligible_verify with the balance named", () => {
    const result = determineLightRegime(
      smallCommercial({ q1_6_balance_sheet: unsure() }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("likely_eligible_verify");
    expect(result.finding.wherefore.toLowerCase()).toContain("balance");
  });

  it("own headcount ≥250 → not_eligible (DETERMINED) — aggregation could only enlarge", () => {
    const result = determineLightRegime(
      smallCommercial({ q1_5_headcount: answered("h_250_plus") }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("not_eligible");
    expect(result.finding.confidence).toBe("DETERMINED");
  });

  it("own headcount 50–249 → not_eligible (small requires <50; medium is NOT light-regime)", () => {
    const result = determineLightRegime(
      smallCommercial({ q1_5_headcount: answered("h_50_249") }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("not_eligible");
  });

  it("both financial legs exceeded (turnover >€10M AND balance >€10M) → not_eligible", () => {
    const result = determineLightRegime(
      smallCommercial({
        q1_5_turnover: answered("t_10_50m"),
        q1_6_balance_sheet: answered("bs_le_43m"),
      }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("not_eligible");
  });

  it("turnover exceeded but balance-sheet leg small → eligible (the OR alternative, §7.1 #4 shape)", () => {
    const result = determineLightRegime(
      smallCommercial({
        q1_5_turnover: answered("t_10_50m"),
        q1_6_balance_sheet: answered("bs_le_10m"),
      }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("eligible");
  });
});

describe("determineLightRegime — quick tier (§7.3 trim semantics)", () => {
  it("quick tier, group question not asked → likely_eligible_verify with 'regime direction pending group verification'", () => {
    const quickAnswers: AnswerMap = {
      q1_4_org_type: answered("commercial"),
      q1_5_headcount: answered("h_10_49"),
      q1_5_turnover: answered("t_2_10m"),
      // q1_6 balance + q1_7 group are FULL-tier — not asked in quick
    };
    const result = determineLightRegime(quickAnswers, "quick", RB);
    expect(result.eligibility).toBe("likely_eligible_verify");
    expect(result.eligibility).not.toBe("eligible"); // never a silent eligible
    const text =
      result.finding.wherefore +
      " " +
      result.reasoning.map((r) => r.step).join(" ");
    expect(text).toContain("regime direction pending group verification");
  });

  it("quick tier with disqualifying own bands → not_eligible (no group verification needed)", () => {
    const result = determineLightRegime(
      {
        q1_4_org_type: answered("commercial"),
        q1_5_headcount: answered("h_250_plus"),
        q1_5_turnover: answered("t_gt_50m"),
      },
      "quick",
      RB,
    );
    expect(result.eligibility).toBe("not_eligible");
  });
});

describe("determineLightRegime — finding envelope + invariants", () => {
  it("finding carries value === eligibility, cluster, ≥1 source and the rulebook version", () => {
    const result = determineLightRegime(smallCommercial(), "full", "2.3.4");
    expect(result.finding.value).toBe(result.eligibility);
    expect(result.finding.cluster).toBe("authorization_registration");
    expect(result.finding.sources.length).toBeGreaterThanOrEqual(1);
    expect(
      result.finding.sources.some((s) => s.citation.includes("Art. 10")),
    ).toBe(true);
    expect(result.finding.rulebookVersion).toBe("2.3.4");
  });

  it("verdict mapping: eligible→applicable, not_eligible→not_applicable, verify→conditional", () => {
    expect(
      determineLightRegime(smallCommercial(), "full", RB).finding.verdict,
    ).toBe("applicable");
    expect(
      determineLightRegime(
        smallCommercial({ q1_5_headcount: answered("h_250_plus") }),
        "full",
        RB,
      ).finding.verdict,
    ).toBe("not_applicable");
    expect(
      determineLightRegime(
        smallCommercial({ q1_7_group: unsure() }),
        "full",
        RB,
      ).finding.verdict,
    ).toBe("conditional");
  });

  it("monotonicity: flipping any single answered input to unsure never UPGRADES the verdict", () => {
    const rank: Record<string, number> = {
      not_eligible: 0,
      likely_eligible_verify: 1,
      eligible: 2,
    };
    const fixtures: AnswerMap[] = [
      smallCommercial(),
      smallCommercial({ q1_5_headcount: answered("h_250_plus") }),
      smallCommercial({
        q1_7_group: answered("yes"),
        q1_7_group_headcount: answered("h_250_plus"),
        q1_7_group_turnover: answered("t_gt_50m"),
      }),
    ];
    for (const fixture of fixtures) {
      const baseline = determineLightRegime(fixture, "full", RB).eligibility;
      for (const id of Object.keys(fixture)) {
        const flipped = { ...fixture, [id]: unsure() };
        const after = determineLightRegime(flipped, "full", RB).eligibility;
        // An unsure may keep or lower the eligibility, never raise it —
        // EXCEPT when it removes the disqualifying fact itself, in which
        // case honesty requires "verify", still never a clean "eligible".
        if (rank[after] > rank[baseline]) {
          expect(after).toBe("likely_eligible_verify");
        }
      }
    }
  });

  it("an unsure on the disqualifying input itself yields verify, never eligible", () => {
    const result = determineLightRegime(
      smallCommercial({ q1_5_headcount: unsure() }),
      "full",
      RB,
    );
    expect(result.eligibility).toBe("likely_eligible_verify");
  });
});
