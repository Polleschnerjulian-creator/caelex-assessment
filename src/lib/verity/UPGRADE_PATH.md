# Verity Phase 2: Trustless Verification Upgrade

## Current State (Phase 1): Trusted Issuer Attestation

- Caelex evaluates compliance and signs assertions
- Verifier trusts Caelex's signature for claim truthfulness
- Commitment: SHA-256 (hiding + binding, not homomorphic)
- Signatures: Ed25519

## Target State (Phase 2): Trustless Mathematical Proofs

- Verifier can confirm claims WITHOUT trusting Caelex
- Commitment: Pedersen over Ristretto255 (homomorphic)
- Range Proof: Schnorr Sigma Protocol on bit-decomposition
- Library: @noble/curves (MIT License, zero cost, ~50KB)

## What Changes in Phase 2

- CryptoProvider implementation swaps from HashBased to Pedersen
- Attestation includes mathematical proof instead of relying on signature trust
- Verification checks mathematical proof in addition to signature
- New field: attestation.proof (contains Pedersen commitment + Schnorr proof)

## What Stays the Same

- All API endpoints (same routes, same structure)
- All DB models (proof stored in existing JSON fields)
- All UI components
- Certificate structure
- Evidence resolution
- Key management (signatures still used for certificate-level trust)

## Migration Path

- Phase 1 attestations remain valid (version: "1.0")
- Phase 2 attestations are version: "2.0"
- Verification detects version and uses appropriate method
- Both coexist indefinitely

## Implementation Checklist

1. Install @noble/curves
2. Implement PedersenCryptoProvider (implements CryptoProvider interface)
3. Add version detection to verifyAttestation()
4. Update generateAttestation() to include proof field
5. Test both versions coexist
6. Deploy with feature flag (VERITY_CRYPTO_VERSION=2)
