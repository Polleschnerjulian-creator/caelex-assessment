# Trade UI Redesign — Phase 3B Implementation Plan (Licence Renewal & Expiry)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `/trade/licenses` from a card layout to a `TradeTable<LicenseRow>` ROW layout (default sort = expiry, soonest-first; status/jurisdiction/expiry/capacity filters; conditions surfaced), and add a guided **renewal** flow ("auto-prepare, human confirms") backed by a pure, node-tested derivation module. **Zero** new cron / Notification / email / Prisma migration / runtime dependency.

**Architecture:** Pure `license-renewal.ts` (expiry-state derivation + renewal-draft clone, node-tested) + a page rewrite that hands columns/slots to the existing `TradeTable` + a `LicenseRenewalModal` component. Components are gated by **tsc + eslint + source review** (jsdom hangs on this machine — do NOT add component tests). The renewal happy-path uses the **existing** `POST /api/trade/licenses` — no API change.

**Tech Stack:** Next.js 15 / React / TypeScript, Tailwind `--trade-*` tokens, lucide-react, Vitest (node only for the pure module).

**Branch:** `fix/trade-to-92`. Commit locally per task; deploy the whole batch at the end (Task 5) per the batched-deploy policy.

**Verified facts (trust these — already read from the codebase):**

- **Expiry reminders ALREADY SHIP.** Cron `GET /api/cron/trade-license-expiry` (vercel.json:190, daily 08:30 UTC) → `runLicenseExpiryReminders()` in `src/lib/trade/license-reminder-service.ts`, buckets **90/30/7** days → `Notification` (`type:"DOCUMENT_EXPIRY"`, `entityType:"trade-license"`, `actionUrl:"/trade/licenses"`) + email, idempotent 24h. **DO NOT touch this. DO NOT add a cron/notification/email.**
- `TradeTable<T>` (`../_components/TradeTable`) props: `rows, columns: TradeColumn<T>[], getRowId, rowHref?, selectable, selectedIds, onSelectionChange, bulkActions, bulkNoun, search:{value,onChange,placeholder?}, filters?, resultCount?, loading?, emptyState?, initialSort?`. It renders its own toolbar (search + `filters` slot + density + count), sticky tri-state select-all header, row checkboxes, and `BulkActionsBar`. `TradeColumn<T> = { key; header; render:(row)=>ReactNode; sortBy?:(row)=>string|number; align?:"left"|"right"; headerClassName? }`. **Note:** when `rowHref` is set, each cell is wrapped in a `<Link>` — 3B leaves `rowHref` UNSET (no detail page yet), so action buttons in cells work normally.
- Sort/selection pure logic is `src/lib/trade/table-state.ts` (already node-tested) — reused by `TradeTable` internally; the page does not import it.
- Current `licenses/page.tsx` (~843 LOC) already defines: `LicenseRow` type, `TYPE_META` (label/jurisdiction/group: BAFA|BIS|DDTC|EU|OTHER), `STATUS_META`, `STATUS_OPTIONS`, `computeExpiryState` (local; 30/90 thresholds), `NewLicenseForm`, `EmptyState`, CSV export via `buildCsv`/`downloadCsv`, page-owned `selectedIds`/`statusFilter`/`search`. **Keep `NewLicenseForm`, `LicensePdfDrop`, `EmptyState`, `TYPE_META`, `STATUS_META` as-is.**
- API: `GET /api/trade/licenses` returns `licenses[]` with `conditions`, `drawnDownValue`/`totalCapValue` already **serialized cents→euros** (the page consumes euros — do NOT add cents math). `POST /api/trade/licenses` accepts `{ licenseType, licenseNumber?, issuedAt?, validUntil?, conditions, totalCapValue?, capCurrency, status, documentId? }` and returns `{ license }`. **No `[id]` / PATCH route exists; none is added in 3B.**
- `conditions` JSON shape: `{ coveredCodes?, coveredCountries?, endUseRestrictions?, valueCap?, notes?, renewalOf? }`.
- `tradeStatusLabel` / `humanizeEnum` live in `@/lib/trade/format`. `useToast` from `@/components/ui/Toast`. `EmptyStateRich` from `../_components/EmptyStateRich`.
- `ScreeningBadge` is **NOT** shared — it's local to the parties page. For licences, keep the status/expiry pills as **local** subcomponents in `page.tsx`.

