# Trade UI Redesign — Phase 3B: Licence Renewal & Expiry Management (Design Spec)

**Date:** 2026-05-31
**Status:** Draft (design) — pending spec review
**Branch:** `fix/trade-to-92`
**Predecessors:** Phase 1 (nav/home/tokens, deployed), Phase 2 (search-pickers + datasheet auto-classify, deployed), **Phase 3A (shared `TradeTable<T>` + parties/items/operations migration, deployed `bae2c272`)**

---

## Goal

Two things, in priority order:

1. **Migrate the Licences list from cards to a `TradeTable<LicenseRow>` ROW layout** — licences are expiry-critical, draw-down-tracked data: a scannable, sortable table (with **"expiring soonest first"** as a one-click sort) beats a stack of cards. This finishes the Phase-3A migration arc (the 3A spec explicitly deferred Licences to 3B).
2. **Make renewal the automation payoff.** Surface a derived **"renewal due"** state in the list, and add a **guided renewal flow**: from an expiring licence, _auto-prepare_ a cloned new-licence application (type / jurisdiction / conditions / cap / parties carried forward), the operator reviews + confirms, Caelex POSTs the new `DRAFT`/`PENDING` licence. This is the platform's established **"auto-prepare, human confirms"** principle (same shape as `classification-draft-builder.ts`).

Plus the smaller wins: surface a licence's **conditions/provisos** (covered codes, covered countries, end-use restrictions, value cap) clearly, and add an expiry/draw-down quick-filter.

### Critical pre-existing infrastructure (DO NOT rebuild)

Exploration found that **server-side expiry tracking + reminders already ship**:

- **Cron** `GET /api/cron/trade-license-expiry` (registered in `vercel.json` line 190, daily **08:30 UTC**) → calls `runLicenseExpiryReminders()` in `src/lib/trade/license-reminder-service.ts`.
- That service scans `ACTIVE` `TradeLicense` rows with `validUntil` within 90 days, buckets them **90 (INFO) / 30 (WARNING) / 7 (CRITICAL)** days, and emits one `Notification` row per MANAGER+ org member (`type: "DOCUMENT_EXPIRY"`, `entityType: "trade-license"`, `entityId`, `actionUrl: "/trade/licenses"`), **plus** a best-effort email via `sendTradeLicenseExpiry`. Idempotent within 24h per `(user, license)`.

**Therefore goal (2)'s "reminder surfacing" is a SOLVED problem server-side.** Phase 3B does **not** add a cron, does **not** add a notification path, and does **not** add email. The _zero-cost_ expiry work in 3B is purely:

- a **pure, node-tested `license-renewal.ts` module** that derives the **"renewal due" / urgency** state from `validUntil` (same 90/30/7 thresholds, so the list UI and the cron agree), reused by both the list column and the renewal CTA gating;
- wiring that derived state into the new table (expiry column + quick-filter), so the operator sees in the list exactly what the daily Notification told them.

## Non-Goals (YAGNI — explicitly OUT of 3B)

- **No new licence types.** The `TradeLicenseType` enum (BAFA / BIS / DDTC / EU / OTHER) is frozen for 3B.
- **No external registry integration** (no BAFA ELAN / BIS SNAP-R / DDTC DECCS submission). The renewal flow produces an _internal_ `DRAFT`/`PENDING` licence record the operator then files manually with the authority — Caelex never auto-submits to a government system.
- **No new cron, no new Notification type, no new email template.** Expiry reminders already ship (see above).
- **No Prisma schema change.** Every field the list and the renewal flow need already exists on `TradeLicense` (verified — see Data touchpoints). Renewal _links_ old→new only via the existing `conditions` JSON (`renewalOf` key); no new column/relation. **This is a key design decision: renewal stays additive-in-JSON, so 3B ships with zero migration.**
- **No licence detail page redesign.** A licence `[id]` detail page does **not** exist today and is **not** in scope as a full surface. The renewal flow is a _modal/panel on the list page_. (A future 3B-follow-up could add `/trade/licenses/[id]`; 3B deliberately does not, to stay tight. The table is built `rowHref`-ready so it can be added later without rework.)
- **No server-side sort/pagination changes.** List is already `take: 100` server-paginated; sorting (incl. expiry) is **client-side on the loaded page**, exactly like 3A. No new query params beyond the existing `q` / `status` / `type`.
- **No Anthropic call in the renewal flow.** Cloning a prior licence is pure deterministic field-copy — no LLM needed. (The existing BAFA-Bescheid _PDF parser_ uses Claude Vision; renewal does not touch it.)

