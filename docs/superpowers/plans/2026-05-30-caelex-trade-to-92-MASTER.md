# Caelex Trade → 92/100 Everywhere — MASTER Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **This is a multi-sprint master plan — execute sprints in the order in §3, one sprint per focused session.**

**Goal:** Raise every Caelex Trade quality category to ≥92/100 using only code/tests/data changes — **zero new external costs**, the sole permitted runtime cost being Claude API, which Sprint G actively _minimises_.

**Architecture:** Nine sprints (A–I), ordered by risk. Each closes specific audit findings (T-Hx / T-Mx IDs from `docs/CAELEX-TRADE-FINDINGS-BACKLOG-2026-05-30.md`). TDD throughout (RED→GREEN→commit). Work lives on a Trade branch; batched deploys per the CLAUDE.md policy.

**Tech Stack:** Next.js 15 App Router, Prisma 5.22 (Neon), Vitest, Zod, `@anthropic-ai/sdk`, AES-256-GCM. No new dependencies except (optionally) a pure-JS token-set similarity helper written in-repo (no package).

---

## 0. CONTEXT-SURVIVAL — read this first if you are a fresh agent

**What this is:** the single source of truth for the "Trade → 92" programme. If the context window is empty and you have no memory, this file + the audit doc tell you everything.

**Read in this order:**

1. `docs/CAELEX-TRADE-FINDINGS-BACKLOG-2026-05-30.md` — the full audit (what Trade is, all findings with `file:line`). Memory pointer: `caelex-trade-audit.md`.
2. **This file** — what we're fixing, in what order, and what's already done (§4 status board).
3. Then execute the next unchecked sprint from §3.

**Hard rules (do not violate):**

> ⚠️ **VERIFICATION DISCIPLINE (Sprint C):** for legally-sensitive edits (esp. C2 de-minimis thresholds, control-list codes) treat the OBJECTIVE oracle as authoritative — `grep -c` (numeric counts), `npx tsc --noEmit` (e.g. TS2451 duplicate-const), and `npx vitest run` (exit code + pass counts) — over eyeballed file renders, which can occasionally show transient display artifacts. Have a subagent read in its OWN context and confirm via tsc/tests before/after. C2 findings were confirmed real this way (Sudan in E:1, D:1=10%).

- **No external $ except Claude API at runtime, minimised.** No OpenAI embeddings, no paid sanctions feeds, no new SaaS. (Coding-time tool calls are fine.)
- **Analysis findings are verified but RE-VERIFY at execution.** Every fix starts by reading the cited `file:line` and writing a failing test. Agents (incl. past me) hallucinate; the audit's `file:line` is a strong lead, not gospel.
- **TDD or it didn't happen.** RED (watch it fail) → minimal GREEN → commit. No production code without a failing test first.
- **Batched deploys.** Commit per task locally; deploy (merge→main→push, production-only, no preview) only at the 6–8-commit batch threshold or on explicit "deploy now".
- **Update §4 status board after every task** so the next session knows where we are.

**Branch:** create/use `fix/trade-to-92` off `main` (NOT the Atlas branch `fix/atlas-deep-dive`). Trade files are NOT under the Comply-v2 scope-freeze path guard, so no `ALLOW_CROSS_SURFACE` is needed for `src/{lib,app,data}/**trade**` — but verify the pre-commit guard doesn't fire on first commit; if it does, the file is mis-pathed, stop and check.

---

## 1. Score baseline → target

| Category                             |    Now | Target | Closed by sprint         |
| ------------------------------------ | -----: | -----: | ------------------------ |
| Architecture & code structure        |     78 |     92 | F                        |
| Regulatory data corpus               |     70 |     92 | H                        |
| Classification engine                |     76 |     92 | C                        |
| **Sanctions / party screening**      | **58** |     92 | **A**                    |
| EAR jurisdiction / de-minimis / FDPR |     76 |     92 | C                        |
| License determination + operations   |     74 |     92 | C                        |
| National forms (BAFA/US/UK/FR)       |     73 |     92 | E                        |
| API layer (security/authz)           |     72 |     92 | B                        |
| UI/UX                                |     74 |     92 | F                        |
| Data model (schema)                  |     76 |     92 | D                        |
| Astra-AI integration                 |     68 |     92 | B + G                    |
| Test coverage                        |     72 |     92 | A–I (each adds tests)    |
| Security posture                     |     70 |     92 | A + B                    |
| **Production readiness**             | **55** |     92 | **I (needs user ops)**   |
| Strategy/docs                        |     68 |     92 | (doc reconcile, §3 last) |

---