---

## Task 1: Pure `license-renewal.ts` — expiry-state derivation (TDD)

**Files:**

- Create: `src/lib/trade/license-renewal.ts`
- Test: `src/lib/trade/license-renewal.test.ts`

- [ ] **Step 1: Write the failing test** `src/lib/trade/license-renewal.test.ts` (expiry portion):

```ts
import { describe, it, expect } from "vitest";
import { deriveExpiryState } from "./license-renewal";

// Fixed clock: 2026-06-01T00:00:00Z
const NOW = new Date("2026-06-01T00:00:00Z");
const inDays = (d: number) =>
  new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

describe("deriveExpiryState", () => {
  it("null validUntil → ok, no days, sorts last", () => {
    const s = deriveExpiryState(null, NOW);
    expect(s.daysRemaining).toBeNull();
    expect(s.urgency).toBe("ok");
    expect(s.isRenewalDue).toBe(false);
    expect(s.label).toBe("—");
    expect(s.sortValue).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("91 days → ok (outside 90 window)", () => {
    const s = deriveExpiryState(inDays(91), NOW);
    expect(s.urgency).toBe("ok");
    expect(s.isRenewalDue).toBe(false);
  });

  it("90 days → info, not yet renewal-due", () => {
    const s = deriveExpiryState(inDays(90), NOW);
    expect(s.daysRemaining).toBe(90);
    expect(s.urgency).toBe("info");
    expect(s.isRenewalDue).toBe(false);
  });

  it("30 days → warning, renewal-due", () => {
    const s = deriveExpiryState(inDays(30), NOW);
    expect(s.urgency).toBe("warning");
    expect(s.isRenewalDue).toBe(true);
    expect(s.label).toBe("30d left");
  });

  it("7 days → critical, renewal-due", () => {
    const s = deriveExpiryState(inDays(7), NOW);
    expect(s.urgency).toBe("critical");
    expect(s.isRenewalDue).toBe(true);
  });

  it("0 days (today) → critical", () => {
    const s = deriveExpiryState(inDays(0), NOW);
    expect(s.daysRemaining).toBe(0);
    expect(s.urgency).toBe("critical");
  });

  it("past → expired, renewal-due, negative-ish sort first", () => {
    const s = deriveExpiryState(inDays(-3), NOW);
    expect(s.daysRemaining).toBe(-3);
    expect(s.urgency).toBe("expired");
    expect(s.isRenewalDue).toBe(true);
    expect(s.label).toBe("Expired 3d ago");
    expect(s.sortValue).toBeLessThan(0);
  });

  it("sortValue orders soonest-first: expired < critical < info < null", () => {
    const expired = deriveExpiryState(inDays(-1), NOW).sortValue;
    const crit = deriveExpiryState(inDays(5), NOW).sortValue;
    const info = deriveExpiryState(inDays(80), NOW).sortValue;
    const none = deriveExpiryState(null, NOW).sortValue;
    expect(expired).toBeLessThan(crit);
    expect(crit).toBeLessThan(info);
    expect(info).toBeLessThan(none);
  });

  it("accepts a Date as well as an ISO string", () => {
    expect(deriveExpiryState(new Date(inDays(7)), NOW).urgency).toBe(
      "critical",
    );
  });
});
```

- [ ] **Step 2: Run the test — confirm it FAILS** (`npx vitest run src/lib/trade/license-renewal.test.ts`).

- [ ] **Step 3: Implement the expiry portion** of `src/lib/trade/license-renewal.ts`:

