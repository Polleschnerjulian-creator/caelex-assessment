# Trade UI Redesign — Phase 3A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one reusable, modern, scannable `TradeTable<T>` primitive (with its sort/selection logic in a pure, node-tested module) and migrate the three bespoke Trade list pages (Parties, Items, Operations) onto it.

**Architecture:** A pure `table-state.ts` (sort + selection set-ops, node-tested) + a generic `TradeTable<T>` component that owns sort inline and consumes the **existing global** `useTradeDensity` for density (row padding is already handled by `globals.css`). Each page keeps owning its data fetch, status filter, search value, `selectedIds`, and CSV export; it passes columns + slots to `TradeTable`.

**Tech Stack:** Next.js 15 / React / TypeScript, Tailwind `--trade-*` tokens, lucide-react, Vitest (node for the pure module; jsdom best-effort for the component — jsdom hangs on this machine, so component correctness is gated by tsc + eslint + source review, matching Phase 1 & 2).

**Branch:** `fix/trade-to-92`. Commit locally per task; deploy the whole batch at the end (Task 6) per the batched-deploy policy.

**Verified facts (trust these — already read from the codebase):**

- `BulkActionsBar` (`./BulkActionsBar`) props: `{ count: number; onClear: () => void; actions: React.ReactNode; noun?: string }`.
- `ListSkeleton` is exported from `./Skeletons` (NOT `ListSkeleton.tsx`): `ListSkeleton({ rows?: number; label?: string })`.
- `useTradeDensity` (`./useTradeDensity`) returns `{ density: "comfortable" | "compact"; setDensity(v) }`, persists to localStorage + sets `data-trade-density` on `documentElement`. `globals.css` (4961-4972) compacts `py-3`/`py-4` inside `.trade-themed` when compact — so rows use `py-3` and respond automatically.
- `ScreeningBadge` exists (parties) and renders the screening pill.
- Row types: `PartyRow { id; legalName; countryCode; status: "ACTIVE"|"ARCHIVED"|"BLOCKED"; screeningStatus: 5 values }`, `TradeItemSummary { id; name; internalSku|null; eccnEU; eccnUS; usmlCategory; mtcrCategory; status: TradeItemStatus }`, `OperationRow { id; reference; operationType; status: 6 values; shipFromCountry; shipToCountry }`.
- All three pages: `import { buildCsv, downloadCsv } from "@/lib/trade/csv-export"`, a page-owned `selectedIds: Set<string>`, a status filter `Set`, a search string, and a bespoke Row component + manual select-all header that this migration replaces.

---

## Task 1: Pure `table-state.ts` (sort + selection logic)

**Files:**

- Create: `src/lib/trade/table-state.ts`
- Test: `src/lib/trade/table-state.test.ts`

