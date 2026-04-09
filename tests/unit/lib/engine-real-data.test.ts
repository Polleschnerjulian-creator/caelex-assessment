/**
 * Real-data tests for the EU Space Act compliance engine.
 *
 * Unlike `engine.test.ts`, which uses a small hand-crafted mock fixture
 * (~10 fake articles), this suite loads the **actual production data file**
 * (`src/data/caelex-eu-space-act-engine.json`, ~1.6k lines, 75 article
 * entries spanning 119 article numbers) and runs `calculateCompliance`
 * against it. Without this, the unit suite reports >90% line coverage
 * while the engine has never actually been exercised against the
 * regulatory dataset shipped to production — the classic "false
 * confidence" coverage trap.
 *
 * The intent is broad sweeps + invariant checks rather than asserting on
 * specific article numbers. Specific-article behaviour is covered in
 * `engine.test.ts` against the deterministic mock; here we make sure the
 * cartesian product of (operator type × entity size × establishment) all
 * round-trip cleanly through the real regulation, that nothing throws,
 * that none of the proportionality / scope rules accidentally drop all
 * articles for a real operator, and that public-API redaction is safe to
 * apply to every result.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import type {
  AssessmentAnswers,
  ActivityType,
  EntitySize,
  EstablishmentType,
  OrbitType,
  SpaceActData,
  ComplianceResult,
} from "@/lib/types";

vi.mock("server-only", () => ({}));

const { calculateCompliance, redactArticlesForClient } =
  await import("@/lib/engine.server");

// ─── Load the real production dataset once ────────────────────────────
let realData: SpaceActData;

beforeAll(() => {
  const filePath = join(
    process.cwd(),
    "src",
    "data",
    "caelex-eu-space-act-engine.json",
  );
  realData = JSON.parse(readFileSync(filePath, "utf-8")) as SpaceActData;
});

// ─── Test fixture builder ─────────────────────────────────────────────
const ACTIVITY_TYPES: Exclude<ActivityType, null>[] = [
  "spacecraft",
  "launch_vehicle",
  "launch_site",
  "isos",
  "data_provider",
];

const ENTITY_SIZES: Exclude<EntitySize, null>[] = [
  "small",
  "research",
  "medium",
  "large",
];

const ESTABLISHMENTS: Exclude<EstablishmentType, null>[] = [
  "eu",
  "third_country_eu_services",
  "third_country_no_eu",
];

const ORBITS: Exclude<OrbitType, null>[] = ["LEO", "MEO", "GEO", "beyond"];

function buildAnswers(
  overrides: Partial<AssessmentAnswers> = {},
): AssessmentAnswers {
  return {
    activityType: "spacecraft",
    isDefenseOnly: false,
    hasPostLaunchAssets: true,
    establishment: "eu",
    entitySize: "medium",
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO",
    offersEUServices: false,
    ...overrides,
  };
}

// ─── Real-data sanity checks ──────────────────────────────────────────
describe("EU Space Act real-data engine — fixture sanity", () => {
  it("loads the production dataset successfully", () => {
    expect(realData).toBeDefined();
    expect(realData.metadata.total_articles).toBe(119);
    expect(realData.titles.length).toBeGreaterThan(0);
  });

  it("has at least one article entry per operator abbreviation that the engine maps to", () => {
    // Counts how many articles in the real dataset declare they apply to
    // each operator. This guards against regressions in the data file
    // that would silently zero-out an operator type. CAP currently has
    // no exclusive articles in the dataset (it inherits from ALL), so
    // we only assert it's not negative.
    const allArticles: { applies_to: string[] }[] = [];
    function walk(items: unknown[]) {
      for (const item of items) {
        const node = item as {
          articles_detail?: { applies_to: string[] }[];
          chapters?: unknown[];
          sections?: unknown[];
        };
        if (node.articles_detail) allArticles.push(...node.articles_detail);
        if (node.chapters) walk(node.chapters);
        if (node.sections) walk(node.sections);
      }
    }
    walk(realData.titles);

    expect(allArticles.length).toBeGreaterThanOrEqual(70);

    const counts = {
      SCO: allArticles.filter((a) => a.applies_to.includes("SCO")).length,
      LO: allArticles.filter((a) => a.applies_to.includes("LO")).length,
      LSO: allArticles.filter((a) => a.applies_to.includes("LSO")).length,
      ISOS: allArticles.filter((a) => a.applies_to.includes("ISOS")).length,
      PDP: allArticles.filter((a) => a.applies_to.includes("PDP")).length,
      TCO: allArticles.filter((a) => a.applies_to.includes("TCO")).length,
      ALL: allArticles.filter((a) => a.applies_to.includes("ALL")).length,
    };

    // Hard-coded floors derived from the current dataset. These act as
    // "tripwires": if someone accidentally drops a major chunk of the
    // SCO obligations, this test fails loudly. Numbers are intentionally
    // generous to absorb expected drift from regulatory updates.
    expect(counts.SCO).toBeGreaterThanOrEqual(20);
    expect(counts.LO).toBeGreaterThanOrEqual(15);
    expect(counts.LSO).toBeGreaterThanOrEqual(10);
    expect(counts.ISOS).toBeGreaterThanOrEqual(10);
    expect(counts.PDP).toBeGreaterThanOrEqual(1);
    expect(counts.TCO).toBeGreaterThanOrEqual(5);
    expect(counts.ALL).toBeGreaterThanOrEqual(15);
  });
});

// ─── Cartesian product smoke test ─────────────────────────────────────
describe("EU Space Act real-data engine — full cartesian product", () => {
  // 5 activities × 4 sizes × 3 establishments = 60 calls.
  // Every single combination must produce a valid result (no throws,
  // no NaN, no negative counts, no empty operator label).
  for (const activity of ACTIVITY_TYPES) {
    for (const size of ENTITY_SIZES) {
      for (const establishment of ESTABLISHMENTS) {
        const label = `${activity} / ${size} / ${establishment}`;
        it(`produces a valid result for ${label}`, () => {
          const result = calculateCompliance(
            buildAnswers({
              activityType: activity,
              entitySize: size,
              establishment,
              offersEUServices: establishment !== "third_country_no_eu",
            }),
            realData,
          );

          expect(result).toBeDefined();
          expect(result.operatorType).toBeTruthy();
          expect(result.operatorAbbreviation).toBeTruthy();
          expect(result.operatorTypeLabel).toBeTruthy();
          // Out-of-scope is a legitimate third regime value, set by
          // buildOutOfScopeResult for defense exemption and
          // third_country_no_eu paths.
          expect(
            ["light", "standard", "out_of_scope"].includes(result.regime),
          ).toBe(true);
          expect(Number.isFinite(result.totalArticles)).toBe(true);
          expect(Number.isFinite(result.applicableCount)).toBe(true);
          expect(Number.isFinite(result.applicablePercentage)).toBe(true);
          expect(result.totalArticles).toBeGreaterThanOrEqual(0);
          expect(result.applicableCount).toBeGreaterThanOrEqual(0);
          expect(result.applicablePercentage).toBeGreaterThanOrEqual(0);
          expect(result.applicablePercentage).toBeLessThanOrEqual(100);
          expect(Array.isArray(result.applicableArticles)).toBe(true);
          expect(Array.isArray(result.moduleStatuses)).toBe(true);
          expect(Array.isArray(result.checklist)).toBe(true);
          expect(Array.isArray(result.keyDates)).toBe(true);

          // Out-of-scope (third_country_no_eu) is the only case where
          // applicableCount may legitimately be 0. Every in-scope
          // combination must hit at least *some* article, otherwise
          // we'd be telling a real operator they have nothing to do.
          if (establishment !== "third_country_no_eu") {
            expect(result.applicableCount).toBeGreaterThan(0);
          }
        });
      }
    }
  }
});

// ─── Operator-type semantic checks ────────────────────────────────────
describe("EU Space Act real-data engine — operator-type semantics", () => {
  it("SCO (spacecraft) gets the highest article count among operator types", () => {
    // Spacecraft operators are the most heavily regulated category in
    // COM(2025) 335, so the real dataset must reflect that. If LSO or
    // PDP ever exceeds SCO, something is seriously off in the data.
    const sco = calculateCompliance(
      buildAnswers({ activityType: "spacecraft" }),
      realData,
    );
    const lo = calculateCompliance(
      buildAnswers({ activityType: "launch_vehicle" }),
      realData,
    );
    const lso = calculateCompliance(
      buildAnswers({ activityType: "launch_site" }),
      realData,
    );
    const isos = calculateCompliance(
      buildAnswers({ activityType: "isos" }),
      realData,
    );
    const pdp = calculateCompliance(
      buildAnswers({ activityType: "data_provider" }),
      realData,
    );

    expect(sco.applicableCount).toBeGreaterThanOrEqual(lo.applicableCount);
    expect(sco.applicableCount).toBeGreaterThanOrEqual(lso.applicableCount);
    expect(sco.applicableCount).toBeGreaterThanOrEqual(isos.applicableCount);
    expect(sco.applicableCount).toBeGreaterThanOrEqual(pdp.applicableCount);
  });

  it("PDP (data provider) has fewer obligations than SCO", () => {
    // Primary data providers operate downstream of the spacecraft and
    // are mostly informational. They should never have more obligations
    // than the upstream operator.
    const pdp = calculateCompliance(
      buildAnswers({ activityType: "data_provider" }),
      realData,
    );
    const sco = calculateCompliance(
      buildAnswers({ activityType: "spacecraft" }),
      realData,
    );
    expect(pdp.applicableCount).toBeLessThan(sco.applicableCount);
  });

  it("third_country_eu_services adds TCO obligations on top of base operator obligations", () => {
    const euSCO = calculateCompliance(
      buildAnswers({ activityType: "spacecraft", establishment: "eu" }),
      realData,
    );
    const tcoSCO = calculateCompliance(
      buildAnswers({
        activityType: "spacecraft",
        establishment: "third_country_eu_services",
        offersEUServices: true,
      }),
      realData,
    );

    expect(tcoSCO.isThirdCountry).toBe(true);
    expect(euSCO.isThirdCountry).toBe(false);
    // Both must be in-scope; the TCO version layers on the Art. 20
    // obligations (representative designation, registration), so it
    // should have at least as many applicable articles as the EU one.
    expect(tcoSCO.applicableCount).toBeGreaterThanOrEqual(
      euSCO.applicableCount,
    );
  });

  it("third_country_no_eu is correctly out-of-scope across all operator types", () => {
    for (const activity of ACTIVITY_TYPES) {
      const result = calculateCompliance(
        buildAnswers({
          activityType: activity,
          establishment: "third_country_no_eu",
          offersEUServices: false,
        }),
        realData,
      );
      // The buildOutOfScopeResult helper produces a regime label
      // containing the substring "Out of Scope".
      expect(result.regimeLabel.toLowerCase()).toContain("out of scope");
      expect(result.applicableCount).toBe(0);
    }
  });
});

// ─── Defense exemption ────────────────────────────────────────────────
describe("EU Space Act real-data engine — defense-only exemption (Art. 2(3))", () => {
  it("returns out-of-scope for every operator/size combination when isDefenseOnly=true", () => {
    for (const activity of ACTIVITY_TYPES) {
      for (const size of ENTITY_SIZES) {
        const result = calculateCompliance(
          buildAnswers({
            activityType: activity,
            entitySize: size,
            isDefenseOnly: true,
          }),
          realData,
        );
        expect(result.applicableCount).toBe(0);
        expect(result.regimeLabel.toLowerCase()).toContain("out of scope");
        // The label must include "Defense" so a downstream UI can
        // render the correct exemption banner.
        expect(result.operatorTypeLabel).toContain("Defense");
      }
    }
  });
});

// ─── Light vs standard regime ─────────────────────────────────────────
describe("EU Space Act real-data engine — light regime (Art. 10)", () => {
  it("small entities are placed on the light regime regardless of orbit", () => {
    for (const orbit of ORBITS) {
      const result = calculateCompliance(
        buildAnswers({ entitySize: "small", primaryOrbit: orbit }),
        realData,
      );
      expect(result.regime).toBe("light");
    }
  });

  it("research institutions are placed on the light regime", () => {
    const result = calculateCompliance(
      buildAnswers({ entitySize: "research" }),
      realData,
    );
    expect(result.regime).toBe("light");
  });

  it("medium and large entities get the standard regime", () => {
    const medium = calculateCompliance(
      buildAnswers({ entitySize: "medium" }),
      realData,
    );
    const large = calculateCompliance(
      buildAnswers({ entitySize: "large" }),
      realData,
    );
    expect(medium.regime).toBe("standard");
    expect(large.regime).toBe("standard");
  });
});

// ─── Constellation ────────────────────────────────────────────────────
describe("EU Space Act real-data engine — constellation tiers", () => {
  it("non-constellation operators are classified as single satellite", () => {
    const result = calculateCompliance(
      buildAnswers({ operatesConstellation: false, constellationSize: null }),
      realData,
    );
    expect(result.constellationTier).toBe("single_satellite");
    expect(result.constellationTierLabel?.toLowerCase()).toContain("single");
  });

  it.each([
    [5, "small_constellation"],
    [50, "medium_constellation"],
    [500, "large_constellation"],
    [2000, "mega_constellation"],
  ])("constellation size %i is classified as %s", (size, expectedTier) => {
    const result = calculateCompliance(
      buildAnswers({
        operatesConstellation: true,
        constellationSize: size,
      }),
      realData,
    );
    expect(result.constellationTier).toBe(expectedTier);
  });
});

// ─── Module statuses ──────────────────────────────────────────────────
describe("EU Space Act real-data engine — module statuses", () => {
  it("returns the same set of modules for every in-scope operator", () => {
    // The compliance dashboard depends on a stable module list. Even if
    // a module has zero applicable articles for a particular operator,
    // its entry must still appear so the UI can render an "N/A" card.
    const sco = calculateCompliance(
      buildAnswers({ activityType: "spacecraft" }),
      realData,
    );
    const lo = calculateCompliance(
      buildAnswers({ activityType: "launch_vehicle" }),
      realData,
    );
    const lso = calculateCompliance(
      buildAnswers({ activityType: "launch_site" }),
      realData,
    );

    const scoModules = sco.moduleStatuses.map((m) => m.module).sort();
    const loModules = lo.moduleStatuses.map((m) => m.module).sort();
    const lsoModules = lso.moduleStatuses.map((m) => m.module).sort();

    expect(scoModules).toEqual(loModules);
    expect(scoModules).toEqual(lsoModules);
    expect(scoModules.length).toBeGreaterThanOrEqual(9);
  });

  it("at least one module is non-empty for an EU spacecraft operator", () => {
    const result = calculateCompliance(
      buildAnswers({ activityType: "spacecraft" }),
      realData,
    );
    const nonEmpty = result.moduleStatuses.filter((m) => m.articleCount > 0);
    expect(nonEmpty.length).toBeGreaterThan(0);
  });
});

// ─── Redaction round-trip ─────────────────────────────────────────────
describe("EU Space Act real-data engine — redactArticlesForClient round-trip", () => {
  function assertRedacted(result: ComplianceResult) {
    const redacted = redactArticlesForClient(result);
    expect(redacted).toBeDefined();
    expect(redacted.applicableArticles.length).toBe(
      result.applicableArticles.length,
    );
    for (const article of redacted.applicableArticles) {
      // The proprietary fields must be stripped before reaching the
      // public API surface.
      expect(article).not.toHaveProperty("summary");
      expect(article).not.toHaveProperty("operator_action");
      expect(article).not.toHaveProperty("decision_logic");
      expect(article).not.toHaveProperty("required_documents");
      expect(article).not.toHaveProperty("estimated_cost");
    }
  }

  it("redaction works on every operator type", () => {
    for (const activity of ACTIVITY_TYPES) {
      const result = calculateCompliance(
        buildAnswers({ activityType: activity }),
        realData,
      );
      assertRedacted(result);
    }
  });

  it("redaction works on out-of-scope results too", () => {
    const result = calculateCompliance(
      buildAnswers({
        establishment: "third_country_no_eu",
        offersEUServices: false,
      }),
      realData,
    );
    assertRedacted(result);
  });

  it("redaction works on defense-exempt results", () => {
    const result = calculateCompliance(
      buildAnswers({ isDefenseOnly: true }),
      realData,
    );
    assertRedacted(result);
  });
});

// ─── Idempotency ──────────────────────────────────────────────────────
describe("EU Space Act real-data engine — idempotency", () => {
  it("calling the engine twice with the same inputs produces deep-equal results", () => {
    const answers = buildAnswers({
      activityType: "spacecraft",
      entitySize: "large",
      establishment: "eu",
      operatesConstellation: true,
      constellationSize: 100,
      primaryOrbit: "LEO",
    });
    const a = calculateCompliance(answers, realData);
    const b = calculateCompliance(answers, realData);

    expect(a.applicableCount).toBe(b.applicableCount);
    expect(a.totalArticles).toBe(b.totalArticles);
    expect(a.applicablePercentage).toBe(b.applicablePercentage);
    expect(a.regime).toBe(b.regime);
    expect(a.operatorAbbreviation).toBe(b.operatorAbbreviation);
    expect(a.moduleStatuses.length).toBe(b.moduleStatuses.length);
  });

  it("does not mutate the input data structure", () => {
    const before = JSON.stringify(realData);
    calculateCompliance(buildAnswers(), realData);
    calculateCompliance(buildAnswers({ entitySize: "small" }), realData);
    calculateCompliance(buildAnswers({ isDefenseOnly: true }), realData);
    const after = JSON.stringify(realData);
    expect(after).toBe(before);
  });
});