```ts
/**
 * Caelex Trade — licence renewal & expiry derivation (Phase 3B).
 *
 * PURE module: no React, no DB, no I/O, no Anthropic. Two concerns:
 *   (A) deriveExpiryState  — list-UI expiry/urgency, aligned with the
 *       trade-license-expiry cron's 90/30/7 buckets so the list and the
 *       daily reminder never disagree.
 *   (B) buildLicenseRenewalDraft — clone a prior licence into a new-licence
 *       create payload ("auto-prepare, human confirms"). Caller POSTs it to
 *       the existing /api/trade/licenses.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Bucket upper bounds (inclusive), tightest first — MUST match
// license-reminder-service.ts (90 info / 30 warning / 7 critical).
const INFO_MAX = 90;
const WARN_MAX = 30;
const CRIT_MAX = 7;

export type ExpiryUrgency = "ok" | "info" | "warning" | "critical" | "expired";

export interface LicenseExpiryState {
  /** Whole days until validUntil (negative = past). null when no validUntil. */
  daysRemaining: number | null;
  urgency: ExpiryUrgency;
  /** Operator should act: urgency ∈ {warning, critical, expired}. */
  isRenewalDue: boolean;
  /** Short UI label: "7d left" / "Expired 3d ago" / "—". */
  label: string;
  /** Sort key, smaller = more urgent. Expired first; no-date last. */
  sortValue: number;
}

/**
 * Derive expiry/urgency from a validUntil. `now` is injectable for tests;
 * defaults to new Date(). All arithmetic is ms-since-epoch (TZ-agnostic).
 */
export function deriveExpiryState(
  validUntil: string | Date | null,
  now: Date = new Date(),
): LicenseExpiryState {
  if (validUntil == null) {
    return {
      daysRemaining: null,
      urgency: "ok",
      isRenewalDue: false,
      label: "—",
      sortValue: Number.MAX_SAFE_INTEGER,
    };
  }
  const until = validUntil instanceof Date ? validUntil : new Date(validUntil);
  const days = Math.floor((until.getTime() - now.getTime()) / MS_PER_DAY);

  let urgency: ExpiryUrgency;
  if (days < 0) urgency = "expired";
  else if (days <= CRIT_MAX) urgency = "critical";
  else if (days <= WARN_MAX) urgency = "warning";
  else if (days <= INFO_MAX) urgency = "info";
  else urgency = "ok";

  const isRenewalDue =
    urgency === "warning" || urgency === "critical" || urgency === "expired";

  const label = days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`;

  // Expired sorts first (negative). Future sorts by days ascending.
  // No-date already returned MAX_SAFE_INTEGER above.
  const sortValue = days;

  return { daysRemaining: days, urgency, isRenewalDue, label, sortValue };
}
```

- [ ] **Step 4: Run the test — confirm it PASSES.**
- [ ] **Step 5: Commit** — `feat(trade): pure licence expiry-state derivation (ui phase 3b)`.

---

## Task 2: Pure `buildLicenseRenewalDraft` — clone / pre-fill (TDD)

**Files:** extend `src/lib/trade/license-renewal.ts` + `src/lib/trade/license-renewal.test.ts`.

- [ ] **Step 1: Append the failing test** to `license-renewal.test.ts`:

```ts
import { buildLicenseRenewalDraft } from "./license-renewal";

describe("buildLicenseRenewalDraft", () => {
  const prior = {
    id: "lic_123",
    licenseType: "BAFA_AGG_12",
    licenseNumber: "AGG-12-2024-987",
    validUntil: "2026-06-30T00:00:00Z",
    totalCapValue: 500000,
    capCurrency: "EUR",
    conditions: {
      coveredCodes: ["9A001.a"],
      coveredCountries: ["US", "JP"],
      endUseRestrictions: ["civilian only"],
      valueCap: { amount: 500000, currency: "EUR" },
    },
  };

  it("carries type, cap, currency", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.licenseType).toBe("BAFA_AGG_12");
    expect(d.totalCapValue).toBe(500000);
    expect(d.capCurrency).toBe("EUR");
    expect(d.status).toBe("DRAFT");
  });

  it("NEVER carries number / issuedAt / validUntil (new authorisation)", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.licenseNumber).toBeUndefined();
    expect(d.issuedAt).toBeUndefined();
    expect(d.validUntil).toBeUndefined();
  });

  it("carries conditions and stamps renewalOf = prior.id", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.conditions.coveredCodes).toEqual(["9A001.a"]);
    expect(d.conditions.coveredCountries).toEqual(["US", "JP"]);
    expect(d.conditions.renewalOf).toBe("lic_123");
  });

  it("does not mutate the prior licence's conditions", () => {
    const snapshot = JSON.stringify(prior.conditions);
    buildLicenseRenewalDraft(prior);
    expect(JSON.stringify(prior.conditions)).toBe(snapshot);
  });

  it("includes a non-empty disclaimer and a carried summary", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.disclaimer.length).toBeGreaterThan(0);
    expect(d.carriedSummary).toMatch(/BAFA_AGG_12|AGG/);
  });

  it("handles a prior with null number / null cap / empty conditions", () => {
    const d = buildLicenseRenewalDraft({
      id: "lic_x",
      licenseType: "OTHER",
      licenseNumber: null,
      validUntil: null,
      totalCapValue: null,
      capCurrency: "EUR",
      conditions: {},
    });
    expect(d.licenseType).toBe("OTHER");
    expect(d.totalCapValue).toBeNull();
    expect(d.conditions.renewalOf).toBe("lic_x");
  });
});
```

- [ ] **Step 2: Run — confirm FAIL.**
- [ ] **Step 3: Append the implementation** to `src/lib/trade/license-renewal.ts`:

```ts
export interface RenewableLicense {
  id: string;
  licenseType: string;
  licenseNumber: string | null;
  validUntil: string | null;
  totalCapValue: number | null; // euros (API-serialized)
  capCurrency: string;
  conditions: Record<string, unknown>;
  operationIds?: string[];
}

