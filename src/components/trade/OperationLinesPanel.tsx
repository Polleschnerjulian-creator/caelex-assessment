/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * OperationLinesPanel — manages TradeOperationLine records on a
 * TradeOperation. Add lines via item-typeahead search + quantity
 * + unit value; remove via per-row delete button.
 *
 * Used by /dashboard/trade/operations/[id] (Sprint C3a).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

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

const labelStyle: React.CSSProperties = { color: "rgba(255,255,255,0.5)" };
const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.30)",
  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.92)",
};

export function OperationLinesPanel({
  operationId,
  initialLines,
  isReadOnly,
  onLinesChanged,
}: {
  operationId: string;
  initialLines: OperationLine[];
  /**
   * True when the operation is in a terminal state (EXECUTED, BLOCKED,
   * VOLUNTARY_DISCLOSURE_FILED). Then no add/remove allowed; only
   * read-only display.
   */
  isReadOnly: boolean;
  /**
   * Callback so parent can refresh derived data (counts, status hints).
   */
  onLinesChanged?: () => void;
}) {
  const [lines, setLines] = useState<OperationLine[]>(initialLines);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with parent updates (e.g. after parent reload)
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
    <section
      className="rounded-2xl"
      style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div>
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Operation Lines ({lines.length})
          </h2>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {totalValue > 0
              ? `Total: ${totalValue.toFixed(2)} EUR equivalent · ${unclassifiedCount} unclassified · ${unlicensedCount} unlicensed`
              : "Add items + quantities to populate this operation"}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all"
            style={{
              background: showAddForm
                ? "rgba(239,68,68,0.12)"
                : "rgba(16,185,129,0.12)",
              color: showAddForm ? "rgb(248,113,113)" : "rgb(52,211,153)",
              boxShadow: showAddForm
                ? "inset 0 0 0 0.5px rgba(239,68,68,0.3)"
                : "inset 0 0 0 0.5px rgba(16,185,129,0.3)",
            }}
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

      {/* Unclassified warning */}
      {unclassifiedCount > 0 && (
        <div
          className="border-b px-5 py-2.5 text-[12px]"
          style={{
            borderColor: "rgba(251,191,36,0.25)",
            background: "rgba(251,191,36,0.06)",
            color: "rgb(251,191,36)",
          }}
        >
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
        <div
          className="px-5 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "rgb(248,113,113)",
          }}
        >
          {error}
        </div>
      )}

      {lines.length === 0 ? (
        <div
          className="px-5 py-8 text-center text-[12px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
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

// ─── Subcomponents ───────────────────────────────────────────────────

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
    <li
      className="flex items-center gap-4 border-b px-5 py-3 last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <Package
        className="h-4 w-4 shrink-0"
        strokeWidth={1.75}
        style={{
          color: isUnclassified ? "rgb(251,191,36)" : "rgba(255,255,255,0.5)",
        }}
      />
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[13px] font-semibold"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {line.item.name}
        </div>
        <div
          className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {line.item.internalSku && <span>SKU {line.item.internalSku}</span>}
          {codes.length > 0 ? (
            <>
              {line.item.internalSku && <span>·</span>}
              {codes.map((c) => (
                <span
                  key={c}
                  className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {c}
                </span>
              ))}
            </>
          ) : (
            <span style={{ color: "rgb(251,191,36)" }}>· unclassified</span>
          )}
        </div>
      </div>
      <div
        className="shrink-0 text-right text-[12px] font-mono"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        {line.quantity} × {line.unitValue.toFixed(2)} {line.unitCurrency}
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          = {lineTotal.toFixed(2)} {line.unitCurrency}
        </div>
      </div>
      <div className="shrink-0">
        {line.appliedLicense ? (
          <span
            className="rounded px-2 py-1 text-[10px] font-mono"
            style={{
              background: "rgba(96,165,250,0.12)",
              color: "rgb(96,165,250)",
            }}
          >
            {line.appliedLicense.licenseType.replace(/_/g, " ")}
          </span>
        ) : (
          <span
            className="rounded px-2 py-1 text-[10px]"
            style={{
              background: "rgba(251,191,36,0.10)",
              color: "rgb(251,191,36)",
            }}
          >
            no license
          </span>
        )}
      </div>
      {!isReadOnly && (
        <button
          onClick={onDelete}
          className="shrink-0 rounded-md p-1.5"
          style={{ color: "rgba(255,255,255,0.4)" }}
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

  // Debounced item search
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

  return (
    <div
      className="border-b px-5 py-4"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
      }}
    >
      {!selectedItem ? (
        <>
          <label
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Search trade items
          </label>
          <div
            className="flex items-center gap-2 rounded-md px-3 py-2"
            style={inputStyle}
          >
            <Search
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "rgba(255,255,255,0.4)" }}
            />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search items by name or SKU…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
              style={{ color: "rgba(255,255,255,0.92)" }}
            />
          </div>
          {results.length > 0 && (
            <ul
              className="mt-2 overflow-hidden rounded-md"
              style={{
                boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
              }}
            >
              {results.map((it) => {
                const codes = [it.eccnEU, it.eccnUS, it.usmlCategory].filter(
                  Boolean,
                );
                return (
                  <li
                    key={it.id}
                    onClick={() => setSelectedItem(it)}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors"
                    style={{ background: "rgba(255,255,255,0.025)" }}
                  >
                    <Package
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-[12px] font-medium"
                        style={{ color: "rgba(255,255,255,0.85)" }}
                      >
                        {it.name}
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-[10px]"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {it.internalSku && <span>SKU {it.internalSku}</span>}
                        {codes.length > 0 ? (
                          codes.map((c) => (
                            <span
                              key={c}
                              className="rounded px-1 font-mono"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.65)",
                              }}
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "rgb(251,191,36)" }}>
                            unclassified
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {search && results.length === 0 && (
            <p
              className="mt-2 text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              No matching items. Create the item first via{" "}
              <span style={{ color: "rgba(255,255,255,0.7)" }}>
                Item Classification
              </span>
              , then return here.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="text-[12px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Item:
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {selectedItem.name}
            </span>
            <button
              onClick={() => setSelectedItem(null)}
              className="ml-auto text-[11px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Change
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={labelStyle}
              >
                Quantity
              </label>
              <input
                type="number"
                min={0.001}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={labelStyle}
              >
                Unit value
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={unitValue}
                onChange={(e) => setUnitValue(parseFloat(e.target.value) || 0)}
                className="w-full rounded-md px-3 py-2 font-mono text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={labelStyle}
              >
                Currency (ISO 3)
              </label>
              <input
                type="text"
                maxLength={3}
                value={unitCurrency}
                onChange={(e) => setUnitCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-md px-3 py-2 font-mono text-[13px] uppercase outline-none"
                style={inputStyle}
              />
            </div>
          </div>
          <div
            className="mt-2 text-[11px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Line total:{" "}
            <span
              className="font-mono"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {(quantity * unitValue).toFixed(2)} {unitCurrency}
            </span>
          </div>
          {err && (
            <div
              className="mt-2 text-[11px]"
              style={{ color: "rgb(248,113,113)" }}
            >
              {err}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button
              onClick={submit}
              disabled={submitting || quantity <= 0}
              className="rounded-md px-4 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: "rgba(16,185,129,0.18)",
                color: "rgb(52,211,153)",
                boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.4)",
              }}
            >
              {submitting ? "Adding…" : "Add line"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
