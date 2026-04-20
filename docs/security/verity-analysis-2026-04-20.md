# Verity — Comprehensive Analysis (2026-04-20)

**Status:** Read-only analysis. No code modified.

## Executive verdict

**Verity is PRODUCTION-READY for Phase 1** (trusted-issuer attestation
model) but **NOT zero-knowledge** in the cryptographic sense. The "ZK
compliance attestation" marketing language is currently fiction —
Phase 2 (Pedersen commitments + Schnorr sigma-protocol range proofs)
is designed in `UPGRADE_PATH.md` but not built. The underlying crypto
(Ed25519 signatures over SHA-256 commitments, AES-256-GCM key
encryption, hash-chained audit log) is solid. Six known incomplete
subsystems are documented below; none are outright broken, but four
are advertised features that don't work yet.

---

## Architecture map

```
src/lib/verity/
  core/                   attestation generation + Ed25519 signing + SHA-256 commits
  keys/                   Ed25519 keygen, per-org rotation, VERITY_MASTER_KEY encryption
  evaluation/             threshold → evidence → attestation orchestration
  certificates/           multi-attestation bundling + offline verifier
  audit-chain/            append-only SHA-256-linked event log
  passport/               compliance-passport builder (PDF-exportable)
  score/                  weighted compliance score calculator
  nca-bridge/             national-authority submission bundles  [PARTIAL]
  p2p/                    peer-to-peer verification             [STUB]
  utils/                  canonical-JSON, redaction, trust-level

src/app/api/v1/verity/       8 API route groups
src/app/verity/              public landing + passport/verify pages
src/app/dashboard/verity/    internal dashboard (generate/list/verify/audit tabs)

Integration points:
  src/lib/shield/verity-integration.server.ts   Shield CA → Verity attestation [PARTIAL]
  src/lib/ephemeris/data/verity-adapter.ts      Ephemeris reads attestation summaries
```

---

## Subsystem status

| Subsystem                                 | Status              | Notes                                                                      |
| ----------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| `core/attestation.ts`                     | ✅ Complete         | Ed25519 sign/verify; actual_value never logged or stored                   |
| `core/commitment.ts`                      | ✅ Phase 1 only     | SHA-256; not homomorphic; Phase 2 would need Pedersen                      |
| `core/crypto-provider.ts`                 | 🟡 Interface only   | Phase 2 variant (`PedersenCryptoProvider`) not built                       |
| `keys/issuer-keys.ts`                     | ✅ Production-grade | Ed25519 + AES-256-GCM encrypted with `VERITY_MASTER_KEY`; rotation support |
| `evaluation/threshold-evaluator.ts`       | ✅ Real             | Pipes through evaluate → resolve evidence → attest → audit-log             |
| `evaluation/evidence-resolver.ts`         | 🟡 Partial          | ComplianceEvidence lookup returns null; only Sentinel + Assessment work    |
| `evaluation/regulation-thresholds.ts`     | ✅ Real             | 9 regulations (EU Art 70/68/72/64/75/80 + IADC + NIS2 + ITU)               |
| `certificates/generator.ts`               | ✅ Complete         | Offline-verifiable certificates with embedded signed attestations          |
| `certificates/verifier.ts`                | ✅ Complete         | Validates cert sig + every embedded attestation                            |
| `audit-chain/`                            | ✅ Real             | Append-only SHA-256-linked entries; 4 event types                          |
| `passport/builder.server.ts`              | ✅ Real             | PDF passport with score + reg status + validity                            |
| `score/calculator.ts`                     | ✅ Real             | Weighted by trust level × regulation category                              |
| `p2p/request-builder.ts`                  | ❌ Stub             | Returns `{requestId, expiresAt}`; no verification logic wired              |
| `nca-bridge/submission-builder.server.ts` | 🟡 Partial          | Jurisdiction filter always `return true` — no real filtering               |
| `utils/`                                  | ✅ Complete         | canonical-JSON, redaction, trust-level helpers all solid                   |

---

## API routes — authentication + completeness

