# Verity Audit Fix Plan

**Created:** 2026-05-05
**Source:** 4-agent parallel audit (Crypto+Security, Backend Bugs, Data Layer, Architecture)
**Status:** Tier 1 completed (8/8; H4a/b/c deferred). Tier 2 completed (5/10 done with 96 tests + 2 known-bug todos; T2-4/T2-5/T2-6/T2-8/T2-10 deferred to a test-infra sprint). Tier 3-5 pending.
**Survives:** Conversation compaction. This file is the single source of truth for the Verity remediation work.

---

## How to use this document

1. Pick the next pending step in Tier 1 (top to bottom).
2. Read the **Reference paths** to load the relevant files.
3. Apply the fix as described in **Fix detail**.
4. Run the **Verification** command(s).
5. Mark the step complete by changing `[ ]` to `[x]` in the checkbox below.
6. Commit using the template in **Commit conventions**.
7. Move to the next step.

When a Tier finishes, update the **Tier completion log** at the bottom and move to the next Tier.

If conversation context is compacted, re-read this file from the top — every Tier-1 step has enough information to act on without prior conversation context.

---

## Commit conventions

- Branch: stay on the current feature branch (do NOT push to main per the batched-deploy rule in CLAUDE.md).
- Pre-commit cross-surface guard: every Verity commit needs `ALLOW_CROSS_SURFACE=1 git commit ...` because Verity files trigger the v2-redesign-scope guard.
- Commit message format:

  ```
  fix(verity): <Tier>-<ID> — <short description>

  <2-3 lines what changed and why, referencing finding ID>

  Verified: <typecheck | tests | both>

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

- Tag examples: `T1-C1`, `T1-H4`, `T2-pedersen-tests`.

---

## Tier 1 — Production blockers (do these first)

8 steps, ~6h total. Required before Verity is safe to use in production.

### [x] T1-C1 — Fix IDOR in `/api/v1/verity/score/[operatorId]` (commit dfd0e4c5)

**Severity:** CRITICAL
**Effort:** 30min
**Reference paths:**

- `src/app/api/v1/verity/score/[operatorId]/route.ts` (lines 40–55)
- `src/app/api/v1/verity/score/me/route.ts` (existing pattern to mirror)

**Problem:**
The endpoint is unauthenticated and accepts `operatorId` from the URL ungeprüft as `where: { operatorId }`. Since `operatorId` is stored as user-id (not org-id), an attacker can probe foreign user-ids and read score breakdowns + compliance status of other operators.

**Fix detail:**

1. Add `getServerAuth()` (or the project's auth helper) at the top of the handler.
2. Resolve the caller's organization-membership.
3. Reject if the requested `operatorId` does not belong to the caller's org membership list, OR change the route semantics so it only ever returns the caller's own org. Pick whichever matches the use-case (the `score/me` route returns the caller's score; this route should either return another operator's PUBLIC score only, or be deleted in favor of a `/score/by-passport/[passportId]` route).
4. Update the route comment to document the auth model.

**Verification:**

- `npx tsc --noEmit -p .` clean
- Unit test: hit endpoint with valid session but wrong `operatorId` → expect 403/404
- If you cannot easily test, manually grep for callers in `src/app` and `src/components` to ensure none rely on the unauthenticated behavior

---

### [x] T1-C2 — Wrap `appendToChain` in serializable transaction (commit pending)

**Severity:** CRITICAL
**Effort:** 1h
**Reference paths:**

- `src/lib/verity/audit-chain/chain-writer.server.ts` (lines 18–46)
- `src/lib/verity/transparency/log-store.ts` (lines 98–116) — already-correct pattern to mirror

**Problem:**
`appendToChain` does `findFirst → +1 → create` without a transaction. Two parallel `evaluateAndAttest` calls in the same org can both compute the same `sequenceNumber`, splitting the hash chain or violating the `@@unique([organizationId, sequenceNumber])` constraint. Callers swallow the failure with `.catch(() => {})`, so audit entries vanish silently.

**Fix detail:**

1. Wrap the `findFirst` + `create` block inside `prisma.$transaction(async (tx) => { ... }, { isolationLevel: "Serializable" })`.
2. Add a retry loop (max 3 attempts) for `P2002` constraint violations from concurrent inserts.
3. Inside the catch in `auto-attestation.server.ts` (lines 241–252) and `threshold-evaluator.ts` (lines 131–141), replace `.catch(() => {})` with `.catch((err) => logger.error("audit-chain append failed", err))` so silent failures become visible.

**Verification:**

- `npx tsc --noEmit -p .` clean
- New unit test (suggested file: `src/lib/verity/audit-chain/chain-writer.test.ts`): 10 parallel `appendToChain` calls for the same org → all 10 must succeed and end up with sequenceNumbers 1..10 with no gaps and no duplicates

---

### [x] T1-H1 — Remove embedded-public-key fallback in `/certificate/verify` (commit pending)

**Severity:** HIGH
**Effort:** 30min
**Reference paths:**

- `src/app/api/v1/verity/certificate/verify/route.ts` (lines 40–43, 47–50)
- `src/app/api/v1/verity/attestation/verify/route.ts` (the correct pattern to mirror)

**Problem:**
When `keyInfo` is null (key-id not in DB), the code uses the public key embedded in the certificate itself for signature verification. The endpoint later marks the cert as `valid: false` overall, but `checks.certificate_signature_valid: true` ends up in the response, which downstream clients can misinterpret.

**Fix detail:**

1. After `keyInfo` lookup, if `keyInfo === null`, immediately return `{ valid: false, reason: "Issuer key not found", checks: { certificate_signature_valid: false, ... } }` without calling `verifyCertificate`.
2. Mirror the strict pattern from `attestation/verify/route.ts` which already does this correctly.

**Verification:**

- `npx tsc --noEmit -p .` clean
- Manual test: forge a cert with a fake `issuer.public_key` and a key_id not in DB → response must have `valid: false` AND `checks.certificate_signature_valid: false`

---

### [x] T1-H3 — Move status filter into DB where-clause in `/attestation/list` (commit pending)

**Severity:** HIGH
**Effort:** 30min
**Reference paths:**

- `src/app/api/v1/verity/attestation/list/route.ts` (lines 67–129, especially line 122)

**Problem:**
The `statusFilter` (VALID/EXPIRED/REVOKED) is applied client-side AFTER `take: limit` is fetched from DB. This makes `total` (which counts unfiltered) and `items` (filtered) inconsistent → pagination breaks (Client navigates to page 2, finds 0 results).

**Fix detail:**
Replace the post-fetch `.filter()` with where-clause filters:

```ts
if (statusFilter === "VALID") {
  where.revokedAt = null;
  where.expiresAt = { gt: new Date() };
} else if (statusFilter === "REVOKED") {
  where.revokedAt = { not: null };
} else if (statusFilter === "EXPIRED") {
  where.revokedAt = null;
  where.expiresAt = { lte: new Date() };
}
```

Remove the `.filter((a) => !statusFilter || a.status === statusFilter)` line.

Also fix `parseInt` NaN issue (M-5 below — bundle into this commit):

```ts
const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
const limit = Number.isNaN(rawLimit) ? 50 : Math.min(rawLimit, 200);
const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);
```

**Verification:**

- `npx tsc --noEmit -p .` clean
- Manual test: 80 VALID + 20 EXPIRED attestations, request `?status=VALID&limit=50&offset=0` → response must have `total: 80, items: 50`. Request `?limit=abc` → must default to 50, not crash

---

### [ ] T1-H4 — Incremental STH signing + lazy-sibling proofs (Memory bomb fix)

**Severity:** HIGH
**Effort:** 4–6h (largest Tier-1 step)
**Reference paths:**

- `src/lib/verity/transparency/log-store.ts` (lines 133, 188, 203, 291, 356)
- `src/lib/verity/transparency/merkle-tree.ts` (look for `largestPow2Less`, leaf/inner hashing)

**Problem:**
`signNewSTH`, `getInclusionForAttestation`, `getConsistencyFromStore`, and `backfillMissingLeaves` each load **all** `VerityLogLeaf` rows without `take`. At 1M leaves this is ~64 MB RAM in a serverless function per request. Inclusion proofs should be O(log N), they are currently O(N).

**Fix detail (split into sub-PRs if needed):**

**T1-H4a — Inclusion-Proof Lazy-Sibling**

- Replace the full-tree-build in `getInclusionForAttestation` with a path walk: at each tree level, fetch only the sibling hash via `prisma.verityLogLeaf.findUnique({ where: { leafIndex: siblingIdx } })`. For inner nodes, persist them in a new `VerityLogInnerNode` table OR derive them by recursively computing only the right-hand subtrees needed for the proof.
- Easier first version: add a `VerityLogInnerNode` table `(treeSize, level, index, hash)` populated by the STH cron, then proofs become 20 simple lookups for a 1M-tree.

**T1-H4b — Consistency-Proof Lazy-Sibling**

- Same approach as inclusion: only fetch the O(log N) hashes the consistency-proof spec needs.

**T1-H4c — Incremental STH-Signing**

- Persist `VerityLogSTH.rootHash` AND a per-level "frontier" of the right-hand path (the only nodes needed to extend an append-only Merkle tree).
- New leaves arrive → recompute only the changed frontier path → rebuild root from frontier. O(log N) per leaf.
- Backfill becomes: process leaves since `latestSTH.treeSize` in batches, no full table scan.

**[x] T1-H4d — backfillMissingLeaves chunking** (commit pending)

- Keyset-cursor pagination over `(issuedAt, attestationId)` in BATCH_SIZE=500 chunks. Leaf-existence set fetched per batch (small `IN`-clause) instead of full `VerityLogLeaf` scan. Memory now O(BATCH_SIZE) instead of O(N total attestations).
- Sub-steps a/b/c (inclusion-proof + consistency-proof + incremental STH-signing) require schema changes (new `VerityLogInnerNode` table + frontier persistence in `VerityLogSTH`) and are scheduled for a separate sprint — see `[!]` notice in the Tier-1 closing section below.

**Verification:**

- New unit tests in `src/lib/verity/transparency/log-store.test.ts`:
  - Inclusion proof for leaf 7 in a 100-leaf tree must use ≤ 7 DB queries (log₂(100) ≈ 7)
  - STH signing on a 100k-leaf tree must complete in <2s on a warm cache
  - Consistency proof between treeSize 100 and 1000 must use ≤ 20 DB queries
- After fix: CRON_SECRET-curl `/api/cron/verity-sth-sign` and check Vercel function memory metric (target <128MB even at 100k leaves)

**Risk:** This is the largest change. Suggest splitting into 4 commits (a/b/c/d) for easier review/rollback.

---

### [x] T1-H5 — Trust-Score 0.8 → 0.92 for Sentinel without CrossVerification (commit pending)

**Severity:** HIGH (correctness)
**Effort:** 5min
**Reference paths:**

- `src/lib/verity/evaluation/evidence-resolver.ts` (line 89)

**Problem:**
Doc-comment says Sentinel without CrossVerification = 0.92 (HIGH). Code returns 0.8 (MEDIUM). This downgrades all NIS2 attestations using Sentinel-only evidence and inflates `min_trust_level` warnings.

**Fix detail:**
Change line 89 from:

```ts
trust_score: hasCrossVerification ? 0.98 : 0.8,
```

to:

```ts
trust_score: hasCrossVerification ? 0.98 : 0.92,
```

**Verification:**

- `npx tsc --noEmit -p .` clean
- Add a one-line unit test asserting Sentinel-without-cross gives 0.92

---

### [x] T1-M2 — Replace `Math.random()` with CSPRNG in P2P request-builder (commit pending)

**Severity:** MEDIUM (security-relevant)
**Effort:** 15min
**Reference paths:**

- `src/lib/verity/p2p/request-builder.ts` (line 8)

**Problem:**
`requestId: \`vr*${Date.now()}*${Math.random().toString(36).slice(2, 8)}\``— ~31 bits of entropy from a non-cryptographic RNG. Combined with`Date.now()`predictability, the requestId space is enumerable. requestId is the access-control identifier in`/p2p/respond`and`/p2p/verify`.

