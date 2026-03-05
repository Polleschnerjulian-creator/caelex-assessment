import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDoc, mockAutoTable } = vi.hoisted(() => {
  const mockDoc = {
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    getTextWidth: vi.fn(() => 20),
    splitTextToSize: vi.fn((text: string) => [text]),
    addPage: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    output: vi.fn(() => new Blob(["mock-pdf"], { type: "application/pdf" })),
    save: vi.fn(),
    getNumberOfPages: vi.fn(() => 1),
    setPage: vi.fn(),
    lastAutoTable: { finalY: 100 } as { finalY: number } | undefined,
  };
  const mockAutoTable = vi.fn();
  return { mockDoc, mockAutoTable };
});

vi.mock("jspdf", () => ({
  jsPDF: function () {
    return mockDoc;
  },
}));

vi.mock("jspdf-autotable", () => ({
  default: mockAutoTable,
}));

import { generateDocumentPDF } from "./jspdf-generator";
import type { ReportSection } from "./types";

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.lastAutoTable = { finalY: 100 };
});

describe("generateDocumentPDF", () => {
  it("returns a Blob", () => {
    const result = generateDocumentPDF("Test Report", []);
    expect(result).toBeInstanceOf(Blob);
  });

  it("calls jsPDF constructor and renders header", () => {
    generateDocumentPDF("My Title", []);
    expect(mockDoc.setFontSize).toHaveBeenCalled();
    expect(mockDoc.setTextColor).toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalled();
  });

  it("renders a text section", () => {
    const sections: ReportSection[] = [
      {
        title: "Section 1",
        content: [{ type: "text", value: "Hello World" }],
      },
    ];
    generateDocumentPDF("Report", sections);
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.flatMap((call: any) => {
      if (Array.isArray(call[0])) return call[0];
      return [call[0]];
    });
    expect(
      allTexts.some(
        (t: string) => typeof t === "string" && t.includes("Section"),
      ),
    ).toBe(true);
  });

  it("renders heading with level 2", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "heading", value: "H2 Title", level: 2 }],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockDoc.setFont).toHaveBeenCalledWith("helvetica", "bold");
    expect(mockDoc.setFontSize).toHaveBeenCalledWith(12);
  });

  it("renders heading with level 3", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "heading", value: "H3 Title", level: 3 }],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockDoc.setFontSize).toHaveBeenCalledWith(11);
  });

  it("renders an ordered list with numbers", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "list", items: ["First", "Second"], ordered: true }],
      },
    ];
    generateDocumentPDF("Report", sections);
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.flatMap((call: any) => {
      if (Array.isArray(call[0])) return call[0];
      return [String(call[0])];
    });
    expect(allTexts.some((t: string) => t.includes("1."))).toBe(true);
  });

  it("renders an unordered list with bullets", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "list", items: ["Alpha", "Beta"], ordered: false }],
      },
    ];
    generateDocumentPDF("Report", sections);
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.flatMap((call: any) => {
      if (Array.isArray(call[0])) return call[0];
      return [String(call[0])];
    });
    expect(allTexts.some((t: string) => t.includes("\u2022"))).toBe(true);
  });

  it("renders empty list without error", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "list", items: [] }],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders a table via autoTable", () => {
    mockAutoTable.mockClear();
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          {
            type: "table",
            headers: ["Name", "Value"],
            rows: [["A", "1"]],
          },
        ],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it("handles table with no lastAutoTable finalY", () => {
    mockDoc.lastAutoTable = undefined;
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          {
            type: "table",
            headers: ["H"],
            rows: [["V"]],
          },
        ],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders empty table without calling autoTable", () => {
    mockAutoTable.mockClear();
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          {
            type: "table",
            headers: [],
            rows: [],
          },
        ],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockAutoTable).not.toHaveBeenCalled();
  });

  it("renders keyValue items", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          {
            type: "keyValue",
            items: [
              { key: "Name", value: "SpaceCo" },
              { key: "Score", value: "85" },
            ],
          },
        ],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockDoc.setFont).toHaveBeenCalledWith("helvetica", "bold");
    expect(mockDoc.line).toHaveBeenCalled();
  });

  it("renders empty keyValue without error", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "keyValue", items: [] }],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders info alert with correct background", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "alert", severity: "info", message: "All good" }],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockDoc.roundedRect).toHaveBeenCalled();
    expect(mockDoc.setFillColor).toHaveBeenCalled();
  });

  it("renders warning alert", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          { type: "alert", severity: "warning", message: "Be careful" },
        ],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockDoc.roundedRect).toHaveBeenCalled();
  });

  it("renders error alert", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "alert", severity: "error", message: "Failure" }],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockDoc.roundedRect).toHaveBeenCalled();
  });

  it("renders empty alert message without error", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "alert", severity: "info", message: "" }],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders divider", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "divider" }],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockDoc.line).toHaveBeenCalled();
  });

  it("renders spacer with specified height", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "spacer", height: 20 }],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders spacer without height using default", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "spacer" }],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("handles multiple sections", () => {
    const sections: ReportSection[] = [
      {
        title: "Section A",
        content: [{ type: "text", value: "Content A" }],
      },
      {
        title: "Section B",
        content: [{ type: "text", value: "Content B" }],
      },
    ];
    generateDocumentPDF("Multi-Section Report", sections);
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.flatMap((call: any) => {
      if (Array.isArray(call[0])) return call[0];
      return [String(call[0])];
    });
    // breakLongWords adds extra spaces between tokens, so check for key parts
    const sectionTexts = allTexts.filter((t: string) => t.includes("Section"));
    expect(sectionTexts.length).toBeGreaterThanOrEqual(2);
    expect(allTexts.some((t: string) => t.includes("Content"))).toBe(true);
  });

  it("handles all content types in one section", () => {
    const sections: ReportSection[] = [
      {
        title: "Everything",
        content: [
          { type: "text", value: "Text" },
          { type: "heading", value: "Heading", level: 2 },
          { type: "list", items: ["A"], ordered: true },
          {
            type: "table",
            headers: ["H1"],
            rows: [["V1"]],
          },
          { type: "keyValue", items: [{ key: "K", value: "V" }] },
          { type: "alert", severity: "info", message: "Ok" },
          { type: "spacer", height: 5 },
          { type: "divider" },
        ],
      },
    ];
    expect(() => generateDocumentPDF("Full Report", sections)).not.toThrow();
  });

  it("handles section with null/undefined content items gracefully", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          null as any,
          undefined as any,
          { type: "text", value: "Valid" },
        ],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("handles unknown content type gracefully", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "unknown_type" } as any],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders empty text without error", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "text", value: "" }],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders empty heading without error", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [{ type: "heading", value: "", level: 2 }],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders keyValue items with non-object entries gracefully", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          {
            type: "keyValue",
            items: [
              null as any,
              "not-an-object" as any,
              { key: "K", value: "V" },
            ],
          },
        ],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("adds footer on finalize", () => {
    generateDocumentPDF("Report", []);
    expect(mockDoc.line).toHaveBeenCalled();
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.map((call: any) => String(call[0]));
    expect(allTexts.some((t: string) => t.includes("Page"))).toBe(true);
  });

  it("renders footer with CONFIDENTIAL notice", () => {
    generateDocumentPDF("Report", []);
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.map((call: any) => String(call[0]));
    expect(allTexts.some((t: string) => t.includes("CONFIDENTIAL"))).toBe(true);
  });

  it("renders footer with Caelex branding", () => {
    generateDocumentPDF("Report", []);
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.map((call: any) => String(call[0]));
    expect(allTexts.some((t: string) => t.includes("Caelex"))).toBe(true);
  });

  it("renders header disclaimer text", () => {
    generateDocumentPDF("Report", []);
    const textCalls = mockDoc.text.mock.calls;
    const allTexts = textCalls.map((call: any) => String(call[0]));
    expect(allTexts.some((t: string) => t.includes("NOT LEGAL ADVICE"))).toBe(
      true,
    );
  });

  it("handles table with non-array rows filtered out", () => {
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          {
            type: "table",
            headers: ["H"],
            rows: [["Valid"], "not-an-array" as any, ["Also valid"]],
          },
        ],
      },
    ];
    expect(() => generateDocumentPDF("Report", sections)).not.toThrow();
  });

  it("renders table without headers when headers array is empty", () => {
    mockAutoTable.mockClear();
    const sections: ReportSection[] = [
      {
        title: "S1",
        content: [
          {
            type: "table",
            headers: [],
            rows: [["V1", "V2"]],
          },
        ],
      },
    ];
    generateDocumentPDF("Report", sections);
    expect(mockAutoTable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        head: undefined,
        body: [["V1", "V2"]],
      }),
    );
  });
});
