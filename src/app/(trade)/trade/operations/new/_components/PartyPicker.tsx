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
  CLEAR: { text: "✓ sauber", cls: "text-trade-accent-success" },
  POTENTIAL_MATCH: {
    text: "? möglicher Treffer",
    cls: "text-trade-accent-warn",
  },
  CONFIRMED_HIT: { text: "✕ Treffer", cls: "text-trade-accent-danger" },
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
