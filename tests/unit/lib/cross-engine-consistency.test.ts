/**
 * Cross-engine consistency tests.
 *
 * Caelex's value proposition is "one assessment → multiple regulations".
 * That only holds if the engines agree about the same operator.
 * Concretely, when a single `UnifiedAssessmentAnswers` is mapped through
 * the EU Space Act, NIS2, and National Space Law engines, the resulting
 * three classifications must not contradict each other.
 *
 * Examples of contradictions this file specifically catches:
 *
 *   - A defense-only operator that the EU Space Act treats as exempt
 *     but NIS2 still classifies as essential (impossible — the engines
 *     would disagree about whether the entity is regulated at all).
 *   - A "large EU spacecraft operator" that EU Space Act puts on the
 *     standard regime while NIS2 leaves out of scope (the size cap is
 *     the same in both regulations).
 *   - A third-country-no-EU operator that any engine still treats as
 *     in scope.
 *
 * These tests don't replace the per-engine unit tests — they catch
 * regressions in the *boundary* between engines, which is where
 * mappers and shared scoping logic live.
 */

import { describe, it, expect, vi } from "vitest";

import {
  euLargeSCO,
  defenseOnlyOperator,
  thirdCountryNoEUServices,
  thirdCountryWithEUServices,
  microResearchInstitution,
  designatedSmallEntity,
  multiActivityOperator,
  megaConstellationOperator,
  smallNonCriticalSpaceEntity,
} from "../../fixtures/unified-answers";

vi.mock("server-only", () => ({}));

const { mapToAssessmentAnswers, mapToNIS2Answers, mapToSpaceLawAnswers } =
  await import("@/lib/unified-assessment-mappers.server");
const { calculateCompliance } = await import("@/lib/engine.server");
const { calculateNIS2Compliance, classifyNIS2Entity } =
  await import("@/lib/nis2-engine.server");
const { calculateSpaceLawCompliance } =
  await import("@/lib/space-law-engine.server");
const { loadSpaceActDataFromDisk } = await import("@/lib/engine.server");

const realData = loadSpaceActDataFromDisk();

// ─── Defense-only consistency ────────────────────────────────────────
describe("Cross-engine consistency — defense-only exemption", () => {
  it("a defense-only operator is exempt from the EU Space Act AND not pulled into NIS2 by sector", async () => {
    // EU Space Act explicitly exempts defense-only ops under Art. 2(3).
    // NIS2 has its own scope rules — but a pure-defense operator
    // would only land in NIS2 via member-state designation. Make
    // sure the defaults don't accidentally cross the streams.
    const spaceActAnswers = mapToAssessmentAnswers(defenseOnlyOperator, "SCO");
    const nis2Answers = mapToNIS2Answers(defenseOnlyOperator);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    expect(spaceActResult.applicableCount).toBe(0);
    expect(spaceActResult.regimeLabel.toLowerCase()).toContain("out of scope");

    // The NIS2 mapper should NOT pre-flag a defense-only operator as
    // designated by member state — that's the user's explicit answer,
    // not something the mapper infers.
    expect(nis2Answers.designatedByMemberState).not.toBe(true);
  });
});

// ─── Third-country consistency ───────────────────────────────────────
describe("Cross-engine consistency — third country / no EU services", () => {
  it("third_country_no_eu is out of scope across EU Space Act AND NIS2", async () => {
    const spaceActAnswers = mapToAssessmentAnswers(
      thirdCountryNoEUServices,
      "SCO",
    );
    const nis2Answers = mapToNIS2Answers(thirdCountryNoEUServices);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Result = await calculateNIS2Compliance(nis2Answers);

    expect(spaceActResult.applicableCount).toBe(0);
    expect(spaceActResult.regime).toBe("out_of_scope");
    expect(nis2Result.entityClassification).toBe("out_of_scope");
    expect(nis2Result.applicableCount).toBe(0);
  });

  it("third_country_with_eu_services is in scope under EU Space Act AND NIS2 Art. 26", async () => {
    const spaceActAnswers = mapToAssessmentAnswers(
      thirdCountryWithEUServices,
      "SCO",
    );
    const nis2Answers = mapToNIS2Answers(thirdCountryWithEUServices);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Result = await calculateNIS2Compliance(nis2Answers);

    expect(spaceActResult.isThirdCountry).toBe(true);
    expect(spaceActResult.applicableCount).toBeGreaterThan(0);

    // Under NIS2 Art. 26 the entity is in scope as important.
    expect(nis2Result.entityClassification).not.toBe("out_of_scope");
    expect(nis2Result.classificationArticleRef).toContain("Art. 26");
  });
});

