# Verity — Pitch Briefing

> Zero-Knowledge Compliance Attestation for Space Operators.
> Cryptographically provable, offline-verifiable, no blockchain, no trust in Caelex.

---

## The one-line pitch

**Verity** turns every space-regulation compliance claim — "fuel above 15%",
"passivation complete", "collision avoided" — into a mathematically provable
statement that a regulator can verify offline in under a minute, without trusting
Caelex and without revealing the underlying satellite telemetry.

---

## The problem

Regulators (EU Space Act, NIS2, national space laws, ITU, FCC, FAA) increasingly
demand that operators **prove** compliance with specific thresholds — not just
assert it. Three failure modes today:

1. **"Trust me"** — Operator says they complied. No cryptographic anchor.
2. **Full disclosure** — Operator ships raw telemetry. Leaks competitive secrets
   (fuel budgets, orbital plans, customer locations).
3. **Third-party audit** — Expensive, slow, still requires the operator to reveal
   everything to an auditor.

None of these scale to a future where every operator files hundreds of compliance
statements per year across multiple jurisdictions.

---

## The Verity solution — a four-tier cryptographic ladder

Each tier is strictly stronger than the one below. Operators opt into the tier
that matches their compliance risk and privacy needs.

| Tier    | Commitment scheme                                                | What it proves                                                                                                                            | Key primitive                                                                                             |
| ------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **v1**  | SHA-256 hash                                                     | Caelex signed a claim binding a hidden value                                                                                              | SHA-256 + Ed25519 signature                                                                               |
| **v2**  | Pedersen commitment on Ristretto255 + Schnorr proof-of-knowledge | Caelex signed AND proves it knows the opening — commitment is _hiding_ (value is computationally indistinguishable) and _binding_         | Pedersen commit `C = r·G + v·H` + Σ-protocol via Fiat-Shamir                                              |
| **v3**  | Pedersen + zero-knowledge range proof                            | Caelex proves the hidden value actually satisfies the threshold (`v ≥ T` or `v ≤ T`) — verifier needs **no trust** in Caelex's evaluation | Bit-decomposition range proof with Chaum-Damgård-Schoenmakers disjunctive Schnorr OR-proofs (Boudot 2000) |
| **Log** | Append-only Merkle transparency log                              | The attestation exists at a specific log position and was never retroactively rewritten                                                   | RFC 6962 compliant Merkle tree + signed tree heads + consistency proofs                                   |

---

## How a regulator verifies — the end-to-end flow

```
Operator                     Caelex API                    Regulator (offline)
────────                     ──────────                    ───────────────────
                                 │
  generate claim ────────────▶  │  issue attestation
                                 │    (ECD25519 signature
                                 │     + range proof + log leaf)
                                 │
  export bundle ────────────▶   │  builds single JSON:
                                 │    • attestation
                                 │    • W3C Verifiable Credential
                                 │    • inclusion proof
                                 │    • signed tree head (STH)
                                 │    • consistency chain
                                 │    • issuer public keys
                                 │    • DID document
                                 │    • README (verification guide)
                                 │
  download bundle.json  ◀────── │
                                 │
  send bundle ──────────────────────────────────────▶ verify offline:
                                                        1. re-derive bundleId
                                                        2. Ed25519 sigs
                                                        3. range proofs
                                                        4. Merkle inclusion
                                                        5. STH signature
                                                        6. consistency chain
                                                        7. revocation (live ping)
```

**Regulator never contacts Caelex during verification** (except an optional
live revocation ping). All math runs in a sandboxed offline environment with
two free npm packages: `@noble/curves` and `@noble/hashes`.

---

## Public API surface

