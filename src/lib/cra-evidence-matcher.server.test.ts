vi.mock("server-only", () => ({}));

import { matchDocumentToCRA } from "./cra-evidence-matcher.server";

describe("CRA Evidence Matcher", () => {
  it("matches penetration test to cra-013", () => {
    const matches = matchDocumentToCRA(
      "Penetration Test Report Q4 2025",
      "cybersecurity",
      [],
    );
    expect(matches.some((m) => m.requirementId === "cra-013")).toBe(true);
  });

  it("matches SBOM document to cra-038", () => {
    const matches = matchDocumentToCRA(
      "Product SBOM CycloneDX",
      "cybersecurity",
      ["sbom"],
    );
    expect(matches.some((m) => m.requirementId === "cra-038")).toBe(true);
  });

  it("matches risk assessment to cra-018", () => {
    const matches = matchDocumentToCRA(
      "Cybersecurity Risk Assessment",
      "cybersecurity",
      ["risk"],
    );
    expect(matches.some((m) => m.requirementId === "cra-018")).toBe(true);
  });

  it("returns empty for unrelated documents", () => {
    const matches = matchDocumentToCRA("Company Brochure 2025", "general", []);
    expect(matches).toHaveLength(0);
  });

  it("returns high confidence for keyword match", () => {
    const matches = matchDocumentToCRA(
      "Penetration Test Report",
      "cybersecurity",
      [],
    );
    const pentest = matches.find((m) => m.requirementId === "cra-013");
    expect(pentest?.confidence).toBe("high");
  });
});
