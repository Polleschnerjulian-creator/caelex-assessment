// src/app/(trade)/trade/assess/_components/EntryChoice.tsx
"use client";
import { Upload, PencilLine, ArrowRight } from "lucide-react";

export function EntryChoice({
  onUpload,
  onManual,
}: {
  onUpload: () => void;
  onManual: () => void;
}) {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2"
      data-testid="assess-entry-step"
    >
      <button
        type="button"
        data-testid="entry-upload"
        onClick={onUpload}
        className="rounded-xl border border-trade-border bg-trade-bg-panel p-6 text-left transition hover:bg-trade-hover"
      >
        <Upload className="h-6 w-6 text-trade-accent" />
        <h3 className="mt-3 text-title text-trade-text-primary">
          Datenblatt hochladen
        </h3>
        <p className="mt-1 text-sm text-trade-text-muted">
          Wir lesen die Spezifikationen aus dem PDF und füllen die relevanten
          Felder vor.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm text-trade-accent">
          Weiter <ArrowRight className="h-4 w-4" />
        </span>
      </button>
      <button
        type="button"
        data-testid="entry-manual"
        onClick={onManual}
        className="rounded-xl border border-trade-border bg-trade-bg-panel p-6 text-left transition hover:bg-trade-hover"
      >
        <PencilLine className="h-6 w-6 text-trade-accent" />
        <h3 className="mt-3 text-title text-trade-text-primary">
          Manuell eingeben
        </h3>
        <p className="mt-1 text-sm text-trade-text-muted">
          Produktklasse wählen und die relevanten Werte selbst eintragen.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm text-trade-accent">
          Weiter <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    </section>
  );
}