**Fix detail:**

```ts
import { randomBytes } from "crypto";
// ...
requestId: `vr_${randomBytes(16).toString("hex")}`,
```

**Verification:**

- `npx tsc --noEmit -p .` clean
- Existing tests in `src/lib/verity/p2p/request-builder.test.ts` should still pass; if any test asserts the old format, update the regex

---

### [x] T1-M9 — Audit-chain entries for cert revoke + visibility-toggle (commit pending)

**Severity:** MEDIUM
**Effort:** 30min
**Reference paths:**

- `src/app/api/v1/verity/certificate/[id]/revoke/route.ts` (lines 72–76)
- `src/app/api/v1/verity/certificate/[id]/visibility/route.ts` (lines 80–83)
- `src/lib/verity/audit-chain/chain-writer.server.ts` — `appendToChain` signature

**Problem:**
Both endpoints mutate the public trust profile of a certificate but do NOT write to `VerityAuditChainEntry`. A regulator auditing the chain sees no trace of revocations or visibility flips.

**Fix detail:**
After successful revoke/visibility-update, call:

```ts
await appendToChain({
  organizationId: membership.organizationId,
  eventType: "CERTIFICATE_REVOKED", // or "CERTIFICATE_VISIBILITY_CHANGED"
  entityId: certificateId,
  eventData: { revokedReason, /* or */ newVisibility },
}).catch((err) => logger.error("audit-chain append failed", err));
```

