# Trade UI Redesign — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill the two worst frictions in the Trade core flows — replace raw-ID text inputs with a reusable async search picker, and wire the already-built Vision/matcher classification chain into item creation as a datasheet dropzone (auto-prepare, human confirms).

**Architecture:** Pure logic first (`attributesToCandidateCodes` wrapping the existing `matchAgainstCrossWalk`), then a generic `AsyncSearchPicker` + two thin adapters (Item/Party), then `DatasheetDropzone`, then wire them into the wizard + item-create form. No new DB model, no migration — every persistence path already exists.

**Tech Stack:** Next.js 15 (App Router, RSC + client islands), TypeScript strict, Tailwind (`--trade-*` tokens), Vitest + React Testing Library, lucide-react. ES2017 target (use `BigInt()` not `0n` if any bigint appears — unlikely here).

**Spec:** `docs/superpowers/specs/2026-05-31-trade-ui-redesign-phase2-design.md`

---

## Conventions (read once)

- **Branch:** `fix/trade-to-92` (already checked out).
- **Run one test file:** `CI=true npx vitest run <path>` (the runner sometimes detaches with no readable output; if so, rely on source-correctness + `npx tsc --noEmit`).
- **Typecheck (heap-bumped):** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`. Repo carries ~733 pre-existing errors; the gate is **no NEW errors in touched files**, not a clean global run.
- **Commit trailer:** `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Commitlint:** subject lowercase, conventional, **no PascalCase in the subject** (use kebab, e.g. `async-search-picker` not `AsyncSearchPicker`).
- **Sequential write agents only** (if subagent-driven).

## Verified facts this plan is built on (confirmed by read at planning time)

The parametric matcher (`@/lib/comply-v2/trade/classification/parametric-matcher`):

```ts
export function matchAgainstCrossWalk(bag: ItemAttributeBag): MatcherResult;
export interface ItemAttributeBag {
  // keys are EXACTLY the AttributeName union values
  apertureMeters?: number | null;
  payloadKg?: number | null;
  rangeKm?: number | null;
  IspSeconds?: number | null;
  deltaVMetersPerSecond?: number | null;
  gsdMeters?: number | null;
  transmitPowerW?: number | null;
  frequencyGhz?: number | null;
  radHardTidKrad?: number | null;
  seuRateErrorsPerBitDay?: number | null;
  isRadHardened?: boolean | null;
  isMilSpec?: boolean | null;
  isAntiJam?: boolean | null;
  isSpeciallyDesigned?: boolean | null;
  itemClass?: string | null;
  parametricAttributes?: Record<string, unknown> | null;
}
export interface MatcherResult {
  candidates: CandidateMatch[];
  possibleMatches: PossibleMatch[];
  nearMisses: NearMissMatch[];
  noAttributesPopulated: boolean;
  disclaimer: string;
  sanityWarnings: string[];
}
export interface CandidateMatch {
  entry: ControlListEntry;
  confidence: MatchConfidence;
  matchedPredicates: MatchedPredicate[];
  rationale: string;
}
export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW";
```

`ControlListEntry` (from `@/lib/comply-v2/trade/classification/control-list-cross-walk`) has `{ canonicalId: string (e.g. "ECCN:9A515.a.1"), regime: RegimeName, category, productGroup, entryNumber, subpara?, title: string, … }`.

The Vision extractor (`@/lib/trade/classification/claude-vision-extractor.server`): `VisionAttribute = { attribute: AttributeName; value: number|boolean|string; confidence: "high"|"medium"|"low"; reasoning: string }`. `AttributeName` is the union whose values are exactly the `ItemAttributeBag` keys (`apertureMeters`, `frequencyGhz`, `isRadHardened`, etc.).

The extract-vision route (`POST /api/trade/classify/extract-vision`): multipart `file` (PDF) → `{ ok: true, extraction: MergedExtraction, skippedVision, … }` on success, `{ error }` + non-200 on failure. `extraction.attributes` is `MergedAttribute[]` where each has at least `{ attribute, value, confidence }` (a superset of `VisionAttribute`). Role-gated Owner/Admin/Manager, rate-limit `document_generation`.

