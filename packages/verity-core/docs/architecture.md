# Verity 2036 Architecture

## System Overview

Verity 2036 is a cryptographic compliance attestation system designed for space operators. It enables operators to prove regulatory compliance properties -- such as "fuel margin above threshold" or "orbital deviation below limit" -- without revealing the underlying sensitive operational telemetry.

The system operates on a commit-then-prove model: measurement values are locked into cryptographic commitments, predicates are evaluated against reference thresholds, and the results are bundled into signed attestations. Verifiers can confirm that a compliant predicate was evaluated correctly without learning the actual measurement.

**Phase 1** is implemented as a pure TypeScript library with zero infrastructure dependencies. There is no database, no API server, no message broker, and no network transport. All state is managed by the caller. This constraint ensures that the cryptographic core can be embedded in any runtime -- Node.js, Deno, Bun, Cloudflare Workers, or browser -- without platform-specific bindings.

---

## Module Boundaries

```
packages/verity-core/src/
├── canonical/     — Deterministic serialization (key-sorted, NFC-normalized, IEEE 754)
├── commitments/   — SHA-256 blinded commitments with domain separation
├── signatures/    — Ed25519 signing with domain separation (@noble/curves)
├── proofs/        — ProofProvider abstraction + ThresholdCommitmentProofProvider
├── keys/          — Key lifecycle management (create, rotate, revoke, resolve)
├── models/        — Attestation + Certificate builders/validators + Merkle tree
├── compat/        — V1 backward-compatible verification
├── time/          — Clock skew handling (300s tolerance)
└── index.ts       — Public API surface
```

### Module Responsibilities

| Module         | Responsibility                                                                                                                                                                                                                                           | External Dependencies                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `canonical/`   | Produce deterministic byte representations of arbitrary JSON-compatible objects. Enforces UTF-8 key sorting, NFC Unicode normalization, IEEE 754 double encoding, and control character escaping.                                                        | None                                        |
| `commitments/` | Create and verify SHA-256 blinded commitments. Manages blinding factor generation via CSPRNG. Applies domain separation tags to prevent cross-protocol commitment reuse.                                                                                 | `@noble/hashes`                             |
| `signatures/`  | Sign and verify byte payloads using Ed25519 with domain separation. Wraps `@noble/curves` with domain-prefix prepending before sign/verify.                                                                                                              | `@noble/curves`                             |
| `proofs/`      | Define the `ProofProvider` interface and implement Phase 1's `ThresholdCommitmentProofProvider`. Produces `ProofResult` objects that accompany attestations.                                                                                             | `commitments/`, `canonical/`                |
| `keys/`        | Generate Ed25519 keypairs, encrypt private keys with AES-256-GCM (scrypt-derived KEK), manage rotation with overlapping validity windows, issue signed revocation entries, and resolve keys by ID at a given point in time.                              | `@noble/curves`, `@noble/hashes`            |
| `models/`      | Define `Attestation` and `Certificate` data structures. Provide builders for constructing attestations from commitments and predicate results. Build Merkle trees over attestation sets and embed roots in certificates. Validate structural invariants. | `canonical/`, `commitments/`, `signatures/` |
| `compat/`      | Verify V1-format attestations (protocol_version === 1) that lack domain separation. V1 creation is permanently disabled. Emits deprecation warnings on each V1 verification call.                                                                        | `signatures/`                               |
| `time/`        | Provide clock-skew-tolerant timestamp comparison. Default tolerance is 300 seconds (5 minutes). Used by attestation and certificate validity checks.                                                                                                     | None                                        |
| `index.ts`     | Re-export the public API surface. Defines which types, functions, and classes are available to consumers. Internal utilities are not exported.                                                                                                           | All modules                                 |

---

## Trust Chain

The Verity 2036 trust model follows a hierarchical delegation chain. Each level in the hierarchy derives its authority from the level above.

