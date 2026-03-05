import { describe, it, expect, vi } from "vitest";

vi.mock("./types", () => ({}));

import { suggestComplianceStatus } from "./auto-assess";

// Inline type to avoid importing from the mocked module
interface ComplianceRule {
  requiredTrue?: string[];
  requiredNotEmpty?: string[];
  numberThresholds?: Record<string, { min?: number; max?: number }>;
}

describe("suggestComplianceStatus (auto-assess)", () => {
  // ─── Null / undefined guards ───

  it("returns null when rule is undefined", () => {
    expect(suggestComplianceStatus(undefined, { field1: "yes" })).toBeNull();
  });

  it("returns null when responses is null", () => {
    const rule: ComplianceRule = { requiredTrue: ["field1"] };
    expect(suggestComplianceStatus(rule, null)).toBeNull();
  });

  it("returns null when responses are all empty/null/undefined", () => {
    const rule: ComplianceRule = { requiredTrue: ["field1"] };
    expect(
      suggestComplianceStatus(rule, {
        field1: null,
        field2: undefined,
        field3: "",
      }),
    ).toBeNull();
  });

  // ─── requiredTrue ───

  it('returns "compliant" when all requiredTrue fields are true', () => {
    const rule: ComplianceRule = { requiredTrue: ["a", "b"] };
    expect(suggestComplianceStatus(rule, { a: true, b: true })).toBe(
      "compliant",
    );
  });

  it('returns "non_compliant" when a requiredTrue field is false', () => {
    const rule: ComplianceRule = { requiredTrue: ["a", "b"] };
    expect(suggestComplianceStatus(rule, { a: true, b: false })).toBe(
      "non_compliant",
    );
  });

  // ─── requiredNotEmpty ───

  it('returns "compliant" when requiredNotEmpty fields are filled', () => {
    const rule: ComplianceRule = { requiredNotEmpty: ["name", "email"] };
    expect(
      suggestComplianceStatus(rule, { name: "Alice", email: "a@b.com" }),
    ).toBe("compliant");
  });

  it("returns null when requiredNotEmpty field is missing (no explicit fail)", () => {
    const rule: ComplianceRule = {
      requiredNotEmpty: ["name", "email"],
    };
    // name is present (so hasAnyResponse is true), email is missing
    expect(
      suggestComplianceStatus(rule, { name: "Alice", email: "" }),
    ).toBeNull();
  });

  // ─── numberThresholds ───

  it('returns "compliant" when numberThresholds pass (min/max)', () => {
    const rule: ComplianceRule = {
      numberThresholds: { score: { min: 0, max: 100 } },
    };
    expect(suggestComplianceStatus(rule, { score: 50 })).toBe("compliant");
  });

  it('returns "non_compliant" when number below min', () => {
    const rule: ComplianceRule = {
      numberThresholds: { score: { min: 10 } },
    };
    expect(suggestComplianceStatus(rule, { score: 5 })).toBe("non_compliant");
  });

  it('returns "non_compliant" when number above max', () => {
    const rule: ComplianceRule = {
      numberThresholds: { score: { max: 100 } },
    };
    expect(suggestComplianceStatus(rule, { score: 150 })).toBe("non_compliant");
  });

  // ─── supportPartial ───

  it('returns "partial" when supportPartial=true and some checks pass', () => {
    const rule: ComplianceRule = { requiredTrue: ["a", "b"] };
    // a is true (passes), b is undefined (does not pass, but not explicit fail)
    expect(
      suggestComplianceStatus(
        rule,
        { a: true, b: "other" },
        { supportPartial: true },
      ),
    ).toBe("partial");
  });

  it("returns null when supportPartial=false and some checks pass", () => {
    const rule: ComplianceRule = { requiredTrue: ["a", "b"] };
    expect(
      suggestComplianceStatus(
        rule,
        { a: true, b: "other" },
        { supportPartial: false },
      ),
    ).toBeNull();
  });

  // ─── Combined rules ───

  it("handles combined rules (requiredTrue + requiredNotEmpty + numberThresholds)", () => {
    const rule: ComplianceRule = {
      requiredTrue: ["approved"],
      requiredNotEmpty: ["name"],
      numberThresholds: { rating: { min: 1, max: 5 } },
    };
    expect(
      suggestComplianceStatus(rule, {
        approved: true,
        name: "Test Corp",
        rating: 3,
      }),
    ).toBe("compliant");
  });

  // ─── NaN number ───

  it("NaN number value does not pass threshold", () => {
    const rule: ComplianceRule = {
      numberThresholds: { score: { min: 0, max: 100 } },
    };
    // "abc" is not empty so hasAnyResponse is true, but Number("abc") is NaN
    // NaN does not pass, totalChecks=1, passedChecks=0, no explicit fail => null
    expect(suggestComplianceStatus(rule, { score: "abc" })).toBeNull();
  });
});