| Route                          | Method | Auth                  | Status                                                             |
| ------------------------------ | ------ | --------------------- | ------------------------------------------------------------------ |
| `/attestation/generate`        | POST   | Session               | ✅ Real                                                            |
| `/attestation/verify`          | POST   | Public + rate-limited | ✅ Real                                                            |
| `/attestation/list`            | GET    | Session               | ✅ Real                                                            |
| `/attestation/[id]/revoke`     | POST   | Session               | ✅ Real                                                            |
| `/attestation/manual`          | POST   | Session               | 🟡 Minimal — creates attestation w/o evidence evaluation           |
| `/certificate/issue`           | POST   | Session               | ✅ Real (IDOR fix documented on L125-129 — `C3 fix` comment)       |
| `/certificate/verify`          | POST   | Public + rate-limited | ✅ Real                                                            |
| `/certificate/list`            | GET    | Session               | ✅ Real                                                            |
| `/certificate/[id]/revoke`     | POST   | Session               | ✅ Real                                                            |
| `/certificate/[id]/visibility` | PATCH  | Session               | ✅ Real                                                            |
| `/public-key`                  | GET    | Public                | ✅ Real                                                            |
| `/passport/generate`           | POST   | Session               | ✅ Real                                                            |
| `/passport/[id]`               | GET    | Token / public flag   | ✅ Real                                                            |
| `/score/[operatorId]`          | GET    | Public                | ✅ Real                                                            |
| `/score/me`                    | GET    | Session               | ✅ Real                                                            |
| `/p2p/request`                 | POST   | Session               | ❌ Stub                                                            |
| `/p2p/respond/[id]`            | POST   | Session               | ❌ Stub                                                            |
| `/p2p/verify/[id]`             | GET    | Token                 | ❌ Stub                                                            |
| `/nca-bundle`                  | GET    | Session               | 🟡 Partial (filter stubbed)                                        |
| `/audit-chain`                 | GET    | Session               | ✅ Real (returns entries; no offline hash-chain verifier endpoint) |

---

## Crypto posture — what's real vs marketing

### Real (Phase 1)

- Ed25519 sign/verify via Node.js `crypto` module (PKCS8 / SPKI DER)
- SHA-256 commitment = `SHA256(context || float64LE(value) || blinding)` with 256-bit random blinding
- AES-256-GCM encryption of private keys at rest (master key in env)
- `timingSafeEqual()` on blinding-factor comparison in `openCommitment`
- `safeLog()` redaction prevents `actual_value` / `blinding_factor` in logs
- `ATTESTATION_SIGNED_FIELDS` / `CERTIFICATE_SIGNED_FIELDS` select exactly which fields are signed
- `issuer_known` check prevents self-issued attestations during verify

### Claimed but NOT implemented (Phase 2)

- **Pedersen commitments (Ristretto255)** — `@noble/curves` not in `package.json`
- **Schnorr sigma-protocol range proofs** — not built
- **Zero-knowledge verification** — currently verifier trusts Caelex's issuer signature; future verifier checks cryptographic proof

The `UPGRADE_PATH.md` document is honest about this gap. External
marketing is not — "zero-knowledge" claim on the Verity landing page
is currently accurate only as an aspirational roadmap item.

---

## Bugs / incompleteness — enumerated

### B1 — Zero-Knowledge marketing vs implementation reality

- **File:** `src/lib/verity/UPGRADE_PATH.md`, `core/crypto-provider.ts`
- **Problem:** Marketing says "zero-knowledge compliance attestation" but Phase 1 is trusted-issuer. `@noble/curves` dependency not installed; `PedersenCryptoProvider` not built.
- **Severity:** HIGH (truth-in-advertising risk)

### B2 — Evidence resolver incomplete for ComplianceEvidence

- **File:** `src/lib/verity/evaluation/evidence-resolver.ts:116`
- **Problem:** Comment states ComplianceEvidence has no numeric field; Phase 2 needs `evidence_values` table. Currently only Sentinel packets + manual Assessments can feed attestations.
- **Severity:** MEDIUM (limits real-world usability to Sentinel-equipped satellites)

### B3 — P2P verification completely stubbed

- **File:** `src/lib/verity/p2p/request-builder.ts:14`
- **Problem:** Returns only ID + expiry; no actual verification-request payload, no sharing protocol, no response handling.
- **API routes affected:** `/p2p/request`, `/p2p/respond/[id]`, `/p2p/verify/[id]`
- **Severity:** MEDIUM (advertised feature, non-functional)

### B4 — NCA submission bundle has no jurisdiction filter

