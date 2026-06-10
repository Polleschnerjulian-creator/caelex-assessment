"use client";

/**
 * CSV item import dialog (ILA review #8).
 *
 * The file is parsed CLIENT-side (preview + honest skip reasons before
 * anything is written); only the validated JSON rows reach the API.
 * Imported rows land as DRAFT — classification happens in the copilot,
 * exactly like hand-created items.
 */

import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { parseCsvItems, type CsvParseResult } from "@/lib/trade/csv-import";

export function CsvImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: Array<{ name: string; error: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    setParsed(parseCsvItems(text));
  }

  async function runImport() {
    if (!parsed || parsed.rows.length === 0 || importing) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/trade/items/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: parsed.rows }),
      });
      if (!res.ok) {
        setError(`Import fehlgeschlagen (HTTP ${res.status}).`);
        return;
      }
      const json = (await res.json()) as {
        created: number;
        failed: Array<{ name: string; error: string }>;
      };
      setResult(json);
      onImported();
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    setResult(null);
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="CSV-Import"
    >
      <div className="w-full max-w-lg rounded-xl border border-trade-border bg-trade-bg-panel p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-trade-text-primary">
              Artikel aus CSV importieren
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-trade-text-muted">
              Benötigt die Spalten Name + Beschreibung (DE/EN-Header werden
              erkannt: Artikelname, Beschreibung, Artikelnummer, Hersteller,
              Ursprungsland …). Max. 200 Zeilen pro Import. Importierte Artikel
              starten als DRAFT — klassifiziert wird im Copilot.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            aria-label="Schließen"
            className="rounded-md p-1.5 text-trade-text-muted transition hover:bg-trade-hover"
          >
            <X size={16} />
          </button>
        </div>

        {result === null ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-trade-border-strong px-4 py-6 text-[13px] text-trade-text-secondary transition hover:bg-trade-hover"
            >
              <Upload size={16} aria-hidden="true" />
              {fileName ?? "CSV-Datei wählen"}
            </button>

            {parsed?.error ? (
              <p className="mt-3 text-[12px] text-red-600">{parsed.error}</p>
            ) : null}

            {parsed && !parsed.error ? (
              <div className="mt-4 rounded-lg border border-trade-border bg-trade-bg-inset p-3 text-[12px] text-trade-text-secondary">
                <div>
                  <strong className="text-trade-text-primary">
                    {parsed.rows.length}
                  </strong>{" "}
                  Zeilen importierbar
                  {parsed.skipped.length > 0
                    ? ` · ${parsed.skipped.length} übersprungen`
                    : ""}
                </div>
                {parsed.skipped.slice(0, 5).map((s) => (
                  <div key={s.line} className="mt-1 text-trade-text-muted">
                    Zeile {s.line}: {s.reason}
                  </div>
                ))}
                {parsed.skipped.length > 5 ? (
                  <div className="mt-1 text-trade-text-muted">
                    … und {parsed.skipped.length - 5} weitere
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 text-[12px] text-red-600">{error}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg px-4 py-2 text-[13px] text-trade-text-muted transition hover:bg-trade-hover"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={
                  !parsed ||
                  !!parsed.error ||
                  parsed.rows.length === 0 ||
                  importing
                }
                className="flex items-center gap-2 rounded-lg bg-trade-text-primary px-4 py-2 text-[13px] font-medium text-trade-bg-panel transition hover:opacity-90 disabled:opacity-50"
              >
                {importing ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {parsed
                  ? `${parsed.rows.length} Artikel importieren`
                  : "Importieren"}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="rounded-lg border border-trade-border bg-trade-bg-inset p-4 text-[13px] text-trade-text-secondary">
              <div>
                <strong className="text-trade-text-primary">
                  {result.created}
                </strong>{" "}
                Artikel angelegt (DRAFT).
              </div>
              {result.failed.length > 0 ? (
                <div className="mt-2 text-red-600">
                  {result.failed.length} fehlgeschlagen:
                  {result.failed.slice(0, 5).map((f) => (
                    <div key={f.name} className="mt-0.5 text-[12px]">
                      {f.name}: {f.error}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-trade-text-primary px-4 py-2 text-[13px] font-medium text-trade-bg-panel transition hover:opacity-90"
              >
                Fertig
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