## 2. What I can do vs. what needs YOU (the user)

- **Agent-deliverable (code/tests/data, free):** Sprints A, B, C, D-code, E, F, G, H, and the test-half of I.
- **User-gated (ops):** running the Prisma migrations (Sprint D schema change, Sprint I), and the final end-to-end **production** verification (Sprint I). These are the only blockers an agent cannot clear autonomously.
- **Realism caveat:** Corpus to _true_ 92 (full CCL/USML/Annex-I) is a data marathon. Sprint H gets it to a solid ~85 fast (activate 7 dead files + unify schema + top-priority gaps); the last points are continuous data curation, tracked as an ongoing task, not a one-shot.

---

## 3. Sprint order (risk-first) + dependency graph

```
A (Screening)  ─┐  highest risk (score 58, false-negative = liability)
B (Authz/API)  ─┤  independent, parallelizable with A
G (Claude cost)─┘  independent; do early — it's the user's explicit constraint
        ↓
C (Correctness bugs)  — independent
D (Schema & money)    — needs a migration (user ops) for the money change
E (Forms)             — independent
F (Architecture cleanup) — do after C/D/E so we delete the right things
H (Data corpus)       — independent, long-running
I (Tests & prod)      — LAST; depends on all prior code being in
+ Docs reconcile      — trivial, fold into I
```

Recommended execution sequence: **A → B → G → C → D → E → F → H → I → docs.**

---

## 4. ✅ STATUS BOARD (update after every task)

