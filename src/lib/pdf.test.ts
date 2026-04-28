import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComplianceResult } from "./types";

// Create a mock jsPDF instance with all methods used by pdf.ts
const mockDoc = {
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  setLineCap: vi.fn(),
  setProperties: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  circle: vi.fn(),
  roundedRect: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  splitTextToSize: vi.fn().mockReturnValue(["line1"]),
  getTextWidth: vi.fn().mockReturnValue(30),
  getTextColor: vi.fn().mockReturnValue("000000"),
};

vi.mock("jspdf", () => {
  return {
    jsPDF: class MockJsPDF {
      setFont = mockDoc.setFont;
      setFontSize = mockDoc.setFontSize;
      setTextColor = mockDoc.setTextColor;
      setFillColor = mockDoc.setFillColor;
      setDrawColor = mockDoc.setDrawColor;
      setLineWidth = mockDoc.setLineWidth;
      setLineCap = mockDoc.setLineCap;
      setProperties = mockDoc.setProperties;
      text = mockDoc.text;
      line = mockDoc.line;
      circle = mockDoc.circle;
      roundedRect = mockDoc.roundedRect;
      addPage = mockDoc.addPage;
      save = mockDoc.save;
      splitTextToSize = mockDoc.splitTextToSize;
      getTextWidth = mockDoc.getTextWidth;
      getTextColor = mockDoc.getTextColor;
    },
  };
});

// Import after mocking
const { generatePDF } = await import("./pdf");

function createMockResult(
  overrides?: Partial<ComplianceResult>,
): ComplianceResult {
  return {
    operatorType: "spacecraft_operator",
    operatorTypeLabel: "Spacecraft Operator",
    operatorAbbreviation: "SCO",
    isEU: true,
    isThirdCountry: false,
    regime: "standard" as const,
    regimeLabel: "Standard",
    regimeReason: "Standard entity",
    entitySize: "large",
    entitySizeLabel: "Large Enterprise",
    constellationTier: "small",
    constellationTierLabel: "Small Constellation",
    orbit: "LEO",
    orbitLabel: "Low Earth Orbit",
    offersEUServices: true,
    applicableArticles: [],
    totalArticles: 119,
    applicableCount: 45,
    applicablePercentage: 38,
    moduleStatuses: [
      {
        id: "authorization",
        name: "Authorization",
        icon: "Shield",
        description: "Authorization module",
        status: "required",
        articleCount: 5,
        summary: "Authorization is required",
      },
      {
        id: "cybersecurity",
        name: "Cybersecurity",
        icon: "Shield",
        description: "Cybersecurity module",
        status: "recommended",
        articleCount: 3,
        summary: "Cybersecurity is recommended",
      },
    ],
    checklist: [
      {
        requirement: "Submit authorization application",
        articles: "5-9",
        module: "authorization",
      },
      {
        requirement: "Prepare debris mitigation plan",
        articles: "10-12",
        module: "debris_mitigation",
      },
    ],
    keyDates: [
      { date: "2027-06-01", description: "EU Space Act application deadline" },
      { date: "2028-01-01", description: "NIS2 compliance deadline" },
    ],
    estimatedAuthorizationCost: "€15,000 - €50,000",
    authorizationPath: "Standard Authorization",
    ...overrides,
  };
}

