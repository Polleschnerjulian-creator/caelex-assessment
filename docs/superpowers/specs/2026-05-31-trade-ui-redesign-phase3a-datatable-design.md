# Trade UI Redesign — Phase 3A: Shared DataTable + List Migration (Design Spec)

**Date:** 2026-05-31
**Status:** Approved (design) — pending spec review
**Branch:** `fix/trade-to-92`
**Predecessors:** Phase 1 (nav/home/tokens, deployed), Phase 2 (search-pickers + datasheet auto-classify, deployed)

---

## Goal

Replace three near-identical, fully-bespoke Trade list pages with **one reusable, modern, scannable table primitive**, and migrate them onto it. Standardize filtering, search, bulk-selection, sorting, density, and empty/loading states. Establish the pattern that Licenses (3B), Screening-Triage (3C), and Documents (3D) inherit later.

**Why this first:** exploration showed Items (747 LOC), Operations (866 LOC), and Parties (629 LOC) are ~2,242 LOC of duplicated filter/search/bulk-select logic with no shared primitive, and an unused `DensityToggle` (an abandoned standardization attempt). This is the foundation the other three Phase-3 subsystems all want.

## Non-Goals (YAGNI — explicitly OUT of 3A)

- **Licenses page** (card layout) — that's 3B; it adopts the primitive later with a card/row variant.
- **Screening triage queue** — 3C (a new surface built ON the primitive).
- **Documents unified view** — 3D.
- **Server-side sort/pagination changes** — data fetching is unchanged. Sorting is **client-side on the already-loaded page** (lists are already server-paginated). No new query params.
- **Column show/hide + reordering, virtualization** — deferred until a real need appears.
- **No new runtime dependencies** (rules out TanStack Table etc.) — the primitive is hand-rolled.

## Architecture

A generic, column-driven table component plus a thin state hook, with the **testable logic extracted into a pure module** (node-testable — important because jsdom component tests hang on this machine).

```
src/lib/trade/table-state.ts            ← PURE: sort comparator, selection-set ops, density map (node tests)
src/app/(trade)/trade/_components/
    TradeTable.tsx                      ← generic <TradeTable<T>> component (uses the pure module)
    useTableState.ts                    ← thin hook: useState around the pure helpers (sort + density)
```

Reuses existing shared components — does NOT rebuild them:

- `BulkActionsBar` (sticky bottom, count + actions slot)
- `EmptyStateRich` (rich empty state)
- `ListSkeleton` (loading)
- `DensityToggle` (currently unused — finally wired)
- `ScreeningBadge` (parties screening pill)

### Pure module — `src/lib/trade/table-state.ts`

```ts
export type SortDir = "asc" | "desc";
export interface SortState {
  key: string | null;
  dir: SortDir;
}

/** Click cycle on a header: new key → asc; same key asc → desc; same key desc → cleared. */
export function nextSort(current: SortState, key: string): SortState;

/** Stable sort of a copy of `rows` by `sortBy`, applying direction. Never mutates input. */
export function sortRows<T>(
  rows: T[],
  sortBy: (r: T) => string | number,
  dir: SortDir,
): T[];

/** Immutable add/remove of one id. */
export function toggleId(set: Set<string>, id: string): Set<string>;

export type SelectAllState = "none" | "some" | "all";
/** Tri-state for the header checkbox, scoped to the currently-visible ids. */
export function selectAllState(
  selectedIds: Set<string>,
  visibleIds: string[],
): SelectAllState;

/** If all visible are selected → deselect all visible; else select all visible. Preserves selections outside the visible set. */
export function toggleSelectAll(
  selectedIds: Set<string>,
  visibleIds: string[],
): Set<string>;

export type Density = "comfortable" | "compact";
export const DENSITY_ROW_PADDING: Record<Density, string>; // { comfortable: "py-3", compact: "py-1.5" }
```

All pure, deterministic, no React, no DOM → covered by fast node tests.

### Component — `TradeTable<T>`

```ts
interface TradeColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode; // arbitrary cell (pills, codes, bars, links)
  sortBy?: (row: T) => string | number; // present ⇒ header is click-sortable
  align?: "left" | "right"; // numbers/dates right-aligned
  headerClassName?: string;
}

interface TradeTableProps<T> {
  rows: T[];
  columns: TradeColumn<T>[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string; // row → next/link navigation

  // selection (controlled by the page, which still owns selectedIds for BulkActionsBar/CSV)
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;

  // toolbar slots (per-surface content lives in the page)
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  filters?: ReactNode; // status pills etc.
  bulkActions?: ReactNode; // rendered inside BulkActionsBar when selection > 0
  resultCount?: number; // shown in the toolbar

  // state
  loading?: boolean; // → ListSkeleton
  emptyState?: ReactNode; // → EmptyStateRich (incl. a "no results for filter" variant)
  initialSort?: SortState; // optional default; otherwise server order is preserved
}
```

**Ownership split:** the page keeps owning `search` value + `selectedIds` + status `filters` (minimal migration churn, drives existing CSV export). `TradeTable` owns the **new** concerns — sort + density — via `useTableState`.

### Hook — `useTableState`

