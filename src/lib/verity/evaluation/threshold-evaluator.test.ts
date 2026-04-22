import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));
vi.mock("../utils/redaction", () => ({ safeLog: vi.fn() }));
vi.mock("./regulation-thresholds", () => ({
  findThreshold: vi.fn(),
  renderClaimStatement: vi.fn(),
}));
vi.mock("./evidence-resolver", () => ({
  resolveEvidence: vi.fn(),
}));
vi.mock("../keys/issuer-keys", () => ({
  getActiveIssuerKey: vi.fn(),
}));
vi.mock("../core/attestation", () => ({
  generateAttestation: vi.fn(),
}));

import { evaluateAndAttest } from "./threshold-evaluator";
import { findThreshold, renderClaimStatement } from "./regulation-thresholds";
import { resolveEvidence } from "./evidence-resolver";
import { getActiveIssuerKey } from "../keys/issuer-keys";
import { generateAttestation } from "../core/attestation";

const mockedFindThreshold = vi.mocked(findThreshold);
const mockedRenderClaimStatement = vi.mocked(renderClaimStatement);
const mockedResolveEvidence = vi.mocked(resolveEvidence);
const mockedGetActiveIssuerKey = vi.mocked(getActiveIssuerKey);
const mockedGenerateAttestation = vi.mocked(generateAttestation);

