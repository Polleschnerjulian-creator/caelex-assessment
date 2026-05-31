"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Sparkles, Loader2, Check } from "lucide-react";

interface Suggestion {
  code: string;
  canonicalId: string;
  regime: string;
  title: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
}
interface ExtractedAttribute {
  attribute: string;
  value: number | boolean | string;
  confidence: "high" | "medium" | "low";
}
export interface DatasheetApplyPayload {
  attributes: ExtractedAttribute[];
  suggestions: Suggestion[];
}

const CONFIDENCE_CLS: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "bg-green-500/15 text-green-400",
  MEDIUM: "bg-amber-500/15 text-amber-400",
  LOW: "bg-zinc-500/15 text-zinc-400",
};

export function DatasheetDropzone({
  onApply,
}: {
  onApply: (payload: DatasheetApplyPayload) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<ExtractedAttribute[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [done, setDone] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const exRes = await fetch("/api/trade/classify/extract-vision", {
        method: "POST",
        body: form,
      });
      const exBody = await exRes.json();
      if (!exRes.ok || !exBody?.ok) {
        setError(exBody?.error ?? "Datenblatt konnte nicht gelesen werden.");
        return;
      }
      const attrs: ExtractedAttribute[] = exBody.extraction?.attributes ?? [];
      setAttributes(attrs);

      const sgRes = await fetch("/api/trade/classify/suggest-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attributes: attrs }),
      });
      const sgBody = await sgRes.json();
      setSuggestions(sgRes.ok ? (sgBody.suggestions ?? []) : []);
      setDone(true);
    } catch {
      setError("Unerwarteter Fehler bei der Datenblatt-Analyse.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-trade-accent/60 bg-trade-accent-soft px-4 py-5 text-center transition hover:bg-trade-hover"
      >
        <span className="flex items-center gap-1 text-lg">
          <FileText className="h-5 w-5 text-trade-accent" />
          <Sparkles className="h-4 w-4 text-trade-accent" />
        </span>
        <span className="text-sm text-trade-text-primary">
          Datenblatt hochladen
        </span>
        <span className="text-xs text-trade-text-muted">
          PDF · Claude Vision liest Specs &amp; schlägt ECCN/USML vor
        </span>
      </button>
      <input
        ref={inputRef}
        data-testid="datasheet-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {busy && (
        <div className="flex items-center gap-2 text-sm text-trade-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Analysiere Datenblatt…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error} — du kannst die Codes weiterhin manuell eingeben.
        </div>
      )}

      {done && !error && (
        <div className="rounded-lg border border-trade-border bg-trade-bg-panel p-3">
          <div className="text-xs uppercase tracking-wide text-trade-text-muted">
            Vorschlag — du bestätigst
          </div>
          {suggestions.length === 0 ? (
            <div className="mt-2 text-sm text-trade-text-muted">
              Keine eindeutige Einstufung aus dem Datenblatt. Attribute wurden
              gelesen ({attributes.length}) — bitte manuell prüfen.
            </div>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {suggestions.slice(0, 5).map((s) => (
                <li
                  key={s.canonicalId}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="font-medium text-trade-text-primary">
                    {s.code}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${CONFIDENCE_CLS[s.confidence]}`}
                  >
                    {s.confidence}
                  </span>
                  <span className="truncate text-xs text-trade-text-muted">
                    {s.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => onApply({ attributes, suggestions })}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-trade-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-trade-accent-strong"
          >
            <Check className="h-3.5 w-3.5" /> Übernehmen
          </button>
        </div>
      )}
    </div>
  );
}