| Endpoint                                                  | Purpose                                                                 | Auth                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------- |
| `POST /api/v1/verity/attestation/generate`                | Issue a new attestation                                                 | Session                   |
| `POST /api/v1/verity/attestation/verify`                  | Verify any attestation                                                  | Public                    |
| `GET /api/v1/verity/attestation/status/:id`               | Live revocation check (dereference target of W3C VC `credentialStatus`) | Public                    |
| `POST /api/v1/verity/bundle/export`                       | Regulator-ready JSON bundle                                             | Session (operator-scoped) |
| `GET /api/v1/verity/transparency/sth/latest`              | Latest signed tree head                                                 | Public                    |
| `GET /api/v1/verity/transparency/sth?size=N`              | STH at specific tree size                                               | Public                    |
| `GET /api/v1/verity/transparency/leaves?from=&limit=`     | Paginated leaf dump (for full log mirrors)                              | Public                    |
| `GET /api/v1/verity/transparency/inclusion/:id`           | Inclusion proof + STH bundle                                            | Public                    |
| `GET /api/v1/verity/transparency/consistency?old=N&new=M` | Consistency proof between two STHs                                      | Public                    |
| `GET /api/v1/verity/public-key`                           | All Verity issuer public keys (active + rotated)                        | Public                    |
| `GET /.well-known/did.json`                               | W3C DID document for `did:web:caelex.eu`                                | Public                    |

---

## What makes Verity different

### vs. traditional compliance attestations

- **Today**: signed PDF or signed JSON. Binary trust — either you trust the issuer or you don't.
- **Verity**: signed PDF equivalent PLUS math-backed proof that the hidden value satisfies the claim. Trust is replaced by mathematics.

### vs. managed Certificate Transparency logs

- **Today** (Google CT): requires participation in a global shared log, submission rate-limited, log operator can in principle collude with CA.
- **Verity**: operator-scoped log, fully self-hosted, compatible with RFC 6962 tooling (inclusion + consistency proofs standard), no external dependency.

### vs. blockchain-anchored compliance

- **Today**: gas fees, public visibility of every claim, dependency on a specific chain's liveness, settlement delays.
- **Verity**: zero gas, zero settlement delay, zero dependency on anything outside Caelex's infrastructure. Operator data stays private (hiding property of Pedersen). Transparency-log gossip is off-chain via signed tree heads.

### vs. third-party auditor

- **Today**: 6-figure fees, 3-month turnaround, operator has to reveal raw telemetry.
- **Verity**: bundle export in < 1 second, verification in < 1 minute, zero sensitive data disclosed.

---

## Key guarantees for an external verifier

1. **Authenticity** — Every attestation is signed by a specific Verity issuer key, traceable to `did:web:caelex.eu`.
2. **Integrity** — Any modification of a single byte anywhere in the signed body invalidates the signature.
3. **Threshold-truth** (v3 only) — The committed value provably satisfies the compliance threshold. Caelex cannot sign a false claim.
4. **Value-hiding** — Actual satellite telemetry (fuel %, miss distance, etc.) is never revealed. Pedersen commitments are computationally hiding.
5. **Non-removal** — Once published via a signed tree head, an attestation cannot be retroactively deleted without detection by anyone holding a later STH (Merkle consistency proof).
6. **Non-equivocation** — Caelex cannot show different logs to different verifiers: the STH signature binds the root hash to a single public snapshot.

---

## Technical ingredients (zero external cost)

| Component           | Library                               | Role                                                            |
| ------------------- | ------------------------------------- | --------------------------------------------------------------- |
| Elliptic curve      | `@noble/curves` (MIT)                 | Ed25519 signatures, Ristretto255 commitments, BLS12-381         |
| Hashing             | `@noble/hashes` (MIT)                 | SHA-256, SHA-512                                                |
| Database            | PostgreSQL via Neon                   | Attestation storage, Merkle log persistence                     |
| Rate limiting       | Upstash Redis                         | Sliding window per endpoint tier                                |
| Key management      | AES-256-GCM + scrypt                  | Issuer private keys encrypted at rest                           |
| Signatures standard | **RFC 6962** Merkle tree transparency | Inclusion + consistency proofs                                  |
| VC standard         | **W3C VC Data Model 2.0**             | Interop with EUDIW, Microsoft Verified ID, Trinsic, Dock, Entra |
| DID method          | **did:web**                           | HTTPS-resolvable issuer identity, no blockchain                 |

