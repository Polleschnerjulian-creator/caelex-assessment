# Verity 2036 Threat Model

## Scope

This document enumerates the threats considered during the design of the Verity 2036 cryptographic compliance attestation system. Each threat is analyzed with its attack vector, potential impact, specific mitigations implemented in the system, and residual risk after mitigation.

The threat model covers the cryptographic core library (`verity-core`). Infrastructure-level threats (network interception, host compromise, supply chain attacks on dependencies) are noted where relevant but are generally outside the scope of the library itself.

### Security Objectives

| Objective                    | Description                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| **Value Confidentiality**    | Measurement values must not be extractable from attestations or commitments. |
| **Attestation Integrity**    | Attestations must not be modifiable after signing without detection.         |
| **Attestation Authenticity** | Attestations must be verifiably attributable to an authorized attester.      |
| **Tenant Isolation**         | Attestations for one tenant must not be valid in another tenant's context.   |
| **Temporal Validity**        | Expired or premature attestations must be rejected.                          |
| **Non-Repudiation**          | An attester cannot deny having produced a signed attestation.                |

---

## Threat Catalog

### T-01: Commitment Value Extraction

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker obtains a commitment value from a public attestation and attempts to reverse the SHA-256 hash to recover the original measurement. The attacker may attempt brute-force over the value space, dictionary attacks against known metric ranges, or algebraic inversion of the hash function.                                                                                                                                            |
| **Impact**        | Privacy breach. Sensitive operational telemetry (fuel levels, orbital parameters, propulsion metrics) is exposed to unauthorized parties. This undermines the core privacy guarantee of the system.                                                                                                                                                                                                                                               |
| **Mitigation**    | Each commitment includes a 256-bit blinding factor generated from a CSPRNG (`crypto.getRandomValues()`). The commitment is computed as `SHA-256(domain_tag \|\| canonical(context) \|\| IEEE754(value) \|\| blinding_factor)`. The blinding factor expands the preimage space to 2^256 regardless of the entropy of the measurement value itself. Even if the attacker knows the exact value, they cannot confirm it without the blinding factor. |
| **Residual Risk** | Security relies on SHA-256 preimage resistance (2^256 work factor) and on the blinding factor being generated with sufficient entropy. If the CSPRNG is compromised or produces predictable output, the blinding factor provides no protection. Platform CSPRNG quality is assumed but not verified by the library.                                                                                                                               |

---

### T-02: Commitment Binding Violation

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | A malicious attester constructs a commitment that can be "opened" to two different measurement values. For example, the attester commits to a value that satisfies the compliance predicate but later claims the commitment was to a different value that does not. This requires finding two distinct inputs `(value_1, blinding_1)` and `(value_2, blinding_2)` that hash to the same commitment. |
| **Impact**        | Attestation fraud. An operator could claim regulatory compliance when the actual measurement is non-compliant. This undermines the integrity of the compliance attestation system.                                                                                                                                                                                                                  |
| **Mitigation**    | SHA-256 provides collision resistance with approximately 2^128 security (birthday bound). The blinding factor is committed alongside the value, so the attacker must find a full collision in SHA-256, not merely a value collision. The domain tag and canonicalized context are also part of the hash input, further constraining the collision search space.                                     |
| **Residual Risk** | SHA-256 collision resistance at 2^128 work factor. No practical collision attacks against SHA-256 are known. If SHA-256 collision resistance is broken, the system must migrate to a stronger hash function. The `ProofProvider` abstraction facilitates this migration.                                                                                                                            |

---

### T-03: Signature Forgery

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker without access to the attester's private key attempts to produce a valid Ed25519 signature on a fabricated attestation. The attacker may attempt algebraic attacks on the Ed25519 curve, side-channel attacks against signing operations, or exploitation of implementation flaws.                                                                                                                        |
| **Impact**        | Unauthorized attestations are accepted as genuine. A forged attestation could assert compliance for a non-compliant operator, or attribute a compliance claim to an attester who did not produce it.                                                                                                                                                                                                                  |
| **Mitigation**    | Ed25519 provides EUF-CMA (existential unforgeability under chosen-message attack) security at approximately 128 bits. Domain separation tags are prepended to all signed payloads, preventing cross-protocol signature reuse: a signature valid for an attestation cannot be replayed as a certificate signature. The `@noble/curves` implementation enforces strict verification, rejecting non-canonical encodings. |
| **Residual Risk** | Ed25519 security at approximately 128 bits. No practical attacks are known. Implementation correctness relies on `@noble/curves`, which has been audited by Cure53.                                                                                                                                                                                                                                                   |

