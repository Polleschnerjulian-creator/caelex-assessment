/**
 * Task 3.2 — credit map. Binding assertions:
 *  - ISO 27001 → Art 21 measure areas "partially evidenced" (never "compliant");
 *  - existing national license (Q4.4) → brownfield credit;
 *  - absent/unsure/unknown inputs emit NOTHING (no fabricated credits).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeCreditMap } from "./credit-map.server";
import type { AnswerMap } from "./answers";

const answered = (value: string | string[] | boolean | number) => ({
  state: "answered" as const,
  value,
});

describe("computeCreditMap", () => {
  it("ISO 27001 → Art 21 measure areas, honestly framed as partial evidence", () => {
    const answers: AnswerMap = {
      q6_7_certifications: answered(["iso_27001"]),
    };
    const credits = computeCreditMap(answers);
    expect(credits).toHaveLength(1);
    expect(credits[0].source).toBe("ISO/IEC 27001");
    expect(credits[0].covers).toContain("risk_assessment");
    expect(credits[0].covers).toContain("cryptography");
    expect(credits[0].basis).toMatch(/partially evidenced/i);
    expect(credits[0].basis).not.toMatch(/\bcompliant\b/i);
  });

  it("existing national license → brownfield authorization credit", () => {
    const answers: AnswerMap = {
      q4_4_licenses_held: answered(["fr_los"]),
    };
    const credits = computeCreditMap(answers);
    expect(credits).toHaveLength(1);
    expect(credits[0].source).toMatch(/French LOS/);
    expect(credits[0].covers).toEqual(["authorization_registration"]);
    expect(credits[0].basis).toMatch(/COM\(2025\) 335 Arts\. 118–119/);
  });

  it("certs and licenses combine; 'none' and unknown values emit nothing", () => {
    const answers: AnswerMap = {
      q6_7_certifications: answered(["cyfun", "iso_9001", "other"]),
      q4_4_licenses_held: answered(["none", "atlantis_base"]),
    };
    const credits = computeCreditMap(answers);
    // cyfun is mapped; iso_9001/other have no NIS2 credit; none/unknown license → nothing
    expect(credits).toHaveLength(1);
    expect(credits[0].source).toMatch(/CyberFundamentals/);
  });

  it("unsure or absent answers fabricate no credit", () => {
    expect(computeCreditMap({})).toEqual([]);
    expect(
      computeCreditMap({
        q6_7_certifications: { state: "unsure" },
        q4_4_licenses_held: { state: "not_asked" },
      }),
    ).toEqual([]);
  });
});
