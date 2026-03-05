import { describe, it, expect } from "vitest";
import {
  UNIFIED_QUESTIONS,
  TOTAL_PHASES,
  getQuestionsForPhase,
  getVisibleQuestions,
  getCurrentQuestion,
  getTotalQuestions,
  getPhaseProgress,
  isQuestionAnswered,
} from "./unified-assessment-questions";
import type {
  UnifiedAssessmentAnswers,
  UnifiedQuestion,
} from "./unified-assessment-types";

// Helper to create partial answers
function makeAnswers(
  overrides?: Partial<UnifiedAssessmentAnswers>,
): Partial<UnifiedAssessmentAnswers> {
  return {
    ...overrides,
  };
}

describe("unified-assessment-questions", () => {
  describe("UNIFIED_QUESTIONS", () => {
    it("exports a non-empty array of questions", () => {
      expect(Array.isArray(UNIFIED_QUESTIONS)).toBe(true);
      expect(UNIFIED_QUESTIONS.length).toBeGreaterThan(0);
    });

    it("each question has required fields", () => {
      UNIFIED_QUESTIONS.forEach((q) => {
        expect(q.id).toBeTruthy();
        expect(q.phase).toBeGreaterThanOrEqual(1);
        expect(q.phase).toBeLessThanOrEqual(TOTAL_PHASES);
        expect(q.phaseName).toBeTruthy();
        expect(q.title).toBeTruthy();
        expect(q.type).toMatch(/^(single|multi|text|number|boolean)$/);
        expect(typeof q.required).toBe("boolean");
      });
    });

    it("has unique question IDs", () => {
      const ids = UNIFIED_QUESTIONS.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("questions with options have at least one option", () => {
      UNIFIED_QUESTIONS.forEach((q) => {
        if (q.type === "single" || q.type === "multi") {
          expect(
            q.options,
            `Question "${q.id}" of type "${q.type}" should have options`,
          ).toBeDefined();
          expect(q.options!.length).toBeGreaterThan(0);
        }
      });
    });

    it("covers all 8 phases", () => {
      const phases = new Set(UNIFIED_QUESTIONS.map((q) => q.phase));
      for (let i = 1; i <= TOTAL_PHASES; i++) {
        expect(phases.has(i), `Phase ${i} should have questions`).toBe(true);
      }
    });
  });

  describe("TOTAL_PHASES", () => {
    it("is 8", () => {
      expect(TOTAL_PHASES).toBe(8);
    });
  });

  describe("getQuestionsForPhase", () => {
    it("returns questions for phase 1", () => {
      const phase1 = getQuestionsForPhase(1);
      expect(phase1.length).toBeGreaterThan(0);
      phase1.forEach((q) => {
        expect(q.phase).toBe(1);
      });
    });

    it("returns questions for each phase", () => {
      for (let phase = 1; phase <= TOTAL_PHASES; phase++) {
        const questions = getQuestionsForPhase(phase);
        expect(
          questions.length,
          `Phase ${phase} should have questions`,
        ).toBeGreaterThan(0);
      }
    });

    it("returns empty array for non-existent phase", () => {
      const questions = getQuestionsForPhase(99);
      expect(questions).toEqual([]);
    });
  });

  describe("getVisibleQuestions", () => {
    it("returns all unconditional questions when answers are empty", () => {
      const visible = getVisibleQuestions({});
      expect(visible.length).toBeGreaterThan(0);

      // All visible questions should either have no showIf, or showIf returns true
      visible.forEach((q) => {
        if (q.showIf) {
          expect(q.showIf({})).toBeTruthy();
        }
      });
    });

    it("includes conditional questions when conditions are met", () => {
      // operatesConstellation requires SCO in activityTypes AND spacecraftCount > 1
      const answers = makeAnswers({
        activityTypes: ["SCO"],
        spacecraftCount: 5,
      });
      const visible = getVisibleQuestions(answers);
      const visibleIds = visible.map((q) => q.id);

      // operatesConstellation should be visible for SCO operators with multiple spacecraft
      const conditionalQ = UNIFIED_QUESTIONS.find(
        (q) => q.id === "operatesConstellation" && q.showIf,
      );
      if (conditionalQ) {
        expect(visibleIds).toContain("operatesConstellation");
      }
    });

    it("excludes conditional questions when conditions are not met", () => {
      // Without any activityTypes, SCO-specific questions should be hidden
      const answersEmpty = makeAnswers({ activityTypes: [] });
      const visible = getVisibleQuestions(answersEmpty);
      const visibleIds = visible.map((q) => q.id);

      // Conditional SCO-specific questions should not be visible
      const scoOnlyQuestions = UNIFIED_QUESTIONS.filter(
        (q) =>
          q.showIf &&
          q.showIf({ activityTypes: ["SCO"] }) === true &&
          !q.showIf({ activityTypes: [] }),
      );

      scoOnlyQuestions.forEach((q) => {
        expect(
          visibleIds,
          `Question "${q.id}" should not be visible without SCO`,
        ).not.toContain(q.id);
      });
    });
  });

  describe("getCurrentQuestion", () => {
    it("returns the first visible question for step 1", () => {
      const q = getCurrentQuestion({}, 1);
      expect(q).not.toBeNull();
      expect(q!.id).toBeDefined();
    });

    it("returns null for step beyond visible questions", () => {
      const q = getCurrentQuestion({}, 9999);
      expect(q).toBeNull();
    });

    it("returns different questions for different steps", () => {
      const q1 = getCurrentQuestion({}, 1);
      const q2 = getCurrentQuestion({}, 2);
      expect(q1).not.toBeNull();
      expect(q2).not.toBeNull();
      expect(q1!.id).not.toBe(q2!.id);
    });
  });

  describe("getTotalQuestions", () => {
    it("returns the number of visible questions", () => {
      const total = getTotalQuestions({});
      expect(total).toBeGreaterThan(0);
      expect(total).toBe(getVisibleQuestions({}).length);
    });

    it("may differ based on answers", () => {
      const totalEmpty = getTotalQuestions({});
      const totalWithSCO = getTotalQuestions({ activityTypes: ["SCO"] });
      // With SCO selected, there are more conditional questions visible
      expect(totalWithSCO).toBeGreaterThanOrEqual(totalEmpty);
    });
  });

  describe("getPhaseProgress", () => {
    it("returns phase info for step 1", () => {
      const progress = getPhaseProgress({}, 1);
      expect(progress.phase).toBe(1);
      expect(progress.phaseName).toBeTruthy();
      expect(progress.phaseProgress).toBeGreaterThan(0);
      expect(progress.overallProgress).toBeGreaterThan(0);
    });

    it("returns complete when step is beyond total", () => {
      const progress = getPhaseProgress({}, 99999);
      expect(progress.phase).toBe(8);
      expect(progress.phaseName).toBe("Complete");
      expect(progress.phaseProgress).toBe(100);
      expect(progress.overallProgress).toBe(100);
    });

    it("increases overall progress with higher steps", () => {
      const p1 = getPhaseProgress({}, 1);
      const p2 = getPhaseProgress({}, 2);
      expect(p2.overallProgress).toBeGreaterThan(p1.overallProgress);
    });

    it("correctly computes phase progress within a phase", () => {
      // Phase 1 should have multiple questions
      const phase1Questions = getVisibleQuestions({}).filter(
        (q) => q.phase === 1,
      );
      if (phase1Questions.length > 1) {
        const p = getPhaseProgress({}, 1);
        expect(p.phaseProgress).toBeLessThanOrEqual(100);
        expect(p.phaseProgress).toBeGreaterThan(0);
      }
    });
  });

  describe("isQuestionAnswered", () => {
    it("returns true for a single-type question with a value", () => {
      const q: UnifiedQuestion = {
        id: "establishmentCountry" as keyof UnifiedAssessmentAnswers,
        phase: 1,
        phaseName: "Test",
        title: "Test",
        type: "single",
        required: true,
      };
      const answered = isQuestionAnswered(q, { establishmentCountry: "DE" });
      expect(answered).toBe(true);
    });

    it("returns false for a single-type question with null", () => {
      const q: UnifiedQuestion = {
        id: "establishmentCountry" as keyof UnifiedAssessmentAnswers,
        phase: 1,
        phaseName: "Test",
        title: "Test",
        type: "single",
        required: true,
      };
      const answered = isQuestionAnswered(q, { establishmentCountry: null });
      expect(answered).toBe(false);
    });

    it("returns false for a single-type question with undefined", () => {
      const q: UnifiedQuestion = {
        id: "establishmentCountry" as keyof UnifiedAssessmentAnswers,
        phase: 1,
        phaseName: "Test",
        title: "Test",
        type: "single",
        required: true,
      };
      const answered = isQuestionAnswered(q, {});
      expect(answered).toBe(false);
    });

    it("returns true for a multi-type question with enough selections", () => {
      const q: UnifiedQuestion = {
        id: "activityTypes" as keyof UnifiedAssessmentAnswers,
        phase: 2,
        phaseName: "Test",
        title: "Test",
        type: "multi",
        required: true,
        minSelections: 1,
      };
      const answered = isQuestionAnswered(q, { activityTypes: ["SCO"] });
      expect(answered).toBe(true);
    });

    it("returns false for a multi-type question with empty array", () => {
      const q: UnifiedQuestion = {
        id: "activityTypes" as keyof UnifiedAssessmentAnswers,
        phase: 2,
        phaseName: "Test",
        title: "Test",
        type: "multi",
        required: true,
        minSelections: 1,
      };
      const answered = isQuestionAnswered(q, { activityTypes: [] });
      expect(answered).toBe(false);
    });

    it("returns true for a multi-type question with default minSelections", () => {
      const q: UnifiedQuestion = {
        id: "activityTypes" as keyof UnifiedAssessmentAnswers,
        phase: 2,
        phaseName: "Test",
        title: "Test",
        type: "multi",
        required: true,
        // no minSelections specified, defaults to 1
      };
      const answered = isQuestionAnswered(q, { activityTypes: ["SCO"] });
      expect(answered).toBe(true);
    });

    it("returns true for a non-required text question with empty value", () => {
      const q: UnifiedQuestion = {
        id: "companyName" as keyof UnifiedAssessmentAnswers,
        phase: 1,
        phaseName: "Test",
        title: "Test",
        type: "text",
        required: false,
      };
      const answered = isQuestionAnswered(q, { companyName: "" });
      expect(answered).toBe(true);
    });

    it("returns false for a required text question with empty string", () => {
      const q: UnifiedQuestion = {
        id: "companyName" as keyof UnifiedAssessmentAnswers,
        phase: 1,
        phaseName: "Test",
        title: "Test",
        type: "text",
        required: true,
      };
      const answered = isQuestionAnswered(q, { companyName: "" });
      expect(answered).toBe(false);
    });

    it("returns false for a required text question with whitespace only", () => {
      const q: UnifiedQuestion = {
        id: "companyName" as keyof UnifiedAssessmentAnswers,
        phase: 1,
        phaseName: "Test",
        title: "Test",
        type: "text",
        required: true,
      };
      const answered = isQuestionAnswered(q, { companyName: "   " });
      expect(answered).toBe(false);
    });

    it("returns true for a required text question with a value", () => {
      const q: UnifiedQuestion = {
        id: "companyName" as keyof UnifiedAssessmentAnswers,
        phase: 1,
        phaseName: "Test",
        title: "Test",
        type: "text",
        required: true,
      };
      const answered = isQuestionAnswered(q, { companyName: "Caelex" });
      expect(answered).toBe(true);
    });

    it("returns true for boolean question with a value", () => {
      const q: UnifiedQuestion = {
        id: "isDefenseOnly" as keyof UnifiedAssessmentAnswers,
        phase: 2,
        phaseName: "Test",
        title: "Test",
        type: "boolean",
        required: true,
      };
      const answered = isQuestionAnswered(q, { isDefenseOnly: false });
      expect(answered).toBe(true);
    });
  });
});
