// CategoryPicker.tsx
"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/trade/intake/product-categories";

const GROUPS = [
  "ADCS",
  "Antrieb",
  "Payload",
  "Power",
  "RF",
  "Elektronik",
] as const;

export function CategoryPicker({
  onSelect,
}: {
  onSelect: (categoryId: string) => void;
}) {
  const [q, setQ] = useState("");
  const term = q.toLowerCase().trim();
  const match = (c: (typeof PRODUCT_CATEGORIES)[number]) =>
    !term ||
    c.label.toLowerCase().includes(term) ||
    c.synonyms.some((s) => s.toLowerCase().includes(term));
  return (
    <section className="space-y-4" data-testid="assess-category-step">
      <label className="flex items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2">
        <Search className="h-4 w-4 text-trade-text-muted" />
        <input
          className="w-full bg-transparent text-trade-text-primary outline-none"
          placeholder="Produktklasse suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {GROUPS.map((g) => {
        const items = PRODUCT_CATEGORIES.filter(
          (c) => c.group === g && match(c),
        );
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <h4 className="text-caption uppercase tracking-wide text-trade-text-muted">
              {g}
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-left transition hover:bg-trade-hover"
                >
                  <div className="text-trade-text-primary">{c.label}</div>
                  <div className="text-caption text-trade-text-muted">
                    {c.blurb}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
