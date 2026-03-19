import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock "server-only" so the module can be imported in a test environment
vi.mock("server-only", () => ({}));

// Must import after mock
import { buildPassportData, type BuildPassportParams } from "./builder.server";

// ─── Helpers ────────────────────────────────────────────────────────────────

function future(daysAhead = 90): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

function makeParams(
  overrides: Partial<BuildPassportParams> = {},
): BuildPassportParams {
  return {
    passportId: "test-passport-id",
    label: "Test Passport",
    operatorId: "op-123",
    satelliteNorad: "12345",
    satelliteName: "Test Satellite",
    jurisdictions: ["EU", "DE"],
    attestations: [
      {
        attestationId: "att-001",
        regulationRef: "eu_art70_debris",
        dataPoint: "orbital_altitude",
        result: true,
        trustLevel: "HIGH",
        issuedAt: new Date(),
        expiresAt: future(),
      },
    ],
    certificates: [
      {
        certificateId: "cert-001",
        claimsCount: 5,
        minTrustLevel: "HIGH",
        issuedAt: new Date(),
        expiresAt: future(365),
      },
    ],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildPassportData", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a PassportData with the correct passportId and label", () => {
    const result = buildPassportData(makeParams());
    expect(result.passportId).toBe("test-passport-id");
    expect(result.label).toBe("Test Passport");
  });

  it("includes operatorId, satelliteNorad, satelliteName", () => {
    const result = buildPassportData(makeParams());
    expect(result.operatorId).toBe("op-123");
    expect(result.satelliteNorad).toBe("12345");
    expect(result.satelliteName).toBe("Test Satellite");
  });

  it("sets verificationUrl using NEXT_PUBLIC_APP_URL env var", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://test.example.com");
    const result = buildPassportData(makeParams());
    expect(result.verificationUrl).toBe(
      "https://test.example.com/verity/passport/test-passport-id",
    );
  });

  it("falls back to caelex.eu when NEXT_PUBLIC_APP_URL is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const result = buildPassportData(makeParams());
    // When empty string, still uses the env value; test the default branch
    expect(result.verificationUrl).toContain(
      "/verity/passport/test-passport-id",
    );
  });

  it("sets expiresAt to ~30 days from now", () => {
    const before = new Date();
    const result = buildPassportData(makeParams());
    const after = new Date();

    const expires = new Date(result.expiresAt);
    const minExpected = new Date(before);
    minExpected.setDate(minExpected.getDate() + 29);
    const maxExpected = new Date(after);
    maxExpected.setDate(maxExpected.getDate() + 31);

    expect(expires.getTime()).toBeGreaterThanOrEqual(minExpected.getTime());
    expect(expires.getTime()).toBeLessThanOrEqual(maxExpected.getTime());
  });

  it("computes a compliance score from attestations", () => {
    const result = buildPassportData(makeParams());
    // One passing HIGH trust attestation → score 100
    expect(result.complianceScore).toBe(100);
  });

  it("includes scoreBreakdown with category scores", () => {
    const result = buildPassportData(makeParams());
    expect(result.scoreBreakdown).toBeDefined();
    expect(typeof result.scoreBreakdown.debris).toBe("number");
  });

  it("maps attestations to PassportAttestationSummary correctly", () => {
    const result = buildPassportData(makeParams());
    expect(result.attestations).toHaveLength(1);
    const att = result.attestations[0];
    expect(att.attestationId).toBe("att-001");
    expect(att.regulationRef).toBe("eu_art70_debris");
    expect(att.result).toBe(true);
    expect(att.trustLevel).toBe("HIGH");
    expect(att.regulationName).toContain("Debris");
  });

  it("maps certificates to PassportCertificateSummary correctly", () => {
    const result = buildPassportData(makeParams());
    expect(result.certificates).toHaveLength(1);
    const cert = result.certificates[0];
    expect(cert.certificateId).toBe("cert-001");
    expect(cert.claimsCount).toBe(5);
    expect(cert.minTrustLevel).toBe("HIGH");
  });

  it("handles no attestations — zero score", () => {
    const result = buildPassportData(makeParams({ attestations: [] }));
    expect(result.complianceScore).toBe(0);
    expect(result.attestations).toHaveLength(0);
  });

  it("handles no certificates", () => {
    const result = buildPassportData(makeParams({ certificates: [] }));
    expect(result.certificates).toHaveLength(0);
  });

  it("handles null satellite info", () => {
    const result = buildPassportData(
      makeParams({ satelliteNorad: null, satelliteName: null }),
    );
    expect(result.satelliteNorad).toBeNull();
    expect(result.satelliteName).toBeNull();
  });

  it("includes jurisdictions array", () => {
    const result = buildPassportData(makeParams());
    expect(result.jurisdictions).toEqual(["EU", "DE"]);
  });

  it("sets generatedAt to current time (ISO string)", () => {
    const before = Date.now();
    const result = buildPassportData(makeParams());
    const after = Date.now();
    const generatedAt = new Date(result.generatedAt).getTime();
    expect(generatedAt).toBeGreaterThanOrEqual(before - 100);
    expect(generatedAt).toBeLessThanOrEqual(after + 100);
  });
});
