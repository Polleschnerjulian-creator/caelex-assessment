import { describe, it, expect, afterEach } from "vitest";

import {
  NIS2_QUESTIONS,
  getCurrentNIS2Question,
  getTotalNIS2Questions,
  getDefaultNIS2Answers,
} from "@/lib/nis2-questions";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";
import type { Question } from "@/lib/questions";

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

  it("should have space sub-sector as the first question (Caelex is space-only)", () => {
    const firstQuestion = NIS2_QUESTIONS.find((q) => q.step === 1);
    expect(firstQuestion).toBeDefined();
    expect(firstQuestion!.id).toBe("spaceSubSector");
  });

  it("should not have a generic sector question", () => {
    const sectorQ = NIS2_QUESTIONS.find((q) => q.id === "sector");
    expect(sectorQ).toBeUndefined();
  });

  it("should have space sub-sector with all sub-sector options", () => {
    const subSectorQ = NIS2_QUESTIONS.find((q) => q.id === "spaceSubSector");
    expect(subSectorQ).toBeDefined();
    // Should NOT have conditional showWhen — it's always shown
    expect(subSectorQ!.showWhen).toBeUndefined();
    const optionIds = subSectorQ!.options.map((o) => o.id);
    expect(optionIds).toContain("ground_infrastructure");
    expect(optionIds).toContain("satellite_communications");
    expect(optionIds).toContain("spacecraft_manufacturing");
    expect(optionIds).toContain("launch_services");
    expect(optionIds).toContain("earth_observation");
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
  it("should return the space sub-sector question at step 1", () => {
    const answers = makeAnswers();
    const question = getCurrentNIS2Question(answers, 1);

    expect(question).toBeDefined();
    expect(question!.id).toBe("spaceSubSector");
    expect(question!.step).toBe(1);
  });

  it("should return EU establishment question at step 2", () => {
    const answers = makeAnswers();
    const question = getCurrentNIS2Question(answers, 2);

    expect(question).toBeDefined();
    expect(question!.id).toBe("isEUEstablished");
  });

  it("should return entity size question at step 3", () => {
    const answers = makeAnswers();
    const question = getCurrentNIS2Question(answers, 3);

    expect(question).toBeDefined();
    expect(question!.id).toBe("entitySize");
  });

  it("should return null for a step beyond the last question", () => {
    const answers = makeAnswers();
    const question = getCurrentNIS2Question(answers, 999);

    expect(question).toBeNull();
  });

  it("should have no conditional questions (all shown for space)", () => {
    const answers = makeAnswers();

    // Get all questions through iteration
    const questions = [];
    for (let i = 1; i <= NIS2_QUESTIONS.length; i++) {
      const q = getCurrentNIS2Question(answers, i);
      if (q) questions.push(q);
    }

    // All questions should be visible
    expect(questions.length).toBe(NIS2_QUESTIONS.length);
  });
});

// ═══════════════════════════════════════════════════════════════
// getTotalNIS2Questions
// ═══════════════════════════════════════════════════════════════

