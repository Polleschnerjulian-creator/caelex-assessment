import { describe, it, expect } from "vitest";
import {
  getArticleGreeting,
  getCategoryGreeting,
  getGeneralGreeting,
  getArticleContextInfo,
  getRegulationLabel,
} from "./article-context";

// ─── getArticleGreeting ───

describe("getArticleGreeting", () => {
  it("returns specific greeting for Art. 67 (Debris Mitigation Plan)", () => {
    const greeting = getArticleGreeting(
      "Art. 67",
      "Debris Mitigation Plan",
      "critical",
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Debris Mitigation Plan");
    expect(greeting).toContain("Art. 67");
  });

  it("returns specific greeting for Art. 58", () => {
    const greeting = getArticleGreeting(
      "Art. 58",
      "General Debris Mitigation",
      "major",
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Art. 58");
  });

  it("returns specific greeting for Art. 74", () => {
    const greeting = getArticleGreeting(
      "Art. 74",
      "Information Security Policy",
      "critical",
      "CYBERSECURITY",
    );
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Art. 74");
  });

  it("returns specific greeting for Art. 75", () => {
    const greeting = getArticleGreeting(
      "Art. 75",
      "Risk Assessment",
      "major",
      "CYBERSECURITY",
    );
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Art. 75");
  });

  it("returns specific greeting for Art. 63", () => {
    const greeting = getArticleGreeting(
      "Art. 63",
      "Trackability Requirements",
      "major",
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
  });

  it("returns specific greeting for Art. 64", () => {
    const greeting = getArticleGreeting(
      "Art. 64",
      "CA Service",
      "major",
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
  });

  it("returns specific greeting for Art. 66", () => {
    const greeting = getArticleGreeting(
      "Art. 66",
      "Manoeuvrability",
      "major",
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
  });

  it("returns specific greeting for Art. 68", () => {
    const greeting = getArticleGreeting(
      "Art. 68",
      "End-of-Life Disposal",
      "major",
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
  });

  it("returns fallback greeting for unknown article with known regulation", () => {
    const greeting = getArticleGreeting(
      "Art. 999",
      "Unknown Article",
      "critical",
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Art. 999");
    expect(greeting).toContain("Unknown Article");
    expect(greeting).toContain("kritischer");
    expect(greeting).toContain("Debris Mitigation");
  });

  it("returns fallback greeting with major severity label", () => {
    const greeting = getArticleGreeting(
      "Art. 999",
      "Test",
      "major",
      "CYBERSECURITY",
    );
    expect(greeting).toContain("wichtiger");
  });

  it("returns fallback greeting with default severity label", () => {
    const greeting = getArticleGreeting(
      "Art. 999",
      "Test",
      "minor",
      "AUTHORIZATION",
    );
    expect(greeting).toContain("relevanter");
  });

  it("returns fallback greeting for unknown regulation type", () => {
    const greeting = getArticleGreeting(
      "Art. 999",
      "Test",
      "critical",
      "UNKNOWN_TYPE",
    );
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Art. 999");
    // Should not contain regulation label since it's unknown
    expect(greeting).not.toContain("Bereich UNKNOWN_TYPE");
  });
});

// ─── getCategoryGreeting ───

describe("getCategoryGreeting", () => {
  it("generates greeting for category with articles", () => {
    const articles = [
      { articleRef: "Art. 58", title: "Debris Mitigation" },
      { articleRef: "Art. 59", title: "Disposal Requirements" },
    ];
    const greeting = getCategoryGreeting(
      "Debris Mitigation",
      articles,
      "DEBRIS",
    );
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("2 Anforderungen");
    expect(greeting).toContain("Debris Mitigation");
    expect(greeting).toContain("Art. 58");
    expect(greeting).toContain("Art. 59");
  });

  it("truncates article list at 8 and shows more text", () => {
    const articles = Array.from({ length: 12 }, (_, i) => ({
      articleRef: `Art. ${i + 1}`,
      title: `Article ${i + 1}`,
    }));
    const greeting = getCategoryGreeting("Test Category", articles, "DEBRIS");
    expect(greeting).toContain("12 Anforderungen");
    expect(greeting).toContain("4 weitere");
  });

  it("does not show more text when articles <= 8", () => {
    const articles = Array.from({ length: 5 }, (_, i) => ({
      articleRef: `Art. ${i + 1}`,
      title: `Article ${i + 1}`,
    }));
    const greeting = getCategoryGreeting("Test Category", articles, "DEBRIS");
    expect(greeting).not.toContain("weitere");
  });

  it("handles single article", () => {
    const articles = [{ articleRef: "Art. 1", title: "Single Article" }];
    const greeting = getCategoryGreeting("Test", articles, "DEBRIS");
    expect(greeting).toContain("1 Anforderungen");
  });
});

// ─── getGeneralGreeting ───

describe("getGeneralGreeting", () => {
  it("returns a non-empty greeting string", () => {
    const greeting = getGeneralGreeting();
    expect(greeting).toBeTruthy();
    expect(greeting.length).toBeGreaterThan(50);
  });

  it("mentions ASTRA", () => {
    const greeting = getGeneralGreeting();
    expect(greeting).toContain("ASTRA");
  });

  it("mentions compliance-related capabilities", () => {
    const greeting = getGeneralGreeting();
    expect(greeting).toContain("Compliance");
  });
});

// ─── getArticleContextInfo ───

describe("getArticleContextInfo", () => {
  it("returns context for Art. 67", () => {
    const info = getArticleContextInfo("Art. 67");
    expect(info).toBeDefined();
    expect(info).not.toBeNull();
    expect(info!.requiredDocuments.length).toBeGreaterThan(0);
    expect(info!.dataFields.length).toBeGreaterThan(0);
    expect(info!.relatedArticles.length).toBeGreaterThan(0);
    expect(info!.greetingTemplate).toBeTruthy();
  });

  it("returns context for Art. 74", () => {
    const info = getArticleContextInfo("Art. 74");
    expect(info).toBeDefined();
    expect(info!.requiredDocuments).toContain("Information Security Policy");
  });

  it("returns context for Art. 58", () => {
    const info = getArticleContextInfo("Art. 58");
    expect(info).toBeDefined();
    expect(info!.requiredDocuments).toContain("Debris Mitigation Plan");
  });

  it("returns context for Art. 63", () => {
    const info = getArticleContextInfo("Art. 63");
    expect(info).toBeDefined();
  });

  it("returns context for Art. 64", () => {
    const info = getArticleContextInfo("Art. 64");
    expect(info).toBeDefined();
  });

  it("returns context for Art. 66", () => {
    const info = getArticleContextInfo("Art. 66");
    expect(info).toBeDefined();
  });

  it("returns context for Art. 68", () => {
    const info = getArticleContextInfo("Art. 68");
    expect(info).toBeDefined();
  });

  it("returns context for Art. 75", () => {
    const info = getArticleContextInfo("Art. 75");
    expect(info).toBeDefined();
  });

  it("returns null for unknown article", () => {
    const info = getArticleContextInfo("Art. 9999");
    expect(info).toBeNull();
  });
});

// ─── getRegulationLabel ───

describe("getRegulationLabel", () => {
  it("returns label for DEBRIS", () => {
    expect(getRegulationLabel("DEBRIS")).toBe("Debris Mitigation");
  });

  it("returns label for CYBERSECURITY", () => {
    expect(getRegulationLabel("CYBERSECURITY")).toBe("Cybersecurity");
  });

  it("returns label for NIS2", () => {
    expect(getRegulationLabel("NIS2")).toBe("NIS2 Directive");
  });

  it("returns label for AUTHORIZATION", () => {
    expect(getRegulationLabel("AUTHORIZATION")).toBe(
      "Authorization & Licensing",
    );
  });

  it("returns label for ENVIRONMENTAL", () => {
    expect(getRegulationLabel("ENVIRONMENTAL")).toBe("Environmental Footprint");
  });

  it("returns label for INSURANCE", () => {
    expect(getRegulationLabel("INSURANCE")).toBe("Insurance & Liability");
  });

  it("returns label for SUPERVISION", () => {
    expect(getRegulationLabel("SUPERVISION")).toBe("Supervision & Reporting");
  });

  it("returns label for REGISTRATION", () => {
    expect(getRegulationLabel("REGISTRATION")).toBe("Registration");
  });

  it("returns raw type for unknown regulation", () => {
    expect(getRegulationLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