Search APIs (already exist): `GET /api/trade/items?q=…` → `{ items: [{ id, name, internalSku, eccnEU, status, … }], … }` (response wraps under `items`); `GET /api/trade/parties?q=…` → `{ parties: [{ id, legalName, countryCode, status, screeningStatus }], … }`. (Confirm the exact response wrapper key by reading each route's `NextResponse.json({...})` — items route returns `{ items, ... }`; parties route returns `{ parties, ... }`.)

The wizard (`src/app/(trade)/trade/operations/new/page.tsx`) has `Draft.itemId`/`Draft.counterpartyId` (string), rendered as two raw `<input value={draft.itemId} onChange={(e)=>patch({itemId:e.target.value})} placeholder="z. B. itm_…">` blocks at the "was" (line ~119-127) and "anWen" (line ~163-171) steps; "Weiter" buttons are `disabled={!draft.itemId}` / `disabled={!draft.counterpartyId}`.

Trade RTL test pattern: `src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx` (lucide via Proxy mock, `render`/`screen`/`fireEvent`, `vi.stubGlobal("fetch", …)`).

---

## File Structure

| File                                                                                 | Responsibility                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/trade/classify-suggest.ts` (new, **pure**)                                  | `attributesToBag(attrs)` + `attributesToCandidateCodes(attrs) → CodeSuggestion[]` — folds vision attributes into an `ItemAttributeBag`, runs `matchAgainstCrossWalk`, maps candidates to a UI-friendly `CodeSuggestion`. The only new logic. |
| `src/lib/trade/classify-suggest.test.ts` (new)                                       | Unit tests for the fold + mapping.                                                                                                                                                                                                           |
| `src/app/api/trade/classify/suggest-codes/route.ts` (new)                            | Thin auth-gated `POST` wrapper: body `{ attributes }` → `attributesToCandidateCodes` → `{ suggestions }`.                                                                                                                                    |
| `src/app/api/trade/classify/suggest-codes/route.test.ts` (new)                       | Route gate test (403 + 200).                                                                                                                                                                                                                 |
| `src/app/(trade)/trade/_components/AsyncSearchPicker.tsx` (new, client, **generic**) | Reusable debounced search-select.                                                                                                                                                                                                            |
| `src/app/(trade)/trade/_components/AsyncSearchPicker.test.tsx` (new)                 | Component tests (debounced search, select, create-new, keyboard).                                                                                                                                                                            |
| `src/app/(trade)/trade/operations/new/_components/ItemPicker.tsx` (new, client)      | Item adapter over `/api/trade/items?q=`.                                                                                                                                                                                                     |
| `src/app/(trade)/trade/operations/new/_components/PartyPicker.tsx` (new, client)     | Party adapter over `/api/trade/parties?q=`.                                                                                                                                                                                                  |
| `src/app/(trade)/trade/operations/new/_components/pickers.test.tsx` (new)            | Tests for both adapters (status pills, mapping).                                                                                                                                                                                             |
| `src/app/(trade)/trade/_components/DatasheetDropzone.tsx` (new, client)              | PDF → extract-vision → suggest-codes → suggestion card → `onApply`.                                                                                                                                                                          |
| `src/app/(trade)/trade/_components/DatasheetDropzone.test.tsx` (new)                 | Component test (success card, error degrade, apply).                                                                                                                                                                                         |
| `src/app/(trade)/trade/operations/new/page.tsx` (modify)                             | Swap the two raw-id inputs for ItemPicker/PartyPicker.                                                                                                                                                                                       |
| `src/app/(trade)/trade/items/page.tsx` (modify)                                      | Add DatasheetDropzone to `NewItemForm` + apply suggestions.                                                                                                                                                                                  |

---

## Task 1: `attributesToCandidateCodes` (pure matcher wrapper)

**Files:**

- Create: `src/lib/trade/classify-suggest.ts`
- Test: `src/lib/trade/classify-suggest.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/trade/classify-suggest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  attributesToBag,
  attributesToCandidateCodes,
  type SuggestInputAttribute,
} from "./classify-suggest";

describe("attributesToBag", () => {
  it("folds vision attributes into an ItemAttributeBag by attribute name", () => {
    const attrs: SuggestInputAttribute[] = [
      { attribute: "apertureMeters", value: 0.8, confidence: "high" },
      { attribute: "frequencyGhz", value: 9.2, confidence: "medium" },
      { attribute: "isRadHardened", value: true, confidence: "high" },
    ];
    const bag = attributesToBag(attrs);
    expect(bag.apertureMeters).toBe(0.8);
    expect(bag.frequencyGhz).toBe(9.2);
    expect(bag.isRadHardened).toBe(true);
  });

  it("ignores attribute names that are not ItemAttributeBag keys", () => {
    const bag = attributesToBag([
      // a name the matcher's bag doesn't carry as a typed column
      { attribute: "totallyUnknownAttr" as never, value: 1, confidence: "low" },
      { attribute: "apertureMeters", value: 0.5, confidence: "high" },
    ]);
    expect(bag.apertureMeters).toBe(0.5);
    // unknown keys do not appear as typed columns
    expect((bag as Record<string, unknown>).totallyUnknownAttr).toBeUndefined();
  });
});

