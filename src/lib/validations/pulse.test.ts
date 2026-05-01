/**
 * Pulse validation schema — unit tests.
 *
 * Coverage:
 *
 *   1. Happy path — minimal input
 *   2. legalName trim + length bounds
 *   3. email format + lowercase normalisation
 *   4. vatId pattern + uppercase normalisation + empty-string-to-undefined
 *   5. establishment ISO-2 length
 *   6. UTM fields are optional + capped
 */

import { describe, it, expect } from "vitest";
import { PulseDetectSchema } from "./pulse";

describe("PulseDetectSchema", () => {
  it("accepts minimal valid input", () => {
    const result = PulseDetectSchema.safeParse({
      legalName: "OneWeb Limited",
      email: "anna@example.com",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.legalName).toBe("OneWeb Limited");
    expect(result.data.email).toBe("anna@example.com");
  });

  it("rejects too-short legalName", () => {
    expect(
      PulseDetectSchema.safeParse({
        legalName: "AB",
        email: "x@y.com",
      }).success,
    ).toBe(false);
  });

  it("trims legalName before length check", () => {
    const result = PulseDetectSchema.safeParse({
      legalName: "  OneWeb  ",
      email: "x@y.com",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.legalName).toBe("OneWeb");
  });

  it("rejects garbage email", () => {
    expect(
      PulseDetectSchema.safeParse({
        legalName: "Acme",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("lowercases email", () => {
    const result = PulseDetectSchema.safeParse({
      legalName: "Acme",
      email: "Anna@Example.COM",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("anna@example.com");
  });

  it("uppercases vatId + accepts spaces/dots/dashes", () => {
    const result = PulseDetectSchema.safeParse({
      legalName: "Acme",
      email: "x@y.com",
      vatId: "de 123.456-789",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.vatId).toBe("DE 123.456-789");
  });

  it("rejects malformed vatId", () => {
    expect(
      PulseDetectSchema.safeParse({
        legalName: "Acme",
        email: "x@y.com",
        vatId: "BAD",
      }).success,
    ).toBe(false);
  });

  it("treats empty vatId string as undefined", () => {
    const result = PulseDetectSchema.safeParse({
      legalName: "Acme",
      email: "x@y.com",
      vatId: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.vatId).toBeUndefined();
  });

  it("rejects establishment that is not 2 chars", () => {
    expect(
      PulseDetectSchema.safeParse({
        legalName: "Acme",
        email: "x@y.com",
        establishment: "DEU",
      }).success,
    ).toBe(false);
  });

  it("uppercases establishment", () => {
    const result = PulseDetectSchema.safeParse({
      legalName: "Acme",
      email: "x@y.com",
      establishment: "de",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.establishment).toBe("DE");
  });

  it("accepts UTM fields when present + capped", () => {
    const result = PulseDetectSchema.safeParse({
      legalName: "Acme",
      email: "x@y.com",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "space-act-2026",
    });
    expect(result.success).toBe(true);
  });

  it("rejects UTM fields longer than 64 chars", () => {
    expect(
      PulseDetectSchema.safeParse({
        legalName: "Acme",
        email: "x@y.com",
        utmSource: "x".repeat(65),
      }).success,
    ).toBe(false);
  });
});
