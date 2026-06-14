// src/lib/trade/intake/attribute-fields.test.ts
import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_FIELDS,
  getAttributeField,
  validateAttributeValue,
} from "./attribute-fields";

describe("attribute dictionary", () => {
  it("defines the decisive star-tracker fields with units", () => {
    const acc = getAttributeField("starTrackerAccuracyArcsec");
    expect(acc?.unit).toBe("arcsec");
    expect(acc?.kind).toBe("number");
  });
  it("flags an out-of-range value using the matcher's sanity bound", () => {
    // ATTRIBUTE_SANITY_RANGES.starTrackerAccuracyArcsec = { min: 0.001, max: 3600 }
    expect(validateAttributeValue("starTrackerAccuracyArcsec", 999999).ok).toBe(
      false,
    );
    expect(validateAttributeValue("starTrackerAccuracyArcsec", 10).ok).toBe(
      true,
    );
  });
});
