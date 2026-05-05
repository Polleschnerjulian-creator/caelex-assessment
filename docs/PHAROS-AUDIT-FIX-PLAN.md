# Pharos Audit Fix Plan

**Created:** 2026-05-05
**Source:** Pharos subsystem audit (`feature-dev:code-explorer` deep-dive)
**Status:** Tier 1 (3/3) ✓ landed. Tier 2-5 designed below, awaiting per-step
implementation.
**Survives:** Conversation compaction. Single source of truth for the
Pharos remediation work.

---

## What is Pharos?

Pharos is the **regulatory-authority pillar** of Caelex. Where the main
operator dashboard serves satellite operators, Pharos serves the NCAs
(BAFA, BNetzA, BSI etc. across 10 jurisdictions) that supervise those
operators under the EU Space Act + NIS2 Directive.

Capabilities (8 surfaces):

1. **Bilateral oversight relationships** with signed MDF + VDF scope.
2. **Operator roster** with compliance summary.
3. **Pharos-Astra AI** (Claude tool-use, citation-enforced or [ABSTAIN]).
4. **Norm-anchor BM25 search** over `NormAnchor` Postgres index.
5. **External webhook ingest** with HMAC-SHA256 from non-Caelex operators.
6. **FSM workflow cases** with Ed25519 + SHA-256 hash-chained transitions.
7. **Multi-party k-of-n approvals** for high-stakes actions.
8. **Cross-authority aggregate stats** with differential-privacy noise.

---

## Tier 1 — Production Blockers (DONE 2026-05-05)

### [x] T1-P1 — Webhook secret AES-256-GCM at-rest

**Was:** [`webhook-service.ts:87`](src/lib/pharos/webhook-service.ts:87) stored the raw
secret in the field misnamed `secretHash`. `deriveSecret()` returned it
verbatim as the HMAC key. Any DB read (SQL injection, insider, backup
leak) exposed every operator's signing secret.

**Fix:** `provisionWebhook` now wraps the raw secret with `encrypt()`
from [`src/lib/encryption.ts`](src/lib/encryption.ts) before storing.
`deriveSecret` is now async and uses `isEncrypted()` to smart-detect
encrypted vs legacy raw — pre-T1-P1 endpoints continue working until
migrated, all new endpoints get encrypted at-rest. Verifier
`verifyAndProcess` awaits the new async `deriveSecret`.

### [x] T1-P2 — `emitOversightAccessLog` race-free Serializable transaction

**Was:** [`oversight-service.ts:558-596`](src/lib/pharos/oversight-service.ts:558)
did `findFirst` (chain head) → compute hash → `create` without a
transaction. Two concurrent calls for the same `oversightId` would
both read the same `entryHash` as `previousHash`, splitting the
hash chain and breaking tamper-evidence.

**Fix:** wrapped in `prisma.$transaction(..., { isolationLevel:
Prisma.TransactionIsolationLevel.Serializable })` with retry loop on
P2034 (serialization failure), max 5 attempts. Mirrors the correct
pattern in [`workflow-service.ts:dispatchEvent`](src/lib/pharos/workflow-service.ts:106)
and the Verity audit's T1-C2 fix in [`chain-writer.server.ts`](src/lib/verity/audit-chain/chain-writer.server.ts).

Required changing the `Prisma` import from type-only to value
(`import { Prisma }`) so the runtime-enum `TransactionIsolationLevel`
member is reachable.

### [x] T1-P3 — Operators-roster route MANAGER+ role gate

**Was:** [`api/pharos/operators/route.ts:50-55`](src/app/api/pharos/operators/route.ts:50)
checked auth + `orgType=AUTHORITY` but accepted any org member
including VIEWER and basic MEMBER. The endpoint surfaces every
operator under oversight + compliance summaries + open-incident
counts → PII-adjacent regulator data should require explicit elevated
privilege.

**Fix:** `resolveAuthorityCaller` now selects `role` from the
membership and rejects below MANAGER. Falls back to the existing
"Authority profile not configured" 403 with a more specific
"requires MANAGER role or higher" message.

---

## Tier 2 — High (fix in first post-launch sprint)

### [ ] T2-P1 — Differential-privacy budget persistence

**File:** [`differential-privacy.ts:120`](src/lib/pharos/differential-privacy.ts:120) — `budgetStore = new Map()` is module-level. On Vercel serverless every cold start (or new isolate) resets the budget to zero. An authority can exhaust the daily ε budget, wait ~15 min for a cold start, repeat — bypassing the privacy guarantee that is the legal basis for cross-authority aggregate sharing under GDPR/NIS2.

**Fix shape:** new Prisma model `PharosDpBudget(authorityId, day, epsilonSpent, updatedAt)` with `@@unique([authorityId, day])`. `consumeBudget(ε)` becomes `prisma.$transaction` with serializable isolation: read row → check `epsilonSpent + ε ≤ DAILY_BUDGET` → upsert. Daily reset via cron OR via `day` partition key (preferred — no cron needed). 1 day effort, 1 schema migration.