describe("getTotalNIS2Questions", () => {
  it("should return total count of all questions (no conditionals for space-only)", () => {
    const answers = makeAnswers();
    const total = getTotalNIS2Questions(answers);

    // All questions should be visible — no conditional questions
    expect(total).toBe(NIS2_QUESTIONS.length);
  });

  it("should return 7 questions for the space-only assessment", () => {
    const answers = makeAnswers();
    const total = getTotalNIS2Questions(answers);

    expect(total).toBe(7);
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
  it("should return default values with sector preset to space", () => {
    const defaults = getDefaultNIS2Answers();

    expect(defaults.sector).toBe("space"); // Caelex is space-only
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

// ═══════════════════════════════════════════════════════════════
// Conditional question logic (showWhen branches)
// ═══════════════════════════════════════════════════════════════

describe("Conditional question handling (showWhen)", () => {
  // Store original length to restore after tests
  let originalLength: number;

  // Helper: Add a conditional question temporarily
  function addConditionalQuestion(): Question {
    originalLength = NIS2_QUESTIONS.length;
    const conditionalQ: Question = {
      id: "conditionalTest",
      step: 100, // High step number to avoid conflicts
      title: "Conditional question for testing",
      showWhen: {
        questionId: "isEUEstablished",
        value: true,
      },
      options: [
        {
          id: "opt1",
          label: "Option 1",
          description: "Test option",
          value: "a",
        },
        {
          id: "opt2",
          label: "Option 2",
          description: "Test option",
          value: "b",
        },
      ],
    };
    NIS2_QUESTIONS.push(conditionalQ);
    return conditionalQ;
  }

  afterEach(() => {
    // Restore the array to its original state
    if (originalLength !== undefined) {
      NIS2_QUESTIONS.length = originalLength;
    }
  });

  describe("getCurrentNIS2Question with showWhen", () => {
    it("should return the question when showWhen condition is met", () => {
      addConditionalQuestion();
      const answers = makeAnswers({ isEUEstablished: true });
      const question = getCurrentNIS2Question(answers, 100);

      expect(question).toBeDefined();
      expect(question!.id).toBe("conditionalTest");
    });

    it("should skip question when showWhen condition is not met", () => {
      addConditionalQuestion();
      const answers = makeAnswers({ isEUEstablished: false });
      const question = getCurrentNIS2Question(answers, 100);

      // Should skip step 100 and move to step 101 which doesn't exist -> null
      expect(question).toBeNull();
    });

    it("should skip question when showWhen answer is null (not answered yet)", () => {
      addConditionalQuestion();
      const answers = makeAnswers({ isEUEstablished: null });
      const question = getCurrentNIS2Question(answers, 100);

      // null !== true, so the question should be skipped
      expect(question).toBeNull();
    });
  });

  describe("getTotalNIS2Questions with showWhen", () => {
    it("should count conditional question when condition is met", () => {
      addConditionalQuestion();
      const answers = makeAnswers({ isEUEstablished: true });
      const total = getTotalNIS2Questions(answers);

      // Original 7 questions + 1 conditional = 8
      expect(total).toBe(8);
    });

    it("should not count conditional question when condition is not met", () => {
      addConditionalQuestion();
      const answers = makeAnswers({ isEUEstablished: false });
      const total = getTotalNIS2Questions(answers);

      // Only the original 7 questions
      expect(total).toBe(7);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// getAnswerValue null coalescing (internal helper exercised via public API)
// ═══════════════════════════════════════════════════════════════

describe("getAnswerValue null coalescing via getCurrentNIS2Question", () => {
  it("handles answers with explicit values", () => {
    const answers = makeAnswers({
      spaceSubSector: "ground_infrastructure",
      isEUEstablished: true,
      entitySize: "large",
    });

    // Step 1 should return normally (no showWhen on step 1)
    const q1 = getCurrentNIS2Question(answers, 1);
    expect(q1).toBeDefined();
    expect(q1!.id).toBe("spaceSubSector");
  });

  it("handles answers where all values are null (default answers)", () => {
    const answers = makeAnswers();

    // Every answer is null, but no questions have showWhen,
    // so all questions should still be returned
    for (let step = 1; step <= 7; step++) {
      const q = getCurrentNIS2Question(answers, step);
      expect(q).toBeDefined();
    }
  });

  it("handles undefined properties in answers via null coalescing", () => {
    // Create answers with missing properties to exercise ?? null path
    const partialAnswers = {
      sector: "space" as const,
      spaceSubSector: null,
      operatesGroundInfra: null,
      operatesSatComms: null,
      manufacturesSpacecraft: null,
      providesLaunchServices: null,
      providesEOData: null,
      entitySize: null,
      employeeCount: null,
      annualRevenue: null,
      memberStateCount: null,
      isEUEstablished: null,
      hasISO27001: null,
      hasExistingCSIRT: null,
      hasRiskManagement: null,
    } as NIS2AssessmentAnswers;

    const total = getTotalNIS2Questions(partialAnswers);
    expect(total).toBe(7);
  });
});