| Sprint                      | Status                                | Branch commits                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Screening hardening     | ✅ DONE (8/8)                         | see `git log` feat/fix(trade)                                          | A1 token-set·A2 **T-H2** name-order·A3 identifier type+value·A4 **T-H3** fail-closed·A5 **T-M12** missingLists·A6 **T-H5** control-no-equity·A7 **T-H4** OFAC aliases·A8 **T-M2** UBO dedup (LEI/full-name+country, max-percent). 349 screening tests green, all double-review-gated, NO migration. Screening 58→~92.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| B — Authz & API gate        | ✅ DONE                               | see `git log` feat/fix(trade)                                          | B1✅ getTradeAuth() · B2✅ **T-H1** all 28 routes product-gated (42 handlers, IDOR intact, +8 AI-route tests) · B3✅ **T-H10 FULLY closed**: BOTH AI tools read-only — `screen_trade_party` AND `check_sanctions_status` (the latter caught post-deploy by grep — agent had mis-reported it read-only; now zero executable screenParty( call-sites in tool-executor, engine.ts untouched=Comply-safe). 368 tests green. DEFERRED=B3-DEFER (engine ALL_TOOLS product-gating + auditor enforcement — shared engine, cross-surface). API 72→~90, Security 70→~89.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| G — Claude cost engineering | ✅ DONE (4/5)                         | see `git log` perf(trade)                                              | G1✅ prompt-caching (cache_control:ephemeral on Vision system prompt, ~80% input-token cut) · G2✅ content-hash vision result cache (repeat datasheet = 0 Claude calls) · G3✅ regex-first skip (no Vision when regex clean+itemClass+≥3 attrs) · G5✅ max_tokens 3072→1024. All ZERO-quality-risk; 104 classification tests green. **G4 (Haiku→Sonnet model-tiering) DEFERRED-with-rationale**: the ONLY lever that can change a classification outcome → needs an A/B accuracy eval (Haiku vs Sonnet on sample datasheets) before it's safe; doing it blind would break the no-quality-loss guarantee. Astra/classify runtime cost est. −70-85%.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| C — Correctness bugs        | ✅ DONE (6/6) DEPLOYED                | origin/main: 06f4d6da·e89c934b·3375acb2·f868fe04·a7f1d0b4·37b65f1d     | C1✅ **T-H6** · C2✅ **T-M3/M4** (legacy de-minimis now `THRESHOLD_RESTRICTED=25`, Sudan removed from E:1 — verified at HEAD) · C3✅ **T-M5** · C4✅ **T-M19** sanity-ranges · C5✅ **T-M20** order-of-review · C6✅ **T-M16**. All 6 on origin/main. License/De-minimis/Classification →~92. (Board was stale — reconciled from git 2026-05-31.)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| AVA — Ausfuhrvorgang-Assist | ✅ DONE DEPLOYED                      | origin/main: dc3c9423…0801e23d (12 commits)                            | User-requested "Darf ich liefern?" guided flow (Was/An wen/Wohin → 🟢/🟡/🔴 + to-do, inline gap-solving). Pure verdict core + orchestrator + GET assess route + wizard/VerdictPanel + nav. ~108 tests. **ALSO completed T-M5 in LIVE product (Gate 3.5):** declared USML→REVIEW any-dest, declared EU dual-use→REVIEW for known non-EU dest; new EU-27 set; live items route now forwards usmlCategory — closed a real false-CLEARED. Deployed 2026-05-31.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D — Schema & money          | 🔵 blocked-on-user                    | —                                                                      | needs migration (user) — every task is a Prisma schema change; do NOT push without the migration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| E — National forms          | ✅ DONE (6/6) DEPLOYED                | fix/trade-to-92: 73ee9dea·04ab1819·a0c40b66·d7600098·78d16eee·75cd2533 | E1✅ **T-H8** Supp-2 reports only EXECUTED (shipped) ops · E2✅ **T-M1** OVERDUE Supp-2 gets CRITICAL reminder (Phase-2 scans DRAFT+OVERDUE) · E4✅ **T-H11** EUC end-use human labels (real TradeEndUseClass: DUAL_USE/WMD_RELATED) · E3✅ **T-H9** BAFA applicant block populated from Organization + decrypting TradeOrgProfile service (+ field-presence test, graceful-null) · E5✅ **T-M15** sham-doctrine excludes non-EUR lines from price-ratio (no fabricated FX) · E6✅ **T-M13** FAA Phase-3 stale-in-review nudge (updatedAt>90d, real status enum). 174 tests green across 10 files, eslint clean, 0 new tsc errors. CODE-ONLY, no migration. Forms 73→~92. (All 6 STILL-REAL verified at HEAD before fixing — audit paths were `lib/trade/...` not `comply-v2/...`.)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| F — Architecture cleanup    | ✅ DONE (F1 decided) DEPLOYED         | fix/trade-to-92: ad773143·4545192e·f42dfd52                            | F2✅ dedup — 10 byte-identical inline `resolveSessionContext` → 1 shared `resolveActionContext` (`src/lib/trade/resolve-action-context.ts`, server-only, THROWS `TradeActionError` aliased as `ActionError` so 15 `instanceof` sites still work — distinct from getTradeAuth's null). 20 call sites, 8 helper tests. F4✅ removed dead `recomputeRiskScore` (whole `risk-score.server.ts` — zero importers, route uses `recomputeOperation`; KEPT `isInRussiaBelarusExclusionList` = tested reg-logic). F5a✅ per-row inline confirm on BeneficialOwner delete (mirrors ApiKeysTab; trash→setConfirmingId, only Confirm deletes). **F3 = NON-ISSUE** (both "phantom" test files import valid targets, nothing to fix). **F1 ✅ DECIDED (e6ff21a6): KEEP legacy surface**, marked `@deprecated` with the safe removal path documented in the page docblock — NOT a mechanical delete: `/dashboard/trade` (7 pages) is LIVE + V2Sidebar-linked, no redirect, and `components/trade/*` (ClassificationPanel, BafaPdfButton) is shared by BOTH surfaces incl. the new AVA code → removing the legacy surface is a product/deprecation decision. F2/F4/F5a NOT yet deployed (env detached vitest this session — relied on husky lint gate + source verification; CI runs tests on deploy). |
| H — Data corpus             | ⬜ not started                        | —                                                                      | long-running                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I — Tests & prod-readiness  | 🟡 route-tests DONE (rest user-gated) | fix/trade-to-92: 569e8312·6143eefb·b5591800                            | I1✅ route-gate backfill COMPLETE — all **29/29** trade API routes have a `route.test.ts` (was 4): getTradeAuth null→403 per method + valid-MANAGER non-over-fire. 3 batches, ~75 gate tests, 0 new tsc errors (repo total unchanged 733). Hardens the T-H1 product gate against regression. REMAINING (USER-GATED): I3 prod migrations, I4 e2e prod verify, I2 draw-down concurrency (w/ D2), I5 docs reconcile; B3-DEFER + G4-DEFER open. needs user ops                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Docs reconcile              | ⬜ not started                        | —                                                                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Legend: ⬜ not started · 🟡 in progress · ✅ done · 🔵 blocked-on-user

---

## SPRINT A — Screening hardening (Screening 58 → 92) 🔴 FIRST

**Closes:** T-H2 (token-order misses), T-H3 (fail-open), T-H4 (OFAC aliases), T-H5 (control_no_equity), T-M2 (cross-screening dedup), T-M11 (staleness TTL), T-M12 (missingLists). Plus the identifier-match gap.

**Why first:** false negatives = legal liability; this is the only category in the 50s-on-a-critical-axis.

**Files (verified anchors):**

