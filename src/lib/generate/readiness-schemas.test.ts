import { describe, it, expect } from "vitest";
import { READINESS_SCHEMAS } from "./readiness-schemas";

describe("readiness-schemas", () => {
  it("exports schemas for all 19 NCA document types", () => {
    const keys = Object.keys(READINESS_SCHEMAS);
    expect(keys.length).toBe(19);
  });

  it("each schema has a documentType matching its key and a non-empty fields array", () => {
    for (const [key, schema] of Object.entries(READINESS_SCHEMAS)) {
      expect(schema.documentType).toBe(key);
      expect(schema.fields.length).toBeGreaterThan(0);
    }
  });

  it("each field has source, field, and weight", () => {
    for (const schema of Object.values(READINESS_SCHEMAS)) {
      for (const field of schema.fields) {
        expect(field.source).toBeTruthy();
        expect(field.field).toBeTruthy();
        expect([1, 2, 3]).toContain(field.weight);
      }
    }
  });
});
