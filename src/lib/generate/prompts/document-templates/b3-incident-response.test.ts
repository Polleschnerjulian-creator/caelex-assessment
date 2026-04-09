import { describe, it, expect } from "vitest";
import { getIncidentResponseTemplate } from "./b3-incident-response";

describe("getIncidentResponseTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getIncidentResponseTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code B3-IRP", () => {
    const result = getIncidentResponseTemplate();
    expect(result).toContain("B3");
    expect(result).toContain("IRP");
  });

  it("references Art. 89-92 for incident response", () => {
    const result = getIncidentResponseTemplate();
    expect(result).toContain("Art. 89");
    expect(result).toContain("Art. 90");
    expect(result).toContain("Art. 91");
    expect(result).toContain("Art. 92");
  });

  it("contains the notification timeline (24h/72h/1mo)", () => {
    const result = getIncidentResponseTemplate();
    expect(result).toContain("24-hour");
    expect(result).toContain("72-hour");
    expect(result).toContain("1-month");
  });

  it("contains SECTION markers for required sections", () => {
    const result = getIncidentResponseTemplate();
    expect(result).toContain("## SECTION: Cover Page & Document Control");
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Incident Classification Framework");
    expect(result).toContain("## SECTION: Detection & Identification");
    expect(result).toContain("## SECTION: Containment & Eradication");
    expect(result).toContain(
      "## SECTION: NCA Notification Procedures (NIS2 Art. 23 / proposal Art. 90-92)",
    );
  });

  it("references NIS2 Art. 23 notification requirements", () => {
    const result = getIncidentResponseTemplate();
    expect(result).toContain("NIS2");
    expect(result).toContain("Art. 23");
  });

  it("includes testing and exercises section", () => {
    const result = getIncidentResponseTemplate();
    expect(result).toContain("## SECTION: Testing & Exercises");
    expect(result).toContain("Art. 89(5)");
  });
});
