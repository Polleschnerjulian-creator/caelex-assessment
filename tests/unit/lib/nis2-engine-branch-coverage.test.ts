/**
 * Targeted branch-coverage tests for the NIS2 engine.
 *
 * Coverage analysis on 2026-04 showed `nis2-engine.server.ts` sitting at
 * 96.9% lines / 77.8% branches. The line coverage is solid; the branch
 * gap was concentrated in three places that the rule-based tests in
 * `nis2-engine.test.ts` didn't exercise:
 *
 *   1. The `answers.sector || "space"` falsy fallback (line ~132).
 *   2. The 11-arm `||` chain that decides whether the entity sits in
 *      Annex I / II — every non-space sector arm was untested
 *      (lines ~135–145).
 *   3. The "wrong sector → out_of_scope" branch (line ~147).
 *   4. `answers.memberStateCount || 1` and `answers.entitySize || "unknown"`
 *      fallbacks in the post-classification path.
 *
 * This file targets each gap individually with the smallest possible
 * fixture. The goal is to prevent regressions where a refactor of the
 * sector check (or removal of an Annex I sector) silently flips
 * dozens of operators between in-scope and out-of-scope.
 */

import { describe, it, expect, vi } from "vitest";

import type { NIS2AssessmentAnswers, NIS2Sector } from "@/lib/nis2-types";

vi.mock("server-only", () => ({}));

const { classifyNIS2Entity, calculateNIS2Compliance } =
  await import("@/lib/nis2-engine.server");

function buildAnswers(
  overrides: Partial<NIS2AssessmentAnswers> = {},
): NIS2AssessmentAnswers {
  return {
    sector: "space",
    spaceSubSector: null,
    operatesGroundInfra: false,
    operatesSatComms: false,
    manufacturesSpacecraft: false,
    providesLaunchServices: false,
    providesEOData: false,
    entitySize: "large",
    employeeCount: 300,
    annualRevenue: 100_000_000,
    memberStateCount: 1,
    isEUEstablished: true,
    offersServicesInEU: false,
    designatedByMemberState: false,
    providesDigitalInfrastructure: false,
    euControlledEntity: true,
    hasISO27001: false,
    hasExistingCSIRT: false,
    hasRiskManagement: false,
    ...overrides,
  };
}

// ─── Sector fallback (`answers.sector || "space"`) ───────────────────
describe("NIS2 branch coverage — sector fallback", () => {
  it("treats null sector as space (default-to-space safety net)", () => {
    const result = classifyNIS2Entity(
      buildAnswers({ sector: null, entitySize: "large" }),
    );
    expect(result.classification).toBe("essential");
  });

  it("treats undefined sector as space", () => {
    // The engine reads `answers.sector || "space"`. We construct an
    // answers object that omits `sector` entirely to exercise the
    // typeof-undefined branch the `null` case doesn't catch.
    const partial = buildAnswers();
    delete (partial as Partial<NIS2AssessmentAnswers>).sector;
    const result = classifyNIS2Entity(partial as NIS2AssessmentAnswers);
    expect(result.classification).toBe("essential");
  });
});

// ─── Sector chain (each Annex I / II arm) ────────────────────────────
describe("NIS2 branch coverage — Annex I sector chain", () => {
  // The classifier uses an 11-arm `||` chain to decide whether the
  // sector qualifies as Annex I / II. Each `it` here flips one arm so
  // V8 coverage records the branch as taken.
  const annexISectors: NIS2Sector[] = [
    "energy",
    "transport",
    "banking",
    "financial_market",
    "health",
    "drinking_water",
    "waste_water",
    "digital_infrastructure",
    "ict_service_management",
    "public_administration",
  ];

  it.each(annexISectors)(
    "classifies a large entity in sector %s as essential",
    (sector) => {
      const result = classifyNIS2Entity(
        buildAnswers({ sector, entitySize: "large" }),
      );
      expect(result.classification).toBe("essential");
    },
  );

  it("classifies a non-space, non-Annex-I sector as out_of_scope (NOT-isSpaceOrAnnexI branch)", () => {
    // The `other` sector exists in NIS2Sector type but is not in the
    // Annex I list, so it must short-circuit to out_of_scope.
    const result = classifyNIS2Entity(
      buildAnswers({ sector: "other", entitySize: "large" }),
    );
    expect(result.classification).toBe("out_of_scope");
    expect(result.articleRef).toContain("Annex");
  });

  it("treats sector=other but providesDigitalInfrastructure=true as in scope", () => {
    // The same chain has a final `|| answers.providesDigitalInfrastructure === true`
    // arm. When the sector itself doesn't qualify but the org also
    // provides digital infra, NIS2 still applies.
    const result = classifyNIS2Entity(
      buildAnswers({
        sector: "other",
        entitySize: "large",
        providesDigitalInfrastructure: true,
      }),
    );
    // Large + Annex-I-equivalent (via digital infra) → essential
    expect(result.classification).toBe("essential");
  });
});