```
                    ┌──────────────────────┐
                    │  Platform Root Key   │
                    │  (trust anchor)      │
                    └──────────┬───────────┘
                               │ issues
                    ┌──────────▼───────────┐
                    │  Tenant Admin Key    │
                    │  (operator org)      │
                    └──────────┬───────────┘
                               │ delegates
                    ┌──────────▼───────────┐
                    │    Attester Key       │
                    │  (agent / system)    │
                    └──────────┬───────────┘
                               │ consumes
                    ┌──────────▼───────────┐
                    │  Measurement Source   │
                    │  (Sentinel, manual)  │
                    └──────────────────────┘
```

### Role Definitions

- **Platform Root Key**: The ultimate trust anchor for the entire Verity 2036 deployment. There is exactly one root key per platform instance. It signs tenant admin key registrations and revocations. The root private key should be held offline or in an HSM (Phase 2).

- **Tenant Admin Key**: Represents an operator organization (e.g., a satellite operator, a launch provider). Issued under the platform root. The tenant admin can delegate attester keys to specific systems or agents within the organization. Tenant admin keys are scoped by `tenant_id`.

- **Attester Key**: A key held by a specific attesting agent or system (e.g., an automated compliance engine, a ground station processor). Attester keys are delegated by the tenant admin and are authorized to sign attestations on behalf of that tenant. Attester keys carry an `authorized_by` reference to their issuing tenant admin key.

- **Measurement Source**: The origin of a measurement value. This is not a cryptographic key but rather a reference to the evidence that the attester consumed. Sources include Sentinel telemetry packets, assessment outputs, or manual operator inputs. The source is recorded in the attestation's `evidence_ref` field.

### Trust Chain Verification

To verify an attestation, a verifier must:

1. Resolve the attester key by `key_id` from the attestation header.
2. Confirm the attester key's `authorized_by` points to a valid tenant admin key.
3. Confirm the tenant admin key was issued under the platform root.
4. Check that none of the keys in the chain have been revoked at the attestation's timestamp.
5. Verify the Ed25519 signature on the attestation using the attester's public key.

---

## Data Flow

The attestation creation pipeline transforms a raw measurement into a cryptographically verifiable compliance claim.

```
  Measurement          Commitment           Predicate            Attestation          Certificate
  ───────────►  ─────────────────►  ──────────────────►  ────────────────────►  ──────────────────►
  (plaintext)   SHA-256(domain ‖    Evaluate threshold   Sign(attester_key,     Bundle attestations
                context ‖ value ‖   against reference     domain ‖ payload)     + Merkle root
                blinding)           (ABOVE/BELOW/EQUAL)                         + sign(attester_key)
```

### Step-by-Step

1. **Measurement Ingestion**: A measurement arrives from a source -- a Sentinel telemetry packet, an assessment computation, or a manual operator input. The measurement contains a numeric value, a metric identifier, and a timestamp.

2. **Commitment Creation**: The attester creates a blinded commitment over the measurement value:

   ```
   commitment = SHA-256(domain_tag ‖ canonical(context) ‖ IEEE754(value) ‖ blinding_factor)
   ```

   - `domain_tag`: The string `VERITY2036_ATTESTATION_V2` encoded as UTF-8.
   - `context`: A JSON object containing `operator_id`, `metric_id`, `timestamp`, and other metadata, canonicalized using the `canonical/` module.
   - `IEEE754(value)`: The measurement value encoded as an 8-byte IEEE 754 double-precision float in big-endian byte order.
   - `blinding_factor`: 32 bytes from a cryptographically secure pseudorandom number generator (CSPRNG).

3. **Predicate Evaluation**: The attester evaluates a predicate against a threshold reference value. Supported predicates:
   - `ABOVE`: value > threshold
   - `BELOW`: value < threshold
   - `EQUAL`: value === threshold (within IEEE 754 tolerance)

   The predicate result is a boolean. The threshold reference value is public; the measurement value remains hidden inside the commitment.

