# pharos-verify

> Standalone Pharos receipt verifier — Ed25519 signature + canonical-JSON triple-hash recompute. **Zero runtime dependencies.** Verify any Pharos AI compliance receipt locally without contacting Caelex.

## Why this exists

Pharos is the EU regulator-side workspace of Caelex (caelex.app/pharos). Every Pharos-AI answer to an authority gets a cryptographically signed receipt that's persisted in a SHA-256 hash-chain. This package lets anyone — a court, journalist, investor, citizen — verify those receipts **without trusting Caelex** to do the verification.

If Caelex's servers were compromised tomorrow, every previously-issued receipt would still be verifiable. That's the design goal.

## Install

```bash
npx pharos-verify <entryId>
```

No install needed beyond Node 18+. The package has zero runtime dependencies — only Node stdlib (`crypto`, `fs`, `https`).

## Usage

```bash
# Fetch a receipt by entryId from caelex.app and verify
npx pharos-verify clx1f2a3b4c5d6

# Verify from an arbitrary URL
npx pharos-verify https://your-pharos-instance/api/pharos/receipt/abc123

# Verify a local JSON file
npx pharos-verify --file ./bescheid-receipt.json

# Verify from stdin (curl pipe)
curl https://caelex.app/api/pharos/receipt/abc123 | npx pharos-verify --stdin
```

## Exit codes

| Code | Meaning                                                              |
| ---- | -------------------------------------------------------------------- |
| `0`  | ✓ Receipt verified — hash + signature match                          |
| `2`  | ✗ Receipt invalid — hash mismatch or bad signature (tamper detected) |
| `3`  | Error — network failure, parse error, missing fields                 |

## Algorithm

A Pharos receipt is verified in two steps:

**1. Recompute the receiptHash**

```
receiptHash = sha256( version | inputHash | contextHash | outputHash | previousReceiptHash )
```

The pipe is a literal `|` separator. `previousReceiptHash` is the empty string for chain-roots.

**2. Verify the Ed25519 signature**

```
Ed25519.verify(signature, receiptHash_bytes, authorityPublicKey)
```

The `authorityPublicKey` is embedded in the receipt JSON as `publicKeyBase64` (raw 32-byte Ed25519 public key, base64-encoded). The same key is also published at `https://caelex.app/.well-known/keys/<authorityProfileId>` for cross-checking.

If both steps succeed, the receipt is authentic — meaning the Pharos system at Caelex (with the corresponding private key) signed exactly this `(inputHash, contextHash, outputHash, previousReceiptHash)` tuple at the claimed `signedAt` time.

## What the receipt proves

- ✓ The Caelex Pharos system produced this AI output
- ✓ The output corresponds to exactly this prompt + tool-trace + citations + context
- ✓ The receipt has not been tampered with since signing

## What the receipt does NOT prove

- ✗ That the AI output is _factually correct_. A signed receipt is provenance, not truth.
- ✗ That the cited norms are still current — the `effectiveFrom` of cited NormAnchors should be checked separately.
- ✗ That the operator-side data was correct at query time. The DB-row contentHash in citations attests "this is what we read from our DB", not "what we read is true".

## Source

- Repository: https://github.com/caelex-platform/caelex-assessment
- Algorithm spec: `/docs/PHAROS-CONCEPT.md` § Receipt Layer
- License: MIT

## Trust model

You trust:

- Node.js stdlib's `crypto` module (Ed25519 implementation)
- The Authority's public key (verifiable independently at `/.well-known/keys/...`)
- The mathematics of SHA-256 and Ed25519

You do **not** trust:

- Caelex GmbH or any Caelex-controlled software
- Any single CDN, cloud provider, or hosting platform
- The Pharos web UI

This is the Glass-Box guarantee — verifiable refusal beats unverifiable trust.