- [ ] **Step 1: Write the failing test** at `src/lib/trade/table-state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  nextSort,
  sortRows,
  toggleId,
  selectAllState,
  toggleSelectAll,
} from "./table-state";

describe("nextSort", () => {
  it("new key → asc", () =>
    expect(nextSort({ key: null, dir: "asc" }, "name")).toEqual({
      key: "name",
      dir: "asc",
    }));
  it("same key asc → desc", () =>
    expect(nextSort({ key: "name", dir: "asc" }, "name")).toEqual({
      key: "name",
      dir: "desc",
    }));
  it("same key desc → cleared", () =>
    expect(nextSort({ key: "name", dir: "desc" }, "name")).toEqual({
      key: null,
      dir: "asc",
    }));
  it("switch key → asc", () =>
    expect(nextSort({ key: "name", dir: "desc" }, "sku")).toEqual({
      key: "sku",
      dir: "asc",
    }));
});

describe("sortRows", () => {
  const rows = [{ n: "b" }, { n: "a" }, { n: "c" }];
  it("asc", () =>
    expect(sortRows(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual([
      "a",
      "b",
      "c",
    ]));
  it("desc", () =>
    expect(sortRows(rows, (r) => r.n, "desc").map((r) => r.n)).toEqual([
      "c",
      "b",
      "a",
    ]));
  it("does not mutate input", () => {
    const before = JSON.stringify(rows);
    sortRows(rows, (r) => r.n, "asc");
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe("toggleId", () => {
  it("adds when absent", () =>
    expect([...toggleId(new Set<string>(), "x")]).toEqual(["x"]));
  it("removes when present", () =>
    expect([...toggleId(new Set(["x"]), "x")]).toEqual([]));
  it("returns a new set", () => {
    const s = new Set(["a"]);
    expect(toggleId(s, "b")).not.toBe(s);
  });
});

describe("selectAllState", () => {
  it("none when empty selection", () =>
    expect(selectAllState(new Set(), ["a", "b"])).toBe("none"));
  it("all when every visible selected", () =>
    expect(selectAllState(new Set(["a", "b"]), ["a", "b"])).toBe("all"));
  it("some when partial", () =>
    expect(selectAllState(new Set(["a"]), ["a", "b"])).toBe("some"));
  it("none when no visible rows", () =>
    expect(selectAllState(new Set(["a"]), [])).toBe("none"));
});

describe("toggleSelectAll", () => {
  it("selects all visible when partial", () =>
    expect([...toggleSelectAll(new Set(["a"]), ["a", "b"])].sort()).toEqual([
      "a",
      "b",
    ]));
  it("deselects visible when all selected", () =>
    expect([...toggleSelectAll(new Set(["a", "b", "z"]), ["a", "b"])]).toEqual([
      "z",
    ]));
  it("preserves out-of-view selections", () =>
    expect(toggleSelectAll(new Set(["a", "b", "z"]), ["a", "b"]).has("z")).toBe(
      true,
    ));
});
```

- [ ] **Step 2: Run, verify it FAILS**

Run: `CI=true npx vitest run src/lib/trade/table-state.test.ts`
Expected: FAIL — `Failed to resolve import "./table-state"`.

- [ ] **Step 3: Write the implementation** at `src/lib/trade/table-state.ts`:

```ts
/**
 * Pure state helpers for TradeTable — sort cycling, stable sorting, and
 * selection set-operations. No React, no DOM: fully unit-testable in node.
 * Density is intentionally NOT here (it is the global `useTradeDensity`
 * preference + globals.css).
 */

export type SortDir = "asc" | "desc";

export interface SortState {
  key: string | null;
  dir: SortDir;
}

/** Header click cycle: new key → asc; same asc → desc; same desc → cleared. */
export function nextSort(current: SortState, key: string): SortState {
  if (current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return { key: null, dir: "asc" };
}

/** Stable sort of a COPY of `rows`; never mutates the input array. */
export function sortRows<T>(
  rows: T[],
  sortBy: (r: T) => string | number,
  dir: SortDir,
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const va = sortBy(a);
    const vb = sortBy(b);
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}

/** Immutable add/remove of one id. */
export function toggleId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export type SelectAllState = "none" | "some" | "all";

/** Tri-state for the header checkbox, scoped to the currently-visible ids. */
export function selectAllState(
  selectedIds: Set<string>,
  visibleIds: string[],
): SelectAllState {
  if (visibleIds.length === 0) return "none";
  let present = 0;
  for (const id of visibleIds) if (selectedIds.has(id)) present++;
  if (present === 0) return "none";
  if (present === visibleIds.length) return "all";
  return "some";
}

/**
 * If every visible id is already selected → deselect all visible; otherwise
 * select all visible. Selections OUTSIDE the visible set are preserved.
 */
export function toggleSelectAll(
  selectedIds: Set<string>,
  visibleIds: string[],
): Set<string> {
  const next = new Set(selectedIds);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
  if (allSelected) {
    for (const id of visibleIds) next.delete(id);
  } else {
    for (const id of visibleIds) next.add(id);
  }
  return next;
}
```

- [ ] **Step 4: Run, verify it PASSES**