4. **Attestation Construction**: The attester builds an attestation record containing:
   - `attestation_id`: A collision-resistant unique ID (cuid2).
   - `protocol_version`: `2` (current version).
   - `commitment`: The SHA-256 commitment from step 2.
   - `predicate`: The predicate type and threshold.
   - `result`: The boolean outcome of the predicate evaluation.
   - `evidence_ref`: A reference to the measurement source.
   - `valid_from` / `valid_until`: The validity window.
   - `nonce`: 32 random bytes for replay resistance.
   - `sequence_number`: Monotonically increasing counter per attester.

5. **Attestation Signing**: The attester signs the attestation with its Ed25519 private key:

   ```
   signature = Ed25519.sign(private_key, domain_tag ‖ canonical(attestation_payload))
   ```

   Domain separation ensures that signatures are not valid across different message types.

6. **Certificate Construction**: Multiple attestations are bundled into a certificate:
   - A Merkle tree is built over the attestation IDs (domain-separated leaf hashing).
   - The Merkle root is included in the certificate header.
   - The certificate is signed by the attester key.
   - The certificate carries its own validity window and expiry.

7. **Verification**: A verifier receives a certificate and performs:
   - Signature verification on each attestation and the certificate.
   - Trust chain resolution (attester -> tenant admin -> platform root).
   - Revocation checks for all keys in the chain.
   - Validity window checks with clock skew tolerance.
   - Commitment well-formedness checks (correct length, non-zero).
   - Merkle inclusion proof verification for each attestation.

---

## Cryptographic Layers

Verity 2036 is designed with a layered cryptographic architecture that allows the privacy model to strengthen over time without breaking backward compatibility.

### Layer A: Commitment + Signature (Phase 1 -- Current)

| Primitive  | Construction                                 | Security Property                                                |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Commitment | SHA-256(domain ‖ context ‖ value ‖ blinding) | Computational hiding, collision-resistant binding                |
| Signature  | Ed25519 with domain separation               | EUF-CMA (existential unforgeability under chosen-message attack) |

Privacy in Layer A depends on the **honesty of the attester**. The attester knows the plaintext value and the blinding factor. A dishonest attester could reveal the value or lie about the predicate result. This is a trust-based privacy model.

### Layer B: Algebraic Commitments (Phase 2 -- Planned)

| Primitive  | Construction                          | Security Property                                     |
| ---------- | ------------------------------------- | ----------------------------------------------------- |
| Commitment | Pedersen commitment over Ristretto255 | Information-theoretic hiding, computationally binding |
| Signature  | Ed25519 with domain separation        | EUF-CMA                                               |

The `ProofProvider` interface swaps `ThresholdCommitmentProofProvider` for `PedersenCommitmentProvider`. Pedersen commitments provide information-theoretic hiding: even an unbounded adversary cannot extract the committed value. The attester still evaluates the predicate, but the commitment itself is unconditionally hiding.

### Layer C: Zero-Knowledge Proofs (Phase 3 -- Planned)

| Primitive  | Construction                       | Security Property            |
| ---------- | ---------------------------------- | ---------------------------- |
| Commitment | Pedersen over Ristretto255         | Information-theoretic hiding |
| Proof      | Bulletproofs or PLONK range proofs | Zero-knowledge, soundness    |
| Signature  | Ed25519 with domain separation     | EUF-CMA                      |

In Phase 3, the attester produces a zero-knowledge proof that the committed value satisfies the predicate, without revealing the value and without requiring trust in the attester's honesty. The `ProofResult` structure already accommodates variable-length proofs.

---

## Privacy Model

### Phase 1 Privacy Guarantees

| Property                 | Guarantee     | Basis                                            |
| ------------------------ | ------------- | ------------------------------------------------ |
| Value confidentiality    | Computational | SHA-256 preimage resistance + 256-bit blinding   |
| Predicate correctness    | Trust-based   | Attester honesty assumption                      |
| Attestation authenticity | Cryptographic | Ed25519 signature                                |
| Attestation integrity    | Cryptographic | Signature covers full payload                    |
| Tenant isolation         | Cryptographic | tenant_id in signed payload + commitment context |

