# @caelex/verity-verifier-sdk

Offline verification SDK for Verity 2036 compliance attestations, certificates, and transparency proofs.

Designed for third-party integrators -- National Competent Authorities, insurance underwriters, supply-chain partners, and auditors -- who need to cryptographically verify Verity artifacts without any server dependency.

## Installation

```bash
npm install @caelex/verity-verifier-sdk
```

## Quick Start

```typescript
import { verifyAttestation } from "@caelex/verity-verifier-sdk";

const result = verifyAttestation(attestationJson, {
  operatorKeys: [{ keyId: "key-001", publicKey: "abcd1234..." }],
  attesterKeys: [{ keyId: "attester-001", publicKey: "ef567890..." }],
});

console.log(result.valid); // true
```

## API Reference

### verifyAttestation

Verifies a Verity attestation offline using trusted public keys. Supports both V1 (legacy) and V2 (current) protocol formats.

```typescript
function verifyAttestation(
  attestation: unknown,
  trustedKeys: TrustedKeySet,
): VerificationResult;
```

**Parameters:**

- `attestation` -- The attestation to verify. Accepts a JSON string or a parsed object.
- `trustedKeys` -- Set of trusted public keys for signature verification.

**Checks performed:**

1. Parses the attestation (JSON string or object)
2. Detects protocol version (V1 legacy or V2 current)
3. Validates structural integrity (required fields present)
4. Verifies operator Ed25519 signature against trusted keys
5. Verifies attester evidence Ed25519 signature against trusted keys
6. Validates commitment format (scheme, version, 64-char hex hash)
7. Checks temporal validity (not expired, not future-dated)

**Return type:**

```typescript
interface VerificationResult {
  valid: boolean;
  protocolVersion: number;
  checks: VerificationCheck[];
  warnings: string[];
  subject: { assetType: string; assetId: string };
  statement: {
    measurementType: string;
    predicateType: string;
    operator: string;
  };
}

interface VerificationCheck {
  check: string;
  passed: boolean;
  detail?: string;
}
```

---

### verifyCertificate

Verifies a Verity certificate offline. A certificate bundles multiple attestations with a Merkle root and issuer signature.

```typescript
function verifyCertificate(
  certificate: unknown,
  trustedKeys: CertificateTrustedKeySet,
): CertificateVerificationResult;
```

**Parameters:**

- `certificate` -- The certificate to verify. Accepts a JSON string or a parsed object. Attestations must be embedded as full objects, not string IDs.
- `trustedKeys` -- Extended key set that includes issuer keys in addition to operator and attester keys.

**Checks performed:**

1. Parses the certificate (JSON string or object)
2. Validates structure (cert_id present, attestations are full objects)
3. Resolves issuer key from trusted key set
4. Verifies certificate Ed25519 signature
5. Verifies Merkle root consistency
6. Verifies each embedded attestation individually
7. Checks certificate expiry
8. Determines overall status: `VALID`, `PARTIALLY_VALID`, `EXPIRED`, or `INVALID`

**Return type:**

```typescript
interface CertificateVerificationResult {
  valid: boolean;
  status: "VALID" | "PARTIALLY_VALID" | "EXPIRED" | "INVALID";
  checks: {
    certificateSignature: boolean;
    merkleRoot: boolean;
    expiry: boolean;
    attestations: Array<{
      index: number;
      attestationId: string;
      valid: boolean;
      reason?: string;
    }>;
  };
  validAttestationIndices: number[];
  warnings: string[];
}
```

---

### verifyInclusionProof

Verifies that an entry is included in a transparency log checkpoint by checking the Merkle path and checkpoint signature.

```typescript
function verifyInclusionProof(
  proof: InclusionProof,
  platformPublicKey: string,
): InclusionVerificationResult;
```

**Parameters:**

- `proof` -- The inclusion proof containing entry hash, Merkle path, and checkpoint data.
- `platformPublicKey` -- Hex-encoded Ed25519 public key of the Verity platform (64 hex characters).