describe("threshold-evaluator", () => {
  let mockPrisma: PrismaClient & {
    verityAttestation: { create: ReturnType<typeof vi.fn> };
  };

  const defaultParams = {
    operatorId: "op_1",
    satelliteNorad: "12345",
    satelliteName: "Sat-1",
    regulationRef: "ART_13",
    expiresInDays: 90,
  };

  const sampleThreshold = {
    regulation_ref: "ART_13",
    regulation_name: "Debris Mitigation",
    data_point: "remaining_fuel_pct",
    threshold_type: "ABOVE" as const,
    threshold_value: 10,
    unit: "%",
    description: "Remaining fuel percentage",
  };

  const sampleEvidence = {
    actual_value: 95.5,
    data_point: "remaining_fuel_pct",
    source: "sentinel" as const,
    trust_score: 0.98,
    collected_at: "2026-02-01T12:00:00Z",
    sentinel_anchor: {
      sentinel_id: "sentinel_1",
      chain_position: 42,
      chain_hash: "hash_abc",
      collected_at: "2026-02-01T12:00:00Z",
    },
    cross_verification: {
      public_source: "ESA",
      verification_result: "VERIFIED" as const,
      verified_at: "2026-02-01T12:05:00Z",
    },
  };

  const sampleIssuerKey = {
    keyId: "verity-2026-01-01",
    publicKeyHex: "pub_key_hex",
    privateKeyDer: Buffer.from("private_key_der"),
  };

  const sampleAttestation = {
    attestation_id: "va_123_abc",
    version: "1.0" as const,
    claim: {
      regulation_ref: "ART_13",
      regulation_name: "Debris Mitigation",
      threshold_type: "ABOVE" as const,
      threshold_value: 10,
      result: true,
      claim_statement: "Value is above threshold",
    },
    subject: {
      operator_id: "op_1",
      satellite_norad_id: "12345",
      satellite_name: "Sat-1",
    },
    evidence: {
      value_commitment: "sha256:abc",
      source: "sentinel" as const,
      trust_level: "HIGH" as const,
      trust_range: "0.95-1.0",
      sentinel_anchor: sampleEvidence.sentinel_anchor,
      cross_verification: sampleEvidence.cross_verification,
    },
    issuer: {
      name: "Caelex" as const,
      key_id: "verity-2026-01-01",
      public_key: "pub_key_hex",
      algorithm: "Ed25519" as const,
    },
    issued_at: "2026-03-01T00:00:00Z",
    expires_at: "2026-06-01T00:00:00Z",
    verification_url: "https://www.caelex.eu/verify/va_123_abc",
    signature: "sig_hex",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      verityAttestation: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as unknown as typeof mockPrisma;
  });

  it("returns null when threshold not found", async () => {
    mockedFindThreshold.mockReturnValue(undefined);

    const result = await evaluateAndAttest(mockPrisma, defaultParams);
    expect(result).toBeNull();
    expect(mockedFindThreshold).toHaveBeenCalledWith("ART_13");
  });

  it("returns null when no evidence available", async () => {
    mockedFindThreshold.mockReturnValue(sampleThreshold);
    mockedResolveEvidence.mockResolvedValue(null);

    const result = await evaluateAndAttest(mockPrisma, defaultParams);
    expect(result).toBeNull();
    expect(mockedResolveEvidence).toHaveBeenCalledWith(
      mockPrisma,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );
  });

  it("generates attestation and stores in DB on success", async () => {
    mockedFindThreshold.mockReturnValue(sampleThreshold);
    mockedResolveEvidence.mockResolvedValue(sampleEvidence);
    mockedGetActiveIssuerKey.mockResolvedValue(sampleIssuerKey);
    mockedRenderClaimStatement.mockReturnValue("Value is above threshold");
    mockedGenerateAttestation.mockReturnValue(sampleAttestation);

    const result = await evaluateAndAttest(mockPrisma, defaultParams);

    expect(result).not.toBeNull();
    expect(mockPrisma.verityAttestation.create).toHaveBeenCalledTimes(1);

    const createCall = mockPrisma.verityAttestation.create.mock.calls[0][0];
    expect(createCall.data.attestationId).toBe("va_123_abc");
    expect(createCall.data.operatorId).toBe("op_1");
    expect(createCall.data.regulationRef).toBe("ART_13");
    expect(createCall.data.result).toBe(true);
  });

  it("passes correct params to generateAttestation", async () => {
    mockedFindThreshold.mockReturnValue(sampleThreshold);
    mockedResolveEvidence.mockResolvedValue(sampleEvidence);
    mockedGetActiveIssuerKey.mockResolvedValue(sampleIssuerKey);
    mockedRenderClaimStatement.mockReturnValue("Value is above threshold");
    mockedGenerateAttestation.mockReturnValue(sampleAttestation);

    await evaluateAndAttest(mockPrisma, defaultParams);

    expect(mockedGenerateAttestation).toHaveBeenCalledWith({
      regulation_ref: "ART_13",
      regulation_name: "Debris Mitigation",
      threshold_type: "ABOVE",
      threshold_value: 10,
      actual_value: 95.5,
      data_point: "remaining_fuel_pct",
      claim_statement: "Value is above threshold",
      subject: {
        operator_id: "op_1",
        satellite_norad_id: "12345",
        satellite_name: "Sat-1",
      },
      evidence_source: "sentinel",
      trust_score: 0.98,
      collected_at: "2026-02-01T12:00:00Z",
      sentinel_anchor: sampleEvidence.sentinel_anchor,
      cross_verification: sampleEvidence.cross_verification,
      issuer_key_id: "verity-2026-01-01",
      issuer_private_key_der: sampleIssuerKey.privateKeyDer,
      issuer_public_key_hex: "pub_key_hex",
      expires_in_days: 90,
    });
  });

  it("returns the generated attestation", async () => {
    mockedFindThreshold.mockReturnValue(sampleThreshold);
    mockedResolveEvidence.mockResolvedValue(sampleEvidence);
    mockedGetActiveIssuerKey.mockResolvedValue(sampleIssuerKey);
    mockedRenderClaimStatement.mockReturnValue("Value is above threshold");
    mockedGenerateAttestation.mockReturnValue(sampleAttestation);

    const result = await evaluateAndAttest(mockPrisma, defaultParams);

    expect(result).toBe(sampleAttestation);
    expect(result!.attestation_id).toBe("va_123_abc");
    expect(result!.claim.result).toBe(true);
    expect(result!.issuer.key_id).toBe("verity-2026-01-01");
  });
});