### What Is Revealed

- The predicate type (ABOVE, BELOW, EQUAL) and the threshold value.
- The boolean result of the predicate evaluation.
- The metric identifier and timestamp.
- The operator (tenant) identity.
- The attester identity and key.

### What Is Hidden

- The actual measurement value.
- The blinding factor.
- Any intermediate computation that produced the measurement.

### Privacy Boundaries

The `models/` module enforces a type-level distinction between `Internal` attestation representations (which contain `currentValue` and `blindingFactor`) and `Public` representations (which do not). The public API surface never exposes `Internal` types. Logging utilities in the library redact sensitive fields.

---

## Key Management Lifecycle

### CREATE

```
1. Generate Ed25519 keypair: (public_key, private_key) = Ed25519.generateKeypair()
2. Derive KEK from passphrase: kek = scrypt(passphrase, salt, N=2^15, r=8, p=1)
3. Encrypt private key: ciphertext = AES-256-GCM.encrypt(kek, private_key, nonce)
4. Store: { key_id, public_key, encrypted_private_key, salt, nonce, created_at, expires_at }
```

The key ID is a collision-resistant identifier generated by cuid2. The `created_at` and `expires_at` timestamps define the key's validity window.

### ROTATE

```
1. Generate new keypair: (new_pub, new_priv)
2. Set new key validity: valid_from = now, expires_at = now + rotation_period
3. Extend old key validity: old_key.expires_at = now + overlap_window
4. Sign rotation record: Ed25519.sign(old_priv, domain_tag ‖ canonical(rotation_record))
5. Store both keys; old key remains valid during overlap window
```

Overlapping validity windows ensure that attestations signed with the old key remain verifiable during the transition period. The rotation record is signed with the old key to prove continuity of authority.

### REVOKE

```
1. Create revocation entry: { key_id, revoked_at, reason, revoked_by }
2. Sign with authority key: Ed25519.sign(authority_priv, domain_tag ‖ canonical(revocation))
   - Platform root can revoke tenant admin keys
   - Tenant admin can revoke attester keys
3. Append to revocation log (append-only; entries cannot be removed)
```

Once a key is revoked, it cannot sign new attestations. Existing attestations signed before the revocation timestamp remain valid unless explicitly invalidated by a separate process. The append-only structure ensures that revocations cannot be silently undone.

### RESOLVE

```
1. Look up key by key_id
2. If point_in_time is provided:
   a. Check key was created before point_in_time
   b. Check key had not expired at point_in_time
   c. Check key was not revoked at or before point_in_time
3. Return key metadata + public key (never the private key)
```

Point-in-time resolution is essential for verifying historical attestations. A key that is currently revoked may have been valid when an attestation was signed.

---

## Migration from V1

### Version Differences

| Aspect                | V1 (protocol_version = 1)           | V2 (protocol_version = 2)                           |
| --------------------- | ----------------------------------- | --------------------------------------------------- |
| Signatures            | Ed25519 (raw payload)               | Ed25519 with domain separation prefix               |
| Commitments           | SHA-256(context ‖ value ‖ blinding) | SHA-256(domain ‖ context ‖ value ‖ blinding)        |
| Attestation structure | Flat JSON                           | Structured with explicit nonce, sequence_number     |
| Key management        | External                            | Integrated lifecycle (create/rotate/revoke/resolve) |
| Proof system          | None                                | ProofProvider abstraction                           |

### Verification Dispatch

The `compat/` module handles V1 verification as follows:

1. Check `protocol_version` field on the incoming attestation.
2. If `protocol_version === 1`, dispatch to V1 verification path:
   - Verify Ed25519 signature without domain prefix.
   - Verify SHA-256 commitment without domain prefix.
   - Emit deprecation warning via configured logger.