---

### T-04: Replay Attack

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vector**        | An attacker captures a valid, signed attestation and resubmits it at a later time. The attestation is cryptographically valid (signature verifies, commitment is well-formed) but represents a stale compliance state.                                                                                                                                                                                 |
| **Impact**        | Stale compliance data is accepted as current. A verifier might accept a fuel-margin attestation from six months ago as evidence of current compliance.                                                                                                                                                                                                                                                 |
| **Mitigation**    | Three mechanisms resist replay: (1) Each attestation contains a unique 32-byte nonce generated from CSPRNG. (2) Each attester maintains a monotonically increasing `sequence_number`; verifiers can reject attestations with sequence numbers lower than the last seen. (3) Each attestation carries a validity window (`valid_from` / `valid_until`); attestations outside their window are rejected. |
| **Residual Risk** | Within the validity window, replay is possible if the verifier does not enforce nonce deduplication or sequence number monotonicity. Nonce deduplication requires state on the verifier side, which is outside the scope of the stateless crypto core. Phase 2 introduces a transparency log that provides global deduplication.                                                                       |

---

### T-05: Protocol Downgrade

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker intercepts an attestation and changes the `protocol_version` field from `2` to `1`. The V1 verification path does not apply domain separation, potentially allowing the signature to verify under weaker rules. Alternatively, the attacker constructs a V1-format attestation to bypass V2's additional security checks.                                                                                                                       |
| **Impact**        | Domain separation is bypassed. A signature intended for one message type might verify as another. The weaker V1 verification path may accept attestations that V2 would reject.                                                                                                                                                                                                                                                                             |
| **Mitigation**    | The `protocol_version` field is part of the signed payload. Changing it after signing invalidates the Ed25519 signature. V1 and V2 attestation formats are structurally different -- a V2 attestation cannot be reinterpreted as V1 because the field layout differs (V2 includes `nonce`, `sequence_number`, and structured `predicate` fields that V1 does not have). V1 creation is permanently disabled in the library; only verification is supported. |
| **Residual Risk** | None, provided the `protocol_version` field is included in the signed payload. The signature binds the version to the payload content.                                                                                                                                                                                                                                                                                                                      |

---

### T-06: Tenant Isolation Breach

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attestation created for Tenant A is presented to a verifier in Tenant B's context. The attacker may attempt to use a valid attestation from one operator to fraudulently assert compliance for a different operator.                                                                                                                                    |
| **Impact**        | Cross-tenant data leakage or fraudulent compliance claims. Tenant A's compliance status could be falsely attributed to Tenant B, or Tenant B could use Tenant A's valid attestation to avoid producing its own.                                                                                                                                            |
| **Mitigation**    | The `tenant_id` is embedded in the signed attestation payload; it cannot be changed without invalidating the signature. Key resolution is tenant-scoped: an attester key authorized by Tenant A's admin cannot be resolved in Tenant B's key store. The commitment context includes the `operator_id`, binding the commitment itself to a specific tenant. |
| **Residual Risk** | None, provided tenant_id validation is enforced by the verifier. The library includes tenant_id in the signed payload and in the commitment context. Verification logic rejects attestations where the claimed tenant does not match the key's tenant scope.                                                                                               |

---

### T-07: Key Compromise

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker obtains the private signing key of an attester, tenant admin, or platform root. This could occur through theft of encrypted key material, compromise of the key encryption passphrase, memory dumping of a running process, or insider threat.                                                                                                                                                                                                  |
| **Impact**        | The attacker can forge attestations for any entity whose key is compromised. If a tenant admin key is compromised, the attacker can issue new attester keys. If the platform root key is compromised, the entire trust chain is invalidated.                                                                                                                                                                                                                |
| **Mitigation**    | Private keys are encrypted at rest with AES-256-GCM using a key encryption key (KEK) derived from a passphrase via scrypt (N=2^15, r=8, p=1). Key rotation with overlapping validity windows limits the window of exposure for any single key. Signed, append-only revocation entries allow immediate revocation of compromised keys. The trust chain hierarchy limits blast radius: compromising an attester key does not compromise the tenant admin key. |
| **Residual Risk** | If the passphrase used to derive the KEK is weak, brute-force against scrypt is feasible. If the platform root key is compromised, all tenant keys are transitively compromised. Phase 2 plans HSM/KMS integration to move private key operations into hardware, removing the private key from application memory.                                                                                                                                          |