// ─── Large EU operator consistency ───────────────────────────────────
describe("Cross-engine consistency — large EU operator", () => {
  it("EU large spacecraft operator is in scope of all three regulations", async () => {
    const spaceActAnswers = mapToAssessmentAnswers(euLargeSCO, "SCO");
    const nis2Answers = mapToNIS2Answers(euLargeSCO);
    const spaceLawAnswers = mapToSpaceLawAnswers(euLargeSCO);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Result = await calculateNIS2Compliance(nis2Answers);
    const spaceLawResult = await calculateSpaceLawCompliance(spaceLawAnswers);

    expect(spaceActResult.applicableCount).toBeGreaterThan(0);
    expect(spaceActResult.regime).toBe("standard");
    expect(spaceActResult.isEU).toBe(true);

    expect(nis2Result.entityClassification).toBe("essential");
    expect(nis2Result.applicableCount).toBeGreaterThan(0);

    expect(spaceLawResult.jurisdictions.length).toBeGreaterThan(0);
  });

  it("EU large operator's NIS2 classification is consistent with the EU Space Act regime", () => {
    // A large EU operator must be EU Space Act standard regime AND
    // NIS2 essential. The entity-size threshold is identical in both
    // regulations (≥250 employees / ≥€50M turnover) so the answers
    // should never disagree.
    const spaceActAnswers = mapToAssessmentAnswers(euLargeSCO, "SCO");
    const nis2Answers = mapToNIS2Answers(euLargeSCO);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Classification = classifyNIS2Entity(nis2Answers);

    expect(spaceActResult.regime).toBe("standard");
    expect(nis2Classification.classification).toBe("essential");
  });
});

// ─── Light regime consistency ────────────────────────────────────────
describe("Cross-engine consistency — small / micro entities", () => {
  it("micro research institution → EU Space Act light regime AND NIS2 out_of_scope", async () => {
    const spaceActAnswers = mapToAssessmentAnswers(
      microResearchInstitution,
      "SCO",
    );
    const nis2Answers = mapToNIS2Answers(microResearchInstitution);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Result = await calculateNIS2Compliance(nis2Answers);

    expect(spaceActResult.regime).toBe("light");
    expect(nis2Result.entityClassification).toBe("out_of_scope");
  });

  it("small non-critical space entity → light regime AND NIS2 out_of_scope (default)", async () => {
    const spaceActAnswers = mapToAssessmentAnswers(
      smallNonCriticalSpaceEntity,
      "SCO",
    );
    const nis2Answers = mapToNIS2Answers(smallNonCriticalSpaceEntity);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Result = await calculateNIS2Compliance(nis2Answers);

    expect(spaceActResult.regime).toBe("light");
    expect(nis2Result.entityClassification).toBe("out_of_scope");
  });

  it("designated small entity → NIS2 essential overrides size, EU Space Act stays light", async () => {
    // Member-state designation under Art. 2(2) overrides the size cap
    // for NIS2, but does not affect the EU Space Act regime — the
    // light regime is purely a function of size for the EU Space Act.
    const spaceActAnswers = mapToAssessmentAnswers(
      designatedSmallEntity,
      "SCO",
    );
    const nis2Answers = mapToNIS2Answers(designatedSmallEntity);
    expect(nis2Answers.designatedByMemberState).toBe(true);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Result = await calculateNIS2Compliance(nis2Answers);

    expect(spaceActResult.regime).toBe("light");
    expect(nis2Result.entityClassification).toBe("essential");
  });
});

