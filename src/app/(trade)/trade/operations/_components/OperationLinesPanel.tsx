"use client";

/**
 * OperationLinesPanel — Trade light-theme variant (Sprint A3b).
 *
 * Light Indigo port of `src/components/trade/OperationLinesPanel.tsx`.
 * Manages TradeOperationLine records on a TradeOperation. Add lines
 * via item-typeahead + quantity + unit value; remove via per-row
 * delete. Read-only when the operation is in a terminal state.
 */

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Package, Search, AlertTriangle } from "lucide-react";

interface OperationLine {
  id: string;
  quantity: number;
  unitValue: number;
  unitCurrency: string;
  appliedLicenseId: string | null;
  item: {
    id: string;
    name: string;
    internalSku: string | null;
    eccnEU: string | null;
    eccnUS: string | null;
    usmlCategory: string | null;
    mtcrCategory: string | null;
    germanAlEntry: string | null;
    status: string;
  };
  appliedLicense: {
    id: string;
    licenseType: string;
    licenseNumber: string | null;
    status: string;
  } | null;
}

interface ItemSearchResult {
  id: string;
  name: string;
  internalSku: string | null;
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
  status: string;
}

export function OperationLinesPanel({
  operationId,
  initialLines,
  isReadOnly,
  onLinesChanged,
}: {
  operationId: string;
  initialLines: OperationLine[];
  isReadOnly: boolean;
  onLinesChanged?: () => void;
}) {
  const [lines, setLines] = useState<OperationLine[]>(initialLines);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  async function deleteLine(lineId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/trade/operations/${operationId}/lines/${lineId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete line");
        return;
      }
      setLines((prev) => prev.filter((l) => l.id !== lineId));
      onLinesChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }

  const totalValue = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitValue,
    0,
  );
  const unclassifiedCount = lines.filter(
    (l) =>
      !l.item.eccnEU &&
      !l.item.eccnUS &&
      !l.item.usmlCategory &&
      !l.item.mtcrCategory &&
      !l.item.germanAlEntry,
  ).length;
  const unlicensedCount = lines.filter((l) => !l.appliedLicenseId).length;

  return (
    <section className="rounded-md border border-trade-border-subtle bg-trade-bg-panel">
      <div className="flex items-center justify-between border-b border-trade-border-subtle px-5 py-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Operation Lines ({lines.length})
          </h2>
          <p className="mt-0.5 text-[11px] text-trade-text-muted">
            {totalValue > 0
              ? `Total: ${totalValue.toFixed(2)} EUR equivalent · ${unclassifiedCount} unclassified · ${unlicensedCount} unlicensed`
              : "Add items + quantities to populate this operation"}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className={
              showAddForm
                ? "flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-100"
                : "flex items-center gap-1.5 rounded-md bg-trade-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-trade-accent-strong"
            }
          >
            {showAddForm ? (
              <>
                <X className="h-3 w-3" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Add line
              </>
            )}
          </button>
        )}
      </div>

      {unclassifiedCount > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-700">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
          {unclassifiedCount}{" "}
          {unclassifiedCount === 1 ? "line has" : "lines have"} no
          classification codes (ECCN/USML/MTCR/AL). Operation cannot proceed
          past <strong>AWAITING_CLASSIFICATION</strong> until all lines are
          classified.
        </div>
      )}

      {showAddForm && !isReadOnly && (
        <AddLineForm
          operationId={operationId}
          excludeIds={lines.map((l) => l.item.id)}
          onAdded={(newLine) => {
            setLines((prev) => [...prev, newLine]);
            setShowAddForm(false);
            onLinesChanged?.();
          }}
        />
      )}

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {lines.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12px] text-trade-text-muted">
          <Package
            className="mx-auto mb-2 h-6 w-6 opacity-50"
            strokeWidth={1.5}
          />
          No lines yet.{" "}
          {!isReadOnly && 'Click "Add line" above to attach an item.'}
        </div>
      ) : (
        <ul>
          {lines.map((line) => (
            <LineRowItem
              key={line.id}
              line={line}
              isReadOnly={isReadOnly}
              onDelete={() => deleteLine(line.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function LineRowItem({
  line,
  isReadOnly,
  onDelete,
}: {
  line: OperationLine;
  isReadOnly: boolean;
  onDelete: () => void;
}) {
  const lineTotal = line.quantity * line.unitValue;
  const codes = [
    line.item.eccnEU,
    line.item.eccnUS,
    line.item.usmlCategory,
    line.item.mtcrCategory,
    line.item.germanAlEntry,
  ].filter(Boolean);
  const isUnclassified = codes.length === 0;

  return (
    <li className="flex items-center gap-4 border-b border-trade-border-subtle px-5 py-3 last:border-0">
      <Package
        className={`h-4 w-4 shrink-0 ${
          isUnclassified ? "text-amber-500" : "text-trade-text-muted"
        }`}
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-trade-text-primary">
          {line.item.name}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-trade-text-muted">
          {line.item.internalSku && <span>SKU {line.item.internalSku}</span>}
          {codes.length > 0 ? (
            <>
              {line.item.internalSku && <span>·</span>}
              {codes.map((c) => (
                <span
                  key={c}
                  className="rounded bg-trade-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-trade-text-secondary ring-1 ring-trade-border-subtle"
                >
                  {c}
                </span>
              ))}
            </>
          ) : (
            <span className="text-amber-600">· unclassified</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right font-mono text-[12px] text-trade-text-primary">
        {line.quantity} × {line.unitValue.toFixed(2)} {line.unitCurrency}
        <div className="text-[10px] text-trade-text-muted">
          = {lineTotal.toFixed(2)} {line.unitCurrency}
        </div>
      </div>
      <div className="shrink-0">
        {line.appliedLicense ? (
          <span className="rounded bg-blue-50 px-2 py-1 font-mono text-[10px] text-blue-700 ring-1 ring-blue-200">
            {line.appliedLicense.licenseType.replace(/_/g, " ")}
          </span>
        ) : (
          <span className="rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700 ring-1 ring-amber-200">
            no license
          </span>
        )}
      </div>
      {!isReadOnly && (
        <button
          onClick={onDelete}
          className="shrink-0 rounded-md p-1.5 text-trade-text-muted transition hover:bg-red-50 hover:text-red-700"
          title="Remove line"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

function AddLineForm({
  operationId,
  excludeIds,
  onAdded,
}: {
  operationId: string;
  excludeIds: string[];
  onAdded: (line: OperationLine) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [unitValue, setUnitValue] = useState(0);
  const [unitCurrency, setUnitCurrency] = useState("EUR");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (selectedItem || !search) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/trade/items?q=${encodeURIComponent(search)}&limit=10`)
        .then((r) => r.json())
        .then((data) => {
          const filtered = (data.items ?? []).filter(
            (i: ItemSearchResult) => !excludeIds.includes(i.id),
          );
          setResults(filtered);
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, selectedItem, excludeIds]);

  async function submit() {
    if (!selectedItem) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}/lines`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          quantity,
          unitValue,
          unitCurrency: unitCurrency.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to add line");
        return;
      }
      onAdded(data.line);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30";
  const labelClass =
    "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary";

  return (
    <div className="border-b border-trade-border-subtle bg-trade-bg-subtle px-5 py-4">
      {!selectedItem ? (
        <>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Search trade items
          </label>
          <div className="flex items-center gap-2 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-trade-text-muted" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search items by name or SKU…"
              className="w-full bg-transparent text-[13px] text-trade-text-primary outline-none placeholder:text-trade-text-muted"
            />
          </div>
          {results.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-md border border-trade-border-subtle">
              {results.map((it) => {
                const codes = [it.eccnEU, it.eccnUS, it.usmlCategory].filter(
                  Boolean,
                );
                return (
                  <li
                    key={it.id}
                    onClick={() => setSelectedItem(it)}
                    className="flex cursor-pointer items-center gap-3 border-t border-trade-border-subtle bg-trade-bg-panel px-3 py-2 transition hover:bg-trade-hover first:border-t-0"
                  >
                    <Package className="h-3.5 w-3.5 shrink-0 text-trade-text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-trade-text-primary">
                        {it.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-trade-text-muted">
                        {it.internalSku && <span>SKU {it.internalSku}</span>}
                        {codes.length > 0 ? (
                          codes.map((c) => (
                            <span
                              key={c}
                              className="rounded bg-trade-bg-subtle px-1 font-mono text-trade-text-secondary ring-1 ring-trade-border-subtle"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-amber-600">unclassified</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {search && results.length === 0 && (
            <p className="mt-2 text-[11px] text-trade-text-muted">
              No matching items. Create the item first via{" "}
              <span className="text-trade-text-secondary">
                Item Classification
              </span>
              , then return here.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[12px] text-trade-text-secondary">Item:</span>
            <span className="text-[13px] font-semibold text-trade-text-primary">
              {selectedItem.name}
            </span>
            <button
              onClick={() => setSelectedItem(null)}
              className="ml-auto text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
            >
              Change
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                min={0.001}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Unit value</label>
              <input
                type="number"
                min={0}
                step="any"
                value={unitValue}
                onChange={(e) => setUnitValue(parseFloat(e.target.value) || 0)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>Currency (ISO 3)</label>
              <input
                type="text"
                maxLength={3}
                value={unitCurrency}
                onChange={(e) => setUnitCurrency(e.target.value.toUpperCase())}
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-trade-text-secondary">
            Line total:{" "}
            <span className="font-mono text-trade-text-primary">
              {(quantity * unitValue).toFixed(2)} {unitCurrency}
            </span>
          </div>
          {err && <div className="mt-2 text-[11px] text-red-600">{err}</div>}
          <div className="mt-3 flex justify-end">
            <button
              onClick={submit}
              disabled={submitting || quantity <= 0}
              className="rounded-md bg-trade-accent px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add line"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