export interface LicenseRenewalDraft {
  licenseType: string;
  licenseNumber: undefined; // new authority no. unknown until issued
  issuedAt: undefined;
  validUntil: undefined; // operator sets the new validity window
  totalCapValue: number | null;
  capCurrency: string;
  conditions: Record<string, unknown>; // prior conditions + { renewalOf }
  status: "DRAFT";
  carriedSummary: string;
  disclaimer: string;
}

const RENEWAL_DISCLAIMER =
  "Creating a renewal in Caelex does NOT file an application with BAFA / BIS / DDTC. " +
  "This produces an internal DRAFT licence record only — you must submit the renewal " +
  "through the competent authority's own channel (BAFA ELAN, BIS SNAP-R, DDTC DECCS, " +
  "etc.) and re-verify every condition (covered codes, covered countries, end-use " +
  "restrictions, value cap) against the new Bescheid/licence before any shipment. " +
  "The authority may impose different conditions; carried-forward conditions are a " +
  "starting point, not a guarantee.";

/**
 * Clone a prior licence into a renewal create-payload. Deterministic
 * field-copy — no LLM, no network. The number/issuedAt/validUntil are
 * intentionally blank: a renewal is a NEW authorisation with new dates.
 * Caller (LicenseRenewalModal) lets the human edit then POSTs to
 * /api/trade/licenses.
 */