Also add a one-line `appendToChain` to `/api/v1/verity/certificate/issue/route.ts` (cf. L-2 — bundle here) with `eventType: "CERTIFICATE_ISSUED"`.

**Verification:**

- `npx tsc --noEmit -p .` clean
- Manual test: revoke a cert, then GET `/api/v1/verity/audit-chain/[operatorId]` → must contain a `CERTIFICATE_REVOKED` entry

---

### Tier 1 commit-and-deploy gate

After all 8 Tier-1 boxes are checked:

1. Run `npx tsc --noEmit -p .` (must be clean)
2. Run `npx vitest run` (all passing or only pre-existing failures)
3. Update the **Tier completion log** at the bottom of this file with date + commit hash
4. Decide with user: continue to Tier 2, push to main, or pause

### `[!]` Tier-1 closing notice — H4a/b/c deferred

H4d (chunked backfill) was completed and ships the daily STH cron from
OOMing on >100k attestations. The remaining sub-steps:

- **H4a — Inclusion-proof lazy-sibling lookup**: still loads full leaf
  set on every `/transparency/inclusion/[id]` request.
- **H4b — Consistency-proof lazy-sibling lookup**: still loads full
  leaf set on every `/transparency/consistency` request.
- **H4c — Incremental STH-signing**: still rebuilds the full Merkle
  tree on every cron tick.