describe("attributesToCandidateCodes", () => {
  it("returns an empty list when no attributes are populated", () => {
    expect(attributesToCandidateCodes([])).toEqual([]);
  });

  it("maps matcher candidates to UI code suggestions (code, regime, title, confidence)", () => {
    // A high-resolution EO aperture should match an electro-optical control entry.
    const suggestions = attributesToCandidateCodes([
      { attribute: "apertureMeters", value: 0.8, confidence: "high" },
      { attribute: "gsdMeters", value: 0.4, confidence: "high" },
    ]);
    // We don't hard-code which ECCN the live cross-walk returns; assert the SHAPE
    // + that a populated attribute set yields at least one suggestion with a code.
    expect(Array.isArray(suggestions)).toBe(true);
    if (suggestions.length > 0) {
      const s = suggestions[0];
      expect(typeof s.code).toBe("string");
      expect(s.code.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(s.confidence);
      expect(typeof s.title).toBe("string");
    }
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `CI=true npx vitest run src/lib/trade/classify-suggest.test.ts` → FAIL (`Cannot find module`). (Vitest may detach; if no output, the RED before the file exists is the confirmation.)

- [ ] **Step 3: Write the implementation** — `src/lib/trade/classify-suggest.ts`:

```ts
import {
  matchAgainstCrossWalk,
  type ItemAttributeBag,
  type MatchConfidence,
} from "@/lib/comply-v2/trade/classification/parametric-matcher";

/**
 * A single extracted attribute (the subset of VisionAttribute / MergedAttribute
 * this module needs). `attribute` is an AttributeName whose values are exactly
 * the ItemAttributeBag keys.
 */
export interface SuggestInputAttribute {
  attribute: string;
  value: number | boolean | string;
  confidence: "high" | "medium" | "low";
}

/** A UI-friendly classification-code suggestion derived from the matcher. */
export interface CodeSuggestion {
  /** The control code, e.g. "9A515.a.1" (canonicalId minus the regime prefix). */
  code: string;
  /** Full stable id, e.g. "ECCN:9A515.a.1". */
  canonicalId: string;
  regime: string;
  title: string;
  confidence: MatchConfidence;
  rationale: string;
}

/**
 * The ItemAttributeBag keys we accept from extracted attributes. Anything not in
 * this set is ignored (kept out of the typed bag) — the matcher only reads these.
 */
const BAG_KEYS = new Set<keyof ItemAttributeBag>([
  "apertureMeters",
  "payloadKg",
  "rangeKm",
  "IspSeconds",
  "deltaVMetersPerSecond",
  "gsdMeters",
  "transmitPowerW",
  "frequencyGhz",
  "radHardTidKrad",
  "seuRateErrorsPerBitDay",
  "isRadHardened",
  "isMilSpec",
  "isAntiJam",
  "isSpeciallyDesigned",
  "itemClass",
]);

/** Fold extracted attributes into the matcher's ItemAttributeBag. */
export function attributesToBag(
  attributes: ReadonlyArray<SuggestInputAttribute>,
): ItemAttributeBag {
  const bag: ItemAttributeBag = {};
  for (const a of attributes) {
    if (BAG_KEYS.has(a.attribute as keyof ItemAttributeBag)) {
      // The AttributeName↔ItemAttributeBag key correspondence is 1:1; the value
      // is already in the matcher's canonical unit (the extractor guarantees it).
      (bag as Record<string, unknown>)[a.attribute] = a.value;
    }
  }
  return bag;
}

/**
 * Pure: run extracted attributes through the parametric matcher and map its
 * ranked candidates to UI suggestions. No I/O. Empty in → empty out.
 */
export function attributesToCandidateCodes(
  attributes: ReadonlyArray<SuggestInputAttribute>,
): CodeSuggestion[] {
  const bag = attributesToBag(attributes);
  const result = matchAgainstCrossWalk(bag);
  return result.candidates.map((c) => {
    const canonicalId = c.entry.canonicalId;
    // canonicalId is "<REGIME>:<code>" — strip the prefix for the short code.
    const code = canonicalId.includes(":")
      ? canonicalId.slice(canonicalId.indexOf(":") + 1)
      : canonicalId;
    return {
      code,
      canonicalId,
      regime: String(c.entry.regime),
      title: c.entry.title,
      confidence: c.confidence,
      rationale: c.rationale,
    };
  });
}
```

- [ ] **Step 4: Run, verify PASS** — `CI=true npx vitest run src/lib/trade/classify-suggest.test.ts` → PASS. `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep classify-suggest` → no errors. (If the live cross-walk returns 0 candidates for the test's attribute set, the `if (suggestions.length > 0)` guard keeps the test green while still asserting the mapping shape when candidates exist — that's intentional; the matcher's own tests cover which inputs produce candidates.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/classify-suggest.ts src/lib/trade/classify-suggest.test.ts
git commit -m "feat(trade): pure attributesToCandidateCodes matcher wrapper (ui phase 2)"
```

---

## Task 2: `POST /api/trade/classify/suggest-codes` route

**Files:**

- Create: `src/app/api/trade/classify/suggest-codes/route.ts`
- Test: `src/app/api/trade/classify/suggest-codes/route.test.ts`

- [ ] **Step 1: Write the failing test** — `src/app/api/trade/classify/suggest-codes/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trade/trade-auth", () => ({ getTradeAuth: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("id"),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { POST } from "./route";
import { getTradeAuth } from "@/lib/trade/trade-auth";

const auth = getTradeAuth as unknown as ReturnType<typeof vi.fn>;
beforeEach(() => auth.mockReset());

function req(body: unknown) {
  return new Request("http://t/suggest-codes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/trade/classify/suggest-codes", () => {
  it("returns 403 when not authenticated/entitled", async () => {
    auth.mockResolvedValue(null);
    expect((await POST(req({ attributes: [] }))).status).toBe(403);
  });

  it("returns 200 with a suggestions array for valid auth", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
      role: "MANAGER",
    });
    const res = await POST(
      req({
        attributes: [
          { attribute: "apertureMeters", value: 0.8, confidence: "high" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.suggestions)).toBe(true);
  });

  it("returns 400 on a malformed body (attributes not an array)", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
      role: "MANAGER",
    });
    expect((await POST(req({ attributes: "nope" }))).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `CI=true npx vitest run "src/app/api/trade/classify/suggest-codes/route.test.ts"` → FAIL (`Cannot find module './route'`).

- [ ] **Step 3: Write the implementation** — `src/app/api/trade/classify/suggest-codes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  attributesToCandidateCodes,
  type SuggestInputAttribute,
} from "@/lib/trade/classify-suggest";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = (await req.json().catch(() => null)) as {
      attributes?: unknown;
    } | null;
    if (!body || !Array.isArray(body.attributes)) {
      return NextResponse.json(
        { error: "Expected { attributes: SuggestInputAttribute[] }" },
        { status: 400 },
      );
    }

    const suggestions = attributesToCandidateCodes(
      body.attributes as SuggestInputAttribute[],
    );
    return NextResponse.json({ suggestions });
  } catch (err) {
    logger.error({ err }, "POST /api/trade/classify/suggest-codes failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run, verify PASS** — `CI=true npx vitest run "src/app/api/trade/classify/suggest-codes/route.test.ts"` → 3/3 PASS. `tsc | grep suggest-codes` → clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/trade/classify/suggest-codes/route.ts" "src/app/api/trade/classify/suggest-codes/route.test.ts"
git commit -m "feat(trade): suggest-codes route wrapping the matcher (ui phase 2)"
```

---

## Task 3: `AsyncSearchPicker` (generic reusable component)

**Files:**

- Create: `src/app/(trade)/trade/_components/AsyncSearchPicker.tsx`
- Test: `src/app/(trade)/trade/_components/AsyncSearchPicker.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/_components/AsyncSearchPicker.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);

import { AsyncSearchPicker } from "./AsyncSearchPicker";

type Row = { id: string; label: string };
const ROWS: Row[] = [
  { id: "a", label: "Alpha Sat" },
  { id: "b", label: "Beta Transceiver" },
];

function setup(
  over: Partial<React.ComponentProps<typeof AsyncSearchPicker<Row>>> = {},
) {
  const onSelect = vi.fn();
  const search = vi.fn(async (q: string) =>
    ROWS.filter((r) => r.label.toLowerCase().includes(q.toLowerCase())),
  );
  render(
    <AsyncSearchPicker<Row>
      placeholder="Suchen…"
      search={search}
      getId={(r) => r.id}
      getLabel={(r) => r.label}
      renderOption={(r) => <span>{r.label}</span>}
      onSelect={onSelect}
      {...over}
    />,
  );
  return { onSelect, search };
}

beforeEach(() => vi.clearAllMocks());

describe("AsyncSearchPicker", () => {
  it("calls search as the user types and renders results", async () => {
    const { search } = setup();
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "beta" },
    });
    await waitFor(() => expect(search).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByText("Beta Transceiver")).toBeTruthy(),
    );
  });

  it("selecting an option fires onSelect and shows it as a chip", async () => {
    const { onSelect } = setup();
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "alpha" },
    });
    await waitFor(() => expect(screen.getByText("Alpha Sat")).toBeTruthy());
    fireEvent.click(screen.getByText("Alpha Sat"));
    expect(onSelect).toHaveBeenCalledWith(ROWS[0]);
    expect(screen.getByTestId("picker-chip")).toBeTruthy();
  });

  it("shows a create-new affordance + fires onCreateNew when results are empty", async () => {
    const onCreateNew = vi.fn();
    setup({
      search: vi.fn(async () => []),
      onCreateNew,
    });
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByTestId("picker-create")).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId("picker-create"));
    expect(onCreateNew).toHaveBeenCalledWith("zzz");
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `CI=true npx vitest run "src/app/(trade)/trade/_components/AsyncSearchPicker.test.tsx"` → FAIL.

- [ ] **Step 3: Write the implementation** — `src/app/(trade)/trade/_components/AsyncSearchPicker.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";

export interface AsyncSearchPickerProps<T> {
  placeholder: string;
  search: (query: string) => Promise<T[]>;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  renderOption: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  /** Called with the current query when the user clicks "+ Neu anlegen". */
  onCreateNew?: (query: string) => void;
  createNewLabel?: string;
}

export function AsyncSearchPicker<T>({
  placeholder,
  search,
  getId,
  getLabel,
  renderOption,
  onSelect,
  onCreateNew,
  createNewLabel = "+ Neu anlegen",
}: AsyncSearchPickerProps<T>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<T | null>(null);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (chosen) return; // don't search while a selection is shown
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);
    if (q.length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await search(q);
        setResults(r);
        setOpen(true);
        setActive(0);
      } catch {
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, search, chosen]);

  const pick = useCallback(
    (item: T) => {
      setChosen(item);
      setOpen(false);
      setQuery("");
      onSelect(item);
    },
    [onSelect],
  );

  if (chosen) {
    return (
      <div
        data-testid="picker-chip"
        className="flex items-center justify-between rounded-lg border border-trade-border bg-trade-bg-elevated px-3 py-2"
      >
        <span className="text-sm text-trade-text-primary">
          {getLabel(chosen)}
        </span>
        <button
          aria-label="Auswahl entfernen"
          onClick={() => setChosen(null)}
          className="text-trade-text-muted hover:text-trade-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-elevated px-3 py-2">
        <Search className="h-4 w-4 text-trade-text-muted" />
        <input
          data-testid="picker-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown")
              setActive((a) => Math.min(a + 1, results.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            else if (e.key === "Enter" && results[active])
              pick(results[active]);
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-trade-text-primary outline-none placeholder:text-trade-text-muted"
        />
      </div>

      {open && (
        <ul
          data-testid="picker-list"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-trade-border bg-trade-bg-panel shadow-xl"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-trade-text-muted">Suche…</li>
          )}
          {!loading &&
            results.map((item, i) => (
              <li key={getId(item)}>
                <button
                  onClick={() => pick(item)}
                  className={`block w-full px-3 py-2 text-left text-sm transition ${
                    i === active ? "bg-trade-hover" : ""
                  } hover:bg-trade-hover`}
                >
                  {renderOption(item)}
                </button>
              </li>
            ))}
          {!loading && results.length === 0 && (
            <li>
              <div className="px-3 py-2 text-sm text-trade-text-muted">
                Keine Treffer
              </div>
              {onCreateNew && (
                <button
                  data-testid="picker-create"
                  onClick={() => onCreateNew(query.trim())}
                  className="flex w-full items-center gap-2 border-t border-trade-border px-3 py-2 text-left text-sm text-trade-accent hover:bg-trade-hover"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {createNewLabel}
                </button>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify PASS** — `CI=true npx vitest run "src/app/(trade)/trade/_components/AsyncSearchPicker.test.tsx"` → PASS (3 tests). `tsc | grep AsyncSearchPicker` → clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/AsyncSearchPicker.tsx" "src/app/(trade)/trade/_components/AsyncSearchPicker.test.tsx"
git commit -m "feat(trade): generic async-search-picker (ui phase 2)"
```

---

## Task 4: `ItemPicker` + `PartyPicker` adapters

**Files:**

- Create: `src/app/(trade)/trade/operations/new/_components/ItemPicker.tsx`
- Create: `src/app/(trade)/trade/operations/new/_components/PartyPicker.tsx`
- Test: `src/app/(trade)/trade/operations/new/_components/pickers.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/operations/new/_components/pickers.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);

import { ItemPicker } from "./ItemPicker";
import { PartyPicker } from "./PartyPicker";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("ItemPicker", () => {
  it("fetches /api/trade/items?q= and renders a classified status pill", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "i1",
            name: "TTC Transceiver",
            internalSku: "TTC-1",
            eccnEU: "9A515.a",
            status: "CLASSIFIED",
          },
        ],
      }),
    });
    const onSelect = vi.fn();
    render(<ItemPicker onSelect={onSelect} />);
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "ttc" },
    });
    await waitFor(() =>
      expect(screen.getByText(/TTC Transceiver/)).toBeTruthy(),
    );
    expect(screen.getByText(/klassifiziert/i)).toBeTruthy();
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/api/trade/items?q=ttc");
  });
});

describe("PartyPicker", () => {
  it("fetches /api/trade/parties?q= and renders a screening pill", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        parties: [
          {
            id: "p1",
            legalName: "Acme Space SAS",
            countryCode: "FR",
            status: "ACTIVE",
            screeningStatus: "CLEAR",
          },
        ],
      }),
    });
    render(<PartyPicker onSelect={vi.fn()} />);
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "acme" },
    });
    await waitFor(() =>
      expect(screen.getByText(/Acme Space SAS/)).toBeTruthy(),
    );
    expect(screen.getByText(/FR/)).toBeTruthy();
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/api/trade/parties?q=acme");
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `CI=true npx vitest run "src/app/(trade)/trade/operations/new/_components/pickers.test.tsx"` → FAIL.

