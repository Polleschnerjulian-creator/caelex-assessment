# Caelex Trade — Findings Backlog (Deep Analysis 2026-05-30)

> Read-only deep analysis of the entire Caelex Trade subsystem (453 files,
> ~153.7k LOC, 26 Prisma models + 34 enums, 28 API routes, 30 pages, ~250
> lib modules, 48 regulatory-data files, 129 test files). Produced by 12
> parallel analysis agents, one per subsystem cluster, each reading its
> files in full and verifying every claim at `file:line`. Nothing was
> changed during analysis.
>
> **Status legend:** 🔴 HIGH (permissive / security / compliance-liability)
> · 🟠 MEDIUM (correctness, mostly conservative-leaning) · 🔵 LOW (nit /
> hygiene) · ✅ verified-correct (recorded so it isn't re-litigated).
>
> **Net verdict:** architecturally strong and _conservative-by-design_ —
> almost every defect leans **over-restrictive** (blocks legitimate trade),
> not permissive. The exceptions are the 🔴 items below, where in export
> control a permissive bug = legal liability. "SHIPPED" in the strategy
> docs means _code+tests merged_, NOT _live in prod_ (8 migrations unrun).

---

## 0. How to read this

Severity is assigned from the **export-control liability model**: the
catastrophic direction is always the _false negative_ (a missed sanctioned
party, a missing license requirement, an under-classified item). A bug that
_over_-blocks is a UX/cost problem; a bug that _under_-controls is a legal
one. The 🔴 list is therefore dominated by the handful of permissive paths.

Every finding carries the verifying `file:line`. Where an agent's claim was
refuted or downgraded after code-check, it is recorded under
§9 (Verified-correct / refuted) so it isn't re-investigated.

---

## 1. 🔴 HIGH — priority remediation

| ID        | Finding                                                                                                                                                                                                              | Location                                                                                                                                             | Why it matters                                                                                                                                                                                                                                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T-H1**  | **No Trade API route enforces `hasProductAccess`** — all 28 routes check org membership only, never TRADE entitlement                                                                                                | every `src/app/api/trade/**/route.ts`; `grep hasProductAccess src/app/api/trade` = 0                                                                 | Any authenticated member of _any_ active org reaches the entire Trade data + AI surface even with **no TRADE subscription / EXPIRED trial / SUSPENDED** grant. Billing bypass **and** control bypass. The page UI is gated (`(trade)/trade/layout.tsx:108`); the data API behind it is not.                                                                                |
| **T-H2**  | **Sanctions fuzzy-match misses name/token-order swaps** (char-level Jaro-Winkler only, no token-set)                                                                                                                 | `src/lib/comply-v2/trade/screening/fuzzy-match.ts:158`                                                                                               | "rosneft oil company" vs "oil company rosneft" → 0.67 = **CLEAR (miss)**; "zhang wei"/"wei zhang" → 0.41. Sanctions lists store names in varying token orders → **misses real sanctioned parties**. The single most catastrophic class.                                                                                                                                    |
| **T-H3**  | **Screening fail-open: still returns CLEAR when a critical list failed to load**                                                                                                                                     | `src/lib/comply-v2/trade/screening/screen-party.server.ts:128` (warns) → still persists CLEAR                                                        | OFAC sync down → party screened against zero OFAC data → "no hit." No gate refuses to clear when a snapshot is missing/stale. Infra failure silently degrades to "compliant."                                                                                                                                                                                              |
| **T-H4**  | **OFAC SDN aliases (`alt.csv`) not loaded** — primary name only                                                                                                                                                      | `src/lib/comply-v2/trade/screening/sources/ofac-sdn.ts:100-101` (`names:[canonical]`, AKA deferred)                                                  | Many SDN entries are commonly known by an alias; an AKA-only counterparty scores against only the primary and falls below threshold → miss. Partially backstopped by OpenSanctions/consolidated _if_ present.                                                                                                                                                              |
| **T-H5**  | **OFAC 50%-rule cascade silently drops `control_no_equity` (trustee/control-without-equity)**                                                                                                                        | `src/lib/comply-v2/trade/screening/cascade-50pct.ts:186` (edge filter to economic/voting only)                                                       | A sanctioned designated trustee with 0% equity is a blocking control relationship under OFAC — here it produces **no ancestor, no flag**. A test (`cross-screening.test.ts:289`) even asserts the absence as "correct," locking in the false-negative.                                                                                                                     |
| **T-H6**  | **`countryOfOrigin` passed as `destinationCountry`** in the item classification call site                                                                                                                            | `src/app/api/trade/items/[id]/route.ts:111-122`                                                                                                      | A US-origin item shipped to Iran is assessed as "destination = US." Embargo, de-minimis tier, and exception-matrix destination checks all evaluate the **wrong country**. Engines are correct; the wiring is wrong (and item-level is arguably the wrong altitude — destination lives on `TradeOperation`).                                                                |
| **T-H7**  | **Sammelgenehmigung draw-down race → quota overdraw** (read-committed + absolute write, no DB constraint)                                                                                                            | `src/lib/trade/sammelgenehmigung/sammelgenehmigung-service.ts:399-447`                                                                               | Two concurrent draw-downs both read the same balance, both pass the cap check, second `update` clobbers the first with a stale absolute value → total exceeds `totalValueCapEur` → **shipping past a BAFA bulk-authorization ceiling**. Fix: atomic conditional `updateMany` (`drawnDownValueEur ≤ cap - value`, `{increment}`) or `Serializable` + retry; add a DB CHECK. |
| **T-H8**  | **Supplement No. 2 reports not-yet-shipped operations to BIS** (status filter missing, contradicts own docstring)                                                                                                    | `src/lib/trade/supplement-2/supplement-2-service.ts:107-119`                                                                                         | Docstring claims `status ∈ {EXECUTED, BLOCKED_PENDING_DISCLOSURE}` but the Prisma `where` has **no status clause** — DRAFT/AWAITING ops with an in-scope ECCN + ship-date land in the federal report. (`BLOCKED_PENDING_DISCLOSURE` isn't even a real enum value.)                                                                                                         |
| **T-H9**  | **BAFA ELAN-K2 XML is well-formed but not XSD-validated; drift-watcher inert; live route emits name+"DE" only**                                                                                                      | `src/lib/trade/bafa/xml-serializer.ts`, `xsd-version.ts:48` (two equal local consts), `src/app/api/trade/operations/[id]/bafa-xml/route.ts:129`      | No `.xsd` in repo; "schema-valid" is unverified and a real ELAN-K2 upload would likely reject. Drift detector compares two hardcoded constants (no remote fetch) → can never fire on real BAFA change. Live route never populates applicant street/PLZ/Ort/VAT → incomplete-applicant rejection.                                                                           |
| **T-H10** | **Astra: mutating trade tools bypass the approval gate** — `screen_trade_party`/`check_sanctions_status` write DB + send email un-gated; tool surface not product-gated; "auditor read-only" is prompt-advisory only | `src/lib/astra/tool-executor.ts:314-338`, `src/lib/atlas/.../screen-party.server.ts:191,208`; `engine.ts:342,449` (`ALL_TOOLS` unconditional)        | The AI can, unprompted, write screening results, mutate `screeningStatus`, and fire a sanctions-hit email — no `AstraProposal`, no human sign-off. Any org (even without TRADE) gets the full trade tool surface.                                                                                                                                                          |
| **T-H11** | **`humanEndUse` enum mismatch → raw `DUAL_USE`/`RESEARCH` token on a signed EUC**                                                                                                                                    | `src/lib/trade/euc/annex-iiia-template.ts:514-526` (switches on `DUAL`/`UNKNOWN`, real enum is `DUAL_USE`/`RESEARCH`/`GOVERNMENT`)                   | A signed End-Use Certificate renders the raw token as the declared end-use category instead of the human label — substantive defect on a legal document. Only `CIVIL` is tested.                                                                                                                                                                                           |
| **T-H12** | **Money stored as `Float` across de-minimis %, ownership %, and draw-down ledgers**                                                                                                                                  | schema `prisma/schema.prisma:11438` (`percent`), `:11861/11865` (license cap/drawn), `:12643/12648` (SAG cap/drawn), `:11814-11815` (line qty/value) | Float drift at the **0.50 ownership cliff** (the 50%-rule multiplies percentages along chains) and at cap `≥` comparisons. The _newer_ foreign models use `BigInt` cents (`14770/14775/14943`) — the team knows the pattern; EUR fields were never migrated.                                                                                                               |

---

## 2. 🟠 MEDIUM — correctness (mostly conservative, fix in normal cycle)

| ID        | Finding                                                                                                                                                                                                                                         | Location                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **T-M1**  | Supplement-2 OVERDUE reports never get the CRITICAL reminder/email (Phase 2 scans `DRAFT` only) — the missed-federal-deadline alert never sends                                                                                                 | `src/lib/trade/supplement-2/supplement-2-reminder-service.ts:122-124`                                                    |
| **T-M2**  | Cross-screening can double-count one human as a real party **and** an Orbis UBO node → false 50% trip (30%+30%→60%)                                                                                                                             | `src/lib/comply-v2/trade/screening/cross-screening.ts:131`                                                               |
| **T-M3**  | `comply-v2/trade/de-minimis-calculator.ts` carries 3 real legal errors: Sudan still E:1 (removed 2020); D:1 = 10% (should be 25%); Cuba E:1 vs E:2 divergence from the authoritative cascade. **Two un-reconciled de-minimis implementations.** | `src/lib/comply-v2/trade/de-minimis-calculator.ts:147-173`; authoritative path `src/lib/trade/subject-to-ear/cascade.ts` |
| **T-M4**  | bom de-minimis advisory threshold-hint layer maps `E:1/E:2→0%`, `D:1→10%` (real §734.4: E:1/E:2=10%, D:1=25%) — wrong, but stricter; contradicts the (correct) cascade                                                                          | `src/lib/trade/bom-de-minimis/calculator.ts:454-460`                                                                     |
| **T-M5**  | Annex IV (Art. 2b) hard-prohibition gate inspects only _suggested_ trigger codes, not the actual classified ECCN → a manually-classified Annex-I item with no trigger hit doesn't fire the gate                                                 | `src/lib/comply-v2/trade/license-determination.ts:197-204`                                                               |
| **T-M6**  | D:1 country list incomplete → NS-FDP (§734.9(b), keys on D:1) silently skipped for omitted D:1 destinations — the one **under-control** FDPR lean (CN/RU/BY are present, so mitigated)                                                          | `src/lib/trade/subject-to-ear/country-groups.ts:87-105`                                                                  |
| **T-M7**  | §9(1)/§9(2) AWV catch-all hits computed but the booleans aren't persisted (no schema column) → specific para9 reason lost after recompute                                                                                                       | `src/lib/comply-v2/trade/operations/recompute.server.ts:114-118` vs `catch-all-evaluator.ts:677-686`                     |
| **T-M8**  | Schema: missing `@@unique` on SAG draw-down ledger and Supplement-2 report items → duplicate rows / double-count in a federal filing                                                                                                            | `prisma/schema.prisma:12712-12714`, `:12539-12542`                                                                       |
| **T-M9**  | `TradeApiKey.createdBy` has no `onDelete` (Prisma default Restrict) → deleting the creating user fails at the FK → blocks user-deletion / GDPR erasure                                                                                          | `prisma/schema.prisma:14466-14467`                                                                                       |
| **T-M10** | UK OFSI source on a knowingly-dead URL (legacy ConList stopped updating 2026-01-28; FCDO feed an unverified TODO) → UK designations after that date absent                                                                                      | `src/lib/comply-v2/trade/screening/sources/uk-ofsi.ts:4-30`                                                              |
| **T-M11** | No snapshot staleness/TTL check at screening time — if sync has been broken for weeks, screening runs against stale lists silently                                                                                                              | `src/lib/comply-v2/trade/screening/snapshot-store.server.ts:120`                                                         |
| **T-M12** | `missingLists()` only knows 4 of 8 lists → under-reports coverage gaps to the operator                                                                                                                                                          | `src/lib/comply-v2/trade/screening/screen-party.server.ts:364`                                                           |
| **T-M13** | FAA reminder "Phase 3" (stale-in-review nudge vs 180-day clock) documented but unimplemented                                                                                                                                                    | `src/lib/trade/faa-ast/faa-ast-reminder-service.ts:13-18`                                                                |
| **T-M14** | No deemed-export expiry cron → ACTIVE deemed-export auths never transition to EXPIRED (coverage check re-validates `validUntil` at query time, so screening stays correct; only stored status drifts)                                           | `src/lib/trade/deemed-export/deemed-export-service.ts` (no cron references it)                                           |
| **T-M15** | OFAC sham detector pricing FX no-op: non-EUR line value silently treated as EUR → mis-rated against EUR median                                                                                                                                  | `src/lib/trade/ofac-sham-doctrine/detector.ts:672`                                                                       |
| **T-M16** | USML XV(e)(11)(iv) electric-propulsion entry has a self-flagged broken predicate (`transmitPowerW gte 0.3` as a thrust stand-in); promised companion entry doesn't exist → mis-fires on any EP item ≥0.3 W                                      | `src/lib/comply-v2/trade/classification/control-list-cross-walk.ts:730-737`                                              |
| **T-M17** | Classification AI vision: prompt-injection surface — a malicious datasheet can steer extraction; output whitelist constrains attribute _names/types_ but **not values**                                                                         | `src/lib/trade/classification/claude-vision-extractor.server.ts:283-306`                                                 |
| **T-M18** | Classification: no author/reviewer separation of duties — same MEMBER can generate a draft and self-approve it                                                                                                                                  | `src/lib/trade/classification-draft-service.ts:109,167`; gate `classification-draft-actions.ts:93`                       |
| **T-M19** | Parametric matcher has zero unit awareness — predicates compare raw numbers; a mis-normalized GHz/MHz value silently flips jurisdiction (no guard)                                                                                              | `src/lib/comply-v2/trade/classification/parametric-matcher.ts:477-579`                                                   |
| **T-M20** | Order-of-review silently drops a second same-regime match (two EAR_CCL hits → second vanishes from all buckets), and has no sub-paragraph-specificity tiebreak                                                                                  | `src/lib/comply-v2/trade/classification/order-of-review.ts:297-314`                                                      |

---

## 3. 🔵 LOW — nits / hygiene (representative, not exhaustive)

- BAFA `Mengeneinheit` hardcoded `"Stk"` for every line (`report-builder.ts:286`, `TODO` present); address-line splitter loses PLZ/Ort for non-DACH recipients (`report-builder.ts:364-396`).
- `find_clauses`-style raw `err.message` returned to client in 3 user-reachable party routes (`parties/[id]/screen`, `.../screenings/[id]/decide`, `.../ubo`) — codebase has `getSafeErrorMessage()` but these don't use it.
- BAFA Bescheid parser German-number coercion mis-parses a US-formatted _string_ `"1,234.56"` → 1000× error (only bites if Claude returns a string not a number) (`bafa-bescheid-parser.server.ts:375-384`).
- `uk-strategic-list-mapping` advertises `WA:` (Wassenaar) refs but zero entries use them — dead capability.
- BeneficialOwner delete has **no confirmation** (`BeneficialOwnersPanel.tsx:316`); deemed-export revoke uses native `window.confirm` (`DeemedExportDetailPanel.tsx:47`) — inconsistent with the inline-confirm pattern elsewhere.
- `TradeShell.tsx:57` sets `lang="en"` on heavy German compliance copy (comment says `de`) — screen-reader mispronunciation.
- de-minimis bright-line compares the 4-dp-rounded percent (`calculator.ts:372` + `cascade.ts:373`) — ~5e-5pp under-count band at the threshold (practically unreachable).
- Corpus: `index.ts:10` barrel docstring advertises a non-existent API (`findByTopic`, `ALL_ENTRIES`); docstrings cite a fictional ECCN `9A515.f` not in `us-ccl.ts`.

---

## 4. 🏗️ Architecture / Tech-debt (root causes, not single bugs)

> Fragmentation is the recurring root cause — duplicated systems where one
> half gets fixed and the other forgotten. In liability-bearing software
> that's not style, it's a bug source.

1. **Two LIVE UI surfaces.** `(trade)/trade/*` (new, branded, product-gated) **and** `dashboard/trade/*` (legacy, still linked in the Comply nav `V2Sidebar.tsx:203`, hits the same APIs, already diverging — new list has multi-select/CSV, legacy doesn't). Every operation panel exists as a light/dark twin (`components/trade/*` vs `(trade)/trade/**/_components/*`). → Pick one, delete the other, repoint the nav.
2. **7 fully-built regime data files are DEAD DATA** (built + tested, zero non-test consumers): Wassenaar, NSG, India SCOMET, Japan METI, German Ausfuhrliste, Russia-833, ICP — ~5.5k LOC + ~250 entries unwired. → Wire into classification/order-of-review **or** remove.
3. **Two corpus schema generations.** Gen-1 (shared `ClassificationEntry`, flows through `index.ts`) vs 9 Gen-2 files each with its own ad-hoc interface (`code`/`position`/`paragraph` divergence). Cross-jurisdiction query — the advertised value-prop — only works in Gen-1. → Unify on one entry type.
4. **Two un-reconciled de-minimis implementations** (T-M3) with divergent country-group truth (Sudan/Cuba/D:1) and threshold models. → Collapse to the authoritative cascade; make the advisory layer call it.
5. **6× copied role-resolution logic** (`resolveSessionContext`/`resolveOrgId`) across pages + layout instead of one `lib/trade` helper. → Extract; a fix to org-resolution currently needs 6 edits.
6. **Phantom modules:** `tool-trade-bridges.ts` / `tool-trade-helpers.ts` don't exist — only their `.test.ts` (which import from `tool-definitions`/`tool-executor`). → Rename tests or restore the intended split.
7. **Dead code:** `recomputeRiskScore` (superseded by `recomputeOperation`); remote-sensing engine (`checkRemoteSensingCompliance`) wired into no route/tool; `isInRussiaBelarusExclusionList` (FDPR exclusion the engine never consults).
8. **Trade API: 0 route-level tests** (28 handlers incl. `screen`/`decide`/AI). The pure engines are well-tested; the HTTP boundary (auth, validation wiring, org-scope) is not — exactly why T-H1 slipped through.

---

## 5. 📄 Docs vs. reality (8 strategy docs, a 48-hour cluster)

- **"SHIPPED" ≠ prod.** The Execution-Plan declares "all 6 tiers COMPLETE" yet admits **8 production migrations unrun** + "end-to-end production verification hasn't been performed." → Treat every Z-sprint "SHIPPED" as _merged in code_, not _live in prod with schema deployed_.
- **Test counts diverge 3×** across docs (644 / 700+ / 839+ / 1,251 / 1,984).
- **Three docs each call themselves "canonical"** with no mutual supersession marker; a new reader gets conflicting "current state."
- **Resolved contradictions (code wins):** UK/UN parsers exist (UK on a dead URL — T-M10); license-determination _does_ call the exception matrix (an Audit gap that was later closed); antenna threshold = 25 m in code (correct), Moat doc's 5 m is stale.

---

## 6. ✅ Standout strengths (real — preserve these)

- **Three-valued classification logic** ("unknown attribute never silently classifies below threshold") — the correct design for a liability-bearing classifier, adversarially tested (`parametric-matcher.test.ts:478`).
- **Order-of-review precedence legally faithful** (USML→AnnexIV→EAR→AnnexI→national→multilateral); non-derogable PROHIBITED shielded from exception downgrade.
- **Cron auth exemplary & uniform** — `timingSafeEqual`, fail-closed on missing secret, identical across all 12.
- **Per-id tenant scoping solid** in the route layer — every `findFirst` filters `organizationId`, 404 on miss; cross-entity links org-verified both sides.
- **Audit-grade screening provenance** — append-only `TradeScreeningResult` + SHA-256 `snapshotHash` + content-addressed snapshots (`@@unique([list,hash])`).
- **Recordkeeping textbook** — pure, UTC-stable, leap-year-correct, never deletes; 5-yr retention matches EAR/ITAR/EU.
- **VSD PDF templates legally meticulous** (BIS §764.5 180-day, DDTC §127.12 60-day, OFAC §501.806) with §1001 certification + privilege watermark.
- **Newest foreign-jurisdiction models use integer-minor-unit money** (`BigInt` pence/cents) — the right pattern, just not back-ported.
- **De-minimis authoritative cascade is correct** — right numerator/denominator, correct 25/10/0 mapping, strict-`>` boundary, FDPR overrides de-minimis. The feared floor-rounding under-count does **not** exist.

---

## 7. Recommended remediation order (risk × effort, all cost-free)

> Sequenced so the highest legal/security risk with the smallest blast
> radius goes first. None requires external spend.

1. **T-H1 — product-access gate.** Add a shared `getTradeAuth()` (session + `getCurrentOrganization` + `hasProductAccess(orgId,"TRADE")`) and route all 28 handlers through it. Highest security/billing fix, mostly mechanical. **Add the missing route-level auth tests at the same time** (closes the §4.8 gap).
2. **T-H6 — `countryOfOrigin`→destination wiring.** One-line-class fix, high legal impact; add a test asserting destination ≠ origin.
3. **Screening false-negative cluster (T-H2/H3/H4/H5).** Add token-set matching alongside Jaro-Winkler; fail-**closed** when a critical snapshot is missing; load OFAC `alt.csv`; surface `control_no_equity` as a separate flag. Each is independently shippable.
4. **T-H7 — SAG draw-down atomicity.** Conditional `updateMany` + `@@unique` + DB CHECK; add a concurrency test.
5. **T-H10 — Astra mutation gate + product-gate the tool surface** (and enforce auditor read-only at the tool layer, not the prompt).
6. **T-H8/H9/H11 — filing correctness** (Supplement-2 status filter, BAFA applicant completeness + a real XSD-conformance test, EUC end-use enum).
7. **T-H12 — money to `BigInt` cents / `Decimal`** (one migration; back-port the pattern the foreign models already use).
8. **Tech-debt** (§4): kill the legacy `dashboard/trade` surface; wire-or-remove the 7 dead regime files; collapse the two de-minimis implementations; extract the role-resolution helper.

---

## 8. 🔧 Customs filing + cross-product bridges + misc services

> _Section pending — the customs/bridges analysis agent was re-dispatched
> after an API rate-limit and is still running. It covers: AES (US) +
> ATLAS (DE) customs serializers, `api-keys-service` (key hashing/entropy/
> constant-time compare), `comply-bridge` tenant isolation, `org-profile`
> encryption (EORI/DUNS/BAFA-email), `sample-data-seeder` prod-safety,
> `csv-export` formula injection, and the aggregators (action-inbox, kpi,
> sidebar-badge). Findings will be merged here on completion._

---

## 9. Verified-correct / refuted (do not re-investigate)

- **De-minimis authoritative path** — numerator/denominator, thresholds, boundary, FDPR-overrides-de-minimis all correct; **no `Math.floor` under-count** (the hypothesized bug does not exist in `calculator.ts`/`cascade.ts`).
- **Cron auth** — all 12 constant-time + fail-closed; no fail-open.
- **Per-id tenant isolation** — no `findUnique({where:{id}})`-then-serialize IDOR anywhere in the route layer; nested resources verify the parent's org.
- **SSRF** — no trade route fetches a user-supplied URL; AI endpoints take uploaded bytes, not URLs.
- **BAFA XML escaping** — `escapeText`/`escapeAttr` correct, `&`-first ordering, injection test passes.
- **Retention** — never deletes; pure; leap-year/UTC-safe.
- **Recordkeeping premature-deletion** — does not exist (read-only layer).
- `japan-meti` "duplicate codes" — by design (Schedule 1 goods vs Schedule 2 tech share numeric codes, disambiguated by `schedule` field; test asserts `schedule+code` uniqueness).

---

_Generated read-only; no source files were modified during this analysis._
_Companion to the strategy docs in `docs/CAELEX-TRADE-*.md`._