export function buildLicenseRenewalDraft(
  prior: RenewableLicense,
): LicenseRenewalDraft {
  // Shallow-clone conditions so we never mutate the caller's object.
  const conditions: Record<string, unknown> = {
    ...prior.conditions,
    renewalOf: prior.id,
  };

  const numberPart = prior.licenseNumber ? ` ${prior.licenseNumber}` : "";
  const capPart =
    prior.totalCapValue != null
      ? ` · cap ${prior.totalCapValue.toLocaleString("en-GB")} ${prior.capCurrency}`
      : "";
  const carriedSummary =
    `Carried from ${prior.licenseType}${numberPart}: type, conditions` +
    `${capPart}. New licence number, issue date, and validity window must be ` +
    `entered when the renewed authorisation is issued.`;

  return {
    licenseType: prior.licenseType,
    licenseNumber: undefined,
    issuedAt: undefined,
    validUntil: undefined,
    totalCapValue: prior.totalCapValue,
    capCurrency: prior.capCurrency,
    conditions,
    status: "DRAFT",
    carriedSummary,
    disclaimer: RENEWAL_DISCLAIMER,
  };
}
```

- [ ] **Step 4: Run — confirm PASS** (whole file green).
- [ ] **Step 5: Commit** — `feat(trade): pure licence renewal-draft builder (ui phase 3b)`.

---

## Task 3: `LicenseRenewalModal` component (review/confirm → POST)

**File:** Create `src/app/(trade)/trade/licenses/_components/LicenseRenewalModal.tsx`.

**Recipe (implementer adapts; gated by tsc/eslint/source review — NO jsdom test):**

- [ ] Client component. Props: `{ prior: RenewableLicense & { licenseNumber: string | null }; onClose: () => void; onRenewed: (newLicense: LicenseRow) => void }`. (Import `RenewableLicense`, `LicenseRenewalDraft`, `buildLicenseRenewalDraft` from `@/lib/trade/license-renewal`; reuse the page's `LicenseRow` / `TYPE_META` — either import them once `page.tsx` exports them, or duplicate the minimal shape. Prefer lifting `LicenseRow` + `TYPE_META` into a small `licenses/_components/license-types.ts` so both files share them; if that's too much churn, duplicate the 3 fields the modal needs.)
- [ ] On mount: `const draft = useMemo(() => buildLicenseRenewalDraft(prior), [prior])`. Seed local form state from `draft` (`conditions` editable as JSON-ish fields or a textarea for `notes`; `totalCapValue`/`capCurrency` editable inputs; `validUntil`/`issuedAt` empty date inputs the operator fills; `licenseType` shown read-only with the `TYPE_META` label + jurisdiction chip).
- [ ] Render the **"What was carried"** summary (`draft.carriedSummary`) and the **disclaimer** (`draft.disclaimer`) in a muted block — match the existing page's `lang="de"`/muted disclaimer styling and the `--trade-*` tokens (modal container `bg-trade-bg-elevated`, border `border-trade-border-subtle`; this is a panel, not a portal — render it inline above the table when open, mirroring how `NewLicenseForm` renders inline).
- [ ] **Submit** → `POST /api/trade/licenses` with body `{ licenseType: draft.licenseType, conditions, totalCapValue: capValue || undefined, capCurrency, validUntil: validUntil? new Date(validUntil).toISOString() : undefined, issuedAt: issuedAt? ...: undefined, status: "DRAFT" }`. On `res.ok`: build a `LicenseRow` (`{ ...data.license, _count: { operations: 0 } }`) and call `onRenewed(row)`; toast success ("Renewal draft created"). On error: inline red error block (copy the `NewLicenseForm` error pattern). Use `useToast`.
- [ ] Buttons: **"Create renewal draft"** (`bg-trade-accent`) + **"Cancel"** (calls `onClose`). Disable submit while in-flight. Reuse the `inputClass` / `labelClass` strings from `NewLicenseForm` (copy them — they're local consts).
- [ ] **Constraint reminders:** no new dependency; German UI strings consistent with the page; do not POST `licenseNumber` (renewal number unknown). All money is **euros** (the POST accepts euros; the API converts to cents).

- [ ] **Gate:** `npx tsc --noEmit` clean on the new file; `npx eslint 'src/app/(trade)/trade/licenses/_components/LicenseRenewalModal.tsx'` clean.
- [ ] **Commit** — `feat(trade): licence renewal modal — auto-prefill, human confirms (ui phase 3b)`.

---

## Task 4: Migrate `/trade/licenses` page — cards → `TradeTable` ROW layout

**File:** Rewrite `src/app/(trade)/trade/licenses/page.tsx` (keep `NewLicenseForm`, `LicensePdfDrop`, `EmptyState`, `TYPE_META`, `STATUS_META`, `STATUS_OPTIONS`).

**Recipe (mirror the Phase-3A parties migration `bae2c272`; gated by tsc/eslint/source review):**

- [ ] **Imports:** add `import { TradeTable, type TradeColumn } from "../_components/TradeTable";`, `import { deriveExpiryState } from "@/lib/trade/license-renewal";`, `import { LicenseRenewalModal } from "./_components/LicenseRenewalModal";`. Drop the now-unused `BulkActionsBar`, `ListSkeleton` direct imports and the manual select-all `<label>`/header block (TradeTable owns them). Keep `EmptyStateRich` (used by `EmptyState`).
- [ ] **Delete** the bespoke `LicenseCard`, the manual select-all header, and the `<ul>`/`<BulkActionsBar>` block. **Move** the threshold logic out of the local `computeExpiryState` — replace its use with `deriveExpiryState` (keep a tiny local `ExpiryBadge` that calls it and renders the pill with the existing amber/red/grey classes). **Keep** a local `LicenseStatusBadge` rendering `STATUS_META[status]`.
- [ ] **State additions:** keep `licenses`, `loading`, `search`, `statusFilter`, `selectedIds`. **Add** `jurisFilter: Set<"BAFA"|"BIS"|"DDTC"|"EU"|"OTHER">`, `expiryFilter: 30 | 60 | 90 | null`, `lowCapacityOnly: boolean`, and `renewingId: string | null` (which licence's modal is open). Clear `selectedIds` on any filter/search change (existing effect — extend deps).
- [ ] **Client filtering** (after fetch; status fetch behaviour unchanged — 1 status → server `status` param, 2+ → client): apply jurisdiction (`TYPE_META[l.licenseType].group ∈ jurisFilter`), expiry (`expiryFilter == null || (deriveExpiryState(l.validUntil).daysRemaining ?? Infinity) <= expiryFilter`), low-capacity (`!lowCapacityOnly || drawnPct(l) > 80`) to produce `visibleLicenses`. Define `const drawnPct = (l) => l.totalCapValue && l.totalCapValue > 0 ? (l.drawnDownValue / l.totalCapValue) * 100 : -1;` (euros; `-1` ⇒ uncapped sorts last + never matches low-capacity).
- [ ] **Columns** (`TradeColumn<LicenseRow>[]`) — port visuals from the old `LicenseCard`:

```tsx
const columns: TradeColumn<LicenseRow>[] = [
  {
    key: "licenseType",
    header: "Type & jurisdiction",
    sortBy: (l) => (TYPE_META[l.licenseType] ?? TYPE_META.OTHER).label,
    render: (l) => {
      const m = TYPE_META[l.licenseType] ?? TYPE_META.OTHER;
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-trade-text-primary">
            {m.label}
          </span>
          <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
            {m.jurisdiction}
          </span>
        </div>
      );
    },
  },
  {
    key: "licenseNumber",
    header: "Number",
    sortBy: (l) => l.licenseNumber ?? "",
    render: (l) => (
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-[12px] text-trade-text-secondary">
          {l.licenseNumber ?? "—"}
        </span>
        {(l.conditions as Record<string, unknown>)?.renewalOf ? (
          <span className="rounded bg-trade-accent-soft px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-accent-strong">
            renewal
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortBy: (l) => l.status,
    render: (l) => <LicenseStatusBadge status={l.status} />,
  },
  {
    key: "validUntil",
    header: "Expiry",
    sortBy: (l) => deriveExpiryState(l.validUntil).sortValue,
    render: (l) => <ExpiryBadge validUntil={l.validUntil} />,
  },
  {
    key: "drawdown",
    header: "Remaining capacity",
    align: "right",
    sortBy: (l) => drawnPct(l),
    render: (l) => <DrawdownCell license={l} />, // bar + "drawn / cap CUR · NN%", or "—" when uncapped
  },
  {
    key: "conditions",
    header: "Conditions",
    render: (l) => <ConditionsCell conditions={l.conditions} />, // "5 codes · 3 countries · restricted" + title tooltip; "none" when empty
  },
  {
    key: "renew",
    header: "",
    align: "right",
    render: (l) =>
      deriveExpiryState(l.validUntil).isRenewalDue ? (
        <button
          type="button"
          onClick={() => setRenewingId(l.id)}
          className="rounded-md border border-trade-accent bg-trade-accent-soft px-2.5 py-1 text-[12px] font-semibold text-trade-accent-strong transition hover:bg-trade-accent hover:text-white"
        >
          Renew
        </button>
      ) : null,
  },
];
```

- [ ] Implement the three small local cell components — `ExpiryBadge` (calls `deriveExpiryState`, maps `urgency`→class: expired/critical=red, warning=amber, info=grey, ok=hidden), `DrawdownCell` (the existing draw-down bar markup from `LicenseCard`, right-aligned, "—" when `totalCapValue` null), `ConditionsCell` (reads `coveredCodes`/`coveredCountries`/`endUseRestrictions` from `conditions`, renders a compact count string with a `title` listing them; "none" when all empty).
- [ ] **Filters slot** (`filterSlot`): keep the existing status pills (All + `STATUS_OPTIONS`), **add** a jurisdiction pill row (BAFA/BIS/DDTC/EU/OTHER), an expiry pill group (≤30d/≤60d/≤90d, single-select, click-again clears), and a "Remaining < 20%" toggle pill — all using the same pill classes as parties' `filterSlot`.
- [ ] **Invoke `TradeTable`** (mirror parties):

```tsx
<TradeTable<LicenseRow>
  rows={visibleLicenses}
  columns={columns}
  getRowId={(l) => l.id}
  selectable
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  bulkNoun="license"
  bulkActions={/* the existing Export-CSV button → handleExportSelected */}
  search={{
    value: search,
    onChange: setSearch,
    placeholder: "Search license number…",
  }}
  filters={filterSlot}
  resultCount={visibleLicenses.length}
  loading={loading}
  emptyState={<EmptyState onNew={() => setShowNew(true)} />}
  initialSort={{ key: "validUntil", dir: "asc" }}
/>
```

(Leave `rowHref` UNSET — no detail page in 3B; this also keeps the in-cell Renew button clickable.)

- [ ] **Render the renewal modal** inline above the table when `renewingId` is set: find the licence, render `<LicenseRenewalModal prior={...} onClose={() => setRenewingId(null)} onRenewed={(row) => { setLicenses((p) => [row, ...p]); setRenewingId(null); }} />`. Map the `LicenseRow` → `RenewableLicense` (`{ id, licenseType, licenseNumber, validUntil, totalCapValue, capCurrency, conditions }`).
- [ ] **Keep** the header, `NewLicenseForm` toggle, and the bottom German disclaimer paragraph **unchanged**.
- [ ] **Gate:** `npx tsc --noEmit` clean; `npx eslint 'src/app/(trade)/trade/licenses/**'` clean; **source-review checklist**: default sort is expiry-asc; CSV export still works; selection still works; status fetch behaviour unchanged; no cents math; German strings preserved; no `rowHref`.
- [ ] **Commit** — `refactor(trade): migrate licences list to TradeTable + renewal action (ui phase 3b)`.

---

## Task 5: Verification + batched deploy

- [ ] **Run pure tests:** `npx vitest run src/lib/trade/license-renewal.test.ts` — green.
- [ ] **Typecheck:** `npx tsc --noEmit` — no NEW errors on touched files (pre-existing unrelated errors noted, not blocking).
- [ ] **Lint:** `npx eslint 'src/lib/trade/license-renewal.ts' 'src/app/(trade)/trade/licenses/**'` — clean.
- [ ] **Manual source review** against the spec's acceptance checklist (expiry-sort default, filters, conditions visible, renewal modal pre-fills + POSTs DRAFT with `renewalOf`, no cron/notification/email/migration/dependency added).
- [ ] **Confirm working tree** has only the intended files: `license-renewal.ts(+test)`, `LicenseRenewalModal.tsx`, `page.tsx`, (optional) `license-types.ts`, the two docs.
- [ ] **Deploy decision:** this is a multi-task batch (Tasks 1–4 = 4 commits) on top of the in-flight 3A work. Per the batched-deploy policy, deploy only when the 6–8-commit batch threshold is reached OR the user says "deploy now". If deploying: `git checkout main && git pull --ff-only origin main && git merge fix/trade-to-92 --no-edit && git push origin main` (production only; **no** feature-branch push / preview build). Otherwise leave committed on `fix/trade-to-92`.
- [ ] **Commit** (docs, if not already committed) — `docs(trade): design spec + plan — ui phase 3b (licence renewal & expiry)`.

---

## Task summary

5 tasks, each independently committable:

1. Pure `deriveExpiryState` (+ node tests).
2. Pure `buildLicenseRenewalDraft` (+ node tests).
3. `LicenseRenewalModal` component (tsc/eslint-gated).
4. List migration cards → `TradeTable` + renewal action (tsc/eslint-gated).
5. Verify + (batched) deploy.

**Net new runtime cost: zero** (no cron, no Notification, no email, no Anthropic, no Prisma migration, no dependency). The renewal happy-path reuses the existing `POST /api/trade/licenses`; expiry reminders reuse the existing `trade-license-expiry` cron.
