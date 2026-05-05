# Verity Phase 2: Trustless Verification Upgrade

> **Status (2026-05-05):** Phase 1 (v1) shipped. Phase 2 (v2) and
> Phase 2.1 (v3) are implemented in code and gated behind the
> `VERITY_CRYPTO_VERSION` env var (default: `v1`). Operators may also
> opt in per-request via the `commitment_scheme` API parameter on the
> attestation/certificate issue endpoints.
> See **§ Migration Plan** below for the rollout schedule.

---

## Three coexisting versions

| Version | Commitment scheme                                                    | What the verifier needs   | Caelex trust required?                                                       | Wire size                                   |
| ------- | -------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| **v1**  | SHA-256 (hiding + binding, **not** homomorphic)                      | Issuer Ed25519 public key | Yes — must trust Caelex's threshold evaluation                               | ~64 B commitment                            |
| **v2**  | Pedersen on Ristretto255 + Schnorr proof-of-knowledge of the opening | Issuer Ed25519 public key | Still yes for the threshold check; the PoK only proves Caelex held the value | ~256 B commitment + PoK                     |
| **v3**  | Pedersen + zero-knowledge bit-decomposition range proof              | Issuer Ed25519 public key | **No** — the math proves the threshold claim                                 | ~12 KB JSON range proof at 32-bit precision |

All three versions share the same Ed25519 signature layer, the same
W3C VC-2.0 envelope, the same DB schema (the proof lives in existing
JSON fields), and the same Merkle transparency log on top. The
verifier auto-detects the version from the `evidence.commitment_scheme`
tag in the signed attestation bytes and routes to the correct
verifier path. So a tenant who flips to v3 today still verifies v1
attestations they issued last year.

---

## v3 size implications (read this before turning v3 on)

The range proof is the only Phase-2 artifact with a meaningful payload
cost. At our default `range_encoding = { scale: 1000, bits: 32 }`:

- **JSON proof size**: ~12 KB per attestation (32 bit commitments + 32
  OR-proofs + 1 consistency Schnorr proof, each ~250–350 B encoded).
- **Multi-claim certificates**: a 50-claim cert grows from ~3 KB
  (v1) to ~600 KB (v3). For NCA-bundle export this is fine; for
  inline rendering on operator dashboards consider lazy-loading the
  proof JSON behind a "Show cryptographic proof" disclosure.
- **Verification CPU**: 32 bit Schnorr proofs ≈ 16 ms on warm Node.js
  (~165 Ristretto scalar multiplications). 50-claim cert ≈ 800 ms
  CPU on the verifier — fine for batch jobs, noticeable in interactive
  UIs. The verifier should off-load to a worker thread or stream
  per-claim verification.
- **Range cap**: the `bits` parameter caps the value range at
  `[0, 2^bits)`. With `bits=32` the cap is ~4.3B (after `scale=1000`
  this is ~4.3M as a real-world value). Use `bits=52` for the full
  IEEE-754-safe integer range; below 32 only when you need to shave
  proof size and know the value fits.

If you need smaller proofs at the same bit-width, switching to
Bulletproofs is the canonical next step — they are O(log n) instead
of O(n) per commitment, and they aggregate across multiple range
claims. Out of scope for this upgrade; tracked as a future Verity
Phase 3.

---

## How to opt in

### Per-request (operator integration)

The three issue endpoints accept an optional `commitment_scheme` param:

- `POST /api/v1/verity/attestation/generate`
- `POST /api/v1/verity/attestation/manual`
- `POST /api/v1/verity/certificate/issue`

```jsonc
POST /api/v1/verity/attestation/generate
{
  "regulation_ref": "eu_art70_debris",
  "satellite_norad_id": "12345",
  "expires_in_days": 90,
  "commitment_scheme": "v3",
  "range_encoding": { "scale": 1000, "bits": 32 }   // optional, only for v3
}
```

The param is rejected with `400` if it is anything other than `"v1"`,
`"v2"`, or `"v3"`. When omitted, the value falls through to the
server-wide default (see env var below).

### Server-wide (operator opt-out)

Set the env var `VERITY_CRYPTO_VERSION` to `v1`, `v2`, or `v3`:

- Default (unset, or any unrecognised value): **v1**
- `VERITY_CRYPTO_VERSION=v2`: every attestation that doesn't pin a
  scheme uses Pedersen + Schnorr PoK.
- `VERITY_CRYPTO_VERSION=v3`: every attestation that doesn't pin uses
  full Pedersen + range proof.

The env var is read inside `src/lib/verity/feature-flags.ts`
(`getDefaultCryptoVersion()` and `resolveCommitmentScheme()`). It is
**server-only** — the value is not exposed to the browser bundle.

---

## Migration plan (forward-only)

> **No attestation is ever rewritten.** The version is fixed at
> issue time and stays with the attestation forever. A v1 attestation
> issued in 2026 will still verify in 2030 even if the platform has
> moved to v3. The verifier path detects the version from the signed
> bytes and routes to the correct algorithm.

### Step 0 (DONE): code lands behind a default-v1 fallback

- `src/lib/verity/feature-flags.ts` ships with `getDefaultCryptoVersion()`
  returning `"v1"` for any unset/unknown env value.
- `commitment_scheme` is optional in all three issue routes.
- No behaviour change for existing integrators.

### Step 1: staging soak with v2

- Set `VERITY_CRYPTO_VERSION=v2` in staging.
- Watch the issuance latency (PoK adds ~1–2 ms per attestation) and
  the verifier latency (PoK verify adds ~1 ms).
- Run the existing integration tests (Tier 2 coverage) plus a manual
  smoke against the public verify endpoints.
- Hold for one full week. Roll back via env-var change if anything
  is off.

### Step 2: production v2 default

- Set `VERITY_CRYPTO_VERSION=v2` in production.
- Existing v1 attestations continue to verify (same routes, same
  signatures). New attestations are now v2.
- Wait one **full attestation expiry cycle** (90 days, our default)
  so almost all v1 attestations age out naturally. Old v1
  attestations linked from cert bundles or P2P proofs continue to
  resolve via the version-dispatch verifier.

### Step 3: staging soak with v3

- Set `VERITY_CRYPTO_VERSION=v3` in staging.
- Pay attention to:
  - Bundle-export endpoint payload sizes (50-claim certs jump from
    ~3 KB to ~600 KB).
  - Verifier CPU usage on the public `/api/v1/verity/attestation/verify`
    and `/api/v1/verity/certificate/verify` endpoints — 50-claim
    certs ≈ 800 ms verifier CPU.
  - Mobile-client memory if any third-party verifier app reads the
    proof JSON in-memory.
- Hold for one week. Adjust default `range_encoding.bits` if needed
  (32 is generous for most regulatory thresholds).

### Step 4: production v3 default

- Set `VERITY_CRYPTO_VERSION=v3` in production.
- Same coexistence rule applies — v1 and v2 attestations from earlier
  remain valid for the rest of their expiry window.

### Rollback at any step

A single env-var change reverts the default for new attestations.
Already-issued attestations of higher versions continue to verify
via their version-dispatch routes — they don't need to be regenerated
to revert the default.

---

## Implementation checklist (status)

- [x] Install `@noble/curves` (already in `package.json`)
- [x] Implement Pedersen commitments (`pedersen-provider.ts`)
- [x] Implement Schnorr proof-of-knowledge (PoK) of opening (v2)
- [x] Implement bit-decomposition range proof (v3)
- [x] Version-dispatch in `generateAttestation` and verifier
- [x] **T3-1 — `commitment_scheme` param exposed on `/attestation/generate`,
      `/attestation/manual`, `/certificate/issue`**
- [x] **T3-2 — `VERITY_CRYPTO_VERSION` env var with safe default `"v1"`**
- [x] **T3-3 — This documentation update (size implications, opt-in,
      verifier CPU/payload notes)**
- [x] **T3-4 — Forward-only migration plan documented above**
- [ ] T2-CRYPTO-1 — Pedersen homomorphism doc-vs-implementation
      mismatch (no production caller of `pedersenAdd` today; needs
      design call: BigInt scalar fix or doc revision). Tracked in
      `docs/VERITY-AUDIT-FIX-PLAN.md`.
- [ ] Bulletproofs (Phase 3) — O(log n) range proofs + cross-claim
      aggregation. Future work, not blocking v3 rollout.