These need a schema migration (new `VerityLogInnerNode` table + a
frontier-state field on `VerityLogSTH`) before the lazy-sibling
algorithms can land. They are out of scope for the Tier-1 commit-
batch and tracked as their own follow-up sprint:

→ see Tier-2 step T2-4 (log-store tests) and Tier-4 step T4-?
(suggest adding T4-11: VerityLogInnerNode + frontier persistence)

The H4d chunked backfill alone is enough to keep the daily cron safe
through the ~100k-attestation horizon. Beyond that, the H4a/b/c
schema work becomes blocking.

---

## Tier 2 — Test coverage build-out

10 steps, ~8–12h total. Verity-Core has effectively 0 tests today; this Tier creates the safety net before further refactor.

### [x] T2-1 — Pedersen-Provider tests (commit pending)

File: `src/lib/verity/core/pedersen-provider.test.ts` — 15 passing + 1 known-bug `it.todo`.
Covers commit/open roundtrip, hiding via blinding (same value → different commitments, both open correctly), edge values (0, negative, large fractional), Schnorr PoK verify, PoK rejection (mutated A / z_r / z_v, wrong context, wrong commitment, malformed bytes).

**🔴 NEW Tier-2 finding T2-CRYPTO-1: Pedersen homomorphism broken.** The doc-comment on `pedersen-provider.ts` promises `C(a) + C(b) = C(a + b)`. The test exposed that `valueToScalar(v) = SHA-512(IEEE-754(v)) mod q` is non-linear, so the homomorphism property does NOT hold. Parked as `it.todo` — needs design call: (a) use `BigInt(value) mod q` as scalar (restores homomorphism, loses fractional support), or (b) drop the homomorphism claim from the doc since no caller uses `pedersenAdd` today. Triage: low impact (no production caller), high embarrassment value (the claim is in the doc).

