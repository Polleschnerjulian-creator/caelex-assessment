/**
 * Tests for the quick-tier result projection (plan Task 2.4).
 *
 * Covers:
 *   - projection of the FULL stored ObligationMapResult (counts preserved,
 *     ONE headline per cluster, unknowns COUNT from the array, §6b "M"),
 *   - tolerance for the already-projected Task 2.2 response shape,
 *   - the isFindingComplete withhold guard (incomplete envelopes are
 *     withheld, never surfaced),
 *   - honesty invariant #6: NO key matching /score/i anywhere in the view,
 *   - honest null on unrecognizable input (never a guessed verdict).
 */

import { describe, it, expect } from "vitest";
import { projectQuickResult } from "./quick-projection";
import {
  buildFullQuickResultFixture,
  buildProjectedQuickResultFixture,
  incompleteFinding,
  authorizationFinding,
} from "./quick-result.fixtures";

describe("projectQuickResult — full stored result", () => {
  it("projects clusters to counts + ONE headline finding each (no full bodies)", () => {
    const view = projectQuickResult(buildFullQuickResultFixture());
    expect(view).not.toBeNull();
    expect(view!.clusters).toHaveLength(2);

    const auth = view!.clusters[0];
    expect(auth.id).toBe("authorization_registration");
    expect(auth.counts).toEqual({
      applicable: 2,
      conditional: 0,
      contested: 0,
      advisory: 0,
    });
    expect(auth.totalFindings).toBe(2);
    // Headline selection is deterministic: DETERMINED applicable beats
    // PROBABLE applicable — and ONLY one finding is surfaced.
    expect(auth.topFinding?.what).toBe(
      "Operator authorisation is required before launch or operation.",
    );
  });

  it("derives unknownsCount from the unknowns array and computes the §6b M", () => {
    const view = projectQuickResult(buildFullQuickResultFixture())!;
    expect(view.unknownsCount).toBe(2);
    // 3 identified findings, 2 headlines shown → 1 unassessed obligation.
    expect(view.totalObligations).toBe(3);
    expect(view.unassessedObligations).toBe(1);
  });

  it("keeps scope, gateway and regime as complete envelopes", () => {
    const view = projectQuickResult(buildFullQuickResultFixture())!;
    expect(view.scope).toHaveLength(1);
    expect(view.scopeWithheldCount).toBe(0);
    expect(view.nis2Gateway?.value).toBe("needs_clarification");
    expect(view.regime?.value).toBe("likely_eligible_verify");
    expect(view.rulebookVersion).toBe("1.0.0");
    expect(view.computedAt).toBe("2026-06-10T12:00:00.000Z");
  });

  it("contains NO key matching /score/i anywhere (honesty invariant #6)", () => {
    const view = projectQuickResult(buildFullQuickResultFixture())!;
    const keys: string[] = [];
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) {
        v.forEach(walk);
      } else if (v !== null && typeof v === "object") {
        for (const [k, child] of Object.entries(v)) {
          keys.push(k);
          walk(child);
        }
      }
    };
    walk(view);
    expect(keys.filter((k) => /score/i.test(k))).toEqual([]);
  });
});

describe("projectQuickResult — withhold guard (invariant #5)", () => {
  it("withholds an incomplete cluster finding instead of surfacing it", () => {
    const fixture = buildFullQuickResultFixture();
    (fixture.clusters as Record<string, unknown>[])[1].findings = [
      incompleteFinding(),
    ];
    const view = projectQuickResult(fixture)!;
    const cyber = view.clusters[1];
    expect(cyber.topFinding).toBeNull();
    expect(cyber.withheldCount).toBe(1);
  });

  it("withholds an incomplete scope finding and counts it", () => {
    const fixture = buildFullQuickResultFixture();
    fixture.scope = [incompleteFinding()];
    const view = projectQuickResult(fixture)!;
    expect(view.scope).toHaveLength(0);
    expect(view.scopeWithheldCount).toBe(1);
  });

  it("nulls an incomplete NIS2 gateway / regime envelope", () => {
    const fixture = buildFullQuickResultFixture();
    fixture.nis2Gateway = incompleteFinding();
    fixture.regime = incompleteFinding();
    const view = projectQuickResult(fixture)!;
    expect(view.nis2Gateway).toBeNull();
    expect(view.regime).toBeNull();
  });
});

describe("projectQuickResult — projected (Task 2.2) shape tolerance", () => {
  it("accepts the counts + topFinding + unknownsCount shape", () => {
    const view = projectQuickResult(buildProjectedQuickResultFixture());
    expect(view).not.toBeNull();
    expect(view!.unknownsCount).toBe(2);
    expect(view!.clusters[0].topFinding?.what).toBe(
      authorizationFinding().what,
    );
    // Counts come from the server-computed cluster counts, not the single
    // top finding: total = 2 + 1 = 3, headlines = 2 → M = 1.
    expect(view!.totalObligations).toBe(3);
    expect(view!.unassessedObligations).toBe(1);
  });

  it("withholds the REDUCED quick-wire headline shape (QuickFindingHeadline) — the result page renders full envelopes from the STORED snapshot, never the stripped wire shape", () => {
    // The real /api/assessment/v2/quick wire response strips why/wherefore/
    // whyTrace from topFinding (QuickFindingHeadline). That shape can NOT
    // pass the envelope completeness guard — and must not: a finding without
    // its WHY must never render as an explained finding (invariant #5).
    const wireHeadline = {
      what: "Operator authorisation is required before launch or operation.",
      verdict: "applicable",
      confidence: "DETERMINED",
      cluster: "authorization_registration",
      sources: authorizationFinding().sources,
      contested: false,
      rulebookVersion: "1.0.0",
    };
    const fixture = buildProjectedQuickResultFixture();
    (fixture.clusters as Record<string, unknown>[])[0].topFinding =
      wireHeadline;
    const view = projectQuickResult(fixture)!;
    expect(view.clusters[0].topFinding).toBeNull();
    expect(view.clusters[0].withheldCount).toBe(1);
    // The counts (server-computed) survive regardless.
    expect(view.clusters[0].counts.applicable).toBe(2);
  });
});

describe("projectQuickResult — honest null on unrecognizable input", () => {
  it("returns null for garbage", () => {
    expect(projectQuickResult(null)).toBeNull();
    expect(projectQuickResult("nope")).toBeNull();
    expect(projectQuickResult([])).toBeNull();
    expect(projectQuickResult({})).toBeNull();
  });

  it("returns null when the rulebook stamp is missing — a verdict without a rulebook version must not render", () => {
    const fixture = buildFullQuickResultFixture();
    delete fixture.rulebookVersion;
    expect(projectQuickResult(fixture)).toBeNull();
  });
});