describe("pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePDF", () => {
    it("creates a PDF document and saves it", async () => {
      const result = createMockResult();
      await generatePDF(result);

      expect(mockDoc.setProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "EU Space Act Compliance Report - Caelex",
          author: "Caelex (Julian Polleschner)",
          creator: "Caelex Compliance Platform (caelex.eu)",
        }),
      );
      expect(mockDoc.save).toHaveBeenCalledWith(
        expect.stringMatching(
          /^caelex-eu-space-act-assessment-\d{4}-\d{2}-\d{2}\.pdf$/,
        ),
      );
    });

    it("draws page headers on all pages", async () => {
      const result = createMockResult();
      await generatePDF(result);

      // Page 2 and 3 are added
      expect(mockDoc.addPage).toHaveBeenCalledTimes(2);
    });

    it("renders profile items from the compliance result", async () => {
      const result = createMockResult();
      await generatePDF(result);

      expect(mockDoc.text).toHaveBeenCalledWith(
        "Spacecraft Operator",
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockDoc.text).toHaveBeenCalledWith(
        "Standard",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("renders key dates", async () => {
      const result = createMockResult();
      await generatePDF(result);

      expect(mockDoc.text).toHaveBeenCalledWith(
        "2027-06-01",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("renders module cards", async () => {
      const result = createMockResult();
      await generatePDF(result);

      expect(mockDoc.text).toHaveBeenCalledWith(
        "Authorization",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("renders checklist items", async () => {
      const result = createMockResult();
      await generatePDF(result);

      expect(mockDoc.text).toHaveBeenCalledWith(
        "1.",
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockDoc.text).toHaveBeenCalledWith(
        "2.",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("draws watermark when userEmail is provided", async () => {
      const result = createMockResult();
      await generatePDF(result, "user@example.com");

      expect(mockDoc.text).toHaveBeenCalledWith(
        "Generated for user@example.com",
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: "center", angle: 35 }),
      );
    });

    it("does not draw watermark when userEmail is not provided", async () => {
      const result = createMockResult();
      await generatePDF(result);

      const watermarkCalls = mockDoc.text.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" && call[0].startsWith("Generated for"),
      );
      expect(watermarkCalls).toHaveLength(0);
    });

    it("handles empty moduleStatuses gracefully", async () => {
      const result = createMockResult({ moduleStatuses: [] });
      await expect(generatePDF(result)).resolves.toBeUndefined();
    });

    it("handles empty checklist gracefully", async () => {
      const result = createMockResult({ checklist: [] });
      await expect(generatePDF(result)).resolves.toBeUndefined();
    });

    it("handles empty keyDates gracefully", async () => {
      const result = createMockResult({ keyDates: [] });
      await expect(generatePDF(result)).resolves.toBeUndefined();
    });

    it("handles null constellationTierLabel", async () => {
      const result = createMockResult({
        constellationTierLabel: null,
        constellationTier: null,
      });
      await generatePDF(result);

      expect(mockDoc.text).toHaveBeenCalledWith(
        "N/A",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("handles odd number of module statuses", async () => {
      const result = createMockResult({
        moduleStatuses: [
          {
            id: "auth",
            name: "Auth",
            icon: "Shield",
            description: "Auth",
            status: "required",
            articleCount: 5,
            summary: "Auth is required",
          },
        ],
      });
      await expect(generatePDF(result)).resolves.toBeUndefined();
    });

    it("throws wrapped error when jsPDF throws", async () => {
      mockDoc.setProperties.mockImplementationOnce(() => {
        throw new Error("jsPDF internal error");
      });

      const result = createMockResult();
      await expect(generatePDF(result)).rejects.toThrow(
        "PDF generation failed: jsPDF internal error",
      );
    });

    it("handles non-Error thrown objects", async () => {
      mockDoc.setProperties.mockImplementationOnce(() => {
        throw "string error";
      });

      const result = createMockResult();
      await expect(generatePDF(result)).rejects.toThrow(
        "PDF generation failed: Unknown error",
      );
    });

    it("handles modules with not_applicable status", async () => {
      const result = createMockResult({
        moduleStatuses: [
          {
            id: "env",
            name: "Environmental",
            icon: "Leaf",
            description: "Environmental",
            status: "not_applicable",
            articleCount: 0,
            summary: "Not applicable",
          },
          {
            id: "ins",
            name: "Insurance",
            icon: "Shield",
            description: "Insurance",
            status: "simplified",
            articleCount: 2,
            summary: "Simplified requirements",
          },
        ],
      });
      await expect(generatePDF(result)).resolves.toBeUndefined();
    });

    it("triggers page break with many modules", async () => {
      // Generate enough modules to overflow the page
      const manyModules = Array.from({ length: 20 }, (_, i) => ({
        id: `mod-${i}`,
        name: `Module ${i}`,
        icon: "Shield",
        description: `Module ${i} desc`,
        status: i % 2 === 0 ? "required" : "recommended",
        articleCount: i + 1,
        summary: `Summary for module ${i}`,
      }));
      const result = createMockResult({ moduleStatuses: manyModules });
      await generatePDF(result);

      // With 20 modules (10 rows of 35mm each = 350mm),
      // there should be additional pages added beyond the base 2
      expect(mockDoc.addPage.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("triggers page break in checklist with long items", async () => {
      // Make splitTextToSize return many lines to simulate long text
      mockDoc.splitTextToSize.mockReturnValue([
        "line1",
        "line2",
        "line3",
        "line4",
        "line5",
        "line6",
        "line7",
        "line8",
      ]);

      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        requirement: `Very long requirement ${i} that needs multiple lines to display.`,
        articles: `${i + 1}`,
        module: `module_${i}`,
      }));
      const result = createMockResult({ checklist: manyItems });
      await generatePDF(result);

      // With 15 items each taking ~8*4+1+4 = 37mm, that's 555mm total
      // Which should trigger page breaks (page is only ~252mm of content area)
      expect(mockDoc.addPage.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("triggers page break before disclaimer when y is high", async () => {
      // 9 lines per splitTextToSize call -> each item takes 9*4+1+4 = 41mm
      // With 15 items: after 2 page breaks, the last 4 items land at y=244
      // Then y+=6 = 250, and 250+20=270 > 252 triggers the disclaimer page break
      mockDoc.splitTextToSize.mockReturnValue(
        Array.from({ length: 9 }, (_, i) => `line${i}`),
      );

      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        requirement: `Very long requirement ${i} that needs many lines.`,
        articles: `${i + 1}`,
        module: `module_${i}`,
      }));
      const result = createMockResult({ checklist: manyItems });
      await generatePDF(result);

      // The disclaimer page break should have been triggered (extra pages beyond base 2)
      expect(mockDoc.addPage.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it("renders EU services as Yes or No", async () => {
      const resultYes = createMockResult({ offersEUServices: true });
      await generatePDF(resultYes);
      expect(mockDoc.text).toHaveBeenCalledWith(
        "Yes",
        expect.any(Number),
        expect.any(Number),
      );

      vi.clearAllMocks();

      const resultNo = createMockResult({ offersEUServices: false });
      await generatePDF(resultNo);
      expect(mockDoc.text).toHaveBeenCalledWith(
        "No",
        expect.any(Number),
        expect.any(Number),
      );
    });
  });
});