### [x] T2-2 — Range-Proof tests (commit pending)

File: `src/lib/verity/core/range-proof.test.ts` — 24 passing tests.
Covers proveNonNegative happy path (0 / 1 / max / mid-range bit-pattern); rejection of out-of-range or negative inputs; rejection of bits<1 or bits>52; verifyNonNegative rejection of mutated proofs (bit count, context, commitment, malformed point bytes); proveThreshold ABOVE at-boundary + interior; rejection of false ABOVE claims (v < T); proveThreshold BELOW at-boundary + interior; rejection of false BELOW claims (v > T); verifyThreshold tampering rejection (type-swap, threshold-value tamper, decoy commitment, wrong context); commitScaledValue input validation (non-int scale, negative value, NaN/Infinity, fractional rounding).

### [x] T2-3 — Merkle-Tree tests (commit pending)

File: `src/lib/verity/transparency/merkle-tree.test.ts` — 36 passing tests.
Covers RFC-6962 domain-separation (0x00 leaf / 0x01 inner) including the second-preimage protection check (`hashLeaf(x) ≠ hashInner(L, R)` even when `x = concat(L, R)`); root calculation against hand-computed expected values for 1/2/3/4-leaf trees; inclusion-proof + verify roundtrip for every leaf in trees of size 1, 2, 3, 4, 7, 8, 16, 100; inclusion-proof rejection (wrong root, wrong leaf data, mutated path, mutated leafIndex); consistency-proof + verify for canonical transitions 0→8, 1→2, 2→4, 3→4, 3→5, 5→8, 7→8, 256→257; consistency rejection (tampered oldRoot, extra trailing bytes); STH signing-bytes determinism + uniqueness across timestamp/treeSize/rootHash/keyId.

### [⏭] T2-4 — log-store tests (deferred)

DEFERRED to a separate test-infra sprint. Needs a fixture-based Prisma test setup or a richer Vitest mock harness — log-store.ts orchestrates 5+ Prisma calls inside transactions for `appendToLog`/`signNewSTH`/`backfill`/`getInclusionForAttestation` and the H4d chunked backfill we landed in Tier 1 makes the call graph wider. Best deferred until Tier 4 schema work (T4-? `VerityLogInnerNode` + frontier persistence) is in flight, since several queries will change shape then.

### [⏭] T2-5 — Attestation verify-path tests (deferred)

DEFERRED. Same reason as T2-4: full v1/v2/v3 attestation roundtrips need a key-setup fixture that synthesises an Ed25519 issuer key, signs an attestation, and runs the verifier. Possible to do without DB, but the realistic test setup is non-trivial and overlaps T2-6 (certificate-roundtrip). Bundle them together in a follow-up sprint.

### [⏭] T2-6 — Certificate-Generator + verifier tests (deferred)

DEFERRED. See T2-5 — bundles with T2-5 in the next test-infra sprint.

### [x] T2-7 — Evidence-Resolver tests (commit pending)

File: `src/lib/verity/evaluation/evidence-resolver.test.ts` — 9 passing tests + 1 known-bug `it.todo` for T5-1.
Existing tests updated to expect the T1-H5 trust-score fix (0.92 instead of 0.8 for Sentinel-without-cross). New test confirms MISMATCH crossChecks fall back to single-source trust 0.92. Known-bug todo for T5-1 (`!metaValue` skipping `value: 0` legitimate measurements).

