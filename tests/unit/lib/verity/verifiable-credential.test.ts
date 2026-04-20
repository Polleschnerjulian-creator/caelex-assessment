// tests/unit/lib/verity/verifiable-credential.test.ts

import { describe, it, expect } from "vitest";
import type { ThresholdAttestation } from "@/lib/verity/core/types";
import {
  attestationToVC,
  buildDidDocument,
  CAELEX_DID,
} from "@/lib/verity/vc/verifiable-credential";

const mockAttestation: ThresholdAttestation = {
  attestation_id: "va_1234567890_abcdef",
  version: "1.0",
  claim: {
    regulation_ref: "eu_space_act_art_70",
    regulation_name: "EU Space Act Article 70 — Post-mission Disposal",
    threshold_type: "BELOW",
    threshold_value: 25,
    result: true,
    claim_statement:
      "Post-mission disposal timeline below 25 years as required.",
  },
  subject: {
    operator_id: "org_caelex_demo",
    satellite_norad_id: "12345",
    satellite_name: "Demo-Sat-1",
  },
  evidence: {
    value_commitment: "sha256:abc123def456",
    source: "sentinel",
    trust_level: "HIGH",
    trust_range: "0.90–1.00",
    sentinel_anchor: null,
    cross_verification: null,
  },
  issuer: {
    name: "Caelex",
    key_id: "vik_2026_01",
    public_key: "deadbeef".repeat(8),
    algorithm: "Ed25519",
  },
  issued_at: "2026-04-20T14:00:00Z",
  expires_at: "2027-04-20T14:00:00Z",
  verification_url: "https://caelex.eu/api/v1/verity/attestation/verify",
  signature: "0011223344".repeat(12), // 64-byte hex
};

describe("VC — attestationToVC", () => {
  it("produces a W3C-VC-2.0-shaped credential with Caelex DID as issuer", () => {
    const vc = attestationToVC(mockAttestation);

    expect(vc["@context"][0]).toBe("https://www.w3.org/ns/credentials/v2");
    expect(vc.type).toContain("VerifiableCredential");
    expect(vc.type).toContain("SpaceComplianceAttestation");
    expect(vc.issuer).toBe(CAELEX_DID);
    expect(vc.id).toBe(`urn:caelex:verity:${mockAttestation.attestation_id}`);
  });

  it("preserves timing windows from the source attestation", () => {
    const vc = attestationToVC(mockAttestation);
    expect(vc.validFrom).toBe(mockAttestation.issued_at);
    expect(vc.validUntil).toBe(mockAttestation.expires_at);
  });

  it("maps the subject to a urn:norad: identifier when a satellite is present", () => {
    const vc = attestationToVC(mockAttestation);
    expect(vc.credentialSubject.id).toBe("urn:norad:12345");
    expect(vc.credentialSubject.satelliteNorad).toBe("12345");
  });

  it("falls back to urn:operator: when no satellite is attached", () => {
    const opOnly = {
      ...mockAttestation,
      subject: { ...mockAttestation.subject, satellite_norad_id: null },
    };
    const vc = attestationToVC(opOnly);
    expect(vc.credentialSubject.id).toBe("urn:operator:org_caelex_demo");
    expect(vc.credentialSubject.satelliteNorad).toBeNull();
  });

  it("flattens the claim block into the VC credentialSubject", () => {
    const vc = attestationToVC(mockAttestation);
    expect(vc.credentialSubject.regulation.ref).toBe("eu_space_act_art_70");
    expect(vc.credentialSubject.regulation.thresholdType).toBe("BELOW");
    expect(vc.credentialSubject.complianceResult).toBe(true);
    expect(vc.credentialSubject.claim).toMatch(/25 years/);
  });

  it("includes evidence metadata without revealing the raw value", () => {
    const vc = attestationToVC(mockAttestation);
    expect(vc.credentialSubject.evidence.commitmentHash).toBe(
      "sha256:abc123def456",
    );
    expect(vc.credentialSubject.evidence.trustLevel).toBe("HIGH");
    // No raw value leaks.
    expect(JSON.stringify(vc)).not.toContain("actual_value");
  });

  it("points verificationMethod at did:web:caelex.eu with the issuer key_id fragment", () => {
    const vc = attestationToVC(mockAttestation);
    expect(vc.proof.verificationMethod).toBe(
      `did:web:caelex.eu#${mockAttestation.issuer.key_id}`,
    );
    expect(vc.proof.type).toBe("Ed25519Signature2020");
    expect(vc.proof.proofPurpose).toBe("assertionMethod");
  });

  it("proofValue is multibase-prefixed", () => {
    const vc = attestationToVC(mockAttestation);
    expect(vc.proof.proofValue.startsWith("z")).toBe(true);
    expect(vc.proof.proofValue.slice(1)).toBe(mockAttestation.signature);
  });

  it("credentialStatus points at the revocation-list endpoint", () => {
    const vc = attestationToVC(mockAttestation);
    expect(vc.credentialStatus?.id).toContain(
      "/api/v1/verity/attestation/status/",
    );
    expect(vc.credentialStatus?.id).toContain(mockAttestation.attestation_id);
  });
});