- **File:** `src/lib/verity/nca-bridge/submission-builder.server.ts:53-58`
- **Problem:** Predicate always returns `true` — all org attestations included regardless of relevance to the target NCA.
- **Severity:** LOW (works, but sends too much)

### B5 — Audit-chain offline verification endpoint missing

- **File:** `src/app/api/v1/verity/audit-chain/route.ts`
- **Problem:** Returns entries but does not expose a verification endpoint that checks chain hash integrity in response. Consumers must reconstruct hash chain themselves.
- **Severity:** LOW (data itself is tamper-evident in DB)

### B6 — Shield → Verity integration creates UNSIGNED attestations

- **File:** `src/lib/shield/verity-integration.server.ts:179-181`
- **Problem:** Writes attestation record with `issuerKeyId: "shield_system"` and `signature: "pending_verity_signing"` — placeholder values, not real crypto.
- **Impact:** CA compliance events are tracked but the resulting attestations cannot be cryptographically verified.
- **Severity:** MEDIUM (gap in trust chain)

### B7 — Previously-fixed IDOR documented in code

- **File:** `src/app/api/v1/verity/certificate/issue/route.ts:125-129`
- **Status:** Already fixed — comment labelled `C3 fix` shows operatorId was corrected from `user.id` to `org.id`.
- **Severity:** N/A (resolved)

---

## Dead code / orphans

- `p2p/request-builder.ts:buildVerificationRequest()` — exported but no callers outside its own test file
- `VerityP2PRequest` Prisma model — created by `/p2p/request` POST but never queried for workflow completion
- `nca-bridge/types.ts` — types defined; filter logic downstream is stubbed
- `/attestation/manual` endpoint — exists but the dashboard UI does not appear to use it

---

## Test coverage

### Present

- `tests/unit/lib/verity/attestation.test.ts`
- `tests/unit/lib/verity/commitment.test.ts`
- `tests/unit/lib/verity/certificate.test.ts`
- `tests/unit/lib/verity/canonical-json.test.ts`
- `tests/unit/lib/verity/serialize-for-signing.test.ts`
- `tests/unit/lib/verity/trust-level.test.ts`
- `tests/unit/lib/verity/redaction.test.ts`
- `tests/unit/lib/verity/keys/issuer-keys.test.ts`
- `tests/unit/lib/verity/evaluation/threshold-evaluator.test.ts`
- `tests/unit/shield/verity-integration.test.ts`

### Missing

- No `tests/integration/verity/*` or `tests/e2e/verity/*`
- API routes uncovered: `/attestation/generate`, `/certificate/issue`, `/passport/generate`, `/p2p/*`, `/nca-bundle`, `/audit-chain`
- End-to-end issue → verify → revoke lifecycle not tested
- Key-rotation across attestation lifetime not tested

**Coverage estimate:** core crypto + attestation logic ≈ 85% covered; API surface ≈ 20%.

---

## Shipping checklist (Phase 1 launch)

### Ship-blocking

- [ ] B6: finish Shield CA attestation signing (it creates placeholder-signed records today)
- [ ] Add E2E coverage for `/certificate/issue` + `/certificate/verify` — currently the multi-attestation bundle path has unit tests only
- [ ] Marketing language correction: "zero-knowledge" vs "Caelex-signed" — align claims with Phase 1 reality

### Ship-with-known-limitations

- [ ] B3: gate `/p2p/*` behind feature flag OR return 501 Not Implemented with coming-soon messaging
- [ ] B2: document that attestations require Sentinel data (or manual assessment) until evidence resolver is extended

### Post-launch (Phase 2)

- [ ] Install `@noble/curves`
- [ ] Build `PedersenCryptoProvider`
- [ ] Implement Schnorr sigma-protocol range proofs
- [ ] Feature-flag Phase 2 attestations; add version byte to enable gradual rollout

---

## Bottom line

Verity is **more real than typical "coming soon" features** and **less
real than its marketing**. The crypto foundation is sound, the API
surface is 16-of-20 fully functional, the three biggest gaps (P2P,
NCA filter, Shield-CA signing) are clearly scoped, and the Phase 2 ZK
upgrade has a written design document. If the product were renamed
from "Zero-Knowledge Compliance Attestation" to "Cryptographically
Signed Compliance Attestation," today it would be a defensible Phase 1
product.