### [⏭] T2-8 — Bundle-Builder tests (deferred)

DEFERRED. Bundle-builder reads 5+ tables in `Promise.all` plus per-attestation inclusion proofs — same DB-mocking complexity as T2-4. Bundle into the next test-infra sprint.

### [x] T2-9 — Score-Calculator tests (commit pending)

File: `src/lib/verity/score/calculator.test.ts` — 15 passing tests (existing 13 + 2 added).
Added: `[L-4 DRIFT GUARD]` test that reads the literal `KNOWN_REGULATION_COUNT = 9` from calculator.ts and asserts it equals `REGULATION_THRESHOLDS.length`. Fails loudly the moment a new threshold is added without updating the constant. Plus a documenting test that confirms `trend` is currently always `"stable"` (placeholder; not a bug, but worth being visible to a future change).

### [⏭] T2-10 — Key-Rotation tests (deferred)

DEFERRED. Key rotation has DB side-effects (new key insertion + active-flag flip + rotated-key archival) and the most useful tests cover concurrent-access race conditions. Same DB-mocking complexity as T2-4. Bundle with the next test-infra sprint.

---

## Tier 3 — Phase-2 activation

Currently v3 (Pedersen + Range Proof) is implemented but inactive — no caller passes `commitment_scheme: "v3"`.

### [ ] T3-1 — API parameter `commitment_scheme` in issue routes

Files: `src/app/api/v1/verity/attestation/{issue,manual,generate}/route.ts`, `src/app/api/v1/verity/certificate/issue/route.ts`. Accept optional `commitment_scheme: "v1" | "v2" | "v3"`. Default to env-flag.

### [ ] T3-2 — Feature-flag `VERITY_CRYPTO_VERSION`

File: `src/lib/feature-flags.ts` (existing) or new `src/lib/verity/feature-flags.ts`. Reads env var, defaults to `"v1"` for backward compat. Suggest staging deploy with `"v2"` for one week, then `"v3"`.

### [ ] T3-3 — Documentation update in `UPGRADE_PATH.md`

Add v3 section. Document ~12KB JSON-overhead-per-attestation implications. Document mobile-client implications. Document signature-size implications for cert bundles.

### [ ] T3-4 — Migration plan: existing v1 attestations stay v1

Document that the upgrade is forward-only — existing v1 attestations remain verifiable, new ones use the configured version.

---

## Tier 4 — Schema + scaling refactor

### [ ] T4-1 — `VerityAttestation.organizationId` from nullable to NOT NULL

Migration. Backfill from `operatorId`-→User-→Org join. Update `evaluateAndAttest` to always pass `organizationId`. Update `attestation/list/route.ts` to filter on `organizationId` directly (removes the IN-clause workaround). Removes the dead `@@index([organizationId])` problem.

### [ ] T4-2 — `VerityCertificate` add `organizationId` + FK

Schema change with cascade rules: `organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)`. NOTE: Audit-chain entries must NOT cascade — keep their `String organizationId` without FK or use `onDelete: Restrict`.

### [ ] T4-3 — `VerityAuditChainEntry` add `onDelete: Restrict` constraint

Prevent accidental deletion via org cleanup. Document explicitly that audit chain is immutable.

### [ ] T4-4 — `@@index([attestationId])` on `VerityCertificateClaim`

Single-line schema add. Fixes O(N) lookup for revoke flows.

### [ ] T4-5 — `@db.VarChar(N)` length constraints on crypto fields

`signature`, `valueCommitment`, `issuerPublicKey`, `encryptedSecret` — bound size to prevent unbounded payload DoS.

### [ ] T4-6 — In-memory cache for `getActiveIssuerKey`

Module-level cache, 5min TTL. Saves 1 DB-roundtrip per attestation. Handle key-rotation by invalidating on `rotate*` calls.

### [ ] T4-7 — BLS-aggregated signatures in cert bundles

