import { describe, it, expect } from "vitest";
import { openApiSpec } from "./openapi";

describe("openapi", () => {
  it("exports a valid OpenAPI 3.0 spec object", () => {
    expect(openApiSpec).toBeDefined();
    expect(openApiSpec.openapi).toBe("3.0.3");
  });

  it("has required info fields", () => {
    expect(openApiSpec.info.title).toBe("Caelex Public API");
    expect(openApiSpec.info.version).toBe("1.0.0");
  });

  it("has servers defined", () => {
    expect(openApiSpec.servers.length).toBeGreaterThan(0);
  });

  it("has paths defined", () => {
    expect(Object.keys(openApiSpec.paths).length).toBeGreaterThan(0);
  });

  it("has components with schemas", () => {
    expect(openApiSpec.components).toBeDefined();
    expect(openApiSpec.components.schemas).toBeDefined();
    expect(Object.keys(openApiSpec.components.schemas).length).toBeGreaterThan(
      0,
    );
  });

  it("has tags for API grouping", () => {
    expect(openApiSpec.tags.length).toBeGreaterThan(0);
    const tagNames = openApiSpec.tags.map((t: { name: string }) => t.name);
    expect(tagNames).toContain("Compliance");
    expect(tagNames).toContain("Spacecraft");
  });
});