---

### T-08: Timing Side-Channel

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker measures the execution time of secret-dependent operations (signature generation, commitment verification, key comparison) to extract information about secret values. For example, a non-constant-time comparison of blinding factors could leak the blinding factor byte by byte.                                                                                                                        |
| **Impact**        | Gradual extraction of private keys, blinding factors, or other secret material. Over many observations, a timing side-channel can fully compromise a secret value.                                                                                                                                                                                                                                                     |
| **Mitigation**    | All comparisons involving secret material use constant-time operations. Byte array comparisons use a constant-time compare function that examines every byte regardless of the position of the first difference (equivalent to `crypto.timingSafeEqual`). The `@noble/curves` library performs Ed25519 scalar operations in constant time. Blinding factor comparisons during commitment verification are timing-safe. |
| **Residual Risk** | Other side channels -- power analysis, electromagnetic emanation, cache timing -- are outside the scope of software mitigation. JIT compilation and garbage collection in JavaScript runtimes may introduce timing variability that is difficult to fully control. The library makes best-effort constant-time guarantees within the constraints of the JavaScript execution model.                                    |

---

### T-09: Canonicalization Divergence

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | Two different implementations of the Verity 2036 protocol produce different canonical byte representations for the same logical input. For example, one implementation sorts object keys by Unicode code point order while another sorts by locale-specific collation. Or one implementation encodes the number `1.0` as `1` while another encodes it as `1.0`.                                                                                                                                                                           |
| **Impact**        | Valid signatures fail verification on different platforms (false negative). Or, an attestation that verifies on one implementation does not verify on another, creating interoperability failures. In the worst case, this could be exploited to create attestations that verify selectively.                                                                                                                                                                                                                                             |
| **Mitigation**    | The `canonical/` module defines explicit, unambiguous canonicalization rules: (1) Object keys are sorted by UTF-8 byte order (not locale-dependent). (2) All strings are NFC-normalized before encoding. (3) Numbers are encoded as IEEE 754 double-precision in big-endian byte order, bypassing string representation ambiguity. (4) Control characters are escaped using a defined escape table. (5) No reliance on `JSON.stringify` for canonical output. (6) Golden test vectors are maintained for all canonicalization edge cases. |
| **Residual Risk** | Bugs in NFC normalization libraries across different platforms or runtimes. Exotic Unicode edge cases (combining characters in rare scripts, newly added Unicode code points) could produce divergent results. The golden test vectors mitigate this by providing a conformance suite.                                                                                                                                                                                                                                                    |

---

### T-10: Signature Malleability

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker takes a valid Ed25519 signature `(R, S)` and produces an alternative signature `(R, S')` where `S' = S + L` (L is the curve order). Both `(R, S)` and `(R, S')` verify as valid for the same message under some Ed25519 implementations that do not enforce canonical S values. The attacker does not need the private key. |
| **Impact**        | Two different signatures exist for the same message. This could bypass deduplication logic that uses signature bytes as a unique identifier. It could also cause confusion in audit logs or transparency records.                                                                                                                       |
| **Mitigation**    | The `@noble/curves` Ed25519 implementation enforces strict verification as defined in RFC 8032. It explicitly checks that `S < L` (the scalar is in canonical form) and rejects signatures with non-canonical S values. This eliminates the malleability vector entirely.                                                               |
| **Residual Risk** | None, provided strict verification is enforced. The library does not allow configuration of non-strict verification mode.                                                                                                                                                                                                               |

---

### T-11: Unicode Normalization Attack

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker constructs attestation field values using visually identical but byte-different Unicode strings. For example, the character "e" (U+0065) followed by a combining acute accent (U+0301) looks identical to "e with acute" (U+00E9) but has a different byte representation. An attacker could create two attestations that appear identical in UI but have different commitments and signatures. |
| **Impact**        | Signature verification failures for legitimate attestations if one party normalizes and the other does not. Or, two attestations that appear identical in display but are cryptographically distinct, confusing audit processes.                                                                                                                                                                            |
| **Mitigation**    | All string fields are NFC-normalized before canonicalization. NFC (Canonical Decomposition followed by Canonical Composition) converts combining character sequences to their precomposed equivalents where they exist. Test vectors explicitly cover combining characters, zero-width joiners (U+200D), zero-width non-joiners (U+200C), and other normalization-sensitive sequences.                      |
| **Residual Risk** | NFC normalization edge cases in exotic scripts where precomposed forms do not exist. Newly added Unicode characters in future Unicode versions may introduce normalization ambiguities until libraries are updated. The risk is low and mitigated by the golden test vector suite.                                                                                                                          |