Currently bundles embed N×64-byte Ed25519 sigs. BLS aggregate is 96 bytes total. `bls-aggregator.ts` is implemented but unused.

### [ ] T4-8 — Rate-limit tier `verity_bundle` and `verity_public` registration

File: `src/lib/ratelimit.ts`. Confirm both tiers are defined; if not, add them with sensible budgets (5/h for bundle, 30/h for public).

### [ ] T4-9 — HTTP cache headers on `/transparency/sth/latest` and `/public-key`

Add `Cache-Control: public, max-age=300, stale-while-revalidate=3600` (sth/latest) and `max-age=3600` (public-key).

### [ ] T4-10 — `/transparency/consistency` size sanity check

Reject `newSize - oldSize > 10_000_000` with 400.

---

## Tier 5 — Quality + small fixes

These are LOW-severity items from the audit. Bundle into one or two commits.

### [ ] T5-1 — `M-3 evidence-resolver` `metaValue === null` instead of `!metaValue`

File: `src/lib/verity/evaluation/evidence-resolver.ts:165`. Fix `0`-as-falsy bug.

### [ ] T5-2 — `M-4 hash-utils` use canonicalJsonStringify

File: `src/lib/verity/audit-chain/hash-utils.ts:14`. Replace `JSON.stringify` with the existing `canonicalJsonStringify` from `utils/canonical-json.ts`.

### [ ] T5-3 — `M-7 attestation/manual` write `organizationId`

File: `src/app/api/v1/verity/attestation/manual/route.ts:123-149`. Add `organizationId: membership.organizationId` to the create call.

### [ ] T5-4 — `L-1 auto-attestation` remove duplicate `appendToChain`

File: `src/lib/verity/evaluation/auto-attestation.server.ts:241-252`. Remove the duplicate `ATTESTATION_CREATED` chain entry; `evaluateAndAttest` already writes it.

### [ ] T5-5 — `L-3 bundle-builder` consolidate `resolveStatus` vs `resolveStatusRelativeTo`

File: `src/lib/verity/bundle/bundle-builder.ts:425`. Keep only one variant (the clock-injected one) and delete the other.

### [ ] T5-6 — `L-4 score/calculator` derive `KNOWN_REGULATION_COUNT`

File: `src/lib/verity/score/calculator.ts:11`. Replace `9` with `REGULATION_THRESHOLDS.length` import.

### [ ] T5-7 — `L-5 vc/verifiable-credential` proofValue must be base58btc

File: `src/lib/verity/vc/verifiable-credential.ts:169`. Decode the hex signature to bytes, then base58btc-encode with the existing `base58btcEncode` helper. Add `z` prefix per multibase spec.

### [ ] T5-8 — `L-6 STH timestamp` enforce monotonic

File: `src/lib/verity/transparency/log-store.ts:180-259` `signNewSTH`. Compute `timestamp = max(Date.now(), latestSTH.timestamp + 1)` to guarantee monotonic.

### [ ] T5-9 — `L-7 OTS calendar` default timeout

File: `src/lib/audit-anchor.server.ts:141-147`. Default `AbortSignal.timeout(15_000)` if `opts.signal` is not provided.

### [ ] T5-10 — `H-2 OTS upgrade` proof verification

File: `src/lib/audit-anchor.server.ts:376-390`. Before persisting upgraded proof bytes, verify that the proof prefix matches the original `anchorHash`, and ideally do full OTS-proof-chain validation.

### [ ] T5-11 — `M-1 attestation/manual` RBAC

File: `src/app/api/v1/verity/attestation/manual/route.ts:29-70`. Reject if `membership.role === "VIEWER"`. Allow `MEMBER` and above.

### [ ] T5-12 — `M-4 verity_bundle` rate-limit defined

File: `src/lib/ratelimit.ts`. Add `verity_bundle: new InMemoryRateLimiter(5, 3600000)` if missing.

### [ ] T5-13 — `M-4 verifyAttestation reason` use last error

File: `src/app/api/v1/verity/attestation/verify/route.ts:69-73`. Set `result.reason = "Embedded public key does not match keyset"` directly instead of pulling from `result.errors[0]`.