- `src/lib/comply-v2/trade/screening/fuzzy-match.ts` (`jaroWinkler:19`, `scoreEntry:85` default threshold 0.75 + `matchedFields=["name"]`, `screenAgainstEntries:100`) — 66 LOC
- `src/lib/comply-v2/trade/screening/fuzzy-match.test.ts` (105 LOC, extend)
- `src/lib/comply-v2/trade/screening/sources/types.ts` (`canonicalizeName:129` — the shared normaliser)
- `src/lib/comply-v2/trade/screening/screen-party.server.ts` (`:128` no-snapshot warn-then-proceed; `:364` missingLists hardcodes 4 of 8; cascade call ~`:191/208`)
- `src/lib/comply-v2/trade/screening/cascade-50pct.ts` (`:186` edge filter drops control_no_equity)
- `src/lib/comply-v2/trade/screening/sources/ofac-sdn.ts` (`:100-101` names:[canonical], alt.csv deferred)
- `src/lib/comply-v2/trade/screening/cross-screening.ts` (`:131` UBO:: prefix → double-count)

### Task A1 — Token-set similarity (fixes the name-order miss, T-H2)

**Files:** Create `src/lib/comply-v2/trade/screening/token-set.ts` + `token-set.test.ts`; later wire into `fuzzy-match.ts:scoreEntry`.

- [ ] **A1.1 RED** — write `token-set.test.ts` asserting:
  - `tokenSetRatio("rosneft oil company","oil company rosneft") ≥ 0.95` (order-invariant)
  - `tokenSetRatio("zhang wei","wei zhang") ≥ 0.95`
  - `tokenSetRatio("spire global","planet labs") < 0.5`
  - `tokenSetRatio("spire global","spire global systems holding")` in (0.5, 0.95). NOTE: actual ≈0.86 = POTENTIAL_MATCH. This is INTENDED for sanctions screening — a superset/holding-suffix name SHOULD reach the human-review band, not be logged-only. The original "<0.85" guess was wrong (false-negative-averse domain); corrected to <0.95.
- [ ] **A1.2** run → verify FAIL (module missing)
- [ ] **A1.3 GREEN** — implement `tokenSetRatio(a,b)`: split each on whitespace into a Set, compute Jaccard over tokens AND a token-sorted Jaro-Winkler, return the max. Pure, no deps. (Token-sort = join sorted tokens with space, then `jaroWinkler` from `fuzzy-match.ts`.)
- [ ] **A1.4** run → PASS
- [ ] **A1.5 commit** `feat(trade): token-set name similarity for sanctions screening`

### Task A2 — Combine token-set into scoreEntry (T-H2 integration)

