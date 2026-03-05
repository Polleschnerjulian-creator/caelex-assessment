import { describe, it, expect, afterEach } from "vitest";
import {
  SPACE_LAW_QUESTIONS,
  getDefaultSpaceLawAnswers,
  getCurrentSpaceLawQuestion,
  getTotalSpaceLawQuestions,
} from "./space-law-questions";
import type { SpaceLawAssessmentAnswers } from "./space-law-types";
import type { Question } from "./questions";

describe("space-law-questions", () => {
  describe("SPACE_LAW_QUESTIONS", () => {
    it("exports an array of questions", () => {
      expect(Array.isArray(SPACE_LAW_QUESTIONS)).toBe(true);
      expect(SPACE_LAW_QUESTIONS.length).toBe(7);
    });

    it("each question has required fields", () => {
      SPACE_LAW_QUESTIONS.forEach((q) => {
        expect(q.id).toBeTruthy();
        expect(q.step).toBeGreaterThan(0);
        expect(q.title).toBeTruthy();
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBeGreaterThan(0);
      });
    });

    it("has unique question IDs", () => {
      const ids = SPACE_LAW_QUESTIONS.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has sequential step numbers", () => {
      const steps = SPACE_LAW_QUESTIONS.map((q) => q.step);
      for (let i = 0; i < steps.length; i++) {
        expect(steps[i]).toBe(i + 1);
      }
    });

    it("each option has required fields", () => {
      SPACE_LAW_QUESTIONS.forEach((q) => {
        q.options.forEach((opt) => {
          expect(opt.id).toBeTruthy();
          expect(opt.label).toBeTruthy();
          expect(opt.description).toBeTruthy();
          expect(opt.value).toBeDefined();
        });
      });
    });

    it("first question is multi-select for jurisdictions", () => {
      const first = SPACE_LAW_QUESTIONS[0];
      expect(first.id).toBe("selectedJurisdictions");
      expect(first.isMultiSelect).toBe(true);
      expect(first.maxSelections).toBe(3);
    });

    it("jurisdiction question has all 10 country codes", () => {
      const jurisdictionQ = SPACE_LAW_QUESTIONS[0];
      const countryCodes = jurisdictionQ.options.map((o) => o.value);
      expect(countryCodes).toContain("FR");
      expect(countryCodes).toContain("UK");
      expect(countryCodes).toContain("BE");
      expect(countryCodes).toContain("NL");
      expect(countryCodes).toContain("LU");
      expect(countryCodes).toContain("AT");
      expect(countryCodes).toContain("DK");
      expect(countryCodes).toContain("DE");
      expect(countryCodes).toContain("IT");
      expect(countryCodes).toContain("NO");
    });
  });

  describe("getDefaultSpaceLawAnswers", () => {
    it("returns answers with all fields set to null/empty", () => {
      const defaults = getDefaultSpaceLawAnswers();
      expect(defaults.selectedJurisdictions).toEqual([]);
      expect(defaults.activityType).toBeNull();
      expect(defaults.entityNationality).toBeNull();
      expect(defaults.entitySize).toBeNull();
      expect(defaults.primaryOrbit).toBeNull();
      expect(defaults.constellationSize).toBeNull();
      expect(defaults.licensingStatus).toBeNull();
    });

    it("returns a new object each time", () => {
      const a = getDefaultSpaceLawAnswers();
      const b = getDefaultSpaceLawAnswers();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe("getCurrentSpaceLawQuestion", () => {
    it("returns the question for the given step", () => {
      const answers = getDefaultSpaceLawAnswers();
      const q = getCurrentSpaceLawQuestion(answers, 1);
      expect(q).not.toBeNull();
      expect(q!.id).toBe("selectedJurisdictions");
    });

    it("returns second question for step 2", () => {
      const answers = getDefaultSpaceLawAnswers();
      const q = getCurrentSpaceLawQuestion(answers, 2);
      expect(q).not.toBeNull();
      expect(q!.id).toBe("activityType");
    });

    it("returns null for a step beyond the total", () => {
      const answers = getDefaultSpaceLawAnswers();
      const q = getCurrentSpaceLawQuestion(answers, 100);
      expect(q).toBeNull();
    });

    it("returns question for each valid step", () => {
      const answers = getDefaultSpaceLawAnswers();
      for (let step = 1; step <= SPACE_LAW_QUESTIONS.length; step++) {
        const q = getCurrentSpaceLawQuestion(answers, step);
        expect(q).not.toBeNull();
      }
    });

    it("skips a question with showWhen when the condition is not met", () => {
      // Temporarily add a conditional question at step 8
      const conditionalQuestion: Question = {
        id: "testConditional",
        step: 8,
        title: "Conditional question",
        options: [
          {
            id: "opt1",
            label: "Option 1",
            description: "Desc",
            value: "opt1",
          },
        ],
        showWhen: {
          questionId: "activityType",
          value: "launch_vehicle",
        },
      };
      // Also add the next step that should be returned instead
      const nextQuestion: Question = {
        id: "testNext",
        step: 9,
        title: "Next question",
        options: [
          {
            id: "opt2",
            label: "Option 2",
            description: "Desc",
            value: "opt2",
          },
        ],
      };

      SPACE_LAW_QUESTIONS.push(conditionalQuestion, nextQuestion);

      try {
        const answers = getDefaultSpaceLawAnswers();
        // activityType is null, which !== "launch_vehicle", so it should skip step 8
        const q = getCurrentSpaceLawQuestion(answers, 8);
        expect(q).not.toBeNull();
        expect(q!.id).toBe("testNext"); // Should skip to step 9
      } finally {
        // Clean up
        SPACE_LAW_QUESTIONS.pop();
        SPACE_LAW_QUESTIONS.pop();
      }
    });

    it("shows a question with showWhen when the condition is met", () => {
      const conditionalQuestion: Question = {
        id: "testConditionalMet",
        step: 8,
        title: "Conditional question",
        options: [
          {
            id: "opt1",
            label: "Option 1",
            description: "Desc",
            value: "opt1",
          },
        ],
        showWhen: {
          questionId: "activityType",
          value: "spacecraft_operation",
        },
      };

      SPACE_LAW_QUESTIONS.push(conditionalQuestion);

      try {
        const answers: SpaceLawAssessmentAnswers = {
          ...getDefaultSpaceLawAnswers(),
          activityType: "spacecraft_operation",
        };
        const q = getCurrentSpaceLawQuestion(answers, 8);
        expect(q).not.toBeNull();
        expect(q!.id).toBe("testConditionalMet");
      } finally {
        SPACE_LAW_QUESTIONS.pop();
      }
    });
  });

  describe("getTotalSpaceLawQuestions", () => {
    it("returns the correct count", () => {
      expect(getTotalSpaceLawQuestions()).toBe(SPACE_LAW_QUESTIONS.length);
      expect(getTotalSpaceLawQuestions()).toBe(7);
    });
  });
});
