# Trade UI Redesign — Phase 3D Design: Unified Documents Smart-Filter

**Status:** Design (spec). No code in this document.
**Branch:** `fix/trade-to-92`
**Predecessor:** Phase 3A (`TradeTable<T>` primitive + `table-state.ts`, shipped).
**Companion plan:** `docs/superpowers/plans/2026-05-31-trade-ui-phase3d-documents.md`

---

## 1. Goal

The `/trade/documents` page is currently a **navigation hub**: eight static cards, each linking to a per-type sub-page (`euc/`, `reexport-consents/`, `vsd/`, `sammelgenehmigungen/`, `france-los/`, `uk-ecju/`, `faa-ast/`, `deemed-exports/`). To answer the operator's single most-frequent compliance question — **"what is expiring or needs action across ALL of my trade documents right now?"** — they must open eight pages and eyeball eight separate "Valid until" columns. There is **no cross-type view** in the codebase today (verified: no `documents/all`, no unified endpoint, no aggregation helper under `src/app/api/trade` or `src/lib/trade`).

Phase 3D adds **one unified, cross-type documents table** built on the shipped `TradeTable<T>` primitive. It aggregates all eight document types into a single sortable list with columns for **type, reference, counterparty, status, and expiry/valid-until (sortable)**, plus **smart filters** (by type, by status, and an "expiring ≤ 30/60/90 days" quick filter) and a unified search across reference + counterparty.

This is **additive**. The eight per-type sub-pages remain the system of record for creating, editing, and advancing lifecycle. The unified view is **read-only triage** that links each row back to its per-type detail page.

## 2. Non-Goals (YAGNI)

- **No new document types.** Exactly the eight that exist today.
- **No editing in the unified view.** No create drawer, no status-transition popover, no PDF download menu. Rows link to the per-type detail (`/trade/<type>/<id>`) where those actions already live.
- **No new storage and no Prisma migration.** This is read-only aggregation over existing tables. The eight models already carry every field we need.
- **No new DB indices.** Every model already has a `@@index([organizationId, status])` and an `@@index([validUntil])` (verified in `prisma/schema.prisma`), which is exactly the access pattern this view uses.
- **No new runtime dependencies.** No Anthropic call. Pure TypeScript + Prisma + the existing `TradeTable`.
- **No saved filters / no persistence** of the operator's filter selection beyond URL/local component state.
- **No pagination in v1.** Document volumes per org are low (tens, not thousands); the per-type pages render unbounded lists today. We sort/filter client-side after a single server fetch, matching the existing Trade list pattern. (Risk + future note in §9.)

## 3. Architecture

### 3.1 The two halves

1. **A pure normalizer + expiry-bucket module** (`src/lib/trade/unified-documents.ts`) — zero I/O, zero React, fully Vitest-testable in node. It owns:
   - the `UnifiedTradeDocumentRow` shape,
   - eight `toUnifiedRow(...)` mapping functions (one per source type) — or one dispatch function per type,
   - `expiryBucket(validUntil, now)` → `"expired" | "soon" | "later" | "none"`,
   - `daysUntil(validUntil, now)`,
   - `matchesExpiryFilter(row, withinDays, now)` and `matchesSearch(row, query)` predicates used by the client filter pills.
2. **A thin server aggregator** (`src/lib/trade/unified-documents.server.ts`, `import "server-only"`) — one function `listUnifiedDocuments(organizationId)` that fires the eight existing `list*` service reads **in parallel** (`Promise.all`), maps each result array through the corresponding `toUnifiedRow`, concatenates, and returns `UnifiedTradeDocumentRow[]`. No new SQL is written.

The page is a server component that calls the aggregator, then hands the plain-serializable rows to a `"use client"` wrapper that owns search/filter state and renders `TradeTable<UnifiedTradeDocumentRow>`.

### 3.2 Aggregation decision: **parallel service-read fan-out**, NOT a raw SQL `UNION` and NOT HTTP fan-out

Three options were considered against the **zero-extra-cost** constraint:

| Option                                                                                                                   | Cost                                                                                                                                                                                                                                                                                                                                                                                                                               | Verdict                    |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **A. Parallel-read the existing `list*` service functions** in one server-side `Promise.all`, then normalize in-process. | 8 indexed `findMany`s on one Neon connection, in parallel, in the same request. Each is already `@@index([organizationId, …])`-backed. Reuses 100% of existing, org-scoped, tested read code. **Zero new query code.**                                                                                                                                                                                                             | **CHOSEN.**                |
| B. A single Prisma `$queryRaw` `UNION ALL` across the eight tables.                                                      | One round-trip, but requires hand-writing + maintaining raw SQL that duplicates the column-selection and org-scoping the services already encode; bypasses Prisma's type-safety; eight heterogeneous schemas make the `UNION` column list ugly and fragile; any schema drift silently breaks it. Marginal latency win not worth the maintenance + correctness cost.                                                                | Rejected.                  |
| C. Parallel-`fetch()` the eight per-type **list API endpoints**.                                                         | **Not possible:** verified that list API routes do **not exist** for these types — only `euc` and `vsd` expose `/api/trade/...` routes, and those are detail/PDF, not list. The per-type pages fetch via direct server-component calls to the `list*` services, not via HTTP. Building eight new list endpoints just to re-consume them over HTTP would add latency, serialization overhead, and net-new surface for zero benefit. | Rejected (and infeasible). |

**Why A is the cheapest correct option:** the eight `list*` functions (`listEucRequests`, `listReexportConsents`, `listVsds`, `listSammelgenehmigungen`, `listDeemedExportAuthorizations`, `listLosAuthorisations`, `listUkEcjuLicenses`, `listFaaAstLicenses`) are already written, already org-scoped, already index-backed, and already return the relations we need (counterparty names where applicable). Fanning them out with `Promise.all` inside a single server component costs eight parallel indexed reads on one pooled connection and **adds no query code, no migration, no index, and no new dependency**. The normalization is pure in-process CPU on a few hundred rows at most.

> **Cost guardrail:** the aggregator runs on a normal authenticated page load (`getTradeAuth()` gate), not on a cron and not on every request from every user simultaneously. There is no AI inference, no external API, no extra Neon compute beyond eight indexed selects that the per-type pages already perform individually. Net infra cost vs. status quo: ≈ the same eight reads, just issued together instead of across eight separate page visits.

### 3.3 The common row shape — `UnifiedTradeDocumentRow`

Every source type is normalized into this flat, JSON-serializable shape (no `Date` objects, no `BigInt` — dates become ISO `YYYY-MM-DD` strings or `null`, so the server→client boundary stays clean and `TradeTable` sorting works on string/number per `sortRows`):

```ts
/** Discriminator — also the value used by the "type" filter pills. */
export type UnifiedDocType =
  | "EUC"
  | "REEXPORT"
  | "VSD"
  | "SAMMELGENEHMIGUNG"
  | "FRANCE_LOS"
  | "UK_ECJU"
  | "FAA_AST"
  | "DEEMED_EXPORT";

export interface UnifiedTradeDocumentRow {
  /** Globally-unique row id: `${docType}:${sourceId}` so ids never
   *  collide across tables (cuids are unique per-table but we prefix
   *  defensively for getRowId + future bulk-select). */
  id: string;

  /** Source PK (the per-type model id) — used to build `detailHref`. */
  sourceId: string;

  /** Discriminator + the human label rendered in the Type column. */
  docType: UnifiedDocType;
  typeLabel: string; // e.g. "End-Use Certificate", "Re-Export Consent"

  /** Primary human reference for the row. Per-type best-effort:
   *  - EUC:               form-type label (no external ref field)
   *  - REEXPORT:          originalLicenseNumber ?? form-type label
   *  - VSD:               filingReference ?? title
   *  - SAMMELGENEHMIGUNG: bafaReference ?? title
   *  - FRANCE_LOS:        cnesReference ?? missionName
   *  - UK_ECJU:           ecjuReference ?? "(draft)"
   *  - FAA_AST:           faaReference ?? "(draft)"
   *  - DEEMED_EXPORT:     authorizationReference ?? employee label
   */
  reference: string;

  /** Optional secondary line under the reference (e.g. EUC form type,
   *  VSD title, mission name). Null when the reference already is the
   *  primary name. Kept separate so the Type/Reference column can show
   *  a muted sub-label without bespoke per-type render code. */
  subReference: string | null;

  /** Counterparty / subject, normalized to a display string + optional
   *  ISO-2 country. Per-type:
   *  - EUC:               party.canonicalName / party.countryCode
   *  - REEXPORT:          requestingParty.canonicalName / .countryCode
   *  - VSD:               authority label (no party) — country null
   *  - SAMMELGENEHMIGUNG: first allowed end-user or "(any)" — country null
   *  - FRANCE_LOS:        operatorName — country "FR"
   *  - UK_ECJU:           applicantName — country "GB"
   *  - FAA_AST:           operatorName — country "US"
   *  - DEEMED_EXPORT:     foreignNationalName ?? employeeId / nationality
   */
  counterparty: string | null;
  counterpartyCountry: string | null;

  /** Raw per-type status enum value (string) + a humanized label.
   *  We keep the raw value for the status filter set; the label for
   *  the cell. Each type's STATUS_LABELS map is the source of truth —
   *  duplicated minimally in the normalizer to avoid importing client
   *  label maps into server code. */
  status: string;
  statusLabel: string;

  /** Coarse status tone for the pill — collapses ~40 distinct per-type
   *  enum values into a 4-tone vocabulary so the unified pill is
   *  consistent without a 40-entry colour table:
   *    "positive" (valid/active/approved/authorised/resolved/validated)
   *    "pending"  (draft/submitted/under-review/investigating/sent/…)
   *    "negative" (rejected/refused/denied/revoked/withdrawn)
   *    "neutral"  (expired/exhausted/completed/terminal-inert)
   */
  statusTone: "positive" | "pending" | "negative" | "neutral";

  /** Expiry / validity end as ISO `YYYY-MM-DD`, or null when the type
   *  has no validUntil (VSD has none; UK_ECJU/FAA_AST/FRANCE_LOS/EUC/
   *  REEXPORT/DEEMED_EXPORT are nullable; SAMMELGENEHMIGUNG is always
   *  set). Sortable column — null sorts last (see §3.5). */
  validUntil: string | null;

  /** Derived bucket from validUntil vs. `now`, computed in the pure
   *  module. Drives both the "expiring soon" badge and the quick
   *  filter. See `expiryBucket`. */
  expiry: ExpiryBucket;

  /** Days until expiry (negative = already past). Null when validUntil
   *  is null. Powers the "Nd left" / "Nd ago" micro-badge. */
  daysUntilExpiry: number | null;

  /** Pre-built link to the per-type detail page for click-through. */
  detailHref: string; // `/trade/${slug}/${sourceId}`

  /** ISO timestamp of row creation — secondary sort + "added" display. */
  createdAt: string;
}

export type ExpiryBucket = "expired" | "soon" | "later" | "none";
```

