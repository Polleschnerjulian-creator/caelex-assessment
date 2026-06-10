// Task 1.3 — tri-state answer Zod layer. These tests codify the binding
// unsure-encoding convention (see answers.ts header): `{state:"unsure"}` is
// THE storage representation of unsure; it carries no value; `not_asked` is
// a distinct explicit state; unknown question ids never validate.
import { describe, expect, it } from "vitest";

import {
  answeredValue,
  buildAnswerMapSchema,
  isAnswered,
  triStateAnswerSchema,
  type AnswerMap,
  type TriStateAnswer,
} from "./answers";

describe("triStateAnswerSchema", () => {
  it("accepts an answered string value", () => {
    const r = triStateAnswerSchema.safeParse({
      state: "answered",
      value: "commercial",
    });
    expect(r.success).toBe(true);
  });

  it("accepts an answered string-array value (multi-select)", () => {
    const r = triStateAnswerSchema.safeParse({
      state: "answered",
      value: ["spacecraft_operator", "launch_provider"],
    });
    expect(r.success).toBe(true);
  });

  it("accepts answered boolean and number values", () => {
    expect(
      triStateAnswerSchema.safeParse({ state: "answered", value: true })
        .success,
    ).toBe(true);
    expect(
      triStateAnswerSchema.safeParse({ state: "answered", value: 42 }).success,
    ).toBe(true);
  });

  it("accepts the bare unsure state", () => {
    expect(triStateAnswerSchema.safeParse({ state: "unsure" }).success).toBe(
      true,
    );
  });

  it("accepts the bare not_asked state", () => {
    expect(triStateAnswerSchema.safeParse({ state: "not_asked" }).success).toBe(
      true,
    );
  });

  it("rejects unsure carrying a value (unsure carries NO value — binding convention)", () => {
    const r = triStateAnswerSchema.safeParse({ state: "unsure", value: "x" });
    expect(r.success).toBe(false);
  });

  it("rejects not_asked carrying a value", () => {
    const r = triStateAnswerSchema.safeParse({
      state: "not_asked",
      value: "x",
    });
    expect(r.success).toBe(false);
  });

  it("rejects answered without a value", () => {
    const r = triStateAnswerSchema.safeParse({ state: "answered" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown states and value-only objects", () => {
    expect(triStateAnswerSchema.safeParse({ state: "maybe" }).success).toBe(
      false,
    );
    expect(triStateAnswerSchema.safeParse({ value: "yes" }).success).toBe(
      false,
    );
  });

  it("rejects answered with non-supported value shapes (null, object, mixed array)", () => {
    expect(
      triStateAnswerSchema.safeParse({ state: "answered", value: null })
        .success,
    ).toBe(false);
    expect(
      triStateAnswerSchema.safeParse({ state: "answered", value: { a: 1 } })
        .success,
    ).toBe(false);
    expect(
      triStateAnswerSchema.safeParse({ state: "answered", value: ["a", 1] })
        .success,
    ).toBe(false);
  });
});

describe("buildAnswerMapSchema", () => {
  const knownIds: ReadonlySet<string> = new Set([
    "q1_1_roles",
    "q1_9_defense_exclusivity",
    "q3_6_launch_timing",
  ]);
  const schema = buildAnswerMapSchema(knownIds);

  it("accepts a map whose keys are all known question ids", () => {
    const map: AnswerMap = {
      q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
      q1_9_defense_exclusivity: { state: "unsure" },
      q3_6_launch_timing: { state: "not_asked" },
    };
    const r = schema.safeParse(map);
    expect(r.success).toBe(true);
  });

  it("rejects a map containing an unknown question id, naming it", () => {
    const r = schema.safeParse({
      q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
      q_does_not_exist: { state: "unsure" },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find(
        (i) => i.path[0] === "q_does_not_exist",
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("q_does_not_exist");
    }
  });

  it("rejects a map whose value violates the tri-state shape", () => {
    const r = schema.safeParse({
      q1_1_roles: { state: "unsure", value: "smuggled" },
    });
    expect(r.success).toBe(false);
  });

  it("accepts the empty map (requiredness is validateSubmission's job, Task 1.4)", () => {
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("round-trips serialize/parse losslessly across all three states and all value shapes", () => {
    const original: AnswerMap = {
      q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
      q1_9_defense_exclusivity: { state: "answered", value: "dual_use" },
      q3_6_launch_timing: { state: "unsure" },
    };
    const revived = schema.parse(JSON.parse(JSON.stringify(original)));
    expect(revived).toEqual(original);

    // Boolean + number value shapes round-trip too (validated standalone —
    // the id set above is string/multi questions).
    const bool: TriStateAnswer = { state: "answered", value: false };
    const num: TriStateAnswer = { state: "answered", value: 7 };
    expect(
      triStateAnswerSchema.parse(JSON.parse(JSON.stringify(bool))),
    ).toEqual(bool);
    expect(triStateAnswerSchema.parse(JSON.parse(JSON.stringify(num)))).toEqual(
      num,
    );
  });
});

describe("isAnswered / answeredValue", () => {
  const map: AnswerMap = {
    answered_q: { state: "answered", value: "yes" },
    multi_q: { state: "answered", value: ["a", "b"] },
    unsure_q: { state: "unsure" },
    skipped_q: { state: "not_asked" },
  };

  it("isAnswered narrows only the answered variant", () => {
    expect(isAnswered(map.answered_q)).toBe(true);
    expect(isAnswered(map.unsure_q)).toBe(false);
    expect(isAnswered(map.skipped_q)).toBe(false);
    expect(isAnswered(undefined)).toBe(false);

    const a = map.answered_q;
    if (isAnswered(a)) {
      // Type-level: `value` is accessible after narrowing.
      expect(a.value).toBe("yes");
    } else {
      throw new Error("expected answered narrowing");
    }
  });

  it("answeredValue returns the value for answered questions only", () => {
    expect(answeredValue(map, "answered_q")).toBe("yes");
    expect(answeredValue(map, "multi_q")).toEqual(["a", "b"]);
  });

  it("answeredValue yields undefined for unsure — never coerced to a value (binding convention)", () => {
    expect(answeredValue(map, "unsure_q")).toBeUndefined();
  });

  it("answeredValue yields undefined for not_asked and missing ids", () => {
    expect(answeredValue(map, "skipped_q")).toBeUndefined();
    expect(answeredValue(map, "never_stored_q")).toBeUndefined();
  });
});