### [ ] T2-P2 — Approval signing race condition

**File:** [`approval-service.ts:79`](src/lib/pharos/approval-service.ts:79) — `signApprovalRequest` reads request + signatures, adds new signature, re-reads to evaluate quorum — three separate non-transactional DB roundtrips. Two parallel signers from the same authority can both read k-1 signatures, both conclude they are the k-th, both updates land but only one is the "real" approval.

**Fix shape:** wrap the read-modify-write in `prisma.$transaction` with serializable isolation. Same pattern as T1-P2. ~30-min fix.

---

## Tier 3 — Medium (fix within 30 days)

### [ ] T3-P1 — Unbounded `findMany` in oversight listings

**Files:** [`oversight-service.ts:635, 661`](src/lib/pharos/oversight-service.ts:635) — `listOversightsByAuthority` and `listOversightsByOperator` both lack `take`. A large authority (BNetzA supervising hundreds of operators) generates an unbounded query growing with time. Same for `/api/pharos/operators/route.ts:61`.

**Fix:** add `take: 500` (matches the pattern in `autoTransitionDueCases`). Add `skip` + `take` parameters for pagination on the route layer.

### [ ] T3-P2 — N+1 queries in operator roster

**File:** [`api/pharos/operators/route.ts:92-99`](src/app/api/pharos/operators/route.ts:92) — for each oversight (N), 3 separate queries (`findMany members`, `count incidents`, `count deadlines`). Authority with 50 operators = 151 queries per GET. Should be a single aggregated query OR pre-computed compliance summaries via a cron pattern (similar to the existing `compliance-snapshot` cron).

### [ ] T3-P3 — `getCase` returns all transitions without pagination

**File:** [`workflow-service.ts:282`](src/lib/pharos/workflow-service.ts:282) — `include: { transitions: { orderBy: { occurredAt: "asc" } } }` returns the entire transition history. Long-running NIS2 case with hundreds of auto-transitions (SLA breaches) → unbounded payload. Add `take: 100` with cursor pagination, or split into a separate `getCaseTransitions` route.

### [ ] T3-P4 — Module-level keypair cache useless in serverless

**File:** [`receipt.ts:101`](src/lib/pharos/receipt.ts:101) — `keypairCache = new Map()` is module-level. In Vercel serverless every cold start recomputes keypairs (scrypt N=2^14, ~50-100ms). Under high traffic this adds latency without amortizing.

**Fix:** either drop the cache (acknowledge each isolate pays the scrypt cost) and document, OR move to a per-org persisted keypair (new model `PharosAuthorityKeypair`), generated once at authority-profile creation, encrypted at rest with `encryptForOrg`.

### [ ] T3-P5 — `cross_authority_aggregate` 50+ sequential DB calls

**File:** [`astra-tools.ts:569-648`](src/lib/pharos/astra-tools.ts:569) — predicate loop iterates over every active oversight org with separate `prisma.*` calls. 50 supervised operators × 5 tool iterations = 250+ sequential roundtrips in a single Astra response.

**Fix:** use `prisma.$transaction([...])` for parallel execution OR consolidate into a single aggregated query with `groupBy`.

---

## Tier 4 — Low / Debt

### [ ] T4-P1 — LLM-judge silent-accept on parse failure

**File:** [`llm-judge.ts:209`](src/lib/pharos/llm-judge.ts:209) — Any JSON parse failure returns `{ verdict: "accepted", confidence: 0.0 }`. A model output that's entirely unparseable (Haiku outage, malformed fenced block) silently passes through — the threshold check at `astra-engine.ts:244` then fails to block. Documented as intentional ("judge outage never blocks user") but bypassable.

**Fix shape:** keep silent-accept on parse failure, but wire a metric so the rate is visible. If parse-failure rate exceeds X% rolling, alert and degrade to `[ABSTAIN]` for the citation-suspect responses.

### [ ] T4-P2 — `vdfAmendmentIsValid` does not enforce MDF floor

**File:** [`oversight-scope.ts:70-76`](src/lib/pharos/oversight-scope.ts:70) — Validates only that each VDF item has non-empty permissions. Does NOT verify that VDF cannot reduce the MDF (a VDF amendment could theoretically retract a mandatory disclosure obligation). Comment acknowledges "relaxed by design" but worth formal confirmation.

**Fix shape:** ADR documenting whether MDF-floor enforcement is intentional. If yes — add a comment + a test that locks the current behaviour. If no — add the check.

### [ ] T4-P3 — Atlas-bridge PII filter is regex-only

**File:** [`astra-bridge.ts:83-84`](src/lib/pharos/astra-bridge.ts:83) — `looksLikePII()` uses regex (cuid, email, operator-id mention). Any PII not matching passes to the cross-pillar Atlas call. Comment acknowledges "Phase 2 nutzt eine echte NER-Library."

