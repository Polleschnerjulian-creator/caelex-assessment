vi.mock("server-only", () => ({}));

import { parseSBOM, assessSBOMCompliance } from "./cra-sbom-service.server";

describe("SBOM Parser", () => {
  describe("parseSBOM — CycloneDX", () => {
    const cyclonedxSBOM = JSON.stringify({
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      components: [
        {
          type: "library",
          name: "openssl",
          version: "3.1.0",
          licenses: [{ license: { id: "Apache-2.0" } }],
          purl: "pkg:npm/openssl@3.1.0",
        },
        { type: "library", name: "proprietary-lib", version: "1.0.0" },
        {
          type: "framework",
          name: "react",
          version: "18.0.0",
          licenses: [{ license: { id: "MIT" } }],
          purl: "pkg:npm/react@18.0.0",
        },
      ],
    });

    it("detects CycloneDX format", () => {
      const result = parseSBOM(cyclonedxSBOM);
      expect(result.format).toBe("cyclonedx");
      expect(result.specVersion).toBe("1.5");
    });

    it("counts components correctly", () => {
      const result = parseSBOM(cyclonedxSBOM);
      expect(result.componentCount).toBe(3);
    });

    it("identifies open source components", () => {
      const result = parseSBOM(cyclonedxSBOM);
      expect(result.openSourceCount).toBeGreaterThan(0);
    });

    it("extracts licenses", () => {
      const result = parseSBOM(cyclonedxSBOM);
      expect(result.licenses.length).toBeGreaterThan(0);
    });
  });

  describe("parseSBOM — SPDX", () => {
    const spdxSBOM = JSON.stringify({
      spdxVersion: "SPDX-2.3",
      packages: [
        { name: "libcurl", versionInfo: "8.0.0", licenseConcluded: "MIT" },
        { name: "zlib", versionInfo: "1.3.0", licenseConcluded: "Zlib" },
      ],
    });

    it("detects SPDX format", () => {
      const result = parseSBOM(spdxSBOM);
      expect(result.format).toBe("spdx");
    });

    it("parses SPDX packages", () => {
      const result = parseSBOM(spdxSBOM);
      expect(result.componentCount).toBe(2);
    });
  });

  describe("parseSBOM — error handling", () => {
    it("handles malformed JSON gracefully", () => {
      expect(() => parseSBOM("not json")).not.toThrow();
      const result = parseSBOM("not json");
      expect(result.format).toBe("unknown");
    });

    it("handles empty components array", () => {
      const result = parseSBOM(
        JSON.stringify({ bomFormat: "CycloneDX", components: [] }),
      );
      expect(result.componentCount).toBe(0);
    });
  });

  describe("assessSBOMCompliance", () => {
    it("marks cra038 compliant when SBOM is valid", () => {
      const analysis = parseSBOM(
        JSON.stringify({
          bomFormat: "CycloneDX",
          specVersion: "1.5",
          components: [
            {
              name: "test",
              version: "1.0",
              purl: "pkg:npm/test@1.0",
              licenses: [{ license: { id: "MIT" } }],
            },
          ],
        }),
      );
      const result = assessSBOMCompliance(analysis);
      expect(result.cra038_sbomGenerated).toBe(true);
    });
  });
});