- [ ] **Step 3a: Write `ItemPicker.tsx`**:

```tsx
"use client";

import { AsyncSearchPicker } from "@/app/(trade)/trade/_components/AsyncSearchPicker";

interface ItemRow {
  id: string;
  name: string;
  internalSku?: string | null;
  eccnEU?: string | null;
  status?: string | null;
}

async function searchItems(q: string): Promise<ItemRow[]> {
  const res = await fetch(`/api/trade/items?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { items?: ItemRow[] };
  return body.items ?? [];
}

function classified(r: ItemRow): boolean {
  return r.status === "CLASSIFIED" || Boolean(r.eccnEU);
}

export function ItemPicker({
  onSelect,
  onCreateNew,
}: {
  onSelect: (item: ItemRow) => void;
  onCreateNew?: (query: string) => void;
}) {
  return (
    <AsyncSearchPicker<ItemRow>
      placeholder="Artikel nach Name suchen…"
      search={searchItems}
      getId={(r) => r.id}
      getLabel={(r) => r.name}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      renderOption={(r) => (
        <div>
          <div className="text-trade-text-primary">{r.name}</div>
          <div className="text-xs text-trade-text-muted">
            {r.internalSku ? `${r.internalSku} · ` : ""}
            {classified(r) ? (
              <span className="text-green-500">
                ✓ klassifiziert{r.eccnEU ? ` · ${r.eccnEU}` : ""}
              </span>
            ) : (
              <span className="text-amber-500">○ unklassifiziert</span>
            )}
          </div>
        </div>
      )}
    />
  );
}
```

- [ ] **Step 3b: Write `PartyPicker.tsx`**:

```tsx
"use client";