## Architecture

Mirrors 3A exactly: **pure logic in a node-tested `src/lib/trade/*.ts` module; the page owns data-fetch + filter + selection state and passes columns/slots to `TradeTable`; components are gated by tsc + eslint + source review** (jsdom component tests hang on this machine).

```
src/lib/trade/
    license-renewal.ts            ← PURE, NEW (node tests): expiry-state derivation
                                     + buildLicenseRenewalDraft (clone/prefill)
    license-renewal.test.ts       ← node tests for the above

src/app/(trade)/trade/licenses/
    page.tsx                      ← REWRITE: cards → <TradeTable<LicenseRow>> + renewal modal
    _components/
        LicensePdfDrop.tsx        ← unchanged (reused by NewLicenseForm)
        LicenseRenewalModal.tsx   ← NEW component: review/confirm cloned application
```

| Concern                                                           | Where                                                       | Tested by                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| Expiry-state derivation (days-left, urgency bucket, isRenewalDue) | `lib/trade/license-renewal.ts` (pure)                       | **node unit tests**              |
| Renewal draft (clone prior licence → new-licence payload)         | `lib/trade/license-renewal.ts` (pure)                       | **node unit tests**              |
| List rendering, columns, filters, renewal modal                   | `licenses/page.tsx` + `LicenseRenewalModal.tsx` (component) | **tsc + eslint + source review** |
| Reminder emission (cron)                                          | `lib/trade/license-reminder-service.ts` (**pre-existing**)  | already has `*.test.ts`          |
| Persisting the renewed licence                                    | existing `POST /api/trade/licenses` (**no change**)         | already has `route.test.ts`      |

**Reused shared components (NOT rebuilt):** `TradeTable` + `TradeColumn` (`../_components/TradeTable`), `EmptyStateRich`, `ListSkeleton` (from `./Skeletons` — used internally by `TradeTable`), `useTradeDensity` (consumed internally by `TradeTable`), `BulkActionsBar` (rendered internally by `TradeTable`), `buildCsv`/`downloadCsv` (`@/lib/trade/csv-export`), `tradeStatusLabel`/`humanizeEnum` (`@/lib/trade/format`), `useToast`.

> **Component-reuse note:** `ScreeningBadge` is **not** a shared `_components` file — it is a _local_ subcomponent inside the parties page. The licences page already has its own `STATUS_META` (status pill) and `computeExpiryState` (expiry pill); 3B keeps those as **local** subcomponents (renamed/extracted as `LicenseStatusBadge` + `ExpiryBadge` inside `page.tsx`), and moves the _pure_ threshold logic behind `computeExpiryState` into `license-renewal.ts` so it is testable and shared with the renewal-gating. No new shared badge is created.

### Pure module — `src/lib/trade/license-renewal.ts`

Two pure concerns, no React / no DB / no I/O / no Anthropic:

**(A) Expiry-state derivation** — single source of truth for "how close to expiry / is renewal due", aligned with the cron's 90/30/7 buckets so list and reminders never disagree:

```ts
export type ExpiryUrgency = "ok" | "info" | "warning" | "critical" | "expired";

export interface LicenseExpiryState {
  /** Whole days until validUntil (negative = already past). null when no validUntil. */
  daysRemaining: number | null;
  urgency: ExpiryUrgency; // ok | info(≤90) | warning(≤30) | critical(≤7) | expired(<0)
  /** True when the operator should act: urgency ∈ {warning, critical, expired}. */
  isRenewalDue: boolean;
  /** Short UI label, e.g. "7d left", "Expired 3d ago", "—". */
  label: string;
  /** Sort key: smaller = more urgent. Expired sorts first, no-date sorts last. */
  sortValue: number;
}
export function deriveExpiryState(
  validUntil: string | Date | null,
  now?: Date,
): LicenseExpiryState;
```