```ts
function useTableState(initialSort?: SortState): {
  sort: SortState;
  toggleSort: (key: string) => void; // wraps nextSort
  density: Density;
  setDensity: (d: Density) => void;
};
```

The table applies `sortRows` to `rows` when `sort.key` matches a column with `sortBy`; otherwise renders server order.

## Visual Treatment (the "modern" part)

- Real `<table>` semantics (a11y + native sticky header).
- **Sticky header row** (`position: sticky; top: 0`, `bg-trade-bg-panel`, hairline bottom border) — column context stays while scrolling long lists.
- **Click-to-sort**: sortable headers show a muted chevron on hover; active sort column shows a solid asc/desc chevron.
- **Density toggle** in the toolbar (wires the existing `DensityToggle`): comfortable (`py-3`, default) vs compact (`py-1.5`) → power users see more rows.
- Hairline row borders (`border-trade-border-subtle`), row hover `bg-trade-hover`, selected row `bg-trade-accent-soft`.
- Numeric/date columns right-aligned.
- Toolbar layout: search (left) · status-filter pills (center) · density toggle + result count (right).
- Selection: indeterminate header checkbox (tri-state via `selectAllState`) + per-row checkboxes; when selection > 0 the existing `BulkActionsBar` slides up with count + the page's `bulkActions`.
- Empty: `EmptyStateRich`; plus an explicit "no results for your search/filter" variant (distinct from the first-run empty state).
- All colors via `--trade-*` tokens — no hardcoded values.

## Migration Plan (TDD, de-risked, smallest-first)

1. **Pure module + hook + `TradeTable`** — build with node tests on the pure module first.
2. **Parties** (629 LOC, smallest) — first migration proves the primitive. Columns: `▢ · Legal Name (sort) · Country · Type · Screening (ScreeningBadge) · updated`.
3. **Items** (747 LOC) — Columns: `▢ · Name (sort) · SKU · Status · Codes (ECCN/USML pills) · updated (sort)`.
4. **Operations** (866 LOC) — Columns: `▢ · Reference (sort) · Type · Route (from→to) · Status · Value (sort, right) · updated`.

Each migration keeps the **same data, same status filters, same search, same bulk/CSV** as today, but now sortable + density-able + sticky. Net LOC drops because the table chrome is shared. Exact column fields are refined against each page's real row type during the build.

## Testing Strategy

Given the documented jsdom hang on this machine:

- **Pure module (`table-state.ts`)** → node tests: `nextSort` cycle, `sortRows` stability + direction + no-mutation, `toggleId`, `selectAllState` tri-state, `toggleSelectAll` preserving out-of-view selections, density map. These cover the real logic risk.
- **`TradeTable` + migrated pages** → source-correctness review + `tsc` (no new errors vs the 733 baseline) + `eslint` clean. Same bar Phase 1 & 2 deployed on. A jsdom render test is written but treated as best-effort (may hang).
- Migration safety net: behavior (data/filters/search/bulk) is unchanged; the risk is concentrated in the pure sort/selection logic, which is fully unit-tested.

## File Structure

| File                                                    | Responsibility                                  |
| ------------------------------------------------------- | ----------------------------------------------- |
| `src/lib/trade/table-state.ts`                          | Pure sort/selection/density logic (node-tested) |
| `src/lib/trade/table-state.test.ts`                     | Node tests for the pure module                  |
| `src/app/(trade)/trade/_components/useTableState.ts`    | Thin React hook (sort + density)                |
| `src/app/(trade)/trade/_components/TradeTable.tsx`      | Generic column-driven table                     |
| `src/app/(trade)/trade/_components/TradeTable.test.tsx` | Best-effort render test (jsdom)                 |
| `src/app/(trade)/trade/parties/page.tsx`                | Migrate to TradeTable + party columns           |
| `src/app/(trade)/trade/items/page.tsx`                  | Migrate to TradeTable + item columns            |
| `src/app/(trade)/trade/operations/page.tsx`             | Migrate to TradeTable + operation columns       |

## Risks & Decisions

- **Client-side sort only.** Sorting acts on the loaded page, not the full server set. Accepted: lists are already server-paginated and the loaded page is what the user sees; full-set sort would require a query-param/API change (out of scope, possible 3A-follow-up).
- **Column defs inline per page** (a `const columns: TradeColumn<X>[]`) rather than a shared columns file — co-located, simplest for v1.
- **Selection stays page-owned** to avoid disturbing the existing CSV-export wiring.
- **Approach A over a table library** — zero new deps honors the "minimal external cost" constraint; our needs (sort, density, selection, sticky) are modest and hand-rollable.
- **Rollback:** the three pages are migrated in independent commits; any one can revert without touching the others or the primitive.

## Success Criteria

- One `TradeTable<T>` + pure `table-state.ts` with green node tests.
- Parties, Items, Operations all rendering via `TradeTable`, visually consistent, with working sort + density + sticky header + existing filters/search/bulk/CSV.
- Net LOC reduction across the three pages.
- `tsc` at the 733 baseline (zero new errors), `eslint` clean.
- Deployed as one batched production push (per deploy policy).