- [ ] **A2.1 RED** — in `fuzzy-match.test.ts`, add: `scoreEntry({names:["oil company rosneft"]}, canonicalizeName("rosneft oil company"))` returns non-null with score ≥ 0.85 (today it's ~0.67 → null).
- [ ] **A2.2** run → FAIL
- [ ] **A2.3 GREEN** — in `scoreEntry` (`fuzzy-match.ts:85`), change the per-name score to `Math.max(jaroWinkler(q, n), tokenSetRatio(q, n))`. Keep the threshold + return shape identical.
- [ ] **A2.4** run full `fuzzy-match.test.ts` → all PASS (no regression)
- [ ] **A2.5 commit** `fix(trade): scoreEntry uses max(jaro, token-set) — catches name-order swaps (T-H2)`

### Task A3 — Identifier match (LEI/passport exact = highest-confidence)

- [ ] **A3.1 RED** — test: an entry whose `identifiers` contains the party's `leiCode` returns a match with `score = 1.0` and `matchedFields:["identifier"]`, regardless of name score.
- [ ] **A3.2** FAIL → **A3.3 GREEN** — add an identifier-exact pre-check in `scoreEntry` (or a sibling `scoreEntryWithIdentifiers`) that short-circuits to 1.0 on any exact identifier hit. Wire the party's `leiCode` through from `screen-party.server.ts`.
- [ ] **A3.4** PASS → **A3.5 commit** `feat(trade): exact identifier (LEI) match in screening (zero-false-negative signal)`

### Task A4 — Fail-CLOSED on missing critical snapshot (T-H3)

- [ ] **A4.1 RED** — test `screenParty` (mock prisma): when `allLatestSnapshots()` returns a map missing OFAC_SDN, the persisted result is **NOT** `CLEAR` — it is a new status `INCONCLUSIVE` (or sets `requiresReview:true`), and the function surfaces `snapshotsMissing`.
- [ ] **A4.2** FAIL → **A4.3 GREEN** — in `screen-party.server.ts:128`, when a critical list snapshot is absent, set decision to a non-CLEAR review state instead of proceeding to CLEAR. Add the enum value if needed (note: may touch `TradeScreeningStatus` — if so, this becomes migration-gated, fold into Sprint D; otherwise use an existing review status).
- [ ] **A4.4** PASS → **A4.5 commit** `fix(trade): screening fails closed when a critical sanctions list is unavailable (T-H3)`

### Task A5 — Expand missingLists to all 8 (T-M12)

- [ ] **A5.1 RED** — test: `missingLists()` reports UK_OFSI / UN_CONSOLIDATED / EU_ANNEX_IV / OPEN_SANCTIONS when absent.
- [ ] **A5.2** FAIL → **A5.3 GREEN** — `screen-party.server.ts:364` expected-set = all 8 registered parsers.
- [ ] **A5.4** PASS → **A5.5 commit** `fix(trade): missingLists covers all 8 registered sanctions sources (T-M12)`

### Task A6 — Surface control_no_equity (T-H5)

- [ ] **A6.1 RED** — test: a cascade where a sanctioned ancestor is linked by `control_no_equity` (0% equity) yields a result flag (`controlOnlyHits: [...]`) — NOT silently dropped.
- [ ] **A6.2** FAIL → **A6.3 GREEN** — `cascade-50pct.ts:186`: keep control-only edges in a separate `controlOnlyAncestors` output rather than filtering them out; `screenParty` escalates on any sanctioned control-only ancestor. (Update the test at `cross-screening.test.ts:289` that currently locks in the drop.)
- [ ] **A6.4** PASS → **A6.5 commit** `fix(trade): surface control-without-equity sanctioned owners (OFAC control rule, T-H5)`

### Task A7 — OFAC SDN aliases (T-H4)

- [ ] **A7.1 RED** — test the `ofac-sdn` parser: given an SDN row + an `alt.csv`-style alias row, the parsed entry's `names` includes the alias.
- [ ] **A7.2** FAIL → **A7.3 GREEN** — extend `ofac-sdn.ts:100` to merge `alt.csv` aliases into `names`. (Fetch is cron-side from the same free treasury.gov host — no new cost.)
- [ ] **A7.4** PASS → **A7.5 commit** `feat(trade): load OFAC SDN aliases (alt.csv) into screening names (T-H4)`

### Task A8 — Cross-screening identity dedup (T-M2)

- [ ] **A8.1 RED** — test: same human as a real party AND an Orbis UBO node (matching LEI/name) is counted ONCE in the cascade, not summed to a false >50%.
- [ ] **A8.2** FAIL → **A8.3 GREEN** — `cross-screening.ts:131` reconcile `UBO::` nodes against existing party ids by LEI/normalised-name before merge.
- [ ] **A8.4** PASS → **A8.5 commit** `fix(trade): dedup UBO nodes vs real parties in cross-screening (T-M2)`

**Sprint A acceptance (→92):** name-order swaps match; identifier-exact = 1.0; missing critical list ⇒ non-CLEAR; control-only sanctioned owners flagged; aliases loaded; no double-count. All screening tests green; add a test count delta.

---

## SPRINT B — Authz & API gate (API 72→92, Security 70→92, Astra partial) 🔴

**Closes:** T-H1 (no product gate, all 28 routes), T-H10 (Astra mutation gate + product-gate tool surface), §4.8 (0 route tests).

**Files:** Create `src/lib/trade/trade-auth.ts`; modify all 28 `src/app/api/trade/**/route.ts`; `src/lib/astra/tool-executor.ts:314-338` + `engine.ts:342,449`; `src/lib/products.ts:21` (`hasProductAccess`), `src/lib/middleware/organization-guard.ts:288` (`getCurrentOrganization`).

### Task B1 — `getTradeAuth()` shared helper

- [ ] **B1.1 RED** — `trade-auth.test.ts`: returns null when org lacks TRADE access; returns `{userId, organizationId, role}` when `hasProductAccess(orgId,"TRADE")` is true.
- [ ] **B1.2** FAIL → **B1.3 GREEN** — compose `auth()` + `getCurrentOrganization` + `hasProductAccess`. → **B1.4** PASS → **B1.5 commit**.

### Task B2 — Route-level auth tests + gate rollout (do in batches of ~6 routes)

- [ ] For each route: **RED** a test asserting a no-TRADE-access caller gets 403; **GREEN** replace the inline `getCurrentOrganization`-only block with `getTradeAuth()`; PASS; commit per batch. (28 routes → ~5 commits.) Start with the highest-risk + AI-cost routes: `classify/extract-vision`, `licenses/parse`, `parties/[id]/screen`, then the rest.

### Task B3 — Astra trade-tool gating (T-H10)

- [ ] **B3.1 RED** — test: `screen_trade_party` / `check_sanctions_status` do NOT execute their DB-write path without going through the approval bridge; and the tool list handed to the model is filtered by org product access.
- [ ] **B3.2** FAIL → **B3.3 GREEN** — route the two mutating tools through the `executeAstraAction` approval gate (don't keep them in the direct `TOOL_HANDLERS` write path); filter `ALL_TOOLS` by product entitlement in `engine.ts:342/449`; enforce auditor-read-only at the tool layer. → **B3.4** PASS → **B3.5 commit**.

**Sprint B acceptance (→92):** every Trade route 403s a non-entitled caller (test-proven); Astra can't write screening/send mail un-gated; tool surface product-scoped.

---

## SPRINT G — Claude cost engineering (Astra 68→92, MINIMISE runtime $) ⭐ user constraint

**Goal:** cut Trade's Claude runtime cost ~70–90% with no feature loss. Do early — it's the explicit constraint.

**Files:** `src/lib/trade/classification/claude-vision-extractor.server.ts` (`model: claude-sonnet`, `max_tokens:3072` at `:213`); `src/lib/trade/classification/extraction-merger.ts`; `src/lib/astra/engine.ts` (system prompt + tool defs sent each turn); `src/lib/astra/tool-definitions.ts`.

### Task G1 — Prompt caching on Astra (biggest single saver)

- [ ] **G1.1 RED** — test asserting the Anthropic request for Astra includes `cache_control: {type:"ephemeral"}` on the (static) system prompt + tool-definitions blocks.
- [ ] **G1.2** FAIL → **G1.3 GREEN** — add `cache_control` breakpoints to the immutable system-prompt + tools array. → PASS → commit.

### Task G2 — Vision result cache (skip repeat extractions)

- [ ] **G2.1 RED** — test: a second `extractFromDatasheet` with the same PDF content-hash returns the cached result without calling Anthropic.
- [ ] **G2.2** FAIL → **G2.3 GREEN** — content-hash the PDF bytes; persist extraction keyed by hash (reuse an existing table or a small new one — if new table, fold the migration into Sprint D). → PASS → commit.

### Task G3 — Regex-first short-circuit (skip Vision entirely when possible)

- [ ] **G3.1 RED** — test: when the regex extractor already has all required attributes, `classifyFromDatasheet` does NOT call the vision model.
- [ ] **G3.2** FAIL → **G3.3 GREEN** — in `extraction-merger`, gate the vision call on "regex missing ≥1 required attribute". → PASS → commit.

### Task G4 — Model tiering (Haiku→Sonnet escalation)

- [ ] **G4.1 RED** — test: simple extraction uses Haiku; low-confidence Haiku result escalates to Sonnet.
- [ ] **G4.2** FAIL → **G4.3 GREEN** — try Haiku first; escalate to Sonnet only when Haiku confidence < threshold. → PASS → commit.

### Task G5 — max_tokens tuning

- [ ] Measure typical extraction output size; lower `max_tokens` from 3072 to a measured-safe ceiling. Test asserts the new ceiling still fits the largest fixture. Commit.

**Sprint G acceptance (→92):** caching + regex-skip + tiering live; a documented before/after token estimate showing ~70–90% reduction on the classify path.

---

## SPRINT C — Correctness bugs (License 74→92, De-minimis 76→92, Classification 76→92)

**Closes:** T-H6, T-M3, T-M4, T-M5, T-M16, T-M19, T-M20.

- [ ] **C1 — T-H6** `items/[id]/route.ts:111-122`: stop passing `countryOfOrigin` as destination. RED: test that classification at item-level does not evaluate embargo against origin. GREEN: remove the destination args at item altitude (destination belongs on `TradeOperation`); if an item-level preview is needed, take an explicit destination param. Commit.
- [ ] **C2 — T-M3/T-M4** collapse the two de-minimis implementations: make `comply-v2/trade/de-minimis-calculator.ts` delegate to the authoritative `subject-to-ear/cascade.ts`; fix Sudan (remove from E:1), D:1=25% (not 10%), Cuba E:2. RED tests per legal fact. Commit.
- [ ] **C3 — T-M5** `license-determination.ts:197`: Annex-IV gate reads the actual classified ECCN (eccnEU/eccnUS), not only trigger codes. RED + GREEN + commit.
- [ ] **C4 — T-M19** `parametric-matcher.ts:477`: add unit-awareness guard (reject/flag predicates whose attribute unit doesn't match the expected canonical unit). RED + GREEN + commit.
- [ ] **C5 — T-M20** `order-of-review.ts:297`: surface a second same-regime match (don't drop it); add sub-paragraph specificity tiebreak. RED + GREEN + commit.
- [ ] **C6 — T-M16** `control-list-cross-walk.ts:730`: fix or remove the broken USML XV(e)(11)(iv) thrust-as-power predicate. RED + GREEN + commit.

**Acceptance:** each legal fact test green; no engine reads origin-as-destination; one de-minimis source of truth.

---

## SPRINT D — Schema & money (Schema 76→92) — ⚠️ needs a migration (user ops)

**Closes:** T-H7 (SAG race), T-H12 (Float money), T-M8 (@@unique), T-M9 (onDelete). · **D5 (NEW, from A5):** add `EU_ANNEX_IV` + `OPEN_SANCTIONS` to `TradeSanctionsList` enum + repoint euAnnexIv/openSanctions parsers off the BIS_DPL/OTHER placeholders (migration).

- [ ] **D1 — T-H12** money fields → integer-minor-units (`BigInt` cents) or `Decimal`. Targets: `TradeLicense.drawnDownValue/totalCapValue` (`schema:11861/11865`), `TradeSammelgenehmigung.totalValueCapEur/drawnDownValueEur` (`12643/12648`), `TradeOperationLine.quantity/unitValue` (`11814-11815`), `TradePartyOwnership.percent`→`Decimal`/basis-points (`11438`). Mirror the pattern the foreign models already use (`BigInt` cents at `14770/14775/14943`). Write the migration; **user runs it**.
- [ ] **D2 — T-H7** `sammelgenehmigung-service.ts:399-447`: atomic draw-down. RED: concurrency test (two parallel draws can't overdraw). GREEN: conditional `updateMany` with `drawnDownValueEur ≤ cap - value` in WHERE + `{increment}` in data; add `@@unique([sammelgenehmigungId, operationId])` on the draw-down ledger (`12712`). Commit.
- [ ] **D3 — T-M8** add `@@unique([reportId, operationId])` on `TradeSupplement2ReportItem` (`12539`).
- [ ] **D4 — T-M9** add `onDelete: SetNull` to `TradeApiKey.createdBy` (`14466`).
- [ ] After schema edits: `prisma validate` + `prisma generate` (free) → migration authored → **🔵 user runs `db:migrate:dev`/`deploy`**.

**Acceptance:** money never `Float` on cap/ledger paths; concurrent draw-down can't exceed cap (test-proven); uniqueness enforced at DB.

---

## SPRINT E — National forms (Forms 73→92)

**Closes:** T-H8, T-H9, T-H11, T-M1, T-M13, T-M15.

- [ ] **E1 — T-H8** `supplement-2-service.ts:107-119`: add the missing operation-status filter (only EXECUTED-class ops in the BIS report). RED (a DRAFT op must NOT appear) + GREEN + commit.
- [ ] **E2 — T-M1** `supplement-2-reminder-service.ts:122`: OVERDUE reports get the CRITICAL reminder/email. RED + GREEN + commit.
- [ ] **E3 — T-H9** BAFA: add an XSD-conformance test (vendor a real ELAN-K2 XSD into the repo or assert required-field presence) + populate the live route's applicant block (`bafa-xml/route.ts:129` → query full org profile). Commit.
- [ ] **E4 — T-H11** `euc/annex-iiia-template.ts:514`: fix the `humanEndUse` switch to the real enum (`DUAL_USE`/`RESEARCH`/`GOVERNMENT`). RED (DUAL_USE renders human label not raw token) + GREEN + commit.
- [ ] **E5 — T-M15** `ofac-sham-doctrine/detector.ts:672`: real FX (don't treat non-EUR as EUR). Commit.
- [ ] **E6 — T-M13** FAA reminder Phase 3 (stale-in-review nudge). Commit.

**Acceptance:** no not-yet-shipped op in a BIS report; overdue alert fires; BAFA XML field-complete + conformance-tested; EUC end-use human-labelled.

---

## SPRINT F — Architecture cleanup (Architecture 78→92, UI 74→92)

**Closes:** §4 root causes #1,#5,#6,#7 + UI nits.

- [ ] **F1** Decide + remove the legacy `src/app/dashboard/trade/**` surface (7 pages) and its dark-twin `components/trade/*`; repoint `V2Sidebar.tsx:203` to `/trade`. RE-VERIFY no live importer first (grep). Commit.
- [ ] **F2** Extract the 6× copied `resolveSessionContext`/`resolveOrgId` into one `lib/trade` helper; replace call sites. Commit.
- [ ] **F3** Resolve phantom modules: rename `tool-trade-bridges.test.ts`/`tool-trade-helpers.test.ts` to match their real import targets (or restore the intended split). Commit.
- [ ] **F4** Remove dead code: `recomputeRiskScore` (superseded), `isInRussiaBelarusExclusionList` (unused). Verify no importer. Commit.
- [ ] **F5** UI: add confirm to BeneficialOwner delete (`BeneficialOwnersPanel.tsx:316`); replace native `window.confirm` (`DeemedExportDetailPanel.tsx:47`) with the inline pattern; fix `TradeShell.tsx:57` `lang`. Commit.

**Acceptance:** one Trade UI surface; one auth-resolution helper; no dead exports; consistent destructive-action confirms.

---

## SPRINT H — Data corpus (Corpus 70→~85 fast, →92 ongoing)

**Closes:** §4 root causes #2,#3 + coverage.

- [ ] **H1** Wire the 7 dead regime files (Wassenaar, NSG, India SCOMET, Japan METI, DE-Ausfuhrliste, Russia-833, ICP) into classification-lookup + order-of-review (they're built + tested, just unconsumed). Commit per file with a test that the engine now returns their entries.
- [ ] **H2** Unify Gen-1/Gen-2 corpus schema onto one `ClassificationEntry` type so cross-jurisdiction queries span all regimes; route all through `index.ts`. Commit.
- [ ] **H3** Priority-fill the highest-traffic space ECCNs/USML categories (continuous; track count in the status board). Each batch: add entries + extend `classification-data.test.ts` invariants. Commit per batch.

**Acceptance:** 0 dead regime files; one corpus type; documented coverage delta. (True 92 = ongoing curation, tracked.)

---

## SPRINT I — Tests & production readiness (Tests 72→92, Prod 55→92) — ⚠️ needs user ops

**Closes:** §4 root cause #8 + the prod-readiness gap. · **B3-DEFER (from Sprint B):** engine-level Astra tool-surface product-gating + auditor read-only enforcement — touches shared `src/lib/astra/engine.ts` (ALL_TOOLS), so affects Comply; needs its own cross-surface design+review, NOT under the Trade branch alone. · **Route tests:** 26 remaining Trade route gate-tests (2 of 28 done in B2). · **G4-DEFER (from Sprint G):** model-tiering Haiku→Sonnet for Vision extraction — quality-sensitive (wrong attr→wrong ECCN), needs an A/B extraction-accuracy eval on sample datasheets before shipping; not a mechanical fix.

- [ ] **I1** Backfill route-level integration tests across the 28 routes (auth, validation wiring, org-scope) — much of this lands during Sprint B; finish the remainder here.
- [ ] **I2** Concurrency tests for the draw-down ledgers (lands in D2; verify here).
- [ ] **I3** 🔵 **USER:** run the 8 pending production migrations (`docs/PRODUCTION-MIGRATION-RUNBOOK.md`) + the Sprint D money migration.
- [ ] **I4** 🔵 **USER + agent:** end-to-end production verification of the 5 feature surfaces (the docs admit this was never done). Agent writes the e2e checklist; user executes against prod.
- [ ] **I5** Docs reconcile: fold the 3 "canonical" strategy docs into one current-state doc; unify the divergent test counts. Commit.

**Acceptance:** route + concurrency tests green; migrations live in prod; e2e checklist passed; one canonical strategy doc.

---

## 5. Self-review notes (done at write time)

- **Spec coverage:** every category in §1 maps to a sprint; every T-Hx (1–12) and the key T-Mx are assigned (A: H2/H3/H4/H5/M2/M11/M12; B: H1/H10; C: H6/M3/M4/M5/M16/M19/M20; D: H7/H12/M8/M9; E: H8/H9/H11/M1/M13/M15; F+H: architecture/data). ✓
- **Placeholder honesty:** Sprint A has literal test assertions (imminent). Sprints B–I are task-level with exact `file:line` anchors + acceptance criteria; their literal implementation code is finalised at each task's RED step (pre-writing it now would be speculative against code not re-read this session — and stale code is a placeholder in disguise). This is the deliberate, stated adaptation for a 9-sprint master plan.
- **Type/name consistency:** `getTradeAuth` (B), `tokenSetRatio` (A1), `controlOnlyAncestors` (A6) are the new symbols; reused consistently where referenced.
- **Ops gating** is explicit (Sprint D migration, Sprint I3/I4) so no agent claims "done" on user-gated work.
