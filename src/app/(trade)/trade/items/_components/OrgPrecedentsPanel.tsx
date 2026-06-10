"use client";

/**
 * "Aus eurer eigenen Praxis" — org classification precedents (ILA #5).
 *
 * Fetches the org's most similar ALREADY-REVIEWED classifications for
 * this item's description and offers a one-click apply. Conservative by
 * design: applying parks the item in REQUIRES_REVIEW (USER_DECLARED
 * provenance — a human chose to follow the precedent), so the four-eyes
 * review stays in the loop. Empty states render honestly; nothing is
 * fabricated.
 */

import { useEffect, useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";

interface OrgPrecedent {
  itemId: string;
  name: string;
  field: "eccnEU" | "eccnUS" | "usmlCategory" | "germanAlEntry";
  code: string;
  similarity: number;
}

const FIELD_LABELS: Record<OrgPrecedent["field"], string> = {
  eccnEU: "EU Dual-Use",
  eccnUS: "US ECCN",
  usmlCategory: "USML",
  germanAlEntry: "AL (DE)",
};

export function OrgPrecedentsPanel({
  itemId,
  queryText,
  onApplied,
}: {
  itemId: string;
  queryText: string;
  onApplied?: () => void;
}) {
  const [precedents, setPrecedents] = useState<OrgPrecedent[] | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/trade/classify/suggest-codes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            attributes: [],
            text: queryText,
            excludeItemId: itemId,
          }),
        });
        if (!res.ok) {
          if (!cancelled) setPrecedents([]);
          return;
        }
        const json = (await res.json().catch(() => null)) as {
          orgPrecedents?: OrgPrecedent[];
        } | null;
        if (!cancelled) setPrecedents(json?.orgPrecedents ?? []);
      } catch {
        if (!cancelled) setPrecedents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId, queryText]);

  async function apply(p: OrgPrecedent) {
    setApplyError(null);
    setApplying(p.itemId);
    try {
      const res = await fetch(`/api/trade/items/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          [p.field]: p.code,
          classificationSource: "USER_DECLARED",
          status: "REQUIRES_REVIEW",
        }),
      });
      if (!res.ok) {
        setApplyError("Übernehmen fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      onApplied?.();
    } catch {
      setApplyError("Netzwerkfehler beim Übernehmen.");
    } finally {
      setApplying(null);
    }
  }

  // No similar reviewed classifications → render nothing (the panel is a
  // bonus signal, not a section that needs an empty-state explanation).
  if (precedents !== null && precedents.length === 0) return null;

  return (
    <section className="rounded-lg border border-trade-border-subtle bg-trade-bg-panel p-5">
      <header className="mb-3 flex items-center gap-2">
        <BookMarked className="h-4 w-4 text-trade-accent" strokeWidth={2} />
        <h2 className="font-display text-[14px] font-semibold tracking-[-0.005em] text-trade-text-primary">
          Aus eurer eigenen Praxis
        </h2>
      </header>
      <p className="mb-3 text-[11px] leading-relaxed text-trade-text-muted">
        Bereits geprüfte Klassifizierungen eurer Organisation mit ähnlicher
        Beschreibung. Übernehmen erzeugt einen Review-pflichtigen Vorschlag —
        keine bindende Einstufung.
      </p>
      {applyError ? (
        <p className="mb-2 text-[12px] text-red-600">{applyError}</p>
      ) : null}
      {precedents === null ? (
        <div className="flex items-center gap-2 text-[12px] text-trade-text-muted">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          Suche ähnliche Klassifizierungen…
        </div>
      ) : (
        <ul className="space-y-2">
          {precedents.map((p) => (
            <li
              key={`${p.itemId}:${p.field}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-trade-border bg-trade-bg-inset px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] text-trade-text-primary">
                  {p.name}
                </div>
                <div className="text-[11px] text-trade-text-muted">
                  {FIELD_LABELS[p.field]}:{" "}
                  <span className="font-medium text-trade-text-secondary">
                    {p.code}
                  </span>{" "}
                  · Ähnlichkeit {Math.round(p.similarity * 100)}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => apply(p)}
                disabled={applying !== null}
                className="shrink-0 rounded-md border border-trade-border-strong px-2.5 py-1 text-[12px] font-medium text-trade-text-primary transition hover:bg-trade-hover disabled:opacity-60"
              >
                {applying === p.itemId ? (
                  <Loader2
                    size={12}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  "Wie dort übernehmen"
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