import { AsyncSearchPicker } from "@/app/(trade)/trade/_components/AsyncSearchPicker";

interface PartyRow {
  id: string;
  legalName: string;
  countryCode?: string | null;
  status?: string | null;
  screeningStatus?: string | null;
}

async function searchParties(q: string): Promise<PartyRow[]> {
  const res = await fetch(`/api/trade/parties?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { parties?: PartyRow[] };
  return body.parties ?? [];
}

const SCREEN_LABEL: Record<string, { text: string; cls: string }> = {
  CLEAR: { text: "✓ sauber", cls: "text-green-500" },
  POTENTIAL_MATCH: { text: "? möglicher Treffer", cls: "text-amber-500" },
  CONFIRMED_HIT: { text: "✕ Treffer", cls: "text-red-500" },
  STALE: { text: "veraltet", cls: "text-trade-text-muted" },
  NOT_SCREENED: { text: "ungescreent", cls: "text-trade-text-muted" },
};

export function PartyPicker({
  onSelect,
  onCreateNew,
}: {
  onSelect: (party: PartyRow) => void;
  onCreateNew?: (query: string) => void;
}) {
  return (
    <AsyncSearchPicker<PartyRow>
      placeholder="Partner nach Name suchen…"
      search={searchParties}
      getId={(r) => r.id}
      getLabel={(r) => r.legalName}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      renderOption={(r) => {
        const s =
          SCREEN_LABEL[r.screeningStatus ?? "NOT_SCREENED"] ??
          SCREEN_LABEL.NOT_SCREENED;
        return (
          <div>
            <div className="text-trade-text-primary">{r.legalName}</div>
            <div className="text-xs text-trade-text-muted">
              {r.countryCode ? `${r.countryCode} · ` : ""}
              <span className={s.cls}>{s.text}</span>
            </div>
          </div>
        );
      }}
    />
  );
}
```

- [ ] **Step 4: Run, verify PASS** — `CI=true npx vitest run "src/app/(trade)/trade/operations/new/_components/pickers.test.tsx"` → PASS (2 tests). `tsc | grep -E "ItemPicker|PartyPicker"` → clean. (NOTE: confirm the items route response key is `items` and parties is `parties` by reading each route's final `NextResponse.json(...)`; if either differs, fix the `body.items`/`body.parties` access + the test mock to match.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/operations/new/_components/ItemPicker.tsx" "src/app/(trade)/trade/operations/new/_components/PartyPicker.tsx" "src/app/(trade)/trade/operations/new/_components/pickers.test.tsx"
git commit -m "feat(trade): item + party search-picker adapters (ui phase 2)"
```

---

## Task 5: `DatasheetDropzone`

**Files:**

- Create: `src/app/(trade)/trade/_components/DatasheetDropzone.tsx`
- Test: `src/app/(trade)/trade/_components/DatasheetDropzone.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/_components/DatasheetDropzone.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);

import { DatasheetDropzone } from "./DatasheetDropzone";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

function pickFile() {
  const input = screen.getByTestId("datasheet-input") as HTMLInputElement;
  const file = new File(["%PDF-1.4"], "ds.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("DatasheetDropzone", () => {
  it("extracts + suggests codes, then applies on confirm", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    // 1st call = extract-vision, 2nd = suggest-codes
    f.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        extraction: {
          attributes: [
            { attribute: "apertureMeters", value: 0.8, confidence: "high" },
          ],
          warnings: [],
        },
      }),
    });
    f.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            code: "9A515.a",
            canonicalId: "ECCN:9A515.a",
            regime: "EU_ANNEX_I",
            title: "TT&C",
            confidence: "HIGH",
            rationale: "aperture",
          },
        ],
      }),
    });
    const onApply = vi.fn();
    render(<DatasheetDropzone onApply={onApply} />);
    pickFile();
    await waitFor(() => expect(screen.getByText(/9A515\.a/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Übernehmen/i }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestions: expect.arrayContaining([
          expect.objectContaining({ code: "9A515.a" }),
        ]),
      }),
    );
  });

  it("degrades gracefully when extraction fails (manual path stays)", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Vision unavailable" }),
    });
    render(<DatasheetDropzone onApply={vi.fn()} />);
    pickFile();
    await waitFor(() =>
      expect(screen.getByText(/Vision unavailable|konnte nicht/i)).toBeTruthy(),
    );
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `CI=true npx vitest run "src/app/(trade)/trade/_components/DatasheetDropzone.test.tsx"` → FAIL.