describe("VC — buildDidDocument", () => {
  // Real-ish 32-byte Ed25519 public key (hex).
  const publicKeyHex =
    "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
  const keyId = "vik_2026_01";

  it("produces a spec-shaped did.json document", () => {
    const doc = buildDidDocument(publicKeyHex, keyId);
    expect(doc["@context"]).toContain("https://www.w3.org/ns/did/v1");
    expect(doc.id).toBe(CAELEX_DID);
    expect(doc.verificationMethod).toHaveLength(1);
  });

  it("verificationMethod has Ed25519VerificationKey2020 type and multibase key", () => {
    const doc = buildDidDocument(publicKeyHex, keyId);
    const vm = doc.verificationMethod[0]!;
    expect(vm.type).toBe("Ed25519VerificationKey2020");
    expect(vm.controller).toBe(CAELEX_DID);
    expect(vm.publicKeyMultibase.startsWith("z")).toBe(true);
    // Ed25519 multicodec (0xed 0x01) + 32 bytes → base58btc ~48 chars.
    // The 'z' prefix + body gives ~49 chars total.
    expect(vm.publicKeyMultibase.length).toBeGreaterThan(40);
    expect(vm.publicKeyMultibase.length).toBeLessThan(60);
  });

  it("assertionMethod and authentication reference the key by full DID URL", () => {
    const doc = buildDidDocument(publicKeyHex, keyId);
    const vmId = doc.verificationMethod[0]!.id;
    expect(vmId).toBe(`${CAELEX_DID}#${keyId}`);
    expect(doc.assertionMethod).toContain(vmId);
    expect(doc.authentication).toContain(vmId);
  });

  it("accepts a 44-byte Ed25519 SPKI-DER public key (the production format)", () => {
    // Verity stores Ed25519 keys in SPKI-DER form: fixed 12-byte header
    // + 32-byte raw key. Both 32 and 44 must work — this is the regression
    // guard for the 2026-04-20 deployment failure.
    // 12-byte Ed25519 SPKI DER prefix.
    const ED25519_SPKI_PREFIX_HEX = "302a300506032b6570032100";
    const spkiHex = ED25519_SPKI_PREFIX_HEX + publicKeyHex;
    expect(spkiHex.length / 2).toBe(44);

    const docFromSpki = buildDidDocument(spkiHex, keyId);
    const docFromRaw = buildDidDocument(publicKeyHex, keyId);
    // Same raw bytes → identical multibase
    expect(docFromSpki.verificationMethod[0]!.publicKeyMultibase).toBe(
      docFromRaw.verificationMethod[0]!.publicKeyMultibase,
    );
  });

  it("rejects a 44-byte input with an invalid SPKI header", () => {
    // Length right, prefix wrong → must throw, not silently strip junk.
    const badPrefix = "ff".repeat(12) + publicKeyHex;
    expect(() => buildDidDocument(badPrefix, keyId)).toThrow(
      /unexpected SPKI header/,
    );
  });

  it("rejects public keys that aren't 32 or 44 bytes", () => {
    expect(() => buildDidDocument("abcd", keyId)).toThrow();
    expect(() => buildDidDocument("ab".repeat(33), keyId)).toThrow();
  });
});