**Why a flat shape:** `TradeTable<T>` sorts via `sortBy: (row) => string | number` (see `sortRows` in `table-state.ts`), so every sortable field must be a primitive on the row. Flattening also keeps the server→client serialization trivial (no `Date`/`BigInt`/`Decimal` to marshal — we never surface EUR/GBP/USD money values in this view, so the `BigInt` fields are simply not read).

### 3.4 Type/label/slug registry

A single `DOC_TYPE_REGISTRY: Record<UnifiedDocType, { label: string; slug: string }>` in the pure module is the one place mapping a `docType` to (a) the human `typeLabel` and (b) the URL `slug` used for `detailHref`. Slugs are the existing route folders:

| `docType`           | `typeLabel`               | `slug` (route)        |
| ------------------- | ------------------------- | --------------------- |
| `EUC`               | End-Use Certificate       | `euc`                 |
| `REEXPORT`          | Re-Export Consent         | `reexport-consents`   |
| `VSD`               | Voluntary Self-Disclosure | `vsd`                 |
| `SAMMELGENEHMIGUNG` | Sammelgenehmigung         | `sammelgenehmigungen` |
| `FRANCE_LOS`        | France LOS                | `france-los`          |
| `UK_ECJU`           | UK ECJU Licence           | `uk-ecju`             |
| `FAA_AST`           | FAA AST Licence           | `faa-ast`             |
| `DEEMED_EXPORT`     | Deemed Export             | `deemed-exports`      |

(Slugs verified against `ls src/app/(trade)/trade/`.)

### 3.5 Expiry derivation (pure, the testable heart)

```
daysUntil(validUntil, now):
  null → null
  else floor((validUntil_midnightUTC - now_midnightUTC) / 86_400_000)

expiryBucket(validUntil, now):
  validUntil == null            → "none"
  daysUntil < 0                 → "expired"
  daysUntil <= SOON_THRESHOLD   → "soon"      (SOON_THRESHOLD default 30)
  else                          → "later"
```

- The **quick filter** "expiring ≤ N days" uses `matchesExpiryFilter(row, N, now)` = `row.validUntil != null && daysUntil(row.validUntil, now) >= 0 && daysUntil(...) <= N`. N ∈ {30, 60, 90}. "Expired" is a separate pill (`expiry === "expired"`).
- `now` is **always an injected parameter** (default `new Date()`) so tests are deterministic and there is no hidden clock.
- Day math is done on date-only (drop the time component) to avoid off-by-one from partial days, matching the existing per-type pages which all render `validUntil` as `…toISOString().slice(0,10)`.
- **Null `validUntil` sorts last** regardless of direction. Because `sortRows` compares the `sortBy` return value directly, the expiry column's `sortBy` returns a sentinel: `row.validUntil ?? "9999-12-31"` (ISO strings sort lexicographically = chronologically). This keeps "no expiry" rows (notably all VSDs) pinned to the bottom when sorting soonest-first, which is the desired triage behavior.

