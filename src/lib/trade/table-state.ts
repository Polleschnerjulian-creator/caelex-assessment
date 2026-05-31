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