// ─── Multi-activity consistency ──────────────────────────────────────
describe("Cross-engine consistency — multi-activity operator", () => {
  it("an operator that is both spacecraft + launch must be in scope of EU Space Act for both views", () => {
    const scoAnswers = mapToAssessmentAnswers(multiActivityOperator, "SCO");
    const loAnswers = mapToAssessmentAnswers(multiActivityOperator, "LO");

    const scoResult = calculateCompliance(scoAnswers, realData);
    const loResult = calculateCompliance(loAnswers, realData);

    // Both views should be in scope and on the standard regime (size=large).
    expect(scoResult.regime).toBe("standard");
    expect(loResult.regime).toBe("standard");
    expect(scoResult.applicableCount).toBeGreaterThan(0);
    expect(loResult.applicableCount).toBeGreaterThan(0);

    // The two views should produce different operator labels
    // — that's the whole point of running them separately.
    expect(scoResult.operatorAbbreviation).toBe("SCO");
    expect(loResult.operatorAbbreviation).toBe("LO");
  });
});

// ─── Mega constellation consistency ──────────────────────────────────
describe("Cross-engine consistency — mega constellation", () => {
  it("mega constellation operator is in scope across all three regulations", async () => {
    const spaceActAnswers = mapToAssessmentAnswers(
      megaConstellationOperator,
      "SCO",
    );
    const nis2Answers = mapToNIS2Answers(megaConstellationOperator);
    const spaceLawAnswers = mapToSpaceLawAnswers(megaConstellationOperator);

    const spaceActResult = calculateCompliance(spaceActAnswers, realData);
    const nis2Result = await calculateNIS2Compliance(nis2Answers);
    const spaceLawResult = await calculateSpaceLawCompliance(spaceLawAnswers);

    expect(spaceActResult.constellationTier).toBeTruthy();
    expect(spaceActResult.applicableCount).toBeGreaterThan(0);

    expect(nis2Result.entityClassification).not.toBe("out_of_scope");
    expect(spaceLawResult.jurisdictions.length).toBeGreaterThan(0);
  });
});

// ─── Mapper / engine boundary invariants ─────────────────────────────
describe("Cross-engine consistency — mapper invariants", () => {
  it("the EU Space Act mapper preserves entity size for non-research large operators", () => {
    const mapped = mapToAssessmentAnswers(euLargeSCO, "SCO");
    expect(mapped.entitySize).toBe("large");
  });

  it("the NIS2 mapper preserves entity size for large operators", () => {
    const mapped = mapToNIS2Answers(euLargeSCO);
    expect(mapped.entitySize).toBe("large");
  });

  it("the space law mapper preserves jurisdictions and orbit for the large EU operator", () => {
    const mapped = mapToSpaceLawAnswers(euLargeSCO);
    expect(mapped.selectedJurisdictions).toEqual(
      euLargeSCO.interestedJurisdictions,
    );
    expect(mapped.primaryOrbit).toBe(euLargeSCO.primaryOrbitalRegime);
  });

  it("all three mappers agree about EU establishment for an EU operator", () => {
    const spaceActAnswers = mapToAssessmentAnswers(euLargeSCO, "SCO");
    const nis2Answers = mapToNIS2Answers(euLargeSCO);
    const spaceLawAnswers = mapToSpaceLawAnswers(euLargeSCO);

    expect(spaceActAnswers.establishment).toBe("eu");
    expect(nis2Answers.isEUEstablished).toBe(true);
    expect(spaceLawAnswers.entityNationality).not.toBe("non_eu");
  });
});
