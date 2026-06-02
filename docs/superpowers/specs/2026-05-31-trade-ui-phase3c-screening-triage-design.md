# Trade UI Redesign — Phase 3C: Screening Batch-Triage (Design Spec)

**Date:** 2026-05-31
**Status:** Draft (design) — pending spec review
**Branch:** `fix/trade-to-92`
**Predecessors:** Phase 1 (nav/home/tokens, deployed), Phase 2 (search-pickers + datasheet auto-classify, deployed), Phase 3A (shared `TradeTable<T>` primitive + list migration, deployed)

---

## Goal

Give the Ausfuhrverantwortliche (AV) a **single, dedicated surface to clear the sanctions-screening backlog** — a work queue at `/trade/screening` built on the Phase-3A `TradeTable<T>` primitive that:

1. **Lists every party needing attention** (`POTENTIAL_MATCH` → `STALE` → `NOT_SCREENED`), urgency-ordered, sortable by last-screened, filterable by status — fed from the _same source_ that already powers the sidebar badge and the home Action Inbox.
2. **Batch-triages**: select many rows → **"re-screen selected"** (reuses the existing `screenParty()` engine server-side at **zero external cost**) and **bulk-dismiss obvious false positives** where policy allows.
3. **Guides per-party resolution** (the "führen" goal): a drawer to review one `POTENTIAL_MATCH` — matched sanctioned entity vs. the party, the score and matched fields — and resolve to `CLEAR` (required justification, audit-logged) or `CONFIRMED_HIT` (which **blocks** the party). The machine auto-prepares; the human confirms.
4. **Surfaces a count in the nav** ("Screening N") feeding from the same query as the existing badge.

**Why now:** Phase 3A explicitly named Screening-Triage as a 3C deliverable built _on_ the primitive. Today the only path to triage a hit is: notice the sidebar badge → open Stammdaten → open Counterparties → scan for the amber icon → click into one party → scroll to its screening history → decide. There is no batch action and no queue ordering. The plumbing (engine, decide endpoint, party-detail screenings include, badge counts, aggregator cohort) **already exists** — 3C is overwhelmingly a UI-composition + pure-ordering-logic effort plus one thin additive batch endpoint.

## Non-Goals (YAGNI — explicitly OUT of 3C)

