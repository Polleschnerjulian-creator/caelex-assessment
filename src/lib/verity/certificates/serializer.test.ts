import { describe, it, expect } from "vitest";
import type { VerityCertificate, ThresholdAttestation } from "../core/types";
import {
  serializeCertificate,
  serializeAttestation,
  parseCertificate,
  parseAttestation,
} from "./serializer";

// ── Fixtures ──────────────────────────────────────────────────────────────

const sampleCertificate: VerityCertificate = {
  certificate_id: "cert_001",
  version: "1.0",
  schema: "https://www.caelex.eu/verity/certificate/v1",
  subject: {
    operator_id: "op_1",
    operator_name: "TestCo",
    satellite_norad_id: "12345",
    satellite_name: "Sat-1",
  },
  issuer: {
    name: "Caelex",
    key_id: "verity-2026-01-01",
    public_key: "abc123",
    algorithm: "Ed25519",
  },
  claims: [
    {
      claim_id: "cl_1",
      attestation_id: "att_1",
      regulation_ref: "ART_13",
      regulation_name: "Debris Mitigation",
      claim_statement: "Compliant",
      result: true,
      trust_level: "HIGH",
      source: "sentinel",
      sentinel_anchored: true,
      cross_verified: true,
    },
  ],
  embedded_attestations: [] as unknown as ThresholdAttestation[],
  evidence_summary: {
    total_attestations: 1,
    sentinel_backed: 1,
    cross_verified: 1,
    min_trust_level: "HIGH",
    evidence_period: {
      from: "2026-01-01T00:00:00Z",
      to: "2026-03-01T00:00:00Z",
    },
  },
  issued_at: "2026-03-01T00:00:00Z",
  expires_at: "2026-06-01T00:00:00Z",
  verification_url: "https://www.caelex.eu/verify/cert_001",
  signature: "sig_hex",
};

const sampleAttestation: ThresholdAttestation = {
  attestation_id: "va_123_abc",
  version: "1.0",
  claim: {
    regulation_ref: "ART_13",
    regulation_name: "Debris Mitigation",
    threshold_type: "ABOVE",
    threshold_value: 90,
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
    source: "sentinel",
    trust_level: "HIGH",
    trust_range: "0.95-1.0",
    sentinel_anchor: null,
    cross_verification: null,
  },
  issuer: {
    name: "Caelex",
    key_id: "verity-2026-01-01",
    public_key: "abc123",
    algorithm: "Ed25519",
  },
  issued_at: "2026-03-01T00:00:00Z",
  expires_at: "2026-06-01T00:00:00Z",
  verification_url: "https://www.caelex.eu/verify/va_123_abc",
  signature: "sig_hex",
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe("serializer", () => {
  describe("serializeCertificate", () => {
    it("returns pretty JSON string", () => {
      const result = serializeCertificate(sampleCertificate);
      expect(typeof result).toBe("string");
      const parsed = JSON.parse(result);
      expect(parsed.certificate_id).toBe("cert_001");
      // Pretty-printed (indent 2) means it contains newlines
      expect(result).toContain("\n");
      expect(result).toBe(JSON.stringify(sampleCertificate, null, 2));
    });
  });

  describe("serializeAttestation", () => {
    it("returns pretty JSON string", () => {
      const result = serializeAttestation(sampleAttestation);
      expect(typeof result).toBe("string");
      const parsed = JSON.parse(result);
      expect(parsed.attestation_id).toBe("va_123_abc");
      expect(result).toContain("\n");
      expect(result).toBe(JSON.stringify(sampleAttestation, null, 2));
    });
  });

  describe("parseCertificate", () => {
    it("returns parsed cert with valid structure", () => {
      const json = JSON.stringify(sampleCertificate);
      const result = parseCertificate(json);
      expect(result).not.toBeNull();
      expect(result!.certificate_id).toBe("cert_001");
      expect(result!.version).toBe("1.0");
      expect(result!.signature).toBe("sig_hex");
      expect(result!.claims).toHaveLength(1);
      expect(result!.embedded_attestations).toBeDefined();
    });

    it("returns null for invalid JSON", () => {
      const result = parseCertificate("not valid json {{{");
      expect(result).toBeNull();
    });

    it("returns null for missing required fields", () => {
      // missing certificate_id, version, signature, claims, embedded_attestations
      const incomplete = JSON.stringify({ foo: "bar" });
      expect(parseCertificate(incomplete)).toBeNull();

      // missing signature
      const noSig = JSON.stringify({
        certificate_id: "x",
        version: "1.0",
        claims: [],
        embedded_attestations: [],
      });
      expect(parseCertificate(noSig)).toBeNull();
    });
  });

  describe("parseAttestation", () => {
    it("returns parsed attestation with valid structure", () => {
      const json = JSON.stringify(sampleAttestation);
      const result = parseAttestation(json);
      expect(result).not.toBeNull();
      expect(result!.attestation_id).toBe("va_123_abc");
      expect(result!.version).toBe("1.0");
      expect(result!.signature).toBe("sig_hex");
      expect(result!.claim).toBeDefined();
      expect(result!.issuer).toBeDefined();
    });

    it("returns null for invalid JSON", () => {
      const result = parseAttestation("{{invalid}}");
      expect(result).toBeNull();
    });

    it("returns null for missing required fields", () => {
      // missing attestation_id, version, signature, claim, issuer
      const incomplete = JSON.stringify({ foo: "bar" });
      expect(parseAttestation(incomplete)).toBeNull();

      // missing issuer
      const noIssuer = JSON.stringify({
        attestation_id: "x",
        version: "1.0",
        signature: "sig",
        claim: { result: true },
      });
      expect(parseAttestation(noIssuer)).toBeNull();
    });
  });
});