---

### T-12: Measurement Value Leakage

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | Actual measurement values appear in application logs, error messages, serialized output, debug traces, or exception stack traces. A developer inadvertently logs the full attestation internal representation including `currentValue` and `blindingFactor`. The log output is stored in a system accessible to parties who should not see the measurement values.                                                                                                                 |
| **Impact**        | Privacy breach. Sensitive telemetry is exposed through a side channel that bypasses the cryptographic commitment scheme. The commitment provides no protection if the plaintext is available elsewhere.                                                                                                                                                                                                                                                                            |
| **Mitigation**    | The type system enforces a structural separation between `Internal` attestation representations (which contain `currentValue` and `blindingFactor` fields) and `Public` representations (which do not). The public API surface exclusively accepts and returns `Public` types. Logging utilities provided by the library implement field-level redaction, replacing sensitive fields with `[REDACTED]` markers. The `Internal` type is not exported from the library's public API. |
| **Residual Risk** | Developer error. A developer with access to the `Internal` type within the library could inadvertently leak values. The type system provides a strong signal but cannot prevent all mistakes. Code review discipline and static analysis rules (e.g., linting rules that flag `currentValue` in log statements) provide additional layers of defense.                                                                                                                              |

---

### T-13: Merkle Tree Second Preimage

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker constructs a different set of attestations that produces the same Merkle root as the original certificate. The attacker could then substitute the original attestations with the forged set and the certificate's Merkle root would still verify. A variant of this attack exploits the lack of domain separation between leaf and internal nodes to promote a leaf pair to look like an internal node.  |
| **Impact**        | A certificate could be verified with a substitute set of attestations. The verifier would accept fabricated compliance claims because the Merkle root matches.                                                                                                                                                                                                                                                       |
| **Mitigation**    | Leaf nodes and internal nodes use different domain separation prefixes. Leaf inputs are computed as `SHA-256(0x00 \|\| attestation_id)` and internal nodes as `SHA-256(0x01 \|\| left \|\| right)`. The `0x00` / `0x01` prefix byte prevents an attacker from reinterpreting a pair of leaves as an internal node. Attestation IDs (cuid2) are included in leaf inputs, binding each leaf to a specific attestation. |
| **Residual Risk** | SHA-256 second preimage resistance (2^256 work factor). No practical second preimage attacks against SHA-256 are known.                                                                                                                                                                                                                                                                                              |

---

### T-14: Clock Manipulation

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker manipulates the system clock on the verifier's machine to make expired attestations appear valid or to make not-yet-valid attestations appear current. On the attester side, clock manipulation could be used to backdate attestations.                                                                                                                                                                                      |
| **Impact**        | Expired compliance claims are accepted as current. An operator whose compliance has lapsed could present an old attestation and, with a manipulated verifier clock, have it accepted.                                                                                                                                                                                                                                                    |
| **Mitigation**    | A 300-second (5-minute) clock skew tolerance window accommodates legitimate clock drift between systems without accepting grossly expired attestations. The `sequence_number` field provides a monotonic ordering that does not depend on wall-clock time; verifiers can prefer sequence-based ordering over timestamps. Certificates have independent expiry timestamps that provide a second temporal check.                           |
| **Residual Risk** | If the verifier's clock is fully compromised (shifted by hours or days), time-based validity checks are ineffective. The library cannot protect against a fully compromised verifier environment. Sequence number checks provide a partial mitigation, but they require the verifier to maintain state about the last-seen sequence number per attester. NTP integrity and secure time sources are outside the scope of the crypto core. |

---

### T-15: Denial of Service via Oversized Input

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker submits extremely large JSON payloads to the canonicalization module. The payload may contain deeply nested objects, arrays with millions of elements, or strings of extreme length. The goal is to exhaust CPU time during canonicalization or memory during intermediate representation construction.                                                             |
| **Impact**        | CPU or memory exhaustion on the attester or verifier, leading to denial of service. In a shared-resource environment, this could affect other tenants.                                                                                                                                                                                                                          |
| **Mitigation**    | The `canonical/` module enforces input size limits: maximum total input size in bytes, maximum object nesting depth, and maximum number of keys per object. Circular references are detected and rejected before recursion begins. The canonicalization algorithm uses an iterative approach with an explicit stack rather than unbounded recursion, preventing stack overflow. |
| **Residual Risk** | Application-level rate limiting and request size limits are outside the scope of the crypto core. The library provides configurable size limits but cannot enforce them at the network transport layer. A sufficiently motivated attacker with direct library access (not through a network boundary) could still cause resource consumption up to the configured limits.       |

