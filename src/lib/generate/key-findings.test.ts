import { describe, it, expect } from "vitest";
import { extractKeyFindings, formatPackageContext } from "./key-findings";
import type { ParsedSection } from "./parse-sections";
import type { NCADocumentType } from "./types";

const mockSections: ParsedSection[] = [
  {
    title: "Executive Summary",
    content: [
      {
        type: "text",
        value:
          "The orbital lifetime analysis confirms 25-year compliance with a predicted decay of 18.3 years under mean solar conditions.",
      },
    ],
  },
  {
    title: "25-Year Compliance Assessment",
    content: [
      {
        type: "text",
        value:
          "Based on the analysis, the spacecraft demonstrates compliance with Art. 72(2) of the EU Space Act.",
      },
      {
        type: "table",
        headers: ["Parameter", "Value"],
        rows: [
          ["Predicted Decay", "18.3 years"],
          ["Compliance", "Yes"],
        ],
      },
    ],
  },
];

describe("extractKeyFindings", () => {
  it("extracts compliance determination from executive summary", () => {
    const findings = extractKeyFindings(
      "ORBITAL_LIFETIME" as NCADocumentType,
      mockSections,
    );
    expect(findings.length).toBeGreaterThan(0);
    const complianceFindings = findings.filter(
      (f) => f.findingType === "compliance_determination",
    );
    expect(complianceFindings.length).toBeGreaterThan(0);
  });

  it("extracts quantitative results from tables", () => {
    const findings = extractKeyFindings(
      "ORBITAL_LIFETIME" as NCADocumentType,
      mockSections,
    );
    const quantFindings = findings.filter(
      (f) => f.findingType === "quantitative_result",
    );
    expect(quantFindings.length).toBeGreaterThan(0);
    expect(quantFindings.some((f) => f.summary.includes("18.3"))).toBe(true);
  });

  it("includes referenceable document citation", () => {
    const findings = extractKeyFindings(
      "ORBITAL_LIFETIME" as NCADocumentType,
      mockSections,
    );
    expect(
      findings.every((f) => f.referenceable.includes("ORBITAL_LIFETIME")),
    ).toBe(true);
  });

  it("returns empty for empty sections", () => {
    const findings = extractKeyFindings("DMP" as NCADocumentType, []);
    expect(findings).toEqual([]);
  });
});

describe("formatPackageContext", () => {
  it("formats findings into a prompt context block", () => {
    const findings = [
      {
        documentType: "ORBITAL_LIFETIME" as NCADocumentType,
        keyFindings: [
          {
            sectionIndex: 1,
            sectionTitle: "25-Year Compliance",
            findingType: "compliance_determination" as const,
            summary:
              "25-year compliance confirmed with 18.3-year predicted decay",
            referenceable: "Document ORBITAL_LIFETIME, Section 2",
          },
        ],
      },
    ];
    const context = formatPackageContext(findings);
    expect(context).toContain("CROSS-REFERENCE DATA");
    expect(context).toContain("ORBITAL_LIFETIME");
    expect(context).toContain("18.3");
    expect(context).toContain("SPECIFIC findings");
  });

  it("returns empty string for no findings", () => {
    expect(formatPackageContext([])).toBe("");
  });
});
