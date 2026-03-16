import { describe, it, expect } from "vitest";
import {
  runDeterministicChecks,
  buildConsistencyCheckPrompt,
} from "./consistency-check";
import type { ParsedSection } from "./parse-sections";

const mockSections: ParsedSection[] = [
  {
    title: "Executive Summary",
    content: [
      {
        type: "text",
        value: "The spacecraft operates at 550km altitude in LEO orbit.",
      },
      { type: "text", value: "Compliance status: Compliant with Art. 72." },
    ],
  },
  {
    title: "Orbital Parameters",
    content: [
      {
        type: "text",
        value: "The operational altitude is approximately 520km.",
      },
      {
        type: "text",
        value:
          "See Document A4 — End-of-Life Disposal Plan, Section 4.2 for disposal details.",
      },
    ],
  },
  {
    title: "Compliance Matrix",
    content: [
      {
        type: "table",
        headers: ["Requirement", "Status"],
        rows: [["Art. 72", "Non-Compliant"]],
      },
    ],
  },
];

describe("runDeterministicChecks", () => {
  it("detects number inconsistencies between sections", () => {
    const findings = runDeterministicChecks(mockSections, "DMP");
    const numberFindings = findings.filter(
      (f) =>
        f.category === "internal" && f.title.toLowerCase().includes("number"),
    );
    expect(numberFindings.length).toBeGreaterThan(0);
    // 550km vs 520km should be flagged
    expect(
      numberFindings.some(
        (f) => f.description.includes("550") || f.description.includes("520"),
      ),
    ).toBe(true);
  });

  it("detects compliance status contradictions", () => {
    const findings = runDeterministicChecks(mockSections, "DMP");
    const contradictions = findings.filter(
      (f) =>
        f.category === "internal" &&
        f.description.toLowerCase().includes("contradict"),
    );
    // "Compliant" in text but "Non-Compliant" in matrix for same article
    expect(contradictions.length).toBeGreaterThan(0);
  });

  it("validates cross-reference format", () => {
    const findings = runDeterministicChecks(mockSections, "DMP");
    // "See Document A4" is valid format — should NOT flag it
    const crossRefErrors = findings.filter(
      (f) => f.category === "formatting" && f.description.includes("A4"),
    );
    expect(crossRefErrors.length).toBe(0);
  });

  it("detects inconsistent article reference formats", () => {
    const sectionsWithBadRefs: ParsedSection[] = [
      {
        title: "Test",
        content: [
          { type: "text", value: "Per Art. 72(2) the requirement is met." },
          {
            type: "text",
            value: "Article 72 paragraph 2 also requires disposal.",
          },
        ],
      },
    ];
    const findings = runDeterministicChecks(sectionsWithBadRefs, "DMP");
    const formatFindings = findings.filter((f) => f.category === "formatting");
    expect(formatFindings.length).toBeGreaterThan(0);
  });

  it("flags unresolved EVIDENCE markers", () => {
    const sectionsWithEvidence: ParsedSection[] = [
      {
        title: "Test",
        content: [
          {
            type: "text",
            value:
              "The analysis is supported by [EVIDENCE: STELA propagation report].",
          },
        ],
      },
    ];
    const findings = runDeterministicChecks(sectionsWithEvidence, "DMP");
    const evidenceFindings = findings.filter((f) => f.category === "evidence");
    expect(evidenceFindings.length).toBeGreaterThan(0);
  });

  it("flags ACTION REQUIRED markers count", () => {
    const sectionsWithActions: ParsedSection[] = [
      {
        title: "Test",
        content: [
          { type: "text", value: "[ACTION REQUIRED: Insert spacecraft mass]" },
          { type: "text", value: "[ACTION REQUIRED: Insert drag coefficient]" },
        ],
      },
    ];
    const findings = runDeterministicChecks(sectionsWithActions, "DMP");
    const actionFindings = findings.filter(
      (f) => f.severity === "info" && f.description.includes("ACTION REQUIRED"),
    );
    expect(actionFindings.length).toBeGreaterThan(0);
  });

  it("returns empty array for clean content", () => {
    const cleanSections: ParsedSection[] = [
      {
        title: "Test",
        content: [
          {
            type: "text",
            value:
              "The spacecraft operates at 550km. Per Art. 72(2), compliance is demonstrated.",
          },
        ],
      },
    ];
    const findings = runDeterministicChecks(cleanSections, "DMP");
    // Should have no errors (maybe some info-level findings)
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.length).toBe(0);
  });
});

describe("buildConsistencyCheckPrompt", () => {
  it("includes document content in the prompt", () => {
    const prompt = buildConsistencyCheckPrompt(mockSections, "DMP", null, []);
    expect(prompt).toContain("Executive Summary");
    expect(prompt).toContain("550km");
  });

  it("includes related document summaries when provided", () => {
    const prompt = buildConsistencyCheckPrompt(mockSections, "DMP", null, [
      { type: "EOL_DISPOSAL", summary: "Controlled re-entry from 550km" },
    ]);
    expect(prompt).toContain("EOL_DISPOSAL");
    expect(prompt).toContain("Controlled re-entry");
  });

  it("includes FINDING output format instruction", () => {
    const prompt = buildConsistencyCheckPrompt(mockSections, "DMP", null, []);
    expect(prompt).toContain("FINDING|");
  });
});