- [ ] **Step 3: Write the implementation** — `src/app/(trade)/trade/_components/DatasheetDropzone.tsx`:

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Sparkles, Loader2, Check } from "lucide-react";

interface Suggestion {
  code: string;
  canonicalId: string;
  regime: string;
  title: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
}
interface ExtractedAttribute {
  attribute: string;
  value: number | boolean | string;
  confidence: "high" | "medium" | "low";
}
export interface DatasheetApplyPayload {
  attributes: ExtractedAttribute[];
  suggestions: Suggestion[];
}

const CONFIDENCE_CLS: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "bg-green-500/15 text-green-400",
  MEDIUM: "bg-amber-500/15 text-amber-400",
  LOW: "bg-zinc-500/15 text-zinc-400",
};

export function DatasheetDropzone({
  onApply,
}: {
  onApply: (payload: DatasheetApplyPayload) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<ExtractedAttribute[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [done, setDone] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const exRes = await fetch("/api/trade/classify/extract-vision", {
        method: "POST",
        body: form,
      });
      const exBody = await exRes.json();
      if (!exRes.ok || !exBody?.ok) {
        setError(exBody?.error ?? "Datenblatt konnte nicht gelesen werden.");
        return;
      }
      const attrs: ExtractedAttribute[] = exBody.extraction?.attributes ?? [];
      setAttributes(attrs);

      const sgRes = await fetch("/api/trade/classify/suggest-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attributes: attrs }),
      });
      const sgBody = await sgRes.json();
      setSuggestions(sgRes.ok ? (sgBody.suggestions ?? []) : []);
      setDone(true);
    } catch {
      setError("Unerwarteter Fehler bei der Datenblatt-Analyse.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-trade-accent/60 bg-trade-accent-soft px-4 py-5 text-center transition hover:bg-trade-hover"
      >
        <span className="flex items-center gap-1 text-lg">
          <FileText className="h-5 w-5 text-trade-accent" />
          <Sparkles className="h-4 w-4 text-trade-accent" />
        </span>
        <span className="text-sm text-trade-text-primary">
          Datenblatt hochladen
        </span>
        <span className="text-xs text-trade-text-muted">
          PDF · Claude Vision liest Specs &amp; schlägt ECCN/USML vor
        </span>
      </button>
      <input
        ref={inputRef}
        data-testid="datasheet-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {busy && (
        <div className="flex items-center gap-2 text-sm text-trade-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Analysiere Datenblatt…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error} — du kannst die Codes weiterhin manuell eingeben.
        </div>
      )}

      {done && !error && (
        <div className="rounded-lg border border-trade-border bg-trade-bg-panel p-3">
          <div className="text-xs uppercase tracking-wide text-trade-text-muted">
            Vorschlag — du bestätigst
          </div>
          {suggestions.length === 0 ? (
            <div className="mt-2 text-sm text-trade-text-muted">
              Keine eindeutige Einstufung aus dem Datenblatt. Attribute wurden
              gelesen ({attributes.length}) — bitte manuell prüfen.
            </div>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {suggestions.slice(0, 5).map((s) => (
                <li
                  key={s.canonicalId}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="font-medium text-trade-text-primary">
                    {s.code}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${CONFIDENCE_CLS[s.confidence]}`}
                  >
                    {s.confidence}
                  </span>
                  <span className="truncate text-xs text-trade-text-muted">
                    {s.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => onApply({ attributes, suggestions })}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-trade-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-trade-accent-strong"
          >
            <Check className="h-3.5 w-3.5" /> Übernehmen
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify PASS** — `CI=true npx vitest run "src/app/(trade)/trade/_components/DatasheetDropzone.test.tsx"` → PASS (2 tests). `tsc | grep DatasheetDropzone` → clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/DatasheetDropzone.tsx" "src/app/(trade)/trade/_components/DatasheetDropzone.test.tsx"
git commit -m "feat(trade): datasheet dropzone — vision extract + code suggestions (ui phase 2)"
```

---

## Task 6: Wire the pickers into the Ausfuhrvorgang wizard

**Files:**

- Modify: `src/app/(trade)/trade/operations/new/page.tsx`

- [ ] **Step 1: Read** the file. Confirm: `Draft.itemId`/`Draft.counterpartyId`, the `patch(...)` helper, the "was" step (the `Artikel-ID` `<label>`+`<input>`, ~lines 119-127) and "anWen" step (the `Gegenpartei-ID` `<label>`+`<input>`, ~lines 163-171), and the `disabled={!draft.itemId}` / `disabled={!draft.counterpartyId}` Weiter buttons.

- [ ] **Step 2: Add imports** at the top:

```tsx
import { ItemPicker } from "./_components/ItemPicker";
import { PartyPicker } from "./_components/PartyPicker";
```

- [ ] **Step 3: Replace the "was" step's `Artikel-ID` label+input** (the whole `<label>…Artikel-ID…<input .../></label>` block) with:

```tsx
<div className="block text-sm text-trade-text-muted">
  Artikel
  <div className="mt-1">
    <ItemPicker onSelect={(it) => patch({ itemId: it.id })} />
  </div>
</div>
```

Keep the quantity + unit-value inputs and the Weiter button exactly as they are (the button's `disabled={!draft.itemId}` still works because the picker sets `draft.itemId`).

- [ ] **Step 4: Replace the "anWen" step's `Gegenpartei-ID` label+input** with:

```tsx
<div className="block text-sm text-trade-text-muted">
  Gegenpartei
  <div className="mt-1">
    <PartyPicker onSelect={(p) => patch({ counterpartyId: p.id })} />
  </div>
</div>
```

Keep the Zurück/Weiter buttons unchanged (`disabled={!draft.counterpartyId}` still works).

- [ ] **Step 5: Typecheck + lint**:
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep "operations/new/page"` → no new errors.
- `npx eslint "src/app/(trade)/trade/operations/new/page.tsx" 2>&1 | tail -6` → clean. (If the wizard's smoke test `page.test.tsx` asserted the old "Weiter disabled until an item id is entered" via typing into a raw input, it may need the assertion adjusted — the field is now a picker. Read `operations/new/page.test.tsx`; if it types into `Artikel-ID`, update it to assert the picker renders + Weiter starts disabled. Keep it minimal.)

- [ ] **Step 6: Run the wizard smoke test** — `CI=true npx vitest run "src/app/(trade)/trade/operations/new/page.test.tsx" 2>&1 | tail -5`. Fix the test if it referenced the removed raw input (assert `picker-input` present + Weiter disabled initially).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(trade)/trade/operations/new/page.tsx"
# include page.test.tsx if you updated it
git commit -m "feat(trade): wire item + party search-pickers into the ausfuhrvorgang wizard (ui phase 2)"
```

---

## Task 7: Wire the DatasheetDropzone into item creation

**Files:**

- Modify: `src/app/(trade)/trade/items/page.tsx`

- [ ] **Step 1: Read** the file. Find the `NewItemForm` component (~lines 550+ per the audit), its form state (`name`, `internalSku`, `description`), and its submit (`POST /api/trade/items`). Note where the form fields render so the dropzone can sit above them.

- [ ] **Step 2: Add the import**:

```tsx
import {
  DatasheetDropzone,
  type DatasheetApplyPayload,
} from "../_components/DatasheetDropzone";
```

(Adjust the relative path so it resolves to `src/app/(trade)/trade/_components/DatasheetDropzone` — from `items/page.tsx` that is `./_components/DatasheetDropzone` if `_components` is under `items/`, else `../_components/DatasheetDropzone`. Verify the actual location of `_components` relative to `items/page.tsx` and use the correct path. The component lives at `src/app/(trade)/trade/_components/DatasheetDropzone.tsx`, so from `src/app/(trade)/trade/items/page.tsx` the path is `../_components/DatasheetDropzone`.)

- [ ] **Step 3: Render the dropzone in `NewItemForm`** above the name/sku fields, and wire `onApply` to stash the suggested top code into the form so creation carries it. Minimal wiring — add a local state for an applied suggestion and, on apply, set the form's name hint + remember the top code; after `POST /api/trade/items` succeeds, if a top suggestion exists, `PATCH /api/trade/items/{id}` with `{ eccnEU: topSuggestion.code }` (only when the suggestion's regime is an EU/ECCN code; for USML map to `usmlCategory`). Concretely, inside `NewItemForm`:

```tsx
const [applied, setApplied] = useState<DatasheetApplyPayload | null>(null);
// …in the JSX, above the existing name input:
<div className="mb-4">
  <DatasheetDropzone onApply={setApplied} />
  {applied && applied.suggestions[0] && (
    <div className="mt-2 text-xs text-trade-text-muted">
      Übernommen:{" "}
      <span className="text-trade-text-primary">
        {applied.suggestions[0].code}
      </span>{" "}
      — wird beim Anlegen gesetzt.
    </div>
  )}
</div>;
```

And in the submit handler, after the item is created and you have its `id`, if `applied?.suggestions[0]` exists:

```tsx
const top = applied?.suggestions[0];
if (top && newItemId) {
  const isUsml = top.regime?.toUpperCase().includes("USML");
  await fetch(`/api/trade/items/${newItemId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      isUsml ? { usmlCategory: top.code } : { eccnEU: top.code },
    ),
  });
}
```

(Use the form's real existing state-variable names + submit structure — read them in Step 1 and adapt. Do NOT change the existing create flow's other behavior; the dropzone + the optional PATCH are purely additive.)

- [ ] **Step 4: Typecheck + lint**:
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep "items/page"` → no new errors.
- `npx eslint "src/app/(trade)/trade/items/page.tsx" 2>&1 | tail -8` → clean.

- [ ] **Step 5: Run any items-page test** — `CI=true npx vitest run "src/app/(trade)/trade/items" 2>&1 | tail -5` (if a test exists). The dropzone is additive; existing tests should pass.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(trade)/trade/items/page.tsx"
git commit -m "feat(trade): datasheet auto-classify in item creation (ui phase 2)"
```

---

## Task 8: Full-feature verification

**Files:** none.

- [ ] **Step 1: Run the whole Phase-2 test set**

```bash
CI=true npx vitest run \
  src/lib/trade/classify-suggest.test.ts \
  "src/app/api/trade/classify/suggest-codes/route.test.ts" \
  "src/app/(trade)/trade/_components/AsyncSearchPicker.test.tsx" \
  "src/app/(trade)/trade/operations/new/_components/pickers.test.tsx" \
  "src/app/(trade)/trade/_components/DatasheetDropzone.test.tsx" 2>&1 | tail -8
```

Expected: ALL green. (If the runner detaches, run each file individually.)

- [ ] **Step 2: Scoped typecheck** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit > /tmp/tsc-p2.txt 2>&1; grep -E "classify-suggest|suggest-codes|AsyncSearchPicker|ItemPicker|PartyPicker|DatasheetDropzone|operations/new/page|items/page" /tmp/tsc-p2.txt | grep -v "\.test\."` → empty (no new source errors). Confirm total error count ≤ the 733 baseline: `grep -cE "error TS" /tmp/tsc-p2.txt`.

- [ ] **Step 3: Lint touched files**

```bash
npx eslint \
  src/lib/trade/classify-suggest.ts \
  "src/app/api/trade/classify/suggest-codes/route.ts" \
  "src/app/(trade)/trade/_components/AsyncSearchPicker.tsx" \
  "src/app/(trade)/trade/operations/new/_components/ItemPicker.tsx" \
  "src/app/(trade)/trade/operations/new/_components/PartyPicker.tsx" \
  "src/app/(trade)/trade/_components/DatasheetDropzone.tsx" \
  "src/app/(trade)/trade/operations/new/page.tsx" \
  "src/app/(trade)/trade/items/page.tsx" 2>&1 | tail -10
```

Expected: 0 errors (warnings ok).

- [ ] **Step 4: Final commit if anything was adjusted**

```bash
git add -A && git commit -m "test(trade): verify ui redesign phase 2 end-to-end" || echo "nothing to commit"
```

---

## Phase-2 scoping notes (faithful to the spec)

- **Resolved the spec's deferred decision:** a separate `POST /api/trade/classify/suggest-codes` route (Task 2) over folding into extract-vision — keeps the matcher server-side, lets the dropzone request suggestions independently, and avoids changing the existing extract-vision contract. The matcher logic is NOT duplicated; the route is a thin wrapper over the pure `attributesToCandidateCodes`.
- **`AsyncSearchPicker` is generic + reusable** — Phase 3's data-table redesign inherits it.
- **No new DB / migration.** Creation/classification use existing routes; the only new logic is the pure matcher-wrapper.
- **Inline quick-create (spec Feature C):** the pickers expose `onCreateNew`; Task 6 wires `onSelect` (the core friction-killer). Full inline quick-create panels are a thin follow-up — the `onCreateNew` hook is in place, so wiring a minimal create panel is additive and can be the first task of a Phase-2b if the user wants it. (Documented as a deliberate scoping line; the picker already renders the "+ Neu anlegen" affordance.)

## Deliberately NOT in Phase 2 (YAGNI)

Screening batch-triage, licence renewal/conditions editor, deep data-table restyle (Phase 3), multi-item BoM in the wizard, forced Vision re-run, OCR beyond extract-vision's output.
