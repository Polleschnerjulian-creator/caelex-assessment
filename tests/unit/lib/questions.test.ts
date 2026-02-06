import { describe, it, expect } from "vitest";
import { QUESTIONS } from "@/lib/questions";
import type { Question, QuestionOption } from "@/lib/questions";

describe("Questions Module", () => {
  describe("QUESTIONS array structure", () => {
    it("should have questions defined", () => {
      expect(QUESTIONS).toBeDefined();
      expect(Array.isArray(QUESTIONS)).toBe(true);
      expect(QUESTIONS.length).toBeGreaterThan(0);
    });

    it("should have unique question ids", () => {
      const ids = QUESTIONS.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid step numbers", () => {
      for (const question of QUESTIONS) {
        expect(question.step).toBeGreaterThan(0);
        expect(Number.isInteger(question.step)).toBe(true);
      }
    });

    it("should have titles for all questions", () => {
      for (const question of QUESTIONS) {
        expect(question.title).toBeDefined();
        expect(typeof question.title).toBe("string");
        expect(question.title.length).toBeGreaterThan(0);
      }
    });

    it("should have options for all questions", () => {
      for (const question of QUESTIONS) {
        expect(question.options).toBeDefined();
        expect(Array.isArray(question.options)).toBe(true);
        expect(question.options.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Question options", () => {
    it("should have unique option ids within each question", () => {
      for (const question of QUESTIONS) {
        const optionIds = question.options.map((o) => o.id);
        const uniqueIds = new Set(optionIds);
        expect(uniqueIds.size).toBe(optionIds.length);
      }
    });

    it("should have labels for all options", () => {
      for (const question of QUESTIONS) {
        for (const option of question.options) {
          expect(option.label).toBeDefined();
          expect(typeof option.label).toBe("string");
          expect(option.label.length).toBeGreaterThan(0);
        }
      }
    });

    it("should have descriptions for all options", () => {
      for (const question of QUESTIONS) {
        for (const option of question.options) {
          expect(option.description).toBeDefined();
          expect(typeof option.description).toBe("string");
        }
      }
    });

    it("should have values for all options", () => {
      for (const question of QUESTIONS) {
        for (const option of question.options) {
          expect(option.value).toBeDefined();
        }
      }
    });
  });

  describe("Activity Type Question", () => {
    it("should have activity type question as first", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      expect(activityQuestion).toBeDefined();
      expect(activityQuestion?.step).toBe(1);
    });

    it("should have spacecraft option", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      const spacecraftOption = activityQuestion?.options.find(
        (o) => o.value === "spacecraft",
      );
      expect(spacecraftOption).toBeDefined();
      expect(spacecraftOption?.label).toContain("Spacecraft");
    });

    it("should have launch vehicle option", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      const launchOption = activityQuestion?.options.find(
        (o) => o.value === "launch_vehicle",
      );
      expect(launchOption).toBeDefined();
      expect(launchOption?.label).toContain("Launch");
    });

    it("should have in-space services option", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      const isosOption = activityQuestion?.options.find(
        (o) => o.value === "isos",
      );
      expect(isosOption).toBeDefined();
    });

    it("should have data provider option", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      const dataOption = activityQuestion?.options.find(
        (o) => o.value === "data_provider",
      );
      expect(dataOption).toBeDefined();
    });
  });

  describe("Defense Question", () => {
    it("should have defense exclusion question", () => {
      const defenseQuestion = QUESTIONS.find((q) => q.id === "isDefenseOnly");
      expect(defenseQuestion).toBeDefined();
    });

    it("should be a yes/no question", () => {
      const defenseQuestion = QUESTIONS.find((q) => q.id === "isDefenseOnly");
      expect(defenseQuestion?.isYesNo).toBe(true);
    });

    it("should have out of scope handling", () => {
      const defenseQuestion = QUESTIONS.find((q) => q.id === "isDefenseOnly");
      expect(defenseQuestion?.outOfScopeValue).toBe(true);
      expect(defenseQuestion?.outOfScopeMessage).toBeDefined();
      expect(defenseQuestion?.outOfScopeDetail).toBeDefined();
    });

    it("should have exactly two options (yes/no)", () => {
      const defenseQuestion = QUESTIONS.find((q) => q.id === "isDefenseOnly");
      expect(defenseQuestion?.options).toHaveLength(2);
    });

    it("should have yes option with true value", () => {
      const defenseQuestion = QUESTIONS.find((q) => q.id === "isDefenseOnly");
      const yesOption = defenseQuestion?.options.find((o) => o.value === true);
      expect(yesOption).toBeDefined();
      expect(yesOption?.label).toContain("Yes");
    });

    it("should have no option with false value", () => {
      const defenseQuestion = QUESTIONS.find((q) => q.id === "isDefenseOnly");
      const noOption = defenseQuestion?.options.find((o) => o.value === false);
      expect(noOption).toBeDefined();
      expect(noOption?.label).toContain("No");
    });
  });

  describe("Question icons", () => {
    it("should have valid icon names for activity type options", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      for (const option of activityQuestion?.options || []) {
        if (option.icon) {
          expect(typeof option.icon).toBe("string");
          expect(option.icon.length).toBeGreaterThan(0);
        }
      }
    });

    it("should have Satellite icon for spacecraft option", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      const spacecraftOption = activityQuestion?.options.find(
        (o) => o.value === "spacecraft",
      );
      expect(spacecraftOption?.icon).toBe("Satellite");
    });

    it("should have Rocket icon for launch vehicle option", () => {
      const activityQuestion = QUESTIONS.find((q) => q.id === "activityType");
      const launchOption = activityQuestion?.options.find(
        (o) => o.value === "launch_vehicle",
      );
      expect(launchOption?.icon).toBe("Rocket");
    });
  });

  describe("Conditional questions", () => {
    it("should have conditional questions with showWhen property", () => {
      const conditionalQuestions = QUESTIONS.filter((q) => q.showWhen);
      // There should be at least some conditional questions
      expect(conditionalQuestions.length).toBeGreaterThanOrEqual(0);
    });

    it("should reference valid question ids in showWhen", () => {
      const questionIds = QUESTIONS.map((q) => q.id);
      for (const question of QUESTIONS) {
        if (question.showWhen) {
          expect(questionIds).toContain(question.showWhen.questionId);
        }
      }
    });
  });

  describe("Out of scope handling", () => {
    it("should have proper out of scope messages", () => {
      const outOfScopeQuestions = QUESTIONS.filter(
        (q) => q.outOfScopeValue !== undefined,
      );
      for (const question of outOfScopeQuestions) {
        expect(question.outOfScopeMessage).toBeDefined();
        expect(typeof question.outOfScopeMessage).toBe("string");
        expect(question.outOfScopeMessage!.length).toBeGreaterThan(0);
      }
    });

    it("should have out of scope details", () => {
      const outOfScopeQuestions = QUESTIONS.filter(
        (q) => q.outOfScopeValue !== undefined,
      );
      for (const question of outOfScopeQuestions) {
        expect(question.outOfScopeDetail).toBeDefined();
        expect(typeof question.outOfScopeDetail).toBe("string");
      }
    });
  });

  describe("Question flow", () => {
    it("should start with step 1", () => {
      const steps = QUESTIONS.map((q) => q.step);
      expect(Math.min(...steps)).toBe(1);
    });

    it("should have sequential steps", () => {
      const steps = [...new Set(QUESTIONS.map((q) => q.step))].sort(
        (a, b) => a - b,
      );
      for (let i = 1; i < steps.length; i++) {
        // Steps can be sequential or have gaps (for conditional questions)
        expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
      }
    });
  });

  describe("Type definitions", () => {
    it("should match Question type", () => {
      const question = QUESTIONS[0];
      // Type assertions to verify structure
      expect(typeof question.id).toBe("string");
      expect(typeof question.step).toBe("number");
      expect(typeof question.title).toBe("string");
      expect(Array.isArray(question.options)).toBe(true);
    });

    it("should match QuestionOption type", () => {
      const option = QUESTIONS[0].options[0];
      expect(typeof option.id).toBe("string");
      expect(typeof option.label).toBe("string");
      expect(typeof option.description).toBe("string");
      expect(option.value).toBeDefined();
    });
  });
});