**Checks performed:**

1. Merkle path verification: recomputes the root from the entry hash and sibling path, comparing against the checkpoint Merkle root.
2. Checkpoint signature verification: verifies the platform Ed25519 signature over the checkpoint data using domain separation.

Both checks must pass for the entry to be considered included.

**Return type:**

```typescript
interface InclusionVerificationResult {
  included: boolean;
  checks: {
    merklePath: boolean;
    checkpointSignature: boolean;
  };
  entryId: string;
  sequenceNumber: number;
  checkpointId: string;
}
```

**Proof structure:**

```typescript
interface InclusionProof {
  entryId: string;
  referenceId: string;
  entryHash: string;
  sequenceNumber: number;
  inclusionProof: {
    merklePath: Array<{ hash: string; position: "left" | "right" }>;
    checkpointId: string;
    checkpointMerkleRoot: string;
    checkpointSignature: string;
  };
}
```

---

### checkRevocationOnline

Checks the revocation status of a key by querying the Verity server. This is the only function in the SDK that requires network access.

```typescript
async function checkRevocationOnline(
  keyId: string,
  serverUrl: string,
  apiKey?: string,
): Promise<RevocationStatus>;
```

**Parameters:**

- `keyId` -- The key identifier to check.
- `serverUrl` -- Base URL of the Verity server (e.g., `"https://verity.caelex.com"`).
- `apiKey` -- Optional API key for authentication. Sent as a `Bearer` token.

The function queries `GET /api/v1/keys/{keyId}/status` with a 10-second timeout.

**Return type:**

```typescript
interface RevocationStatus {
  keyId: string;
  status: "ACTIVE" | "ROTATED" | "REVOKED" | "UNKNOWN";
  revokedAt?: string; // ISO 8601 timestamp
  reason?: string;
  checkedAt: string; // ISO 8601 timestamp
}
```

On any network or server error, returns `status: "UNKNOWN"` with a descriptive `reason`. Never throws.

---

## Types

### TrustedKey

```typescript
interface TrustedKey {
  keyId: string; // Unique key identifier
  publicKey: string; // Hex-encoded Ed25519 public key (64 hex chars)
}
```

### TrustedKeySet

```typescript
interface TrustedKeySet {
  operatorKeys: TrustedKey[];
  attesterKeys: TrustedKey[];
}
```

### CertificateTrustedKeySet

```typescript
interface CertificateTrustedKeySet extends TrustedKeySet {
  issuerKeys: TrustedKey[];
}
```

## Trust Model

The SDK cryptographically verifies that an attestation was signed by the claimed operator and attester keys, that the commitment is well-formed, and that temporal validity is within bounds. It does NOT verify that the attester's measurement is accurate -- that trust assumption rests on the attester hardware and the Sentinel agent chain of custody.

Specifically, the verification boundary covers:

- **Operator signature** -- proves the space operator endorsed this attestation with their registered key.
- **Attester signature** -- proves the measurement evidence was produced by a known attester device.
- **Commitment integrity** -- proves the cryptographic commitment follows the expected scheme and version.
- **Temporal validity** -- proves the attestation has not expired and is not future-dated.
- **Certificate binding** -- proves the Merkle root over bundled attestations matches the issuer signature.
- **Transparency inclusion** -- proves an entry exists in a tamper-evident log checkpoint.

What is NOT verified:

- The physical accuracy of the attester measurement.
- Whether the attester hardware was tampered with at the physical layer.
- Whether the operator's internal processes are sound.

## Integration Example: National Competent Authority

An NCA receiving a batch of attestations from a space operator can verify each one offline before entering them into a regulatory database:

```typescript
import {
  verifyAttestation,
  checkRevocationOnline,
} from "@caelex/verity-verifier-sdk";
import type { TrustedKeySet } from "@caelex/verity-verifier-sdk";

// Trusted keys obtained via out-of-band registration
const trustedKeys: TrustedKeySet = {
  operatorKeys: [
    {
      keyId: "op-sat-eu-001",
      publicKey:
        "3b7a9f2e1c8d4b6a0e5f7c9d2a4b6e8f1c3d5a7b9e0f2a4c6d8e0f1a3b5c7d",
    },
    {
      keyId: "op-sat-eu-002",
      publicKey:
        "9f1a3c5e7d2b4a6c8e0f1d3b5a7c9e2f4a6b8d0e1c3f5a7b9d2e4c6a8f0b1d",
    },
  ],
  attesterKeys: [
    {
      keyId: "sentinel-alpha-7",
      publicKey:
        "d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4",
    },
  ],
};

async function processOperatorSubmission(attestations: unknown[]) {
  const results = [];

  for (const att of attestations) {
    const result = verifyAttestation(att, trustedKeys);

    if (!result.valid) {
      console.error(
        `REJECTED ${result.subject.assetId}: ${result.checks
          .filter((c) => !c.passed)
          .map((c) => c.detail ?? c.check)
          .join(", ")}`,
      );
    }

    // Optional: check if signing keys have been revoked since issuance
    if (result.valid) {
      const keyStatus = await checkRevocationOnline(
        "op-sat-eu-001",
        "https://verity.caelex.com",
      );
      if (keyStatus.status === "REVOKED") {
        console.warn(
          `Key revoked at ${keyStatus.revokedAt} -- manual review required`,
        );
      }
    }

    results.push({
      assetId: result.subject.assetId,
      valid: result.valid,
      result,
    });
  }

  return results;
}
```

## Integration Example: Insurance Underwriter

An insurer can verify a compliance certificate before renewing coverage for a satellite constellation:

```typescript
import { verifyCertificate } from "@caelex/verity-verifier-sdk";
import type { CertificateTrustedKeySet } from "@caelex/verity-verifier-sdk";

const trustedKeys: CertificateTrustedKeySet = {
  issuerKeys: [
    {
      keyId: "caelex-issuer-prod",
      publicKey:
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    },
  ],
  operatorKeys: [
    {
      keyId: "op-constellation-alpha",
      publicKey:
        "f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1",
    },
  ],
  attesterKeys: [
    {
      keyId: "sentinel-orbital-9",
      publicKey:
        "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    },
  ],
};

function evaluateCoverageRenewal(certificateJson: string) {
  const result = verifyCertificate(certificateJson, trustedKeys);

  switch (result.status) {
    case "VALID":
      console.log("Certificate fully valid. Proceed with renewal.");
      console.log(
        `${result.validAttestationIndices.length} attestations verified.`,
      );
      break;

    case "PARTIALLY_VALID":
      console.warn(
        `${result.validAttestationIndices.length} of ` +
          `${result.checks.attestations.length} attestations valid. ` +
          "Manual review required before renewal.",
      );
      // List failed attestations
      for (const att of result.checks.attestations) {
        if (!att.valid) {
          console.warn(`  [${att.index}] ${att.attestationId}: ${att.reason}`);
        }
      }
      break;

    case "EXPIRED":
      console.error("Certificate expired. Request re-issuance before renewal.");
      break;

    case "INVALID":
      console.error("Certificate invalid. Coverage renewal denied.");
      console.error("Warnings:", result.warnings);
      break;
  }

  return result;
}
```

## Design Principles

- **Never throws exceptions.** Every public function returns a typed result object. Errors, including unexpected ones, are captured in the result structure with descriptive messages.

- **Zero server dependencies.** The SDK has no runtime dependencies on any Verity server, database, or external service. All cryptographic operations use locally available primitives.

- **Offline-first.** Three of four functions work entirely offline with no network access. The single online function (`checkRevocationOnline`) is optional and clearly separated.

- **Pure functions.** `verifyAttestation`, `verifyCertificate`, and `verifyInclusionProof` are pure: same inputs always produce the same outputs. No side effects, no shared state.

- **No logging, no environment variables, no filesystem access.** The SDK reads nothing from the environment. Integrators control all inputs and outputs explicitly.

## Changelog

_No releases yet._
