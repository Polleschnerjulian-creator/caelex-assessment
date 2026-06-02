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
