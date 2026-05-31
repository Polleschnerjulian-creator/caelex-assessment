"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlignJustify,
  List,
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
              <AlignJustify className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Compact rows"
              aria-pressed={density === "compact"}
              onClick={() => setDensity("compact")}
              className={`rounded p-1 transition ${density === "compact" ? "bg-trade-accent text-white" : "text-trade-text-muted hover:text-trade-text-primary"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <ListSkeleton rows={6} label="Loading rows…" />
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
