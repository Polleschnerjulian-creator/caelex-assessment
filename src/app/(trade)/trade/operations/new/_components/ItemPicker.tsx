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