**(B) Renewal draft (clone / pre-fill)** — given a prior licence, produce the create-payload for its renewal. Deterministic field-copy + carry the link in `conditions.renewalOf`. Caller (the modal) lets the human edit, then POSTs it:

```ts
export interface RenewableLicense {
  id: string;
  licenseType: string; // TradeLicenseType
  licenseNumber: string | null;
  validUntil: string | null;
  totalCapValue: number | null; // euros (API-serialized)
  capCurrency: string;
  conditions: Record<string, unknown>;
  operationIds?: string[]; // optional: parties/operations to re-attach (advisory)
}
export interface LicenseRenewalDraft {
  licenseType: string; // carried unchanged
  licenseNumber: undefined; // ALWAYS blank — new authority no. unknown until issued
  issuedAt: undefined; // blank — set when the new Bescheid arrives
  validUntil: undefined; // blank — operator sets the new validity window
  totalCapValue: number | null; // carried (fresh cap usually == prior cap)
  capCurrency: string; // carried
  conditions: Record<string, unknown>; // prior coveredCodes/coveredCountries/endUseRestrictions/valueCap + { renewalOf: priorId }
  status: "DRAFT"; // renewals start as DRAFT
  /** Human-readable summary of what was carried, shown in the modal. */
  carriedSummary: string;
  /** Mandatory disclaimer — travels with the draft, never dropped. */
  disclaimer: string;
}
export function buildLicenseRenewalDraft(
  prior: RenewableLicense,
): LicenseRenewalDraft;
```

Design choices baked into `buildLicenseRenewalDraft`:

- **Never carry `licenseNumber` / `issuedAt` / `validUntil`.** A renewal is a _new_ authorisation with a new number and new dates issued by the authority; copying the old number would be a compliance falsification. These start blank and the operator fills them when the new Bescheid/licence arrives.
- **Carry `licenseType`, `conditions` (covered codes, covered countries, end-use restrictions, value cap), `totalCapValue`, `capCurrency`.** These are the operator's prior application substance — the time-saver.
- **Stamp `conditions.renewalOf = prior.id`** so the lineage is queryable and the list can show a "renewal of …" hint. No schema change — it's a JSON key.
- **`status: "DRAFT"`** — the renewed record is a draft application, not a live licence, until the operator advances it.
- **Disclaimer constant** (same spirit as `classification-draft-builder.ts`): renewing in Caelex does **not** file with BAFA/BIS/DDTC; the operator must submit through the authority's own channel and re-verify all conditions.

## Licence list — columns (ROW layout)

