import { describe, it, expect } from "vitest";

import {
  NIS2_QUESTIONS,
  getCurrentNIS2Question,
  getTotalNIS2Questions,
  getDefaultNIS2Answers,
} from "@/lib/nis2-questions";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

// ─── Test Helpers ───

function makeAnswers(
  overrides: Partial<NIS2AssessmentAnswers> = {},
): NIS2AssessmentAnswers {
  return {
    ...getDefaultNIS2Answers(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// NIS2_QUESTIONS structure
// ═══════════════════════════════════════════════════════════════

describe("NIS2_QUESTIONS", () => {
  it("should have at least 6 questions", () => {
    expect(NIS2_QUESTIONS.length).toBeGreaterThanOrEqual(6);
  });

  it("should have unique step numbers", () => {
    const steps = NIS2_QUESTIONS.map((q) => q.step);
    const uniqueSteps = new Set(steps);
    expect(uniqueSteps.size).toBe(steps.length);
  });

  it("should have unique IDs", () => {
    const ids = NIS2_QUESTIONS.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have at least 2 options per question", () => {
    for (const question of NIS2_QUESTIONS) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("should have valid option structure", () => {
    for (const question of NIS2_QUESTIONS) {
      for (const option of question.options) {
        expect(option.id).toBeTruthy();
        expect(option.label).toBeTruthy();
        expect(option.value !== undefined && option.value !== null).toBe(true);
      }
    }
  });

  it("should start at step 1", () => {
    const firstStep = Math.min(...NIS2_QUESTIONS.map((q) => q.step));
    expect(firstStep).toBe(1);
  });

  it("should have sector as the first question", () => {
    const firstQuestion = NIS2_QUESTIONS.find((q) => q.step === 1);
    expect(firstQuestion).toBeDefined();
    expect(firstQuestion!.id).toBe("sector");
  });

  it("should have conditional space sub-sector question", () => {
    const subSectorQ = NIS2_QUESTIONS.find((q) => q.id === "spaceSubSector");
    expect(subSectorQ).toBeDefined();
    expect(subSectorQ!.showWhen).toBeDefined();
    expect(subSectorQ!.showWhen!.questionId).toBe("sector");
    expect(subSectorQ!.showWhen!.value).toBe("space");
  });

  it("should include EU establishment question with out-of-scope handling", () => {
    const euQ = NIS2_QUESTIONS.find((q) => q.id === "isEUEstablished");
    expect(euQ).toBeDefined();
    expect(euQ!.outOfScopeValue).toBe(false);
    expect(euQ!.outOfScopeMessage).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// getCurrentNIS2Question
// ═══════════════════════════════════════════════════════════════

describe("getCurrentNIS2Question", () => {
  it("should return the first question at step 1 with default answers", () => {
    const answers = makeAnswers();
    const question = getCurrentNIS2Question(answers, 1);

    expect(question).toBeDefined();
    expect(question!.id).toBe("sector");
    expect(question!.step).toBe(1);
  });

  it("should return space sub-sector question at step 2 when sector=space", () => {
    const answers = makeAnswers({ sector: "space" });
    const question = getCurrentNIS2Question(answers, 2);

    expect(question).toBeDefined();
    expect(question!.id).toBe("spaceSubSector");
  });

  it("should skip space sub-sector question at step 2 when sector is not space", () => {
    const answers = makeAnswers({ sector: "transport" });
    const question = getCurrentNIS2Question(answers, 2);

    // Should skip to step 3 or beyond
    if (question) {
      expect(question.id).not.toBe("spaceSubSector");
      expect(question.step).toBeGreaterThan(2);
    }
  });

  it("should return null for a step beyond the last question", () => {
    const answers = makeAnswers();
    const question = getCurrentNIS2Question(answers, 999);

    expect(question).toBeNull();
  });

  it("should skip questions when showWhen condition is not met", () => {
    // Set sector to non-space, so spaceSubSector should be skipped
    const answers = makeAnswers({ sector: "digital_infrastructure" });

    // Get all questions through iteration
    const questions = [];
    for (let i = 1; i <= NIS2_QUESTIONS.length; i++) {
      const q = getCurrentNIS2Question(answers, i);
      if (q) questions.push(q);
    }

    // None should be spaceSubSector
    const hasSubSector = questions.some((q) => q.id === "spaceSubSector");
    expect(hasSubSector).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// getTotalNIS2Questions
// ═══════════════════════════════════════════════════════════════

describe("getTotalNIS2Questions", () => {
  it("should return total count including conditional questions when conditions are met", () => {
    const answers = makeAnswers({ sector: "space" });
    const total = getTotalNIS2Questions(answers);

    // With space selected, all questions should be visible (including sub-sector)
    expect(total).toBe(NIS2_QUESTIONS.length);
  });

  it("should return fewer questions when conditions are not met", () => {
    const answers = makeAnswers({ sector: "transport" });
    const total = getTotalNIS2Questions(answers);

    // Without space, sub-sector is hidden
    expect(total).toBeLessThan(NIS2_QUESTIONS.length);
  });

  it("should return consistent count for space vs non-space", () => {
    const spaceAnswers = makeAnswers({ sector: "space" });
    const nonSpaceAnswers = makeAnswers({ sector: "transport" });

    const spaceTotal = getTotalNIS2Questions(spaceAnswers);
    const nonSpaceTotal = getTotalNIS2Questions(nonSpaceAnswers);

    // Space should have one more question (sub-sector)
    expect(spaceTotal).toBe(nonSpaceTotal + 1);
  });

  it("should return a positive number", () => {
    const answers = makeAnswers();
    const total = getTotalNIS2Questions(answers);

    expect(total).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// getDefaultNIS2Answers
// ═══════════════════════════════════════════════════════════════

describe("getDefaultNIS2Answers", () => {
  it("should return all null values", () => {
    const defaults = getDefaultNIS2Answers();

    expect(defaults.sector).toBeNull();
    expect(defaults.spaceSubSector).toBeNull();
    expect(defaults.entitySize).toBeNull();
    expect(defaults.isEUEstablished).toBeNull();
    expect(defaults.hasISO27001).toBeNull();
    expect(defaults.hasExistingCSIRT).toBeNull();
    expect(defaults.operatesGroundInfra).toBeNull();
    expect(defaults.operatesSatComms).toBeNull();
    expect(defaults.memberStateCount).toBeNull();
  });

  it("should include all required answer fields", () => {
    const defaults = getDefaultNIS2Answers();

    expect(defaults).toHaveProperty("sector");
    expect(defaults).toHaveProperty("spaceSubSector");
    expect(defaults).toHaveProperty("operatesGroundInfra");
    expect(defaults).toHaveProperty("operatesSatComms");
    expect(defaults).toHaveProperty("manufacturesSpacecraft");
    expect(defaults).toHaveProperty("providesLaunchServices");
    expect(defaults).toHaveProperty("providesEOData");
    expect(defaults).toHaveProperty("entitySize");
    expect(defaults).toHaveProperty("employeeCount");
    expect(defaults).toHaveProperty("annualRevenue");
    expect(defaults).toHaveProperty("memberStateCount");
    expect(defaults).toHaveProperty("isEUEstablished");
    expect(defaults).toHaveProperty("hasISO27001");
    expect(defaults).toHaveProperty("hasExistingCSIRT");
    expect(defaults).toHaveProperty("hasRiskManagement");
  });

  it("should return a new object on each call (no shared references)", () => {
    const defaults1 = getDefaultNIS2Answers();
    const defaults2 = getDefaultNIS2Answers();

    expect(defaults1).not.toBe(defaults2);
    expect(defaults1).toEqual(defaults2);
  });
});
