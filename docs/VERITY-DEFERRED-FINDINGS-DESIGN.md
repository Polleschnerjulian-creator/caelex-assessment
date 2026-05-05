# Verity Deferred Findings — Design Notes

**Created:** 2026-05-05 (read-only design; no code changes made)
**Status:** Awaiting approval per finding before implementation.
**Scope:** Three crypto/persistence findings deferred from Tier 1 / Tier 2:

| ID          | Surface                    | Severity                           | Effort      |
| ----------- | -------------------------- | ---------------------------------- | ----------- |
| T2-CRYPTO-1 | Pedersen homomorphism      | LOW (no production caller today)   | 1 day or 1h |
| T2-CRYPTO-2 | v3 range proof — PASS-only | HIGH (blocks v3 as default scheme) | 3-5 days    |
| T1-H4a/b/c  | Merkle proof memory cost   | HIGH at >100k attestations         | 1-2 weeks   |

All three were surfaced by tests written during the Tier-2 sprint
and parked as `it.todo`. Each section below tells you the options,
the recommendation, and the deploy shape so you can pick a path.

---

## T2-CRYPTO-1 — Pedersen homomorphism docs vs implementation mismatch

### Problem

`pedersen-provider.ts` documents the additive-homomorphic property:

> ```
> C(v_a) + C(v_b) = C(v_a + v_b)
> ```
>
> "homomorphic — C(v₁) + C(v₂) = C(v₁ + v₂), enabling aggregate
> proofs across attestations without revealing any individual value."

Test `pedersen-provider.test.ts` verified this empirically and
**found it doesn't hold** because `valueToScalar` uses SHA-512:

```ts
function valueToScalar(value: number): bigint {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, false);
  const hash = sha512(new Uint8Array(buf));
  return reduceToScalar(hash);
}
```

`SHA-512` is non-linear — `H(a) + H(b) ≠ H(a + b)`. The Pedersen
commitment math itself is correct, but because the value is mapped
to a scalar through a hash, the natural sum `C_a + C_b` opens to
`H(a) + H(b)` on the curve, not `H(a + b)`. The doc's claim is
wrong; `pedersenAdd` produces a commitment with no useful opening.

**Production impact: zero today.** No caller uses `pedersenAdd`. The
v2 Schnorr-PoK and v3 range-proof paths only commit individual values
and don't aggregate.

### Options

#### Option A — Fix the implementation (`BigInt(value) mod q`)

```ts
function valueToScalar(value: number): bigint {
  if (!Number.isFinite(value)) throw new Error("non-finite");
  if (!Number.isInteger(value)) {
    throw new Error(
      "valueToScalar requires integer; use commitScaledValue for fractions",
    );
  }
  // Direct integer encoding preserves linearity:
  //   valueToScalar(a) + valueToScalar(b) == valueToScalar(a + b) mod q
  return ((BigInt(value) % CURVE_ORDER) + CURVE_ORDER) % CURVE_ORDER;
}
```

**Tradeoffs:**

- ✓ Restores the documented homomorphism — `pedersenAdd` works correctly.
- ✓ All v2/v3 range-proof code already integer-scales values via
  `commitScaledValue` (range-proof.ts:435-450), so this change is
  forward-compatible.
- ✗ Breaks fractional inputs to bare `pedersenCommit(value)`. Today
  this is only called from `attestation.ts` for v2 (line 131); the
  impact is bounded by changing the v2 path to scale before commit.
- ✗ Breaking change for any existing v2 attestations — but per the
  T3-3 Phase-2 rollout doc, v2 is gated behind `VERITY_CRYPTO_VERSION=v2`
  and not yet promoted to staging. Migration cost: ~zero in prod today.

**Effort:** 1 day. Update `valueToScalar`, route v2's
`pedersenCommit(actual_value)` call through `commitScaledValue` first,
update existing tests + add a new "homomorphism holds" test that
flips the `it.todo` to `it`.

#### Option B — Drop the homomorphism claim from the doc

Remove the "homomorphic" bullet from the file header, delete
`pedersenAdd` (it would lie), and document that v2 commits are
binding + hiding only, not additive.

**Tradeoffs:**

- ✓ One-hour change, zero ripple.
- ✗ Permanently closes the door on aggregate proofs ("the sum of
  miss-distances across our fleet exceeds X km without revealing any
  single satellite's value" — feature mentioned in the v2 doc as a
  motivating example).
