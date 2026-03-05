import { describe, it, expect } from "vitest";
import { getAuthorizationApplicationTemplate } from "./c1-authorization-application";

describe("getAuthorizationApplicationTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getAuthorizationApplicationTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code C1", () => {
    const result = getAuthorizationApplicationTemplate();
    expect(result).toContain("C1");
  });

  it("references Art. 4-12 for authorization", () => {
    const result = getAuthorizationApplicationTemplate();
    expect(result).toContain("Art. 4");
    expect(result).toContain("Art. 4-12");
  });

  it("contains key SECTION markers", () => {
    const result = getAuthorizationApplicationTemplate();
    expect(result).toContain("## SECTION: Cover Letter");
    expect(result).toContain("## SECTION: Operator Profile");
    expect(result).toContain("## SECTION: Mission Description");
    expect(result).toContain("## SECTION: Compliance Summary");
    expect(result).toContain("## SECTION: Authorization Checklist");
    expect(result).toContain("## SECTION: Supporting Documents Index");
    expect(result).toContain("## SECTION: Certification Statement");
  });

  it("references all document series (A, B, C)", () => {
    const result = getAuthorizationApplicationTemplate();
    expect(result).toContain("A-series");
    expect(result).toContain("B-series");
    expect(result).toContain("C-series");
  });

  it("covers debris, cybersecurity, environmental, and insurance areas", () => {
    const result = getAuthorizationApplicationTemplate();
    expect(result).toContain("Debris Mitigation");
    expect(result).toContain("Cybersecurity");
    expect(result).toContain("Environmental");
    expect(result).toContain("Insurance");
  });
});