---

### T-16: Prototype Pollution

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vector**        | An attacker includes `__proto__`, `constructor`, or `prototype` keys in JSON input that is processed by the canonicalization module. If the canonicalization code assigns these keys to a regular JavaScript object, it could modify the object prototype chain, affecting the behavior of security-critical checks elsewhere in the application.                                                  |
| **Impact**        | Object prototype modification could cause security checks to behave incorrectly. For example, polluting `Object.prototype.hasOwnProperty` could cause key existence checks to return wrong results, potentially bypassing validation logic.                                                                                                                                                        |
| **Mitigation**    | The `canonical/` module explicitly rejects `__proto__`, `constructor`, and `prototype` keys in input objects, throwing a validation error. Intermediate objects used during canonicalization are created with `Object.create(null)` to ensure they have no prototype chain. The JSON parsing step uses a reviver function that strips dangerous keys before they reach the canonicalization logic. |
| **Residual Risk** | None, provided the sanitization is applied consistently to all input paths. The rejection of dangerous keys is tested explicitly. If a new prototype pollution vector is discovered in the JavaScript specification, the sanitization list must be updated.                                                                                                                                        |

---

## Threat Summary Matrix

| ID   | Threat                              | Severity | Likelihood | Mitigation Status   | Residual Risk Level |
| ---- | ----------------------------------- | -------- | ---------- | ------------------- | ------------------- |
| T-01 | Commitment Value Extraction         | Critical | Low        | Mitigated           | Low                 |
| T-02 | Commitment Binding Violation        | Critical | Very Low   | Mitigated           | Very Low            |
| T-03 | Signature Forgery                   | Critical | Very Low   | Mitigated           | Very Low            |
| T-04 | Replay Attack                       | High     | Medium     | Partially Mitigated | Medium              |
| T-05 | Protocol Downgrade                  | High     | Low        | Mitigated           | None                |
| T-06 | Tenant Isolation Breach             | Critical | Low        | Mitigated           | None                |
| T-07 | Key Compromise                      | Critical | Medium     | Mitigated           | Medium              |
| T-08 | Timing Side-Channel                 | High     | Low        | Mitigated           | Low                 |
| T-09 | Canonicalization Divergence         | Medium   | Low        | Mitigated           | Low                 |
| T-10 | Signature Malleability              | Medium   | Low        | Mitigated           | None                |
| T-11 | Unicode Normalization Attack        | Medium   | Very Low   | Mitigated           | Very Low            |
| T-12 | Measurement Value Leakage           | High     | Medium     | Partially Mitigated | Medium              |
| T-13 | Merkle Tree Second Preimage         | High     | Very Low   | Mitigated           | Very Low            |
| T-14 | Clock Manipulation                  | Medium   | Medium     | Partially Mitigated | Medium              |
| T-15 | Denial of Service (Oversized Input) | Medium   | Medium     | Partially Mitigated | Low                 |
| T-16 | Prototype Pollution                 | High     | Low        | Mitigated           | None                |

---

## Out-of-Scope Threats

The following threat categories are acknowledged but are outside the scope of the `verity-core` cryptographic library:

| Category                                        | Rationale                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Network-level attacks** (MITM, eavesdropping) | The library does not handle transport. TLS enforcement is the caller's responsibility.                                                                                                |
| **Supply chain attacks** on dependencies        | Dependency integrity is managed by lockfiles and audit processes. The library uses a minimal dependency set of audited packages.                                                      |
| **Host compromise** (OS, hypervisor)            | A fully compromised host can read process memory. HSM/KMS integration (Phase 2) mitigates private key exposure.                                                                       |
| **Social engineering**                          | Credential theft and insider threats are organizational concerns, not library concerns.                                                                                               |
| **Quantum computing**                           | Ed25519 and SHA-256 are not quantum-resistant. Post-quantum migration is a long-term consideration. The `ProofProvider` abstraction may facilitate migration to post-quantum schemes. |

---

## Review Schedule

This threat model should be reviewed:

- On each major version increment of `verity-core`.
- When a new `ProofProvider` implementation is added (Phase 2, Phase 3).
- When cryptographic primitives are upgraded or replaced.
- When a relevant vulnerability is disclosed in a dependency (`@noble/curves`, `@noble/hashes`).
- At minimum annually.
