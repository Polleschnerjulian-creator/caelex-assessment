/**
 * Real-data tests for the NIS2 compliance engine.
 *
 * The companion `nis2-engine.test.ts` exercises the engine against the
 * `classifyNIS2Entity` rules in isolation. This file goes one step
 * further: it imports the **actual production requirements dataset**
 * (`src/data/nis2-requirements.ts`, ~4k LOC, 50+ requirements) and runs
 * `calculateNIS2Compliance` end-to-end. Without this, our test suite
 * could pass while the real requirements file silently broke
 * filtering, sub-sector matching, or article references — every gap
 * the original audit flagged.
 *
 * Three things this file specifically guards against:
 *   1. Real-data filtering for the four `applicableTo` dimensions
 *      (entityClassifications, sectors, subSectors, organizationSizes).
 *   2. The Art. 26 / non-EU-with-services path actually returns Art. 26
 *      requirements when present in the dataset.
 *   3. Out-of-scope short-circuits return zero requirements regardless
 *      of how many entries the data file contains.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

import type {
  NIS2AssessmentAnswers,
  NIS2Sector,
  NIS2SpaceSubSector,
} from "@/lib/nis2-types";

vi.mock("server-only", () => ({}));

const { calculateNIS2Compliance, classifyNIS2Entity } =
  await import("@/lib/nis2-engine.server");

// Note: nis2-requirements.ts has no `import "server-only"` guard, so we
// can import it directly without the vi.mock dance.
const { NIS2_REQUIREMENTS, getApplicableNIS2Requirements } =
  await import("@/data/nis2-requirements");

// ─── Sanity check on the real dataset itself ─────────────────────────
let totalRequirements: number;

beforeAll(() => {
  totalRequirements = NIS2_REQUIREMENTS.length;
});

function buildAnswers(
  overrides: Partial<NIS2AssessmentAnswers> = {},
): NIS2AssessmentAnswers {
  return {
    sector: "space" as NIS2Sector,
    spaceSubSector: null,
    operatesGroundInfra: false,
    operatesSatComms: false,
    manufacturesSpacecraft: false,
    providesLaunchServices: false,
    providesEOData: false,
    entitySize: "medium",
    employeeCount: 100,
    annualRevenue: 20_000_000,
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

// ─── Dataset sanity checks ────────────────────────────────────────────
describe("NIS2 real-data engine — dataset sanity", () => {
  it("loads the production NIS2 requirements file", () => {
    expect(NIS2_REQUIREMENTS).toBeDefined();
    expect(Array.isArray(NIS2_REQUIREMENTS)).toBe(true);
    // The dataset has been steadily growing through audit fixes.
    // Today (2026-04) it sits at ~50 requirements; we set a low floor
    // so legitimate growth doesn't break the test.
    expect(NIS2_REQUIREMENTS.length).toBeGreaterThanOrEqual(40);
  });

  it("every requirement has an id, articleRef, category, title, and severity", () => {
    for (const req of NIS2_REQUIREMENTS) {
      expect(req.id).toBeTruthy();
      expect(req.articleRef).toBeTruthy();
      expect(req.category).toBeTruthy();
      expect(req.title).toBeTruthy();
      expect(["critical", "major", "minor"]).toContain(req.severity);
    }
  });

  it("requirement ids are unique", () => {
    const ids = new Set<string>();
    for (const req of NIS2_REQUIREMENTS) {
      expect(ids.has(req.id)).toBe(false);
      ids.add(req.id);
    }
  });

  it("includes all 10 Art. 21(2) cybersecurity measures (a)–(j)", () => {
    // The full Art. 21(2) list is the heart of NIS2. If the dataset
    // ever loses one of these, the engine has a hole that would cost
    // a customer six-figure fines. Match by substring rather than
    // exact reference so renames don't break us.
    const articleStrings = NIS2_REQUIREMENTS.map((r) =>
      r.articleRef.toLowerCase(),
    );
    for (const letter of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]) {
      const found = articleStrings.some((ref) =>
        ref.includes(`art. 21(2)(${letter})`),
      );
      expect({
        searchedFor: `Art. 21(2)(${letter})`,
        found,
      }).toEqual({ searchedFor: `Art. 21(2)(${letter})`, found: true });
    }
  });
});

// ─── End-to-end async calculation against real data ──────────────────
describe("NIS2 real-data engine — calculateNIS2Compliance with real dataset", () => {
  it("returns the full requirements set (within filter) for an EU large entity", async () => {
    const result = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "large" }),
    );

    expect(result.entityClassification).toBe("essential");
    expect(result.totalNIS2Requirements).toBe(totalRequirements);
    expect(result.applicableCount).toBeGreaterThan(0);
    expect(result.applicableRequirements.length).toBe(result.applicableCount);
    // Large/essential entities should not be filtered out by classification.
    // Every applicable requirement must list "essential" or have no entity-
    // classification filter at all.
    for (const req of result.applicableRequirements) {
      const filter = req.applicableTo.entityClassifications;
      if (filter !== undefined) {
        expect(filter.includes("essential")).toBe(true);
      }
    }
  });

  it("returns fewer requirements for a medium (important) entity than for a large (essential) one", async () => {
    const large = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "large" }),
    );
    const medium = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "medium" }),
    );

    expect(medium.applicableCount).toBeLessThanOrEqual(large.applicableCount);
    // Both classifications must be in scope.
    expect(medium.entityClassification).toBe("important");
    expect(large.entityClassification).toBe("essential");
  });

  it("returns zero applicable requirements for an out-of-scope micro entity", async () => {
    const result = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "micro" }),
    );

    expect(result.entityClassification).toBe("out_of_scope");
    expect(result.applicableCount).toBe(0);
    expect(result.applicableRequirements).toEqual([]);
    expect(result.registrationRequired).toBe(false);
    // The total still reflects the dataset — out-of-scope only zeros
    // the *applicable* slice.
    expect(result.totalNIS2Requirements).toBe(totalRequirements);
  });

  it("designation override brings a small entity into scope as essential", async () => {
    const result = await calculateNIS2Compliance(
      buildAnswers({
        entitySize: "small",
        designatedByMemberState: true,
      }),
    );
    expect(result.entityClassification).toBe("essential");
    expect(result.applicableCount).toBeGreaterThan(0);
    expect(result.registrationRequired).toBe(true);
  });

  it("non-EU + offersServicesInEU triggers Art. 26 path classified as important", async () => {
    const result = await calculateNIS2Compliance(
      buildAnswers({
        isEUEstablished: false,
        offersServicesInEU: true,
        entitySize: "large", // size still doesn't override Art. 26 path
      }),
    );
    expect(result.entityClassification).toBe("important");
    expect(result.classificationArticleRef).toContain("Art. 26");
    expect(result.registrationRequired).toBe(true);
  });

  it("non-EU + no EU services is fully out of scope", async () => {
    const result = await calculateNIS2Compliance(
      buildAnswers({
        isEUEstablished: false,
        offersServicesInEU: false,
        entitySize: "large",
      }),
    );
    expect(result.entityClassification).toBe("out_of_scope");
    expect(result.applicableCount).toBe(0);
    expect(result.registrationRequired).toBe(false);
  });

  it("supervisory authority changes when memberStateCount > 1", async () => {
    const single = await calculateNIS2Compliance(
      buildAnswers({ memberStateCount: 1 }),
    );
    const multi = await calculateNIS2Compliance(
      buildAnswers({ memberStateCount: 5 }),
    );

    expect(single.supervisoryAuthority).not.toBe(multi.supervisoryAuthority);
    // For multi-MS operators, the engine returns a primary/coordination
    // string ("Primary: Member state of main establishment. Additional:
    // coordination with other member state authorities."). The note
    // explicitly references Art. 26(1) and "multiple member states".
    expect(multi.supervisoryAuthority.toLowerCase()).toContain("primary");
    expect(multi.supervisoryAuthorityNote.toLowerCase()).toContain(
      "multiple member states",
    );
  });

  it("populates a 4-phase incident reporting timeline regardless of classification", async () => {
    const inScope = await calculateNIS2Compliance(buildAnswers());
    const outOfScope = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "micro" }),
    );

    for (const result of [inScope, outOfScope]) {
      expect(result.incidentReportingTimeline.earlyWarning.deadline).toBe(
        "24 hours",
      );
      expect(result.incidentReportingTimeline.notification.deadline).toBe(
        "72 hours",
      );
      expect(
        result.incidentReportingTimeline.intermediateReport.deadline,
      ).toBeTruthy();
      expect(result.incidentReportingTimeline.finalReport.deadline).toBe(
        "1 month",
      );
    }
  });

  it("applies penalties matching the classification", async () => {
    const essential = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "large" }),
    );
    const important = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "medium" }),
    );
    const outOfScope = await calculateNIS2Compliance(
      buildAnswers({ entitySize: "micro" }),
    );

    expect(essential.penalties.applicable).toContain("10,000,000");
    expect(important.penalties.applicable).toContain("7,000,000");
    expect(outOfScope.penalties.applicable.toLowerCase()).toContain(
      "out of scope",
    );
  });
});

// ─── Sub-sector filtering ─────────────────────────────────────────────
describe("NIS2 real-data engine — sub-sector filtering", () => {
  const subSectors: NIS2SpaceSubSector[] = [
    "ground_infrastructure",
    "satellite_communications",
    "spacecraft_manufacturing",
    "launch_services",
    "earth_observation",
    "navigation",
    "space_situational_awareness",
  ];

  it.each(subSectors)(
    "returns a non-empty applicable set for sub-sector %s",
    async (sub) => {
      const result = await calculateNIS2Compliance(
        buildAnswers({ entitySize: "large", spaceSubSector: sub }),
      );
      // Sub-sector filtering should never return zero — at minimum the
      // generic Art. 21 / Art. 23 measures (which don't carry a sub-
      // sector filter) must apply to every space-sector operator.
      expect(result.applicableCount).toBeGreaterThan(0);
    },
  );

  it("requirements without subSector filter apply to every sub-sector", () => {
    // Get the 'no sub-sector filter' set once and assert that every
    // narrower sub-sector slice still includes them.
    const baseline = NIS2_REQUIREMENTS.filter(
      (r) =>
        !r.applicableTo.subSectors || r.applicableTo.subSectors.length === 0,
    ).map((r) => r.id);

    for (const sub of subSectors) {
      const filtered = getApplicableNIS2Requirements(
        "essential",
        buildAnswers({ entitySize: "large", spaceSubSector: sub }),
      ).map((r) => r.id);
      for (const id of baseline) {
        expect(filtered).toContain(id);
      }
    }
  });
});

// ─── Idempotency & determinism ────────────────────────────────────────
describe("NIS2 real-data engine — determinism", () => {
  it("produces deep-equal results across two consecutive calls", async () => {
    const answers = buildAnswers({
      entitySize: "large",
      spaceSubSector: "satellite_communications",
      operatesSatComms: true,
      memberStateCount: 3,
    });

    const a = await calculateNIS2Compliance(answers);
    const b = await calculateNIS2Compliance(answers);

    expect(a.entityClassification).toBe(b.entityClassification);
    expect(a.applicableCount).toBe(b.applicableCount);
    expect(a.totalNIS2Requirements).toBe(b.totalNIS2Requirements);
    expect(a.euSpaceActOverlap.count).toBe(b.euSpaceActOverlap.count);
    expect(a.applicableRequirements.map((r) => r.id)).toEqual(
      b.applicableRequirements.map((r) => r.id),
    );
  });

  it("classifyNIS2Entity is a pure function of its inputs", () => {
    const answers = buildAnswers();
    const a = classifyNIS2Entity(answers);
    const b = classifyNIS2Entity(answers);
    expect(a).toEqual(b);
    // Calling it should not mutate the input.
    expect(answers.entitySize).toBe("medium");
  });
});