// ─── Post-classification fallbacks ───────────────────────────────────
describe("NIS2 branch coverage — post-classification fallbacks", () => {
  it("falls back to 'unknown' organization size when entitySize is null", async () => {
    // Note: classifyNIS2Entity short-circuits on null entitySize and
    // returns out_of_scope. But calculateNIS2Compliance still hits the
    // `answers.entitySize || "unknown"` fallback when populating the
    // result object — so this test exercises that line.
    const result = await calculateNIS2Compliance(
      buildAnswers({ entitySize: null }),
    );
    expect(result.entityClassification).toBe("out_of_scope");
    expect(result.organizationSize).toBe("unknown");
  });

  it("falls back to memberStateCount=1 when memberStateCount is null", async () => {
    // The supervisory authority decision uses
    // `answers.memberStateCount || 1`. Passing null exercises the
    // fallback arm; the resulting authority must be the "single
    // member state" variant, not the multi-state coordination one.
    const result = await calculateNIS2Compliance(
      buildAnswers({ memberStateCount: null, entitySize: "large" }),
    );
    expect(result.supervisoryAuthority.toLowerCase()).not.toContain("primary:");
    expect(result.supervisoryAuthority.toLowerCase()).toContain(
      "national competent authority",
    );
  });

  it("classifies entity correctly when memberStateCount is exactly 1", async () => {
    // Symmetric check: passing 1 explicitly should match the fallback
    // path output. This is a regression check for any future change
    // that switches from `||` to `??` (which would behave differently).
    const fallback = await calculateNIS2Compliance(
      buildAnswers({ memberStateCount: null, entitySize: "large" }),
    );
    const explicit = await calculateNIS2Compliance(
      buildAnswers({ memberStateCount: 1, entitySize: "large" }),
    );
    expect(fallback.supervisoryAuthority).toBe(explicit.supervisoryAuthority);
  });
});

// ─── isEUEstablished ambiguity ───────────────────────────────────────
describe("NIS2 branch coverage — isEUEstablished branches", () => {
  it("treats isEUEstablished=null as EU (default-to-EU safety net)", () => {
    // The classifier explicitly checks `=== false` rather than
    // truthy/falsy, so a `null` value falls through to the EU branch.
    // This is intentional — we'd rather over-classify a borderline
    // entity than miss them.
    const result = classifyNIS2Entity(
      buildAnswers({ isEUEstablished: null, entitySize: "large" }),
    );
    expect(result.classification).toBe("essential");
  });

  it("treats isEUEstablished=true normally", () => {
    const result = classifyNIS2Entity(
      buildAnswers({ isEUEstablished: true, entitySize: "large" }),
    );
    expect(result.classification).toBe("essential");
  });
});

// ─── Designation override interaction with non-EU ────────────────────
describe("NIS2 branch coverage — designation precedence", () => {
  it("designation override takes precedence over non-EU + no EU services", () => {
    // Designation (Rule 2) is checked before the non-EU rule (Rule 3),
    // so even an entity that would otherwise be out_of_scope under
    // Art. 2(4) gets pulled into scope as essential. This is the
    // ordering the comment in the engine documents — protect it.
    const result = classifyNIS2Entity(
      buildAnswers({
        designatedByMemberState: true,
        isEUEstablished: false,
        offersServicesInEU: false,
        entitySize: "micro",
      }),
    );
    expect(result.classification).toBe("essential");
  });

  it("designation override works for every entity size", () => {
    for (const size of ["micro", "small", "medium", "large"] as const) {
      const result = classifyNIS2Entity(
        buildAnswers({
          designatedByMemberState: true,
          entitySize: size,
        }),
      );
      expect(result.classification).toBe("essential");
    }
  });
});