**Fix shape:** Phase 2 = integrate a real NER (compromise.js or spaCy via Python subprocess). Until then, expand the regex set with phone-number and address-pattern matchers.

### [ ] T4-P4 — Receipt persistence silent failure

**File:** [`astra-engine.ts:282`](src/lib/pharos/astra-engine.ts:282) — Receipt signing + `OversightAccessLog` persistence wrapped in a try/catch that does not rethrow. An Ed25519 signing failure or DB write silent-skips the audit log. Given the audit log is the legal compliance artifact, silent failure may not satisfy NIS2 Art. 21 evidence requirements.

**Fix shape:** keep the user-facing response intact (don't fail the Astra query) but write a HIGH-severity log + metric on persistence failure. Optionally queue the failed entry for retry via a backfill cron (mirrors the Verity transparency-log H4d backfill pattern).

---

## Tier 5 — Observations / Document & Accept

### [ ] T5-P1 — Initial `handshakeHash` uses `oversightId: "pending"` sentinel

[`oversight-service.ts:157`](src/lib/pharos/oversight-service.ts:157) — Hash computed before DB record exists. Documented as intentional, but means the stored `handshakeHash` is not the hash of a canonical object containing the real ID. Audit-inconsistency if hash is independently recomputed from `OversightRelationship` fields.

**Action:** ADR clarifying intent; add a comment in the field docstring noting the "pending" sentinel.

### [ ] T5-P2 — `_resetBudgetForTests` exported

[`differential-privacy.ts:222`](src/lib/pharos/differential-privacy.ts:222) — Test-only helper exported from production module. All Pharos files are `server-only` so blast radius is contained, but worth either suffixing with `__test_only__` or moving to a `__test__` subfolder.

### [ ] T5-P3 — Hardcoded LLM-judge model

[`llm-judge.ts:39`](src/lib/pharos/llm-judge.ts:39) — `JUDGE_MODEL_OVERRIDE = "claude-haiku-4-5"` hardcoded. Anthropic deprecation would silently fall back to the main model, making the judge as expensive as the primary call. No alerting.

**Action:** read from env (`PHAROS_JUDGE_MODEL`) with default fallback; add a startup log line so the operator can spot a fallback.

---

## Sequencing / Effort

| Tier     | Items                                    | Effort   | Migration? |
| -------- | ---------------------------------------- | -------- | ---------- |
| **T1 ✓** | T1-P1, T1-P2, T1-P3                      | 1 day    | No         |
| T2       | T2-P1 (DP budget), T2-P2 (approval race) | 2-3 days | T2-P1 yes  |
| T3       | T3-P1..P5                                | 3-4 days | No         |
| T4       | T4-P1..P4                                | 2 days   | No         |
| T5       | T5-P1..P3                                | ADR-only | No         |

T1 closed all 3 production blockers in one batched commit. The single
highest-value follow-up is T2-P1 (DP budget) because it affects the
legal basis for the cross-authority aggregate-sharing feature under
GDPR/NIS2.

---

## Test-Coverage Priorities (separate sprint)

Pharos has **0 tests** today (23 source files, all in `src/lib/pharos/`).
Highest-value test files to write first, in order:

1. **`oversight-service.test.ts`** — `emitOversightAccessLog` race
   regression (10 parallel calls → all 10 succeed, no duplicate
   `previousHash`), `listOversightsByAuthority` bounded check.
2. **`webhook-service.test.ts`** — HMAC verify, replay-guard
   (nonce uniqueness), timestamp window, T1-P1 encryption-roundtrip
   (provision → encrypted → derive → matches), legacy-raw fallback.
3. **`differential-privacy.test.ts`** — Laplace noise CSPRNG,
   budget arithmetic, serverless-bypass demonstration (the test
   that justifies T2-P1).
4. **`astra-engine.test.ts`** — citation-compliance enforcement,
   LLM-judge override threshold, receipt-failure degradation.
5. **`approval-service.test.ts`** — k-of-n quorum boundary, T2-P2
   race regression, signature verification.

The Verity Tier-2 in-memory-Prisma-fake pattern (
[`src/lib/verity/transparency/log-store.test.ts`](src/lib/verity/transparency/log-store.test.ts)
) should be reused — Pharos has the same persistence-orchestration
shape (`$transaction`, `findFirst`-orderBy-create chains).

---

## Cross-references

- Original audit transcript: see conversation history (deep-dive by
  `feature-dev:code-explorer` agent).
- Verity audit fix plan: [`docs/VERITY-AUDIT-FIX-PLAN.md`](docs/VERITY-AUDIT-FIX-PLAN.md)
  — Pharos T1 follows the same pattern.
- Encryption module: [`src/lib/encryption.ts`](src/lib/encryption.ts) — used
  by T1-P1 for AES-256-GCM at-rest.
- Reference correct `$transaction` pattern: [`workflow-service.ts:dispatchEvent`](src/lib/pharos/workflow-service.ts:106).
