import { describe, it, expect } from "vitest";
import { applyAutoFixes } from "./auto-fix";
import type { ParsedSection } from "./parse-sections";
import type { ConsistencyFinding } from "./consistency-check";

describe("applyAutoFixes", () => {
  it("replaces inconsistent numbers with the canonical value", () => {
    const sections: ParsedSection[] = [
      {
        title: "Section 1",
        content: [{ type: "text", value: "Altitude is 550km." }],
      },
      {
        title: "Section 2",
        content: [
          { type: "text", value: "Operating at approximately 520km altitude." },
        ],
      },
    ];
    const findings: ConsistencyFinding[] = [
      {
        id: "f-1",
        category: "internal",
        severity: "error",
        documentType: "DMP",
        sectionIndex: 1,
        title: "Number inconsistency",
        description: "Altitude: 520km in Section 2 vs 550km in Section 1",
        autoFixable: true,
        autoFixDescription: "Replace 520km with 550km in Section 2",
      },
    ];

    const result = applyAutoFixes(sections, findings, { altitudeKm: 550 });
    const section2Text = result.updatedSections[1].content
      .filter((c): c is { type: "text"; value: string } => c.type === "text")
      .map((c) => c.value)
      .join(" ");
    expect(section2Text).toContain("550");
    expect(section2Text).not.toContain("520");
    expect(result.appliedFixes.length).toBe(1);
  });

  it("does not mutate original sections", () => {
    const sections: ParsedSection[] = [
      {
        title: "Test",
        content: [{ type: "text", value: "At 520km altitude." }],
      },
    ];
    const findings: ConsistencyFinding[] = [
      {
        id: "f-1",
        category: "internal",
        severity: "error",
        documentType: "DMP",
        sectionIndex: 0,
        title: "Number fix",
        description: "Fix altitude",
        autoFixable: true,
        autoFixDescription: "Replace 520km with 550km",
      },
    ];

    applyAutoFixes(sections, findings, { altitudeKm: 550 });
    expect(sections[0].content[0]).toEqual({
      type: "text",
      value: "At 520km altitude.",
    });
  });

  it("skips non-autoFixable findings", () => {
    const sections: ParsedSection[] = [
      { title: "Test", content: [{ type: "text", value: "Some content." }] },
    ];
    const findings: ConsistencyFinding[] = [
      {
        id: "f-1",
        category: "internal",
        severity: "warning",
        documentType: "DMP",
        sectionIndex: 0,
        title: "Not fixable",
        description: "Manual review needed",
        autoFixable: false,
        autoFixDescription: null,
      },
    ];

    const result = applyAutoFixes(sections, findings, {});
    expect(result.appliedFixes.length).toBe(0);
    expect(result.updatedSections[0].content[0]).toEqual({
      type: "text",
      value: "Some content.",
    });
  });

  it("normalizes article reference formats", () => {
    const sections: ParsedSection[] = [
      {
        title: "Test",
        content: [
          {
            type: "text",
            value:
              "Article 72 requires compliance. Per Article 67(1)(a) debris must be mitigated.",
          },
        ],
      },
    ];
    const findings: ConsistencyFinding[] = [
      {
        id: "f-1",
        category: "formatting",
        severity: "warning",
        documentType: "DMP",
        sectionIndex: 0,
        title: "Article format",
        description: "Inconsistent format: 'Article 72' should be 'Art. 72'",
        autoFixable: true,
        autoFixDescription: "Normalize 'Article X' to 'Art. X'",
      },
    ];

    const result = applyAutoFixes(sections, findings, {});
    const text = result.updatedSections[0].content
      .filter((c): c is { type: "text"; value: string } => c.type === "text")
      .map((c) => c.value)
      .join(" ");
    expect(text).toContain("Art. 72");
    expect(text).toContain("Art. 67(1)(a)");
    expect(text).not.toContain("Article 72");
  });
});