- ✗ Locks in a known-broken `pedersenAdd` export until removed.

#### Option C — Keep both: fix `valueToScalar` AND scope it

Fork `valueToScalar` into `valueToScalarLinear` (integer-only, used
by `pedersenAdd`) and keep the SHA-512 mapping for the existing
`pedersenCommit(value: number)` for backwards compatibility with any
floating-point caller.

**Tradeoffs:**

- ✓ Doesn't break any caller.
- ✗ Two scalar mappings == two commitment formats. A v2 attestation's
  commitment can no longer be added to another v2 attestation's
  commitment unless both used the linear mapping. Confusion guaranteed.

### Recommendation: **Option A**

Lowest long-term complexity, restores the documented behaviour, fixes
the latent crash potential of `pedersenAdd`. The v2 path scaling is
trivial because the range-proof code already does it.

### Deploy plan

1. Create `src/lib/verity/core/pedersen-provider.ts` patch:
   - Replace `valueToScalar` body
   - Add `commitInteger(value: number)` and `commitScaled(value: number, scale: number)` thin wrappers
2. Update `attestation.ts:131` v2 path to call `commitScaled(actual_value, 1000)` (matching v3's default).
3. Update `pedersen-provider.test.ts`: flip the `it.todo` to `it`, add three new tests (commit/open across scaled values, `pedersenAdd` opens to sum, `pedersenAdd` is associative).
4. Add a Tier-2 finding to the plan-doc marking T2-CRYPTO-1 closed.

Single batched commit. No migration needed.

---

## T2-CRYPTO-2 — v3 range proof can't issue FAIL attestations

### Problem

`generateAttestation` in `attestation.ts:102-128` for `commitment_scheme: "v3"`
calls `proveThreshold` unconditionally:

```ts
range_proof = proveThreshold({
  actual_value: params.actual_value,
  threshold_value: params.threshold_value,
  threshold_type: params.threshold_type,
  // ...
});
```

`proveThreshold` (in `range-proof.ts:475-484`) rejects with:

```
proveThreshold: ABOVE claim is false (v < T)
proveThreshold: BELOW claim is false (v > T)
```

This is correct cryptographic behaviour — you can't construct a
zero-knowledge proof of a false statement. But the platform's whole
reason for existing is to attest BOTH compliance and non-compliance:
a Sentinel reading of "remaining fuel = 5%" against a threshold of
10% MUST produce a verifiable FAIL attestation, not a thrown
exception.

**Production impact: blocks v3 as a default scheme.** Per the T3-4
migration plan, the rollout is `v1 → v2 → v3`. If v3 default lands
without fixing this, the next non-compliant Sentinel reading crashes
the attestation pipeline.

### Options

#### Option A — v3-PASS / v2-FAIL hybrid

When `result === false`, fall back to v2 (Pedersen + Schnorr PoK).
Verifier still gets binding + hiding for the commitment, but loses
the "trustless threshold check" property for FAIL paths only.

```ts
if (scheme === "v3") {
  if (!result) {
    // Non-compliance can't carry a trustless range proof — fall back
    // to v2 so the attestation is still issuable.
    scheme = "v2";
  } else {
    // ... v3 path
  }
}
```

**Tradeoffs:**

- ✓ Smallest change. ~10 lines of code. No new crypto.
- ✓ Verifier already supports both versions per the dispatch in
  `verifyAttestation:380-436`.
- ✓ FAIL attestations are typically less commercially sensitive
  (regulators want to see them; operators don't usually re-share them
  publicly). Trustless FAIL is nice-to-have, not load-bearing.
- ✗ Two trust levels in the same scheme — UI must show "v3 PASS" vs
  "v2 FAIL" distinctly, which is confusing for end users.
- ✗ A regulator auditing only FAIL attestations to identify
  non-compliant operators must trust Caelex's threshold computation
  for those rows. (Same trust as the entire v1 era.)

#### Option B — Negation proof (v3 attests "the OPPOSITE direction is true")

For a failed-ABOVE claim (`v < T`), generate a v3 BELOW proof of
`v ≤ T - 1` (or `v < T` rounded down to the encoding precision).
The attestation's `claim` block records the user-facing claim
(failed-ABOVE-T) and `evidence.range_proof` carries the inverted
proof (BELOW-(T-1)).

The verifier already cross-checks `range_proof.threshold_type`
against `claim.threshold_type` (audit fix T2-CRYPTO-2 made this
explicit in `attestation.ts:421-424`). That cross-check would need
to be relaxed for the negation case OR the attestation needs a
new field `evidence.proof_inverted: true` so the verifier knows to
expect the opposite direction.

**Tradeoffs:**

- ✓ Preserves uniform trustlessness — every v3 attestation, PASS or
  FAIL, carries a math-only proof.
- ✓ Same verifier path with one extra branch.
- ✗ Wire size: doubles when the claim is FAIL (one inverted proof per
  attestation) — but only ~12 KB → 12 KB so the multiplier is on the
  per-claim cost, not catastrophic.
- ✗ Conceptually trickier — the cert claim says "operator failed Art
  70" but the proof says "operator's value was ≤ T-1", which is
  almost-but-not-quite equivalent. Subtle off-by-one risk at the
  encoding precision boundary.
- ✗ Range proof only proves `v ≤ T-1`; it does NOT prove `v ≥ 0`
  unless we also bound below. For "failed-BELOW" at `v > T`, the
  inverted proof is `v ≥ T+1` AND `v ≤ 2^bits` — the latter requires
  a second range proof. Doubles wire size again.

#### Option C — Defer to Bulletproofs in Phase 3

Bulletproofs natively prove disjunctions: "v ≤ T-1 OR v ≥ T+1" can
be expressed as a single bulletproof at ~O(log n) size. This makes
PASS / FAIL symmetric without negation-proof gymnastics, AND shrinks
the wire size by 10×.

**Tradeoffs:**

- ✓ The "right" long-term answer per the v3 design notes
  (`UPGRADE_PATH.md:55-57`).
- ✓ No backwards-compatibility burden — Bulletproofs slot in as v4
  alongside v3.
- ✗ Substantial implementation effort (estimate: 2-3 weeks for a
  production-quality Bulletproofs implementation, audit-grade testing,
  and verifier integration).
- ✗ Until Bulletproofs lands, v3 default rollout (T3-4 Step 4) is
  blocked.

### Recommendation: **Option A for the immediate unblock + Option C as the proper fix**

Land Option A (v3-PASS / v2-FAIL hybrid) now so v3 can be promoted
to staging per the T3-4 plan. Document explicitly in the API response
and bundle that FAIL attestations carry v2 trust. Track Option C as
Verity Phase 3 (Bulletproofs).

Option B is an attractive middle ground but the off-by-one encoding
risk is a real foot-gun, and the wire-size doubling for failed-BELOW
is annoying. Skip it.

### Deploy plan (Option A)

1. `attestation.ts:102` — branch on `result`:
   ```ts
   const effectiveScheme = scheme === "v3" && !result ? "v2" : scheme;
   ```
2. Use `effectiveScheme` in the if/else cascade. Set
   `version: "2.0"` for the FAIL-fallback case.
3. Add a `attestation.evidence.scheme_fallback?: "v3-pass-only"` field
   so verifiers and dashboards know why a v3-default response carried
   a v2 attestation.
4. Update `attestation.test.ts`: flip the T2-CRYPTO-2 `it.todo` to
   `it`, add a v3-FAIL test that asserts `evidence.scheme_fallback`
   and the verifier still returns `valid: true`.
5. Update `UPGRADE_PATH.md` to document the hybrid behaviour and
   the trust implication for FAIL attestations.

Single batched commit. No DB migration. Backwards-compatible with
existing v3 PASS attestations.

### Deploy plan (Option C — Phase 3 sprint)

Out of scope for the audit. Sketch:

1. Implement `src/lib/verity/core/bulletproofs.ts` against
   `@noble/curves/bls12-381`. Need:
   - Inner-product argument (RFC 9396 §4)
   - Pedersen vector commit
   - Range proof reduction
   - Disjunction proof (PASS-OR-FAIL composition)
2. Add v4 commitment scheme to `feature-flags.ts` and `attestation.ts`.
3. Verifier dispatch: `version: "4.0"` → `verifyBulletproof`.
4. Migrate v3 → v4 default per the T3-4 phased rollout pattern.

Effort: 2-3 weeks minimum. Library audit (or third-party security
review) recommended before production.

---

## T1-H4a/b/c — Lazy-sibling Merkle proofs + incremental STH signing

### Problem

Three sub-steps from the original H4 audit finding were deferred
because they all need a schema change. Today, every call to:

- `signNewSTH` (cron, daily)
- `getInclusionForAttestation` (per public verify request)
- `getConsistencyFromStore` (per public consistency request)

…runs a full `prisma.verityLogLeaf.findMany({ orderBy: { leafIndex: "asc" } })`.
At 1M leaves this is ~64 MB JS heap per call. The cron pulls the
entire dataset every tick to rebuild the tree from scratch and sign
the new root.

**T1-H4d (chunked backfill, already shipped)** mitigated the
backfill memory bomb but NOT the inclusion-proof / consistency-proof
/ STH-signing paths.

**Production impact:** safe through ~100k attestations per the
chunked backfill. Beyond that, the inclusion-proof endpoint OOMs
public requests; the cron OOMs nightly. With current per-org volume
estimates (50 attestations × 100 satellites × 1 cycle/90 days ≈
20k/quarter), this is comfortably 6-12 months out — but the schema
change is a 1-2 week effort, so plan now.

### Required schema change

Two additions, both backwards-compatible with existing log data:

```diff
 model VerityLogLeaf {
   id            String   @id @default(cuid())
   leafIndex     Int      @unique
   attestationId String   @unique
   leafHash      String
   appendedAt    DateTime @default(now())
   ...
 }

+/// Persisted inner-node hashes for the RFC 6962 Merkle tree.
+/// Populated by the STH cron at sign time. Indexed for O(log N)
+/// inclusion + consistency proof lookups.
+model VerityLogInnerNode {
+  treeSize Int
+  level    Int
+  index    Int
+  hash     String   @db.VarChar(64)
+  createdAt DateTime @default(now())
+
+  @@id([treeSize, level, index])
+  @@index([treeSize, level])
+}

 model VerityLogSTH {
   id          String   @id @default(cuid())
   treeSize    Int      @unique
   rootHash    String
   issuerKeyId String
   signature   String
   timestamp   DateTime @default(now())
   version     String   @default("v1")
+  /// Per-level frontier hashes: the right-spine of the Merkle tree
+  /// at this size. Required for incremental STH signing — extending
+  /// the tree only needs to rehash the frontier path, not the whole
+  /// tree. Stored as JSON array indexed by level.
+  frontier    Json?
 }
```

Migration: pure additive (new table + new nullable column). No data
movement. Backfill of `VerityLogInnerNode` runs at the next cron
tick after deploy.

### H4a — Inclusion-proof lazy-sibling lookup

Replace `getInclusionForAttestation` with:

```ts
async function getInclusionForAttestation(prisma, attestationId) {
  const leaf = await prisma.verityLogLeaf.findUnique({
    where: { attestationId },
    select: { leafIndex: true },
  });
  if (!leaf) return null;

  const sth = await prisma.verityLogSTH.findFirst({
    orderBy: { treeSize: "desc" },
  });
  if (!sth || leaf.leafIndex >= sth.treeSize) return null;

  // Walk RFC 6962 audit path: at each level i, fetch only the
  // sibling node hash. Total: O(log treeSize) DB lookups.
  const proof: string[] = [];
  let idx = leaf.leafIndex;
  let levelSize = sth.treeSize;
  for (let level = 0; levelSize > 1; level++) {
    const siblingIdx = idx ^ 1;
    if (siblingIdx < levelSize) {
      const sibling =
        level === 0
          ? await prisma.verityLogLeaf.findUnique({
              where: { leafIndex: siblingIdx },
              select: { leafHash: true },
            })
          : await prisma.verityLogInnerNode.findUnique({
              where: {
                treeSize_level_index: {
                  treeSize: sth.treeSize,
                  level,
                  index: siblingIdx,
                },
              },
              select: { hash: true },
            });
      if (!sibling) return null; // node not yet persisted
      proof.push(level === 0 ? sibling.leafHash : sibling.hash);
    }
    idx = idx >> 1;
    levelSize = Math.ceil(levelSize / 2);
  }

  return {
    proof: { leafIndex: leaf.leafIndex, path: proof, root: sth.rootHash },
    sth,
  };
}
```

For a 1M-leaf tree, this is ~20 DB queries instead of one
findMany-of-1M.

### H4b — Consistency-proof lazy-sibling lookup

Same approach as H4a, applied to the consistency-proof algorithm
(RFC 6962 §2.1.4.2). Each consistency proof needs O(log newSize)
inner-node lookups; the proof is the union of "old subtree completion"
nodes and "delta" nodes. Algorithm well-specified in the RFC.

Effort: 3-4 days. Most of the work is the test fixture (matching
the existing 8 canonical transitions in `merkle-tree.test.ts`).

### H4c — Incremental STH signing

Today `signNewSTH` rebuilds the entire tree from leaves. With the
frontier persisted on each STH:

```ts
async function signNewSTH(prisma) {
  const latest = await prisma.verityLogSTH.findFirst({
    orderBy: { treeSize: "desc" },
    select: { treeSize: true, frontier: true },
  });

  const treeSize = await prisma.verityLogLeaf.count();
  if (latest?.treeSize === treeSize) return null;

  // Fetch ONLY the new leaves since the last STH.
  const newLeaves = await prisma.verityLogLeaf.findMany({
    where: { leafIndex: { gte: latest?.treeSize ?? 0 } },
    orderBy: { leafIndex: "asc" },
    select: { leafIndex: true, leafHash: true },
  });

  // Apply each new leaf to the frontier:
  //   - hash with the rightmost frontier node at level 0
  //   - if that produces a complete subtree, propagate up
  // O(log treeSize) per leaf, O((newSize - oldSize) * log newSize)
  // total — instead of O(newSize) for a full rebuild.
  const { newRoot, newFrontier, innerNodesToPersist } = extendFrontier(
    latest?.frontier ?? [],
    newLeaves,
  );

  await prisma.verityLogInnerNode.createMany({
    data: innerNodesToPersist,
    skipDuplicates: true,
  });

  // ... sign STH as today ...
  return { ...sth, frontier: newFrontier };
}
```

Effort: 5-7 days (the `extendFrontier` algorithm needs careful
testing against the existing RFC 6962 happy-path tests).

### Deploy plan (T1-H4a/b/c bundled)

The schema change (`VerityLogInnerNode` + `frontier` column) is a
prerequisite for all three. Sequence:

1. **Deploy A** — schema migration (additive): `prisma migrate dev --name verity_log_inner_node`.
   - New table, new nullable column. No data movement, no risk.
2. **Deploy B** — H4c incremental STH signing.
   - Cron now persists `VerityLogInnerNode` rows AND `frontier` per
     STH. First tick after deploy is still a full rebuild (no prior
     frontier); subsequent ticks are incremental.
   - Backfill task: re-walk historical STHs to populate
     `VerityLogInnerNode` for existing tree sizes. One-time, can
     run as a manual `npm run script:backfill-inner-nodes` job.
3. **Deploy C** — H4a inclusion lazy-sibling.
   - `getInclusionForAttestation` switches to the lazy walk.
   - Falls back to the legacy "rebuild from leaves" path when
     `VerityLogInnerNode` is missing for the requested treeSize
     (covers historical STHs not yet backfilled).
4. **Deploy D** — H4b consistency lazy-sibling. Same fallback pattern.
5. **Deploy E** — drop the legacy fallback paths once the backfill
   completes and all historical STHs have inner-node data.

Total effort: ~2 weeks.

### Required tests

For each of H4a/b/c, the existing `merkle-tree.test.ts` (36 cases)
provides the cryptographic correctness oracle. New
`log-store.test.ts` cases needed:

- Lazy inclusion produces same proof bytes as the rebuild path for
  trees of size 1, 2, 7, 8, 100, 257.
- Lazy consistency produces same proof bytes for the 8 canonical
  transitions (0→8, 1→2, 2→4, 3→4, 3→5, 5→8, 7→8, 256→257).
- Frontier-extend produces the same root as a full rebuild for trees
  of size 1, 2, 100, 257, 1024.
- Backfill of `VerityLogInnerNode` is idempotent.

The in-memory Prisma fake from T2-4 already supports
`verityLogInnerNode` shape — only the new model needs to be added.

---

## Summary table

| Finding     | Recommended option       | Effort   | Migration?          |
| ----------- | ------------------------ | -------- | ------------------- |
| T2-CRYPTO-1 | Option A (linear scalar) | 1 day    | No                  |
| T2-CRYPTO-2 | Option A (v2 fallback)   | 1 day    | No                  |
| T1-H4a/b/c  | Bundled deploy A→E       | ~2 weeks | Yes (additive only) |

T2-CRYPTO-1 + T2-CRYPTO-2 can land together in a single commit
(both pure crypto changes, both flip a known `it.todo` to `it`).
T1-H4a/b/c is its own sprint with five deploys.