### 3.6 Status-tone collapsing

The eight types define ~40 distinct status enum values across their `STATUS_LABELS` maps. Rather than a 40-row colour table, the normalizer maps each raw status to one of four tones via a small per-type switch (the mapping lives in the pure module so it is unit-tested). Examples: `VALIDATED/APPROVED/AUTHORISED/ACTIVE/RESOLVED → positive`; `DRAFT/SUBMITTED/UNDER_REVIEW/INVESTIGATING/SENT/REQUESTED/… → pending`; `REJECTED/REFUSED/DENIED/REVOKED/WITHDRAWN → negative`; `EXPIRED/EXHAUSTED/COMPLETED → neutral`. The exact, exhaustive mapping per enum is enumerated in the plan (Task 1) so the `switch` is total (TypeScript `never` check guards against an unmapped value when an enum grows).

## 4. The unified page

Route: enhance the existing `src/app/(trade)/trade/documents/page.tsx`.

Decision: **keep the nav-hub cards AND add the unified table below them on the same page** (single route, no new `documents/all` URL). Rationale: the hub is a useful "jump to a type" affordance and is cheap to keep; stacking the triage table beneath it means the operator lands on one page that both navigates and triages. The cards become a compact strip; the table is the primary content. (If the human prefers a separate `/trade/documents/all` route, the plan notes the one-line change — it is the same client component mounted on a different page.)

Structure (mirrors the shipped `parties/page.tsx` reference pattern):

- `page.tsx` (server): `getTradeAuth()` gate → `listUnifiedDocuments(orgId)` → render header + `<UnifiedDocumentsTable rows={rows} />`.
- `_components/UnifiedDocumentsTable.tsx` (`"use client"`): owns `search`, the type-filter `Set<UnifiedDocType>`, the status-tone filter `Set`, and the single-select expiry quick-filter (`null | 30 | 60 | 90 | "expired"`). Applies the pure predicates to derive the visible rows, then renders `TradeTable<UnifiedTradeDocumentRow>` passing `columns`, `rowHref={(r) => r.detailHref}`, `search`, `filters` (the pills), `resultCount`, `initialSort={{ key: "validUntil", dir: "asc" }}`, and an `EmptyStateRich` empty state.

`selectable` is **off** in v1 (no bulk actions — read-only triage). The prop is available for a later "export expiring to CSV" follow-up but is out of scope here.

## 5. Columns (`TradeColumn<UnifiedTradeDocumentRow>[]`)

