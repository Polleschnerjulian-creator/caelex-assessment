import { describe, it, expect, vi } from "vitest";

vi.mock("@/data/debris-requirements", () => ({}));

import { suggestComplianceStatus } from "./debris-auto-assess";

// Inline type to avoid importing from the mocked module
interface ComplianceRule {
  requiredTrue?: string[];
  requiredNotEmpty?: string[];
  numberThresholds?: Record<string, { min?: number; max?: number }>;
}

describe("suggestComplianceStatus (debris-auto-assess)", () => {
  // ─── Null / undefined guards ───

  it("returns null when rule is undefined", () => {
    expect(suggestComplianceStatus(undefined, { field1: "yes" })).toBeNull();
  });

  it("returns null when responses is null", () => {
    const rule: ComplianceRule = { requiredTrue: ["field1"] };
    expect(suggestComplianceStatus(rule, null)).toBeNull();
  });

  it("returns null when all responses are empty", () => {
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

  it('returns "compliant" when all requiredTrue pass', () => {
    const rule: ComplianceRule = { requiredTrue: ["a", "b"] };
    expect(suggestComplianceStatus(rule, { a: true, b: true })).toBe(
      "compliant",
    );
  });

  it('returns "non_compliant" when requiredTrue is false', () => {
    const rule: ComplianceRule = { requiredTrue: ["a"] };
    expect(suggestComplianceStatus(rule, { a: false })).toBe("non_compliant");
  });

  it("returns null when requiredTrue is undefined (not explicitly false)", () => {
    const rule: ComplianceRule = { requiredTrue: ["a", "b"] };
    // a is true, b is undefined => allPass=false but no explicit fail => null
    // Need to ensure hasAnyResponse is true
    expect(suggestComplianceStatus(rule, { a: true })).toBeNull();
  });

  // ─── requiredNotEmpty ───

  it('returns "compliant" when requiredNotEmpty filled', () => {
    const rule: ComplianceRule = { requiredNotEmpty: ["name"] };
    expect(suggestComplianceStatus(rule, { name: "Satellite Co" })).toBe(
      "compliant",
    );
  });

  // ─── numberThresholds ───

  it('returns "compliant" when numberThresholds pass', () => {
    const rule: ComplianceRule = {
      numberThresholds: { altitude: { min: 200, max: 2000 } },
    };
    expect(suggestComplianceStatus(rule, { altitude: 500 })).toBe("compliant");
  });

  it('returns "non_compliant" when number fails threshold', () => {
    const rule: ComplianceRule = {
      numberThresholds: { altitude: { min: 200 } },
    };
    expect(suggestComplianceStatus(rule, { altitude: 100 })).toBe(
      "non_compliant",
    );
  });

  // ─── NaN ───

  it("NaN value means allPass=false but not explicit fail => returns null", () => {
    const rule: ComplianceRule = {
      numberThresholds: { score: { min: 0, max: 100 } },
    };
    // "xyz" is not empty so hasAnyResponse is true, Number("xyz") is NaN
    // allPass=false, anyExplicitFail=false => null
    expect(suggestComplianceStatus(rule, { score: "xyz" })).toBeNull();
  });

  // ─── Combined rules ───

  it("handles combined rules (requiredTrue + requiredNotEmpty + numberThresholds)", () => {
    const rule: ComplianceRule = {
      requiredTrue: ["hasTracker"],
      requiredNotEmpty: ["operatorName"],
      numberThresholds: { deorbitYears: { max: 25 } },
    };
    expect(
      suggestComplianceStatus(rule, {
        hasTracker: true,
        operatorName: "SpaceCorp",
        deorbitYears: 10,
      }),
    ).toBe("compliant");
  });
});