3. If `protocol_version === 2`, dispatch to V2 verification path (standard).
4. If `protocol_version` is unrecognized, reject with `UNSUPPORTED_PROTOCOL_VERSION` error.

### Migration Constraints

- **V1 creation is permanently disabled.** The library does not expose any function to create V1 attestations. Only verification is supported.
- **V1 verification emits deprecation warnings.** Consumers should plan to sunset V1 attestation acceptance.
- **No automatic migration.** V1 attestations cannot be "upgraded" to V2 because the signatures would change. V1 attestations remain V1 for their entire lifetime.

---

## Domain Separation Tags

Domain separation prevents signatures and commitments created for one purpose from being reinterpreted in a different context.

| Tag                                | Usage                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `VERITY2036_ATTESTATION_V2`        | Prepended to attestation payloads before signing and to commitment inputs |
| `VERITY2036_CERTIFICATE_V2`        | Prepended to certificate payloads before signing                          |
| `VERITY2036_KEY_ROTATION_V2`       | Prepended to key rotation records before signing                          |
| `VERITY2036_KEY_REVOCATION_V2`     | Prepended to key revocation entries before signing                        |
| `VERITY2036_TRANSPARENCY_ENTRY_V2` | Prepended to transparency log entries (Phase 2)                           |

Each tag is encoded as a UTF-8 byte string and concatenated with the payload bytes before the cryptographic operation. This ensures that a valid attestation signature can never be misinterpreted as a valid certificate signature, even if the payloads happen to share a byte prefix.

---

## Dependencies

| Package                | Purpose                        | Selection Rationale                                                                                          |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `@noble/curves`        | Ed25519 signatures             | Audited by Cure53; pure JavaScript; no native bindings; strict verification (rejects non-canonical S values) |
| `@noble/hashes`        | SHA-256, SHA-512, scrypt       | Audited by Cure53; pure JavaScript; constant-time implementations                                            |
| `@paralleldrive/cuid2` | Collision-resistant unique IDs | No coordination required; k-sortable; URL-safe                                                               |

### Non-Dependencies (Deliberate Exclusions)

- **No native crypto bindings** (e.g., no `node:crypto` for core operations). This ensures portability to Edge Runtimes, Cloudflare Workers, and browsers.
- **No bundled RNG**. The library uses the platform's `crypto.getRandomValues()` via `@noble/hashes` utilities, which delegates to the runtime's CSPRNG.
- **No database driver**. State management is the caller's responsibility.
- **No HTTP client or server**. Transport is the caller's responsibility.

---

## Upgrade Path

### Phase 1 to Phase 2: Algebraic Commitments

1. **Add dependency**: `@noble/curves` Ristretto255 (already available in the package).
2. **Implement** `PedersenCommitmentProvider` conforming to the `ProofProvider` interface.
3. **No model changes**: The `Attestation` and `Certificate` data structures accommodate the new commitment scheme via the `scheme` and `version` fields in `ProofResult`.
4. **Verifier update**: Verifiers must support both `ThresholdCommitmentProofProvider` (Phase 1) and `PedersenCommitmentProvider` (Phase 2) dispatched by `scheme` field.
5. **HSM/KMS integration**: Optional -- private keys can be delegated to hardware security modules.

### Phase 2 to Phase 3: Zero-Knowledge Proofs

1. **Add proof library**: Integrate a Bulletproofs or PLONK implementation.
2. **Implement** `ZKRangeProofProvider` conforming to the `ProofProvider` interface.
3. **ProofResult accommodation**: The `proof` field in `ProofResult` already supports variable-length byte arrays.
4. **Verifier update**: Verifiers must support all three providers dispatched by `scheme` + `version`.
5. **Trustless verification**: Predicate correctness no longer depends on attester honesty.

### Backward Compatibility Guarantee

Each phase introduces a new `scheme` value. Existing attestations retain their original scheme and remain verifiable. There is no migration of existing attestations -- they are immutable once signed.
