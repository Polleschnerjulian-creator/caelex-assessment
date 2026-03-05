import { describe, it, expect } from "vitest";
import { SPACE_LAW_COUNTRY_CODES } from "./space-law-types";

describe("space-law-types", () => {
  it("exports SPACE_LAW_COUNTRY_CODES as a 10-element array", () => {
    expect(SPACE_LAW_COUNTRY_CODES).toBeDefined();
    expect(SPACE_LAW_COUNTRY_CODES).toHaveLength(10);
  });

  it("contains all expected country codes", () => {
    const expected = [
      "FR",
      "UK",
      "BE",
      "NL",
      "LU",
      "AT",
      "DK",
      "DE",
      "IT",
      "NO",
    ];
    for (const code of expected) {
      expect(SPACE_LAW_COUNTRY_CODES).toContain(code);
    }
  });
});