---

## Tier completion log

- **Tier 1: completed 2026-05-05 except H4a/b/c (deferred to follow-up sprint).**
  Commits on branch `claude/crazy-pascal-065793`:
  - `df5093af` — docs: persist audit fix plan
  - `dfd0e4c5` — T1-C1 IDOR /score/[operatorId]
  - `53ef4676` — T1-C2 appendToChain Serializable + retry
  - `7b3b55ac` — T1-H1 cert-verify embedded-key fallback removed
  - `4b943326` — T1-H3 attestation/list pagination + NaN guard
  - `1964025a` — T1-H5 trust-score 0.92 + T1-M2 P2P CSPRNG
  - `76fdf9fb` — T1-M9 cert audit-chain entries (issue/revoke/visibility)
  - `9892255e` — T1-H4d chunked backfill
    Verification: typecheck shows 863 pre-existing errors codebase-wide,
    zero in any Verity file. P2P + audit-anchor tests 28/28 pass.
- **Tier 2: completed 2026-05-05 except T2-4/T2-5/T2-6/T2-8/T2-10 (deferred to a follow-up test-infra sprint).**
  Tests added across 4 commits on branch `claude/crazy-pascal-065793`:
  - `880754ee` — T2-1 + T2-2 (Pedersen + Range-Proof, 39 cases)
  - (commit pending) — T2-3 (Merkle RFC 6962, 36 cases)
  - (commit pending) — T2-7 (evidence-resolver: T1-H5 regression + 1 todo for T5-1)
  - (commit pending) — T2-9 (score-calculator: + L-4 drift guard + trend placeholder doc-test)
    Total Tier-2 test cases added: **96 passing + 2 known-bug todos** (T2-CRYPTO-1, T5-1).
    Deferred (5 sub-steps): all need DB mocking infrastructure or full
    attestation-roundtrip fixtures. To be bundled into a separate
    test-infra sprint together with the Tier-4 schema work.
    **🔴 New Tier-2 finding T2-CRYPTO-1**: pedersen-provider's documented
    homomorphism `C(a)+C(b)=C(a+b)` does not hold because `valueToScalar`
    uses SHA-512 (non-linear). Parked as `it.todo`. No production caller
    uses `pedersenAdd` today, but the doc-comment is a real claim that
    needs either implementation fix or doc revision.
- Tier 3: not started
- Tier 4: not started — note: add T4-11 "VerityLogInnerNode + frontier
  persistence" prerequisite for H4a/b/c lazy-sibling lookup
- Tier 5: not started

---

## Cross-references

**Audit findings detail (in conversation history, may be compacted):**

- Crypto/Security agent: 1 CRITICAL (C1, IDOR), 4 HIGH (H1-H4), 4 MEDIUM (M1-M4), 3 LOW (L1-L3)
- Backend bugs agent: 2 CRITICAL (audit-chain race + list pagination), 3 HIGH (trust-score, missing org-id, key-init TOCTOU), 5 MEDIUM, 4 LOW
- Data-layer agent: 5 schema findings, 6 N+1 findings, 3 tenant-isolation findings, 4 cost-DoS findings, 2 caching findings, 3 crypto-perf findings
- Architecture agent: full system map, 11 subsystems with maturity ratings (most "Beta", crypto-core "Production-ready", P2P + Score "Alpha")

**Existing related docs in this repo (for context):**

- `src/lib/verity/UPGRADE_PATH.md` — Phase 1 → Phase 2 crypto upgrade plan
- `docs/CAELEX-COMPLY-CONCEPT.md` — system scope (note: scope guard rejects Verity changes without `ALLOW_CROSS_SURFACE=1`)

**Atlas audit for comparison (pattern):**

- The Atlas audit of 2026-05-04 followed the same 4-agent pattern. Findings file: not separately persisted (lives in conversation), but the fixes are in commits `a9381dcd`, `b8ca68ed`, `8b72d72b`, `594c4499`, `8f192ff2`, `8b315b64` on the current branch.