| key            | header       | sortBy                                 | render                                                                                   |
| -------------- | ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docType`      | Type         | `r.typeLabel`                          | small monochrome type chip with `typeLabel`                                              |
| `reference`    | Reference    | `r.reference.toLowerCase()`            | `reference` bold + `subReference` muted sub-line                                         |
| `counterparty` | Counterparty | `(r.counterparty ?? "").toLowerCase()` | name + ISO-2 country muted (or "—")                                                      |
| `status`       | Status       | `r.statusLabel`                        | tone pill (`statusTone`) showing `statusLabel`                                           |
| `validUntil`   | Valid until  | `r.validUntil ?? "9999-12-31"`         | date string + "Nd left"/"expired" badge when `expiry` is `soon`/`expired`; "—" when null |

Default sort: `validUntil` ascending (soonest-expiring first; nulls last). All five columns are click-sortable.

## 6. Filters (the `filters` slot — pill groups)

Three independent pill groups rendered into `TradeTable`'s `filters` slot, plus its built-in `search`:

1. **Expiry quick-filter** (single-select): `All` · `Expired` · `≤ 30d` · `≤ 60d` · `≤ 90d`. This is the headline feature — one click answers "what's expiring soon across everything."
2. **Type filter** (multi-select `Set<UnifiedDocType>`, empty = all): one pill per `UnifiedDocType` using `typeLabel`. Mirrors the parties page's multi-select screening pills exactly (`All` pill clears; others toggle).
3. **Status-tone filter** (multi-select, empty = all): `Valid` · `Pending` · `Issue` · `Closed` (the four tones). Coarser than raw status but consistent across types.

**Search** (built into `TradeTable.search`): case-insensitive substring over `reference + subReference + counterparty`, via the pure `matchesSearch(row, q)` predicate.

Filter composition: a row is visible iff it passes **all active** groups (AND across groups, OR within a multi-select group) AND the search. All composition is pure functions, computed in the client wrapper with `useMemo`.

## 7. Testing strategy

Per the project constraint, **pure logic is node/Vitest-tested; components are gated by tsc + eslint + source review** (jsdom hangs on this machine — same posture as Phases 1/2/3A).

- **`src/lib/trade/unified-documents.test.ts`** (Vitest, co-located, the convention used by `table-state.test.ts`) covers the pure module exhaustively:
  - `daysUntil`: null passthrough; exact boundaries (0, ±1); date-only (ignores time-of-day); past dates negative.
  - `expiryBucket`: `none` for null; `expired` for past; `soon` at threshold boundary (30 and 31); `later` beyond.
  - `toUnifiedRow` for **each of the eight** source types: correct `docType`/`typeLabel`/`slug`→`detailHref`; the reference fallback chain (e.g. UK_ECJU with null `ecjuReference` → `(draft)`; VSD → `filingReference ?? title`); counterparty extraction (EUC party name+country; FAA_AST operatorName + "US"); `validUntil` → ISO string or null; `statusTone` mapping for representative statuses.
  - `statusTone` totality: a table-driven test asserting every enum value of all eight status enums maps to a tone (guards the `never` exhaustiveness check).
  - `matchesExpiryFilter` / `matchesSearch` predicates: positive + negative cases; null-validUntil excluded from expiry filters; search across all three fields, case-insensitive.
- **`unified-documents.server.ts`** is a thin `Promise.all` + map; its correctness is the sum of the (tested) `list*` services and the (tested) `toUnifiedRow` mappers. We do **not** add a DB-backed integration test for it (no new query logic to verify; the services own their own tests). tsc guards the wiring.
- **Components** (`page.tsx`, `UnifiedDocumentsTable.tsx`): no jsdom test. Gated by `npx tsc --noEmit` (prop/type correctness against `TradeTable`'s generics + the serialized row shape) and `npm run lint`, plus a visual smoke during the deploy step.

**Determinism:** every time-dependent test passes a fixed `now`. No `vi.useFakeTimers` needed because `now` is an explicit parameter everywhere.

## 8. Security / correctness invariants

- **Org-scoping is inherited, not re-implemented.** `listUnifiedDocuments` takes the `organizationId` from `getTradeAuth()` and passes it to each `list*` service, every one of which filters `where: { organizationId }`. The normalizer never queries; it cannot widen scope. No hand-written SQL means no chance of a missing `WHERE organizationId`.
- **No PII leak widening.** VSD `notes`/`description` (privileged work-product) and deemed-export employee PII beyond the display name are **not** placed on `UnifiedTradeDocumentRow`. The row carries only fields already shown on the respective per-type list page.
- **Serializable boundary.** Rows are plain JSON (strings/numbers/null) — no `Date`, `BigInt`, or Prisma model instances cross into the client component.

## 9. Risks & open questions

1. **Unbounded fetch / future scale.** v1 fetches all eight types in full and filters client-side (matching every existing Trade list page). For an org with thousands of documents this is wasteful. _Mitigation now:_ the headline use case (expiring soon) is exactly the cheap case, and per-org volumes are low. _Future:_ if needed, push the expiry/status filter into the services (they already have `listExpiring(orgId, daysAhead)` helpers for several types) and stream server-filtered rows — but that is a later optimization, explicitly out of 3D scope.
2. **Status-tone collapsing loses nuance.** Folding ~40 statuses into 4 tones means e.g. `UNDER_REVIEW` and `SUBMITTED` both read as "Pending." This is intentional for a glanceable cross-type view; the per-type detail page shows the exact status. _Open question for human:_ are the four tone buckets (positive/pending/negative/neutral) the right vocabulary, and is "Issue/Closed" acceptable labeling for negative/neutral? (Easy to relabel — single registry.)
3. **Page vs. separate route.** This design stacks the table beneath the existing hub cards on `/trade/documents`. If the human would rather keep `/trade/documents` as a pure hub and add a distinct `/trade/documents/all`, that is a trivial relocation of the same client component (noted in the plan). Flagging the UX call.
4. **Reference heterogeneity.** Some types have no stable external reference until a late lifecycle stage (UK_ECJU/FAA_AST refs are null until issued; EUC has no external ref at all, only a form-type label). The fallback chain (§3.3) keeps every row addressable, but the "Reference" column will mix true authority references with form-type/title fallbacks. Acceptable for triage; called out so it isn't mistaken for a bug.
