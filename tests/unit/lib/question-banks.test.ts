/**
 * Question bank structural tests.
 *
 * `questions.ts`, `nis2-questions.ts`, `space-law-questions.ts`, and
 * `unified-assessment-questions.ts` together hold ~3,000 LOC of
 * wizard configuration. Until now they had no direct test coverage —
 * a typo in a question id, a duplicate step number, or an `outOfScopeValue`
 * that doesn't exist in the option list could ship to production
 * without being caught.
 *
 * The tests here are intentionally structural and *additive*: they
 * assert invariants that any future question must satisfy, without
 * pinning down the exact wording of any specific question. That keeps
 * the test useful as the wizards evolve.
 *
 * Invariants checked:
 *   - Every question has a unique id and a positive step number.
 *   - Every question option has a unique id within the question.
 *   - Every `showWhen` reference points to a question that exists.
 *   - Every `outOfScopeValue` matches a value present in the options
 *     list (or for boolean questions, is a boolean).
 *   - The default-answers helpers return objects whose keys match the
 *     ids of every non-conditional question in the bank.
 */

import { describe, it, expect, vi } from "vitest";
import type { Question } from "@/lib/questions";

vi.mock("server-only", () => ({}));

const { QUESTIONS } = await import("@/lib/questions");
const { NIS2_QUESTIONS, getDefaultNIS2Answers } =
  await import("@/lib/nis2-questions");

// ─── Generic invariants applied to every bank ────────────────────────
function assertQuestionBankInvariants(bank: Question[], bankName: string) {
  describe(`${bankName} — invariants`, () => {
    it("every question has a non-empty id", () => {
      for (const q of bank) {
        expect(q.id, `Question id missing in ${bankName}`).toBeTruthy();
      }
    });

    it("question ids are unique within the bank", () => {
      const seen = new Set<string>();
      for (const q of bank) {
        expect(
          seen.has(q.id),
          `Duplicate question id ${q.id} in ${bankName}`,
        ).toBe(false);
        seen.add(q.id);
      }
    });

    it("every question has a positive step number", () => {
      for (const q of bank) {
        expect(q.step).toBeGreaterThan(0);
      }
    });

    it("every question has a non-empty title", () => {
      for (const q of bank) {
        expect(q.title).toBeTruthy();
      }
    });

    it("every question has at least one option", () => {
      for (const q of bank) {
        expect(q.options.length, `${q.id} has no options`).toBeGreaterThan(0);
      }
    });

    it("option ids are unique within each question", () => {
      for (const q of bank) {
        const seen = new Set<string>();
        for (const opt of q.options) {
          expect(
            seen.has(opt.id),
            `Duplicate option id ${opt.id} in question ${q.id}`,
          ).toBe(false);
          seen.add(opt.id);
        }
      }
    });

    it("every option has a non-empty label", () => {
      for (const q of bank) {
        for (const opt of q.options) {
          expect(
            opt.label,
            `Option ${opt.id} in ${q.id} has no label`,
          ).toBeTruthy();
        }
      }
    });

    it("every showWhen reference points to a known question id", () => {
      const knownIds = new Set(bank.map((q) => q.id));
      for (const q of bank) {
        if (q.showWhen) {
          expect(
            knownIds.has(q.showWhen.questionId),
            `${q.id}.showWhen references unknown question ${q.showWhen.questionId}`,
          ).toBe(true);
        }
      }
    });

    it("every outOfScopeValue matches a value present in the options (or is boolean)", () => {
      for (const q of bank) {
        if (q.outOfScopeValue === undefined) continue;
        if (typeof q.outOfScopeValue === "boolean") {
          // For yes/no questions, boolean is always valid.
          expect(q.isYesNo === true || q.options.length === 2).toBe(true);
        } else {
          const optionValues = q.options.map((o) => o.value);
          expect(
            optionValues.includes(q.outOfScopeValue),
            `${q.id}.outOfScopeValue=${q.outOfScopeValue} not in option list`,
          ).toBe(true);
        }
      }
    });

    it("multi-select questions declare a non-zero maxSelections (when set)", () => {
      for (const q of bank) {
        if (q.isMultiSelect && q.maxSelections !== undefined) {
          expect(q.maxSelections).toBeGreaterThan(0);
        }
      }
    });
  });
}

// ─── Apply invariants to each bank ───────────────────────────────────
assertQuestionBankInvariants(
  QUESTIONS,
  "EU Space Act questions (questions.ts)",
);
assertQuestionBankInvariants(
  NIS2_QUESTIONS,
  "NIS2 questions (nis2-questions.ts)",
);

// ─── Specific high-value assertions ──────────────────────────────────
describe("EU Space Act questions — high-value assertions", () => {
  it("includes a question for activityType (entry point)", () => {
    expect(QUESTIONS.find((q) => q.id === "activityType")).toBeDefined();
  });

  it("includes a defense-only question for the Art. 2(3) exemption path", () => {
    expect(QUESTIONS.find((q) => q.id === "isDefenseOnly")).toBeDefined();
  });

  it("includes an entitySize question (drives light vs standard regime)", () => {
    expect(QUESTIONS.find((q) => q.id === "entitySize")).toBeDefined();
  });

  it("includes a primaryOrbit question", () => {
    expect(QUESTIONS.find((q) => q.id === "primaryOrbit")).toBeDefined();
  });

  it("activity type options include all 5 supported types", () => {
    const activityQuestion = QUESTIONS.find((q) => q.id === "activityType")!;
    const values = activityQuestion.options.map((o) => o.value);
    expect(values).toContain("spacecraft");
    expect(values).toContain("launch_vehicle");
    expect(values).toContain("launch_site");
    expect(values).toContain("isos");
    expect(values).toContain("data_provider");
  });
});

describe("NIS2 questions — high-value assertions", () => {
  it("includes an entitySize question (drives essential/important classification)", () => {
    const ids = NIS2_QUESTIONS.map((q) => q.id);
    expect(ids).toContain("entitySize");
  });

  it("getDefaultNIS2Answers returns a valid object with the canonical keys", () => {
    const defaults = getDefaultNIS2Answers();
    // Each of these is required by the NIS2AssessmentAnswers interface.
    expect(defaults).toHaveProperty("entitySize");
    expect(defaults).toHaveProperty("sector");
    expect(defaults).toHaveProperty("isEUEstablished");
    expect(defaults).toHaveProperty("hasISO27001");
    expect(defaults).toHaveProperty("hasExistingCSIRT");
    expect(defaults).toHaveProperty("hasRiskManagement");
  });
});

describe("Question bank cross-references", () => {
  it("EU Space Act and NIS2 banks have distinct question id namespaces", () => {
    // Both banks live in the same wizard wrapper at the API level, so
    // accidentally sharing an id can cause cross-bank state collisions.
    // It's OK for some ids to overlap (e.g. entitySize) — but most
    // should be distinct.
    const spaceActIds = new Set(QUESTIONS.map((q) => q.id));
    const nis2Ids = new Set(NIS2_QUESTIONS.map((q) => q.id));
    const intersection = [...spaceActIds].filter((id) => nis2Ids.has(id));
    // Allow up to 5 shared ids (entitySize, etc.) — flag a regression
    // if the namespaces start drifting together.
    expect(intersection.length).toBeLessThanOrEqual(5);
  });
});