**Zero paid APIs. Zero blockchain. Zero managed crypto services.**

---

## Numbers

| Metric                                      | Value                               |
| ------------------------------------------- | ----------------------------------- |
| Tests (unit + integration)                  | **255 green** across 14 test files  |
| Cryptographic pillars shipped               | **11** (see commit list)            |
| Lines of cryptographic code                 | ~4,000 LOC across `src/lib/verity/` |
| Attestation verification time (client-side) | < 10 ms                             |
| Range proof generation time (v3, 32-bit)    | ~150 ms                             |
| Range proof size (v3, 32-bit)               | < 20 KB (fits in any HTTP response) |
| Inclusion proof size (1M leaves)            | ~640 bytes (20 hashes × 32)         |
| Bundle size (10 attestations)               | ~50 KB JSON                         |
| Log cron cadence                            | Daily STH signing @ 13:00 UTC       |

---

## Tagline options (for a pitch deck)

- _"Compliance you can verify in a math engine, not a meeting room."_
- _"Zero-knowledge means zero trust required."_
- _"Every claim. Every satellite. Every regulator. Cryptographically."_
- _"The audit trail that audits itself."_
- _"Regulator-ready in one JSON download."_

---

## Suggested pitch-graphic structures

### Option A — The cryptographic ladder (vertical)

Stack 4 tiers, each wider than the one below, showing the strictly
increasing guarantees:

```
╔═══════════════════════════════════════════════╗
║ Log  — "nothing was retroactively deleted"   ║
╠═══════════════════════════════════════════════╣
║ v3   — "the value satisfies the threshold"   ║
╠═══════════════════════════════════════════════╣
║ v2   — "commitment is hiding + binding"      ║
╠═══════════════════════════════════════════════╣
║ v1   — "Caelex signed this claim"            ║
╚═══════════════════════════════════════════════╝
```

Each tier labelled with its cryptographic primitive + the new
guarantee it adds.

### Option B — The trust-transfer arrow (horizontal)

Show the progression from "operator says so" → "signature" →
"knowledge proof" → "range proof" → "transparency log" with
annotations pointing to "trust in Caelex required: YES / PARTIAL /
NO" at each step.

### Option C — The end-to-end flow (swimlane)

Three lanes: Operator / Caelex / Regulator. Show the bundle export
as the key hand-off moment, with all the cryptographic artifacts
flowing across the boundary in a single JSON envelope. Highlight
the fact that Caelex is NOT in the Regulator's verification loop.

### Option D — The commitment-explained (visual crypto)

Show a single attestation with its internal structure:

- Signed body (Ed25519 lock icon)
- Pedersen commitment (shape labelled "hides value")
- Range proof (shape labelled "proves threshold")
- Inclusion proof (ladder/tree icon)
- STH signature (lock icon)
  Annotate each with "what this piece buys you".

---

## References

- **Caelex platform** — https://caelex.eu
- **Verity DID document** — https://caelex.eu/.well-known/did.json
- **Live transparency log** — https://caelex.eu/api/v1/verity/transparency/sth/latest
- **RFC 6962** (Certificate Transparency) — https://datatracker.ietf.org/doc/html/rfc6962
- **W3C VC Data Model 2.0** — https://www.w3.org/TR/vc-data-model-2.0/
- **Pedersen commitment paper** (CRYPTO '91) — Pedersen, T.P. _"Non-Interactive and Information-Theoretic Secure Verifiable Secret Sharing"_
- **Boudot range proofs** (EUROCRYPT 2000) — Boudot, F. _"Efficient Proofs that a Committed Number Lies in an Interval"_
- **@noble/curves** — https://github.com/paulmillr/noble-curves