- **No new sanctions / scrime / PEP list, and no new external screening provider.** We reuse the existing snapshot store (`allLatestSnapshots()`) and the existing `screenParty()` engine. **No new runtime dependency.** The only external API the platform allows is Anthropic Claude — and 3C does **not** use it (deterministic triage; no LLM in the hot path).
- **No ML / learned scoring.** Match scoring stays the existing Jaro-Winkler + identifier pre-check + 50%-rule cascade. We only _order_ and _present_ existing results.
- **No 4-eyes / maker-checker workflow.** The `decide` endpoint records the decision atomically by a single reviewer (a future V2-Proposal enhancement is noted in that route's header but is out of scope here).
- **No change to the resolution state machine semantics.** `CONFIRMED_HIT` blocks; `FALSE_POSITIVE_DISMISSED` returns to `CLEAR`; already-decided screenings stay immutable. We _expose_ this machine through a better UI and add a _bulk_ entry point to its two existing server paths.
- **No Prisma migration.** Existing enums (`TradeScreeningStatus`, `TradeScreeningDecision`, `TradePartyStatus`) and fields (`lastScreenedAt`, `blockedReason`, `notes`, `decidedById`/`decidedAt`) already model everything. (See "Data model" — confirmed additive-free.)
- **No server-side sort/pagination redesign.** The queue is server-paginated by the existing parties query; urgency ordering + secondary sort happen client-side on the loaded page, exactly like 3A. (Open question Q2 covers the >50-row case.)
- **No "re-screen ALL stale" button.** That is the daily `trade-rescreen-stale` cron's job; the UI offers _selected_ re-screen only, to keep per-user load bounded and audit attribution clean.

## Verified facts (read from the codebase — trust these)

**Engine — `src/lib/comply-v2/trade/screening/screen-party.server.ts`**

- `screenParty(partyId, { scoreThreshold?, systemDecisionUserId? }): Promise<ScreenPartyResult>` — fetches `allLatestSnapshots()` (cached snapshot store, no network), runs Jaro-Winkler + identifier pre-check across all lists + the 50%-rule cascade, **persists a new `TradeScreeningResult` (insert-only)** and updates the party's denormalized `screeningStatus` + `lastScreenedAt` atomically in one `$transaction`. **Zero external cost** — pure CPU against in-memory snapshots (~50 ms/party).
- A would-be-`CLEAR` is escalated to `POTENTIAL_MATCH` when a critical list snapshot is missing (T-H3 fail-closed) or a control-without-equity sanctioned owner exists (T-H5). On `POTENTIAL_MATCH` it fire-and-forgets a sanctions-hit email (best-effort; result still persists).
- Score bands (`fuzzy-match.ts`): `SCORE_CONFIRMED_HIT = 0.95`, `SCORE_POTENTIAL_MATCH = 0.85`, `SCORE_WEAK_MATCH = 0.75`. `classifyScore()` → `"confirmed" | "potential" | "weak" | "none"`. `FuzzyHit = { entryId; score; matchedFields: string[]; ... }`; persisted as `PersistableHit = FuzzyHit & { list: TradeSanctionsList }`.

**Engine is already reused server-side, sequentially:**

- On-demand: `POST /api/trade/parties/[id]/screen` (rate-limit tier `sensitive`, 5/hr) calls `screenParty(id, { systemDecisionUserId })`.
- Cron: `GET /api/cron/trade-rescreen-stale` (`maxDuration = 300`, `runtime = "nodejs"`) loads up to 5000 stale `ACTIVE` parties and calls `screenParty()` in a **sequential `for`-loop**, accumulating per-item results. This is the proven batch pattern 3C's batch endpoint copies.
- Astra tool `screen_trade_party`.

**Resolution state machine — `POST /api/trade/parties/[id]/screenings/[screeningId]/decide`**

- Body: `{ decision: "CONFIRMED_HIT" | "FALSE_POSITIVE_DISMISSED", notes: string (1..2000) }`. `notes` is **required** (Zod `min(1)`).
- Org-scoped (`party.organizationId` match). Only a `POTENTIAL_MATCH` screening can be decided; deciding an already-decided one → **409** ("Run a new screening to override"). Decided screenings are immutable for audit.
- `CONFIRMED_HIT` → `party.screeningStatus = CONFIRMED_HIT`, `party.status = BLOCKED`, `party.blockedReason = "Sanctions match confirmed by reviewer on <ISO>: <notes>"`. `FALSE_POSITIVE_DISMISSED` → `party.screeningStatus = CLEAR`, **no** change to `party.status`. Both write `decidedById`/`decidedAt`/`notes` on the screening row and emit `trade.screening.decided` (+ `trade.party.blocked` on confirm) via `emitTradeEvent`.

**Queue data sources (already shaped, org-scoped):**

- `getSidebarBadgeCounts(orgId).partiesNeedingReview` = `count(TradeParty where screeningStatus IN [POTENTIAL_MATCH, CONFIRMED_HIT, STALE])` — already rendered as the `Stammdaten` badge.
- `aggregateActionItems({ partiesNeedingReview, ... })` consumes `{ id, legalName, screeningStatus: "POTENTIAL_MATCH"|"CONFIRMED_HIT"|"STALE" }`; the welcome page fetches exactly those rows.
- `GET /api/trade/parties?screening=<STATUS>` filters server-side; the list `select` already returns `{ id, legalName, tradeName, countryCode, status, screeningStatus, isUSPerson, isHighRiskCountry, lastScreenedAt, createdAt, updatedAt }`.
- `GET /api/trade/parties/[id]` already `include`s `screenings` (latest 10, `desc`) with `{ id, decision, decidedAt, createdAt, snapshotHash, hits, cascade, notes, decidedBy }` — exactly the drawer payload.

**UI primitives (Phase 3A):** `TradeTable<T>` (toolbar + tri-state select-all + sticky sortable headers + `BulkActionsBar`; props per Phase-3A spec), pure `table-state.ts` (node-tested), `BulkActionsBar` (`{ count; onClear; actions; noun? }`), `EmptyStateRich`, `ListSkeleton` (from `./Skeletons`), `ScreeningBadge` (currently a private fn in `parties/page.tsx`), `useTradeDensity`. Theme = `--trade-*` tokens; German UI strings. Sidebar `SECTIONS` items carry `badgeKey: keyof SidebarBadgeCounts`.

**Auth:** `getTradeAuth(): { userId; organizationId; role } | null`.

---

## Architecture

3C adds **one pure logic module**, **one new page + one drawer component** (gated by tsc/eslint/source, per machine constraint), and **one additive API route** (bulk re-screen). It promotes `ScreeningBadge` to a shared component and adds one nav entry. No engine change, no schema change, no decide-route change.

```
PURE (node-tested):
  src/lib/trade/screening-triage.ts          ← NEW. derive + urgency-order the queue,
                                                 reason/justification validation,
                                                 false-positive eligibility predicate
  src/lib/trade/screening-triage.test.ts      ← NEW. node tests for the above

SERVER (additive only):
  src/app/api/trade/parties/screen-batch/route.ts        ← NEW. POST { partyIds[] } →
                                                            loop screenParty() (reuse), org-scoped,
                                                            rate-limited "sensitive"
  src/app/api/trade/parties/screen-batch/route.test.ts   ← NEW
  (REUSED unchanged: .../[id]/screenings/[screeningId]/decide  ← per-party + bulk-dismiss path)
  (REUSED unchanged: screenParty(), getSidebarBadgeCounts, party-detail GET)

UI (gated — tsc + eslint + source review; jsdom hangs on this machine):
  src/app/(trade)/trade/screening/page.tsx               ← NEW. RSC shell: header + count,
                                                            renders the client triage table
  src/app/(trade)/trade/screening/ScreeningTriageTable.tsx  ← NEW client. TradeTable<TriageRow>
                                                            + drawer orchestration + bulk actions
  src/app/(trade)/trade/screening/ResolutionDrawer.tsx   ← NEW client. review matched entity vs
                                                            party; CLEAR/CONFIRMED_HIT with reason
  src/app/(trade)/trade/_components/ScreeningBadge.tsx    ← NEW (promoted from parties/page.tsx)
  src/app/(trade)/trade/parties/page.tsx                 ← EDIT: import shared ScreeningBadge
  src/app/(trade)/trade/_components/TradeSidebar.tsx     ← EDIT: add "Screening" nav item
```

### The queue data source

The queue is **the existing parties screening cohort** — `TradeParty.screeningStatus IN (POTENTIAL_MATCH, STALE, NOT_SCREENED)` — fetched org-scoped via the existing `GET /api/trade/parties` (one fetch per status, or `q`/`screening` params), then **shaped + ordered by the pure module**. This is the _same data_ the sidebar badge and Action Inbox already read, so the three surfaces never disagree.

Status set for the **triage queue** (note this differs from the badge): `POTENTIAL_MATCH` (a live hit needing a decision), `STALE` (screening older than 30 d — refresh), `NOT_SCREENED` (never run). We **include `NOT_SCREENED`** here (the badge omits it) because "never screened" is exactly a triage-queue action ("run the first screen"), and 3C provides the batch button for it. `CONFIRMED_HIT` is **excluded from the default queue** — it is a deliberate, resolved decision and already a known blocker; it stays reachable via the `CONFIRMED_HIT` filter chip but is not "needs action now". `CLEAR` parties are out entirely.

Fetch strategy (client, in `ScreeningTriageTable`, mirroring `parties/page.tsx`):

- Default view: fetch the three queue statuses (e.g. three `GET /api/trade/parties?screening=…` calls, or reuse the multi-status client-filter pattern already in `parties/page.tsx`) → merge → `deriveTriageQueue()` (pure) orders them.
- A status filter chip narrows to a single `screening=` server call.
- After any mutation (batch re-screen, bulk-dismiss, drawer decide) the table re-fetches its current view so rows that left the queue disappear and the result count updates.

### The re-screen path (reusing the engine, zero external cost)

`POST /api/trade/parties/screen-batch` with `{ partyIds: string[] }` (Zod: 1..50 ids):

- `getTradeAuth()`; rate-limit tier **`sensitive`** (5/hr/user — same tier as single screen; batching many parties into one request keeps the per-user write budget honest).
- Org-scope **all** ids in one query (`tradeParty.findMany({ where: { id: { in }, organizationId } , select:{id}})`); silently drop any id not in the caller's org (no cross-tenant existence leak).
- Loop the in-org ids and call `screenParty(id, { systemDecisionUserId: userId })` **sequentially** — identical to the `trade-rescreen-stale` cron. Each call is ~50 ms in-memory; a 50-party batch ≈ 2.5 s, well within the function budget. Accumulate `{ partyId, ok, decision, hitCount, error? }` per item; never let one failure abort the batch (try/catch per item, exactly like the cron).
- `emitTradeEvent("trade.screening.batch", …)` summarizing the run (count, new POTENTIAL_MATCH count).
- Return `{ summary: { total, ok, failed, newPotentialMatches }, items }`. The client toasts the summary and re-fetches.

**Why sync, not a job queue:** there is no background-job infrastructure in the repo, and the UI batch is user-bounded (≤50). The engine is in-memory and fast; a synchronous request finishes in seconds. This is the lowest-complexity choice that honors "zero external cost" and "no new runtime dependency". (Open question Q1 covers a very large org's "screen all NOT_SCREENED".)

### The resolution state machine + audit

Unchanged from today — 3C only _drives_ it from a better surface:

```
                         re-screen (engine)
   NOT_SCREENED ───────────────────────────────►  CLEAR
        │                                            ▲
        │ re-screen                                  │ FALSE_POSITIVE_DISMISSED
        ▼                                            │   (required justification; audit)
   POTENTIAL_MATCH ─── reviewer decides ───────────┤
        ▲                                            │ CONFIRMED_HIT
        │ re-screen (>30d → STALE first)             ▼   (required reason; audit)
      STALE ◄── 30 d elapsed ──── CLEAR        CONFIRMED_HIT  ⇒  party.status = BLOCKED
                                                              ⇒  party.blockedReason set
```

- **Auto-prepare, human confirms.** The engine produces the `POTENTIAL_MATCH` and the candidate hit(s); the drawer surfaces them and the reviewer supplies the **mandatory** justification before either resolution. No resolution is possible without `notes` (server-enforced; mirrored client-side by `validateResolutionReason()`).
- **CONFIRMED_HIT blocks the party**: the decide route sets `party.status = BLOCKED` + `blockedReason` in the same `$transaction` as the screening update, then emits `trade.party.blocked`. A `BLOCKED` party is already excluded from new operations elsewhere in Trade (the operation-assistant + ops pipeline treat `BLOCKED` counterparties as a hard stop) and is rendered with the red "Blocked" chip in the parties list. 3C does not re-implement blocking — it routes the reviewer to the existing route that performs it.
- **Audit:** every decision writes `decidedById` + `decidedAt` + `notes` on the insert-only `TradeScreeningResult` (5-yr retention per §22 AWV / 15 CFR 762) and emits `trade.screening.decided` (canonical audit log). The batch re-screen inserts one `TradeScreeningResult` per party (proving "we re-checked on date X against snapshot hash Y"), exactly as the cron does.

**Bulk-dismiss of obvious false positives** is the bulk analogue of the `FALSE_POSITIVE_DISMISSED` path. Because the server requires a per-decision `notes`, the bulk UI **collects one shared justification** for the selection (e.g. "Homonym sweep — distinct legal entity, different country/registration; reviewed YYYY-MM-DD by <reviewer>") and the client issues one `decide` call per selected party's **current POTENTIAL_MATCH screening** with that shared `notes`. Eligibility is gated by the pure predicate `isBulkDismissEligible()` (see below) so we never offer bulk-dismiss for a high-confidence/`CONFIRMED`-band hit or a cascade hit. This is conservative by construction: it reuses the audited single-decision route N times rather than adding a less-audited bulk mutation.

### Nav integration

Add one item to `TradeSidebar` `SECTIONS` under **Arbeit**:

- `{ href: "/trade/screening", label: "Screening", icon: ShieldCheck (or ScanLine), match: p => p.startsWith("/trade/screening"), badgeKey: "partiesNeedingReview", tooltip: "Sanktions-Treffer triagieren — Potential Matches, veraltete & ungescreente Partner." }`.
- Reuses the **existing** `partiesNeedingReview` badge count (no new `SidebarBadgeCounts` field, no extra query). The `Stammdaten` item already uses the same key; both pills reflect the same backlog — intentional, since Screening is the dedicated drill-in for what Stammdaten summarizes. `badgeKeyLabel("partiesNeedingReview")` already returns "need screening review" for the a11y label.

### Triage table columns (`TradeColumn<TriageRow>[]`)

`TriageRow` extends the existing party list row with derived urgency fields from the pure module:

| Column            | `sortBy`          | render                                                                                                                                 |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Screening**     | `screeningStatus` | shared `<ScreeningBadge />` + status text                                                                                              |
| **Counterparty**  | `legalName` (lc)  | legal name (+ trade name), country chip, high-risk / US-person markers (ports the parties-list cell)                                   |
| **Why / top hit** | `urgencyRank`     | one-line reason: "Potential match — top 0.97 (OFAC SDN)" / "Stale — last screened 42 d ago" / "Never screened" (from `triageReason()`) |
| **Last screened** | `lastScreenedMs`  | relative date ("42 d ago" / "—")                                                                                                       |
| **Urgency**       | `urgencyRank`     | derived pill: Critical (POTENTIAL_MATCH) / Refresh (STALE) / New (NOT_SCREENED)                                                        |

- **Default order:** `deriveTriageQueue()` sorts by `urgencyRank` asc (POTENTIAL_MATCH=0, STALE=1, NOT_SCREENED=2), tie-broken by _most-stale first_ (largest `lastScreenedMs`, `null`/never sorts to the top of its bucket), then `legalName`. The table's `initialSort` reflects this; header clicks then re-sort via the existing 3A client sorter.
- **Filters slot:** status chips `All / Potential / Stale / Not screened / Confirmed` (Confirmed surfaces the otherwise-hidden blockers on demand) — same pill styling as `parties/page.tsx`.
- **Selection + bulk:** `selectable`, page-owned `selectedIds`. `bulkActions`: **"Re-screen (N)"** (always) and **"Dismiss false positives (N)"** (enabled only when _every_ selected row passes `isBulkDismissEligible`; otherwise disabled with a tooltip explaining why). `bulkNoun="party"`.

### The resolution drawer

A right-side panel (the existing chrome has no Drawer primitive; build a focused `ResolutionDrawer` using `glass`/`--trade-*` tokens, `role="dialog"` + focus trap + Esc-to-close — same a11y bar as `TradeCommandPalette`). Opened by clicking a `POTENTIAL_MATCH` row's "Review" affordance.

Contents:

- **Header:** party legal name, country, status; "Potential sanctions match" banner.
- **Side-by-side compare:** for the latest `POTENTIAL_MATCH` screening (from `GET /api/trade/parties/[id]` → `screenings[0]` with `decision === "POTENTIAL_MATCH"`), render each top hit: the **matched sanctioned entity** (list, entry name/id, country) vs. the **party** (canonical/legal name, country, identifiers), with the **score** and **matched fields** ("name", "identifier", "address"). If `cascade` is present, show the sanctioned-ancestor chain (name, effective %).
- **Two resolutions:**
  - **Mark CLEAR (false positive)** — requires a justification textarea (≥1 char, ≤2000). Posts `decide { decision: "FALSE_POSITIVE_DISMISSED", notes }`.
  - **Confirm hit (block party)** — requires a justification; shows an explicit "this will BLOCK <party> from new operations" confirmation. Posts `decide { decision: "CONFIRMED_HIT", notes }`.
- On success: toast, close, re-fetch the queue (the row leaves the queue).
- Client-side guard via `validateResolutionReason(notes)` before enabling either submit, but the **server remains the source of truth** (Zod `min(1)`).

---

## Pure logic (the node-tested core)

`src/lib/trade/screening-triage.ts` — no React, no Prisma, no `server-only`:

- `TriageStatus = "POTENTIAL_MATCH" | "STALE" | "NOT_SCREENED" | "CONFIRMED_HIT" | "CLEAR"`.
- `urgencyRank(status): number` — `POTENTIAL_MATCH=0, STALE=1, NOT_SCREENED=2, CONFIRMED_HIT=3, CLEAR=4`.
- `deriveTriageQueue(rows, now): TriageRow[]` — filters to the queue set (POTENTIAL_MATCH/STALE/NOT_SCREENED by default), computes `lastScreenedMs` (ms since `lastScreenedAt`, `null` → `Infinity` so never-screened sorts most-urgent within its bucket), attaches `urgencyRank` + a `triageReason` string, and returns the array **sorted** (urgencyRank asc → most-stale first → legalName). Pure, deterministic, `now` injected.
- `triageReason(row): string` — the "Why / top hit" one-liner from `screeningStatus` + top hit (list + score, derived from the row's `screeningHits` summary when present) or staleness age.
- `validateResolutionReason(notes): { ok: true } | { ok: false; error: string }` — trims; rejects empty or >2000; (optionally) rejects a too-short stub like a single char to nudge a real justification — mirrors but does not replace the server Zod.
- `isBulkDismissEligible(row): boolean` — `true` only for a `POTENTIAL_MATCH` row whose **top hit band is not "confirmed"** (top score `< SCORE_CONFIRMED_HIT`) **and** that has **no cascade hit** — i.e. exactly the "obvious false positive" class policy permits to clear in bulk. High-confidence and cascade hits must go through the per-party drawer.
- `summarizeBatch(items)` / `compareTriage(a,b)` helpers as needed.

These five functions are the entire correctness surface that gets real automated tests. Everything else is gated by tsc + eslint + source review (jsdom hangs here — same constraint as Phases 1/2/3A).

---

## API touchpoints (all additive; one new route)

| Route                                                     | Method | Status     | Purpose                                                                |
| --------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------- |
| `/api/trade/parties`                                      | GET    | **reused** | List the queue (org-scoped, `screening=` filter, existing select).     |
| `/api/trade/parties/[id]`                                 | GET    | **reused** | Drawer payload — already `include`s `screenings` with hits + cascade.  |
| `/api/trade/parties/[id]/screenings/[screeningId]/decide` | POST   | **reused** | Per-party + bulk-dismiss resolution. Unchanged.                        |
| `/api/trade/parties/screen-batch`                         | POST   | **NEW**    | Batch re-screen selected ids; loops `screenParty()`; tier `sensitive`. |

No GET/DELETE/PATCH changes. No new query params on existing routes.

---

## Testing strategy

- **Pure module (`screening-triage.test.ts`, node):** the only automated-correctness layer. Cover `urgencyRank` ordering; `deriveTriageQueue` filtering (queue set incl. NOT_SCREENED, excl. CONFIRMED/CLEAR), stable ordering (urgency → most-stale → name), never-screened sorts most-urgent in its bucket, `now` injection determinism; `triageReason` strings per status; `validateResolutionReason` (empty / whitespace / max-length / valid); `isBulkDismissEligible` (POTENTIAL_MATCH below-confirmed-band & no cascade → true; confirmed-band → false; cascade hit → false; non-POTENTIAL_MATCH → false).
- **Batch route (`screen-batch/route.test.ts`, node — matches existing trade route tests):** auth 403; Zod 400 on empty/oversized ids; org-scoping drops foreign ids (no leak); per-item failure does not abort the batch; summary counts correct; `screenParty` invoked once per in-org id (mocked). Mirrors the existing `parties/[id]/screen/route.test.ts` + cron-style accumulation.
- **Components (page, table, drawer):** gated by `npx tsc --noEmit` + `npm run lint` + source review. No jsdom (`*.test.tsx` hang on this machine — documented in 3A). The drawer's decide-on-submit and the table's bulk wiring are reviewed against the verified route contracts above.
- **Regression:** `parties/page.tsx` still renders after `ScreeningBadge` is extracted (tsc + the existing parties route test; the badge move is a pure import swap).

---

## Security & cost

- **Zero new external screening cost.** No new list, no new provider, no new dependency. `screenParty()` runs Jaro-Winkler against the already-cached snapshots; the batch route is N in-memory calls. The only third-party API the platform permits (Anthropic) is **not** used by 3C.
- **Org-scoping** on every new touchpoint: the batch route filters `id IN (…) AND organizationId = caller`; the decide route already enforces it; the queue uses the org-scoped list endpoint. No cross-tenant existence leak.
- **Rate limiting:** batch re-screen on `sensitive` (5/hr/user) — one batch of ≤50 ids costs one token, bounding write amplification on the insert-only `TradeScreeningResult` table.
- **Audit integrity preserved:** all writes go through the existing insert-only screening-result + `emitTradeEvent` paths. 3C adds no path that mutates a decided screening or blocks a party outside the audited decide route.
- **Mandatory disclaimer** ("Screening ist Decision-Support, kein Counsel; Treffer erfordern menschliche Triage durch qualifizierten AV …") is carried onto the new surface, matching `parties/page.tsx`.

## Risks / open questions

- **Q1 — very large "NOT_SCREENED" backlog.** The synchronous batch caps at 50 ids/request. A brand-new org importing thousands of parties cannot one-click-screen them all from the UI. _Mitigation:_ the daily `trade-rescreen-stale` cron already screens never-screened `ACTIVE` parties (`lastScreenedAt: null`) in batches of 5000 overnight; the UI batch is for _targeted_ triage, not bulk onboarding. If a "screen all" UX is later required, it should trigger the cron's worker pattern, not a long synchronous request. **Needs human sign-off that "≤50 per batch + overnight cron for the rest" is acceptable.**
- **Q2 — queue completeness vs. pagination.** The list endpoint paginates at ≤50/status; urgency ordering is client-side on the loaded page, so a 200-`POTENTIAL_MATCH` org sees the top page ordered, not a globally-sorted 200. _Mitigation:_ POTENTIAL_MATCH counts are realistically small (each is a human-review event); the badge shows the true total. If servers-side urgency ordering becomes necessary, add an `orderBy`/larger `take` for the screening view only. **Confirm the page-size assumption is fine for v1.**
- **R1 — dual badge on Stammdaten + Screening.** Both nav items show `partiesNeedingReview`. Intended (Screening is the drill-in for the Stammdaten backlog), but two identical pills could read as double-counting. _Mitigation:_ distinct tooltips; acceptable for v1. Alternative considered & rejected: a screening-only badge key (new query, no real benefit).
- **R2 — bulk-dismiss audit quality.** One shared justification across a homonym sweep is weaker evidence than a per-party rationale. _Mitigation:_ `isBulkDismissEligible` restricts bulk-dismiss to below-confirmed-band, non-cascade hits only; anything high-confidence is forced through the per-party drawer. The shared note is still recorded per screening row (full audit trail), and confirms (blocks) are **never** bulkable. **Confirm the eligibility predicate's threshold (top score < 0.95 AND no cascade) matches the AV's risk appetite.**
- **R3 — drawer "latest POTENTIAL_MATCH" selection.** The drawer decides on `screenings[0]` where `decision === "POTENTIAL_MATCH"`. If a newer CLEAR/CONFIRMED screening exists, that party already left the queue, so the row shouldn't be present — but a race (concurrent reviewer) is possible. _Mitigation:_ the decide route's 409-on-already-decided is the backstop; the drawer surfaces that error and re-fetches.