`TradeTable<LicenseRow>` with these columns (visuals ported from the current `LicenseCard`; `LicenseRow` type is unchanged from today's page). Selection + CSV export + toolbar are owned by `TradeTable`.

| #   | key             | header                  | render                                                                                                | sortBy                                                            | align     |
| --- | --------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------- |
| 1   | `licenseType`   | **Type & jurisdiction** | `TYPE_META[type].label` (bold) + jurisdiction chip (DE/EU/US)                                         | `TYPE_META[type].label`                                           | left      |
| 2   | `licenseNumber` | **Number**              | mono `licenseNumber` or muted `—`; if `conditions.renewalOf` set, tiny "renewal" tag                  | `licenseNumber ?? ""`                                             | left      |
| 3   | `status`        | **Status**              | `LicenseStatusBadge` (existing `STATUS_META` pill)                                                    | `status`                                                          | left      |
| 4   | `validUntil`    | **Expiry**              | `ExpiryBadge` from `deriveExpiryState` — "7d left" (red/amber/grey) / "Expired 3d ago" / "—"          | `deriveExpiryState(validUntil).sortValue`                         | left      |
| 5   | `drawdown`      | **Remaining capacity**  | draw-down % bar + `drawn / cap CUR` (mono); right-aligned; bar red ≥90 / amber ≥70                    | `drawnPct` (drawn/cap\*100; `-1` when uncapped so they sort last) | **right** |
| 6   | `conditions`    | **Conditions**          | indicator: count of covered codes/countries + restriction icon; tooltip lists them; "none" when empty | (none)                                                            | left      |
| 7   | `renew`         | **(action)**            | when `isRenewalDue`, a small **"Renew"** button opening `LicenseRenewalModal`; else empty             | (none)                                                            | right     |

**Default sort:** `initialSort = { key: "validUntil", dir: "asc" }` → **expiring soonest first** out of the box (the headline UX of 3B). Because `sortBy` returns `sortValue` (expired → most negative, no-date → `+Infinity`-ish large), expired/imminent rise to the top and undated sink.

**Filters slot (passed to `TradeTable.filters`):**

- **Status** multi-select pills (existing `STATUS_OPTIONS`: Active / Pending / Draft / Expired / Exhausted) — unchanged behaviour from today (1 status → server `status` param; 2+ → client filter), matching the 3A pattern.
- **Jurisdiction** multi-select pills (BAFA / BIS / DDTC / EU / OTHER) — client-side filter on `TYPE_META[type].group`.
- **Expiry quick-filter**: pills "≤30d" / "≤60d" / "≤90d" — client filter on `deriveExpiryState(validUntil).daysRemaining`.
- **Capacity quick-filter**: pill "Remaining < 20%" (i.e. `drawnPct > 80`) — client filter; threshold constant, not a free input (YAGNI).

All quick-filters are **client-side on the loaded page** (no new query params), consistent with 3A and the Non-Goals.

## Renewal flow (guided, "auto-prepare → human confirms")

1. Operator sees an expiring licence (list expiry badge is amber/red, and they likely got the daily `DOCUMENT_EXPIRY` Notification linking to `/trade/licenses`).
2. They click **Renew** (column 7, only shown when `isRenewalDue`).
3. `LicenseRenewalModal` opens. On open it calls the **pure** `buildLicenseRenewalDraft(prior)` (no network) and renders the pre-filled new-licence form: type + jurisdiction (carried, read-only-ish), conditions (carried, editable), cap + currency (carried, editable), **number/issuedAt/validUntil left blank for the operator**, and a **"What was carried"** summary + the mandatory disclaimer.
4. Operator edits as needed and clicks **Create renewal draft**.
5. Modal POSTs to the **existing** `POST /api/trade/licenses` (it already accepts `licenseType`, `conditions`, `totalCapValue`, `capCurrency`, `status`, etc.). The new licence is created as `DRAFT` with `conditions.renewalOf = prior.id`.
6. On success the new row is prepended to the list (status `DRAFT`); the operator can later attach operations / upload the new Bescheid PDF / advance status — all via existing flows.

No new API endpoint is required for the happy path. (Optional nicety, **out of 3B scope**: a `PATCH /api/trade/licenses/[id]` to mark the _prior_ licence `EXPIRED` once the renewal is live — deferred, since the cron + operator already manage status, and adding the route is more surface than 3B wants.)

## Conditions / provisos surfacing

The `conditions` JSON (shape: `{ coveredCodes?, coveredCountries?, endUseRestrictions?, valueCap?, notes?, renewalOf? }`) is currently invisible in the card UI. 3B surfaces it:

- **List column 6** shows a compact indicator (e.g. "5 codes · 3 countries · restricted") with a `title` tooltip enumerating them; "none" when empty. Pure read of the already-fetched `conditions` (already returned by `GET /api/trade/licenses`).
- **Renewal modal** shows the full conditions block (editable), since carrying conditions forward is the core value.

No schema change, no new API field — `conditions` is already selected and returned.

## Data / Prisma touchpoints (additive-only — NO migration)

`TradeLicense` (schema.prisma ~11847) already has every needed field:

- `licenseType`, `licenseNumber`, `issuedAt`, `validUntil`, `conditions` (Json), `drawnDownValue` (BigInt cents → euros by API), `totalCapValue` (BigInt? cents → euros by API), `capCurrency`, `status`, `documentId`, `_count.operations`, and **`@@index([validUntil])`** (the cron + the new expiry-sort both benefit).
- The renewal lineage uses **`conditions.renewalOf`** — a JSON key, **no column added**.

**Migration required: NONE.** This is the headline answer for the human. If a future phase wants first-class lineage (a real `renewedFromId` self-relation) or a materialised "renewal due" flag, that's an additive, safe migration _then_ — explicitly deferred out of 3B.

`GET /api/trade/licenses` already returns `conditions`, so the list column needs **no API change**. `POST /api/trade/licenses` already accepts the full create shape, so the renewal flow needs **no API change**.

## Testing strategy

- **`license-renewal.ts` → real node unit tests** (`license-renewal.test.ts`, Vitest, node env): exhaustive on `deriveExpiryState` (boundaries at 91/90/31/30/8/7/0/−1 days, null `validUntil`, sort ordering) and `buildLicenseRenewalDraft` (number/issuedAt/validUntil blanked; type/conditions/cap carried; `renewalOf` stamped; disclaimer present; prior `conditions` not mutated). This is where the logic lives precisely _because_ it can be node-tested.
- **`page.tsx` + `LicenseRenewalModal.tsx` → gated by `npx tsc --noEmit` + `npx eslint` + source review**, matching Phase 1/2/3A (jsdom component tests hang on this machine — do not add them).
- **`license-reminder-service.test.ts`** already exists and is untouched (no behaviour change).
- **`route.test.ts`** for `/api/trade/licenses` already exists and is untouched (no API change).

## Risks / open questions

1. **`drawnDownValue` / `totalCapValue` are euros in the API, cents (BigInt) in the DB.** The list already consumes the euro-serialized values (current card does). The new `drawnPct` sort + capacity filter operate on the euro numbers from the API — correct, but the implementer must **not** re-introduce cents math in the page. (Low risk; flagged.)
2. **Renewal lineage in `conditions.renewalOf` is soft (JSON, unindexed).** Fine for display + audit, but you can't efficiently query "all renewals of X" at scale. Acceptable for 3B (YAGNI); promote to a real relation only if a reporting need appears. **Open question for the human:** accept JSON lineage now, or pay for a small additive migration (`renewedFromId String?` self-relation) up front? Recommendation: JSON now.
3. **"Should creating a renewal auto-expire the prior licence?"** 3B deliberately does **not** (no PATCH route added). The prior licence's status stays operator/cron-managed. **Open question for the human:** is a one-click "mark prior expired" worth a tiny `PATCH /api/trade/licenses/[id]` in this phase, or defer? Recommendation: defer.
4. **Quick-filters are client-side on the 100-row page.** If an org ever exceeds 100 licences, expiry/capacity filters only see the loaded page. Same limitation as all 3A lists; documented, not solved here.

---

## Acceptance (definition of done for 3B)

- [ ] `license-renewal.ts` exists with `deriveExpiryState` + `buildLicenseRenewalDraft`; `license-renewal.test.ts` green in node.
- [ ] `/trade/licenses` renders a `TradeTable<LicenseRow>` ROW layout with the 7 columns; default sort = expiry ascending ("soonest first"); status + jurisdiction + expiry(≤30/60/90) + capacity(<20%) filters; CSV export + selection preserved.
- [ ] Conditions are visible in the list (column + tooltip).
- [ ] An expiring licence shows a **Renew** action → modal pre-fills via `buildLicenseRenewalDraft` → POST creates a `DRAFT` renewal with `conditions.renewalOf` set.
- [ ] No new cron / Notification / email / Prisma migration / runtime dependency introduced.
- [ ] `npx tsc --noEmit` clean on touched files; `npx eslint` clean; relevant node tests pass.
