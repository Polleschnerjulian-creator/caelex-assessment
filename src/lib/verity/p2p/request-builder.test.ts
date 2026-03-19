import { describe, it, expect } from "vitest";
import { buildVerificationRequest } from "./request-builder";

describe("buildVerificationRequest", () => {
  it("returns a requestId with the vr_ prefix", () => {
    const result = buildVerificationRequest({
      requesterName: "Acme Satellites",
      regulationRefs: ["eu_art70_debris"],
      purpose: "conjunction_coordination",
    });
    expect(result.requestId).toMatch(/^vr_\d+_[a-z0-9]{6}$/);
  });

  it("returns a unique requestId on each call", () => {
    const a = buildVerificationRequest({
      requesterName: "Acme",
      regulationRefs: [],
      purpose: "general",
    });
    const b = buildVerificationRequest({
      requesterName: "Acme",
      regulationRefs: [],
      purpose: "general",
    });
    expect(a.requestId).not.toBe(b.requestId);
  });

  it("returns an expiresAt ISO string that is in the future", () => {
    const before = Date.now();
    const result = buildVerificationRequest({
      requesterName: "Acme",
      regulationRefs: ["nis2_art21"],
      purpose: "nca_cross_check",
    });
    const after = Date.now();

    const expiresMs = new Date(result.expiresAt).getTime();
    expect(expiresMs).toBeGreaterThan(before);
    expect(expiresMs).toBeGreaterThan(after);
  });

  it("defaults expiresAt to ~7 days from now", () => {
    const before = Date.now();
    const result = buildVerificationRequest({
      requesterName: "Acme",
      regulationRefs: [],
      purpose: "general",
    });
    const after = Date.now();

    const expiresMs = new Date(result.expiresAt).getTime();
    const minExpected = before + 6 * 24 * 60 * 60 * 1000;
    const maxExpected = after + 8 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(minExpected);
    expect(expiresMs).toBeLessThanOrEqual(maxExpected);
  });

  it("respects a custom expiresInDays value", () => {
    const before = Date.now();
    const result = buildVerificationRequest({
      requesterName: "Acme",
      regulationRefs: [],
      purpose: "general",
      expiresInDays: 30,
    });
    const after = Date.now();

    const expiresMs = new Date(result.expiresAt).getTime();
    const minExpected = before + 29 * 24 * 60 * 60 * 1000;
    const maxExpected = after + 31 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(minExpected);
    expect(expiresMs).toBeLessThanOrEqual(maxExpected);
  });

  it("returns a valid ISO 8601 expiresAt string", () => {
    const result = buildVerificationRequest({
      requesterName: "Acme",
      regulationRefs: [],
      purpose: "general",
    });
    expect(() => new Date(result.expiresAt)).not.toThrow();
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