Run: `CI=true npx vitest run src/lib/trade/table-state.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/table-state.ts src/lib/trade/table-state.test.ts
git commit -m "feat(trade): pure table-state helpers — sort + selection (ui phase 3a)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `TradeTable<T>` component

**Files:**

- Create: `src/app/(trade)/trade/_components/TradeTable.tsx`
- Test: `src/app/(trade)/trade/_components/TradeTable.test.tsx`

- [ ] **Step 1: Write a best-effort render test** at `src/app/(trade)/trade/_components/TradeTable.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = () => <span data-testid={`icon-${String(n)}`} />;
          I.displayName = String(n);
          return I;
        },
      },
    ),
);
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { TradeTable, type TradeColumn } from "./TradeTable";

interface Row {
  id: string;
  name: string;
  n: number;
}
const rows: Row[] = [
  { id: "1", name: "Beta", n: 2 },
  { id: "2", name: "Alpha", n: 1 },
];
const columns: TradeColumn<Row>[] = [
  { key: "name", header: "Name", sortBy: (r) => r.name, render: (r) => r.name },
  { key: "n", header: "N", align: "right", render: (r) => String(r.n) },
];

describe("TradeTable", () => {
  it("renders rows and headers", () => {
    render(<TradeTable rows={rows} columns={columns} getRowId={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
  });

  it("sorts ascending when a sortable header is clicked", () => {
    render(<TradeTable rows={rows} columns={columns} getRowId={(r) => r.id} />);
    fireEvent.click(screen.getByRole("button", { name: /Name/i }));
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    // After asc sort, "Alpha" row comes before "Beta" row
    expect(cells.indexOf("Alpha")).toBeLessThan(cells.indexOf("Beta"));
  });

  it("renders the empty state when there are no rows", () => {
    render(
      <TradeTable
        rows={[]}
        columns={columns}
        getRowId={(r) => r.id}
        emptyState={<div>Nothing here</div>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, verify it FAILS**

Run: `CI=true npx vitest run "src/app/(trade)/trade/_components/TradeTable.test.tsx"`
Expected: FAIL — import unresolved. NOTE: jsdom component tests frequently HANG on this machine (known infra issue). If it hangs, confirm RED only if quick; for GREEN later, rely on `tsc` + source trace. NEVER fabricate a pass count.

- [ ] **Step 3: Write the implementation** at `src/app/(trade)/trade/_components/TradeTable.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Rows3,
  Rows2,
} from "lucide-react";
import { BulkActionsBar } from "./BulkActionsBar";
import { ListSkeleton } from "./Skeletons";
import { useTradeDensity } from "./useTradeDensity";
import {
  nextSort,
  sortRows,
  toggleId,
  selectAllState,
  toggleSelectAll,
  type SortState,
} from "@/lib/trade/table-state";

export interface TradeColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Present ⇒ the header is click-sortable on this accessor. */
  sortBy?: (row: T) => string | number;
  align?: "left" | "right";
  headerClassName?: string;
}

export interface TradeTableProps<T> {
  rows: T[];
  columns: TradeColumn<T>[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string;

  // selection (page-owned, optional)
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  bulkActions?: ReactNode;
  bulkNoun?: string;

  // toolbar slots
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  filters?: ReactNode;
  resultCount?: number;

  // states
  loading?: boolean;
  emptyState?: ReactNode;
  initialSort?: SortState;
}

export function TradeTable<T>({
  rows,
  columns,
  getRowId,
  rowHref,
  selectable = false,
  selectedIds,
  onSelectionChange,
  bulkActions,
  bulkNoun = "item",
  search,
  filters,
  resultCount,
  loading = false,
  emptyState,
  initialSort,
}: TradeTableProps<T>) {
  const [sort, setSort] = useState<SortState>(
    initialSort ?? { key: null, dir: "asc" },
  );
  const { density, setDensity } = useTradeDensity();

  const activeCol = columns.find((c) => c.key === sort.key && c.sortBy);
  const displayRows =
    activeCol && activeCol.sortBy
      ? sortRows(rows, activeCol.sortBy, sort.dir)
      : rows;

  const visibleIds = displayRows.map(getRowId);
  const selState =
    selectable && selectedIds
      ? selectAllState(selectedIds, visibleIds)
      : "none";

  const toggleAll = () => {
    if (selectedIds && onSelectionChange)
      onSelectionChange(toggleSelectAll(selectedIds, visibleIds));
  };
  const toggleRow = (id: string) => {
    if (selectedIds && onSelectionChange)
      onSelectionChange(toggleId(selectedIds, id));
  };

  return (
    <div className="trade-themed">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {search && (
          <input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Search…"}
            className="w-56 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-1.5 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted outline-none focus:border-trade-accent"
          />
        )}
        {filters && (
          <div className="flex flex-wrap items-center gap-1.5">{filters}</div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {typeof resultCount === "number" && (
            <span className="text-[12px] text-trade-text-muted">
              {resultCount} results
            </span>
          )}
          <div
            className="inline-flex rounded-md border border-trade-border-subtle bg-trade-bg-panel p-0.5"
            role="group"
            aria-label="Row density"
          >
            <button
              type="button"
              aria-label="Comfortable rows"
              aria-pressed={density === "comfortable"}
              onClick={() => setDensity("comfortable")}
              className={`rounded p-1 transition ${density === "comfortable" ? "bg-trade-accent text-white" : "text-trade-text-muted hover:text-trade-text-primary"}`}
            >
              <Rows3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Compact rows"
              aria-pressed={density === "compact"}
              onClick={() => setDensity("compact")}
              className={`rounded p-1 transition ${density === "compact" ? "bg-trade-accent text-white" : "text-trade-text-muted hover:text-trade-text-primary"}`}
            >
              <Rows2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <ListSkeleton rows={6} />
      ) : displayRows.length === 0 ? (
        <div>{emptyState}</div>
      ) : (
        <div className="rounded-lg border border-trade-border-subtle">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-trade-bg-panel">
              <tr className="border-b border-trade-border-subtle text-[11px] uppercase tracking-wide text-trade-text-muted">
                {selectable && (
                  <th className="w-10 px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={selState === "all"}
                      ref={(el) => {
                        if (el) el.indeterminate = selState === "some";
                      }}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const isActive = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      className={`px-3 py-2 font-medium ${col.align === "right" ? "text-right" : "text-left"} ${col.headerClassName ?? ""}`}
                    >
                      {col.sortBy ? (
                        <button
                          type="button"
                          onClick={() => setSort((s) => nextSort(s, col.key))}
                          className="inline-flex items-center gap-1 hover:text-trade-text-primary"
                        >
                          {col.header}
                          {isActive ? (
                            sort.dir === "asc" ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                const id = getRowId(row);
                const selected = selectedIds?.has(id) ?? false;
                return (
                  <tr
                    key={id}
                    className={`border-b border-trade-border-subtle transition hover:bg-trade-hover ${selected ? "bg-trade-accent-soft" : ""}`}
                  >
                    {selectable && (
                      <td className="w-10 px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          aria-label={`Select row ${id}`}
                          checked={selected}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const cell = col.render(row);
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-3 ${col.align === "right" ? "text-right" : "text-left"} text-trade-text-primary`}
                        >
                          {rowHref ? (
                            <Link href={rowHref(row)} className="block">
                              {cell}
                            </Link>
                          ) : (
                            cell
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectable && selectedIds && selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          onClear={() => onSelectionChange?.(new Set())}
          actions={bulkActions}
          noun={bulkNoun}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

- `CI=true npx vitest run "src/app/(trade)/trade/_components/TradeTable.test.tsx" 2>&1 | tail -6` — try; if it hangs >60s, kill it and rely on the next two.
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep "TradeTable"` → no errors. **If `Rows3` or `Rows2` is flagged as not exported by lucide-react**, swap both to `AlignJustify` (comfortable) + `List` (compact), which are guaranteed to exist, and re-run.
- `npx eslint "src/app/(trade)/trade/_components/TradeTable.tsx" 2>&1 | tail -6` → clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/TradeTable.tsx" "src/app/(trade)/trade/_components/TradeTable.test.tsx"
git commit -m "feat(trade): generic TradeTable primitive — sortable, dense, sticky (ui phase 3a)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

(Commitlint: lowercase subject. The `TradeTable` token in the body is fine; only the subject is linted.)

---

## Task 3: Migrate the Parties page

**Files:**

- Modify: `src/app/(trade)/trade/parties/page.tsx`

- [ ] **Step 1: Read** `src/app/(trade)/trade/parties/page.tsx`. Identify: the `PartyRow` interface, the existing `PartyRowItem` component (port its cell visuals — legalName styling, the `ScreeningBadge`, any status pill — into columns), the status-filter pill rendering, the search input, `selectedIds` state + select-all logic, the `handleExport` CSV function, and the `BulkActionsBar` usage. Keep the data fetch, filter state, search state, `selectedIds`, and CSV export.

- [ ] **Step 2: Add imports** (path is `../_components/TradeTable`):

```tsx
import { TradeTable, type TradeColumn } from "../_components/TradeTable";
```

- [ ] **Step 3: Define the columns** (above the component's return, after the filtered-rows computation). Port the EXACT badge/markup from the existing `PartyRowItem` into the `render`s — example shape:

```tsx
const columns: TradeColumn<PartyRow>[] = [
  {
    key: "legalName",
    header: "Legal name",
    sortBy: (p) => p.legalName.toLowerCase(),
    render: (p) => (
      <span className="font-medium text-trade-text-primary">{p.legalName}</span>
    ),
  },
  { key: "countryCode", header: "Country", render: (p) => p.countryCode },
  {
    key: "screeningStatus",
    header: "Screening",
    sortBy: (p) => p.screeningStatus,
    render: (p) => <ScreeningBadge status={p.screeningStatus} />, // use the real ScreeningBadge import/props from this file
  },
];
```

(If the page renders a separate ACTIVE/ARCHIVED/BLOCKED status pill, add a `{ key: "status", header: "Status", render: … }` column reusing that pill.)

- [ ] **Step 4: Replace the bespoke list block** (the `<ul>`/map of `PartyRowItem`, the manual select-all header, the standalone search input, the standalone status pills container, and the standalone `BulkActionsBar`) with a single `TradeTable`:

```tsx
<TradeTable<PartyRow>
  rows={filteredParties} // the existing filtered array
  columns={columns}
  getRowId={(p) => p.id}
  rowHref={(p) => `/trade/parties/${p.id}`}
  selectable
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  bulkNoun="counterparty"
  bulkActions={
    <button
      onClick={handleExport}
      className="rounded-md border border-trade-border px-3 py-1.5 text-[12px] text-trade-text-primary hover:bg-trade-hover"
    >
      Export CSV
    </button>
  }
  search={{
    value: searchQuery,
    onChange: setSearchQuery,
    placeholder: "Search counterparties…",
  }}
  filters={/* the existing status-pill buttons, unchanged */}
  resultCount={filteredParties.length}
  loading={loading}
  emptyState={/* the existing EmptyStateRich (or a "no results" node when a filter/search is active) */}
/>
```

Use the page's REAL variable names (e.g. the filtered array, search state setter, loading flag, export handler, status-pill JSX) — adapt the above to them. Delete the now-dead `PartyRowItem` component and the manual select-all helpers if nothing else references them.

- [ ] **Step 5: Verify**
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep "parties/page"` → no new errors.
- `npx eslint "src/app/(trade)/trade/parties/page.tsx" 2>&1 | tail -6` → clean.
- `CI=true npx vitest run "src/app/(trade)/trade/parties" 2>&1 | tail -5` → run if a test exists (jsdom may hang; fall back to tsc+source).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(trade)/trade/parties/page.tsx"
git commit -m "refactor(trade): migrate parties list to TradeTable (ui phase 3a)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Migrate the Items page

**Files:**

- Modify: `src/app/(trade)/trade/items/page.tsx`

- [ ] **Step 1: Read** `src/app/(trade)/trade/items/page.tsx`. Identify: `TradeItemSummary`, the existing `ItemRow` (port its cell visuals — name, SKU, `StatusBadge`, the ECCN/USML code pills), the status filter, search, `selectedIds`, `handleExport`. **Do NOT touch `NewItemForm`** (the Phase-2 datasheet dropzone lives there) — only the list rendering.

- [ ] **Step 2: Add import**:

```tsx
import { TradeTable, type TradeColumn } from "../_components/TradeTable";
```

- [ ] **Step 3: Define the columns** — port the real `StatusBadge` + code-pill markup from `ItemRow`:

```tsx
const columns: TradeColumn<TradeItemSummary>[] = [
  {
    key: "name",
    header: "Name",
    sortBy: (i) => i.name.toLowerCase(),
    render: (i) => (
      <span className="font-medium text-trade-text-primary">{i.name}</span>
    ),
  },
  { key: "internalSku", header: "SKU", render: (i) => i.internalSku ?? "—" },
  {
    key: "status",
    header: "Status",
    sortBy: (i) => i.status,
    render: (i) => <StatusBadge status={i.status} />, // the file's real StatusBadge
  },
  {
    key: "codes",
    header: "Codes",
    render: (i) => /* the existing code-pill JSX from ItemRow (eccnEU/eccnUS/usmlCategory/mtcrCategory) */,
  },
];
```

- [ ] **Step 4: Replace the bespoke items list** (the list map of `ItemRow`, the manual select-all header, the standalone toolbar + `BulkActionsBar`) with `TradeTable`:

```tsx
<TradeTable<TradeItemSummary>
  rows={filteredItems}
  columns={columns}
  getRowId={(i) => i.id}
  rowHref={(i) => `/trade/items/${i.id}`}
  selectable
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  bulkNoun="item"
  bulkActions={/* the existing Export CSV button calling handleExport */}
  search={{
    value: searchQuery,
    onChange: setSearchQuery,
    placeholder: "Search items…",
  }}
  filters={/* the existing status-pill buttons */}
  resultCount={filteredItems.length}
  loading={loading}
  emptyState={/* the existing EmptyStateRich */}
/>
```

Adapt to the page's real names. Keep `NewItemForm` and its toggle exactly as-is. Delete the dead `ItemRow` if unreferenced.

- [ ] **Step 5: Verify**
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep "(trade)/trade/items/page"` → no new errors.
- `npx eslint "src/app/(trade)/trade/items/page.tsx" 2>&1 | tail -6` → clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(trade)/trade/items/page.tsx"
git commit -m "refactor(trade): migrate items list to TradeTable (ui phase 3a)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Migrate the Operations page

**Files:**

- Modify: `src/app/(trade)/trade/operations/page.tsx`

- [ ] **Step 1: Read** `src/app/(trade)/trade/operations/page.tsx`. Identify: `OperationRow`, `OperationRowItem` (port status pill + route), the status filter, search, `selectedIds`, `handleExport`. Note `humanizeEnum` is imported from `@/lib/trade/format` for type labels.

- [ ] **Step 2: Add import**:

```tsx
import { TradeTable, type TradeColumn } from "../_components/TradeTable";
```

- [ ] **Step 3: Define the columns**:

```tsx
const columns: TradeColumn<OperationRow>[] = [
  {
    key: "reference",
    header: "Reference",
    sortBy: (o) => o.reference,
    render: (o) => (
      <span className="font-medium text-trade-text-primary">{o.reference}</span>
    ),
  },
  { key: "operationType", header: "Type", render: (o) => humanizeEnum(o.operationType) },
  {
    key: "route",
    header: "Route",
    render: (o) => `${o.shipFromCountry} → ${o.shipToCountry}`,
  },
  {
    key: "status",
    header: "Status",
    sortBy: (o) => o.status,
    render: (o) => /* the existing operation status pill from OperationRowItem */,
  },
];
```

- [ ] **Step 4: Replace the bespoke operations list** with `TradeTable`:

```tsx
<TradeTable<OperationRow>
  rows={filteredOperations}
  columns={columns}
  getRowId={(o) => o.id}
  rowHref={(o) => `/trade/operations/${o.id}`}
  selectable
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  bulkNoun="operation"
  bulkActions={/* the existing Export CSV button */}
  search={{
    value: searchQuery,
    onChange: setSearchQuery,
    placeholder: "Search by reference…",
  }}
  filters={/* the existing status-pill buttons */}
  resultCount={filteredOperations.length}
  loading={loading}
  emptyState={/* the existing EmptyStateRich */}
/>
```

Adapt to real names; delete dead `OperationRowItem` if unreferenced.

- [ ] **Step 5: Verify**
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep "operations/page"` → no new errors.
- `npx eslint "src/app/(trade)/trade/operations/page.tsx" 2>&1 | tail -6` → clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(trade)/trade/operations/page.tsx"
git commit -m "refactor(trade): migrate operations list to TradeTable (ui phase 3a)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Full-feature verification + deploy

**Files:** none.

- [ ] **Step 1: Pure tests** — `CI=true npx vitest run src/lib/trade/table-state.test.ts 2>&1 | tail -6` → all green.

- [ ] **Step 2: Component test (best-effort)** — `CI=true npx vitest run "src/app/(trade)/trade/_components/TradeTable.test.tsx" 2>&1 | tail -6` → green if observable; if it hangs, document the jsdom fallback (tsc + source).

- [ ] **Step 3: Scoped typecheck** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit > /tmp/tsc-p3a.txt 2>&1; grep -E "table-state|TradeTable|parties/page|items/page|operations/page" /tmp/tsc-p3a.txt | grep -v "\.test\."` → empty. Then `grep -cE "error TS" /tmp/tsc-p3a.txt` → ≤ 733 (the baseline; ideally lower if dead code was removed).

- [ ] **Step 4: Lint touched files** — `npx eslint src/lib/trade/table-state.ts "src/app/(trade)/trade/_components/TradeTable.tsx" "src/app/(trade)/trade/parties/page.tsx" "src/app/(trade)/trade/items/page.tsx" "src/app/(trade)/trade/operations/page.tsx" 2>&1 | tail -8` → 0 errors.

- [ ] **Step 5: Deploy the batch** (per the batched-deploy policy — production only, no preview). Confirm clean fast-forward, then:

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD && echo "FF OK"
git push origin fix/trade-to-92:main
```

Confirm `git log --oneline origin/main..HEAD | wc -l` → 0 after the push.

---

## Self-Review (done at plan-write time)

- **Spec coverage:** TradeTable primitive (Task 2) ✓; pure sort/selection logic (Task 1) ✓; Parties/Items/Operations migrations (Tasks 3-5) ✓; sticky header + sort + density button + selection + empty/loading states (Task 2 component) ✓; reuse of BulkActionsBar/ListSkeleton/ScreeningBadge/useTradeDensity ✓; node-test strategy for the pure module ✓; batched deploy ✓.
- **Type consistency:** `SortState`/`TradeColumn`/`TradeTableProps` defined in Tasks 1-2 and used identically in 3-5. `selectedIds: Set<string>` + `onSelectionChange` match each page's existing state. `ScreeningBadge`/`StatusBadge`/`humanizeEnum` are referenced as existing in-file imports (the implementer ports them from the page being migrated).
- **Placeholder note:** Tasks 3-5 deliberately leave `render` bodies for status/code pills as "port the existing markup" — because the exact badge JSX lives in each page's current Row component and must be copied verbatim from there (transcribing 2,242 LOC of current page code into the plan would be wasteful and error-prone). Every other step is complete code. The column STRUCTURE, the TradeTable invocation, and all props are fully specified.
- **Density correction** from the spec amendment is reflected: no `useTableState` file, density via `useTradeDensity`, rows use `py-3`.
