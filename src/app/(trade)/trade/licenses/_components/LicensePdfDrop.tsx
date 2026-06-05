"use client";

/**
 * Caelex Trade — BAFA-Bescheid PDF Drop-Zone (M1-1C).
 *
 * Self-contained drop-zone that sits ABOVE the NewLicenseForm. Lets an
 * operator drag-drop (or click-select) a BAFA-Bescheid PDF, runs it
 * through POST /api/trade/licenses/parse, renders the extracted fields
 * with per-field confidence badges, and on "Use this data" hands the
 * values up to the parent form via `onExtracted`.
 *
 * Acceptance criteria (M1-1C):
 *   ✅ Operator drag-drops Bescheid → form pre-fills within ~10s.
 *   ✅ Low-confidence fields visually flagged (amber chip).
 *   ✅ Missing fields rendered with em-dash, not silently dropped.
 *   ✅ Operator can dismiss the panel and use manual entry instead.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type {
  BafaBescheidExtraction,
  FieldConfidence,
} from "@/lib/trade/licenses/bafa-bescheid-types";

// ─── Props ─────────────────────────────────────────────────────────────

export interface LicensePdfDropProps {
  /** Called when the operator approves the extraction. The parent form
   *  uses these values to pre-fill its inputs. Optional fields are
   *  passed as null / empty so the parent can decide what to do. */
  onExtracted: (extraction: BafaBescheidExtraction) => void;
}

// ─── Component ─────────────────────────────────────────────────────────

type State =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | {
      kind: "ready";
      fileName: string;
      extraction: BafaBescheidExtraction;
      latencyMs: number;
    }
  | {
      kind: "error";
      fileName: string | null;
      error: string;
      warnings?: string[];
    };

export function LicensePdfDrop({ onExtracted }: LicensePdfDropProps) {
  const [state, setState] = React.useState<State>({ kind: "idle" });
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { success, error: errorToast } = useToast();

  // Upload + parse the selected file. Idempotent — caller guarantees we
  // call once per file selection.
  const handleFile = React.useCallback(
    async (file: File) => {
      if (file.type && file.type !== "application/pdf") {
        setState({
          kind: "error",
          fileName: file.name,
          error: `Nur PDFs werden unterstützt (erhalten: ${file.type || "unbekannt"}).`,
        });
        return;
      }
      if (file.size === 0) {
        setState({
          kind: "error",
          fileName: file.name,
          error: "Die Datei ist leer.",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setState({
          kind: "error",
          fileName: file.name,
          error: `Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 5 MB.`,
        });
        return;
      }

      setState({ kind: "uploading", fileName: file.name });

      const fd = new FormData();
      fd.append("file", file);

      try {
        const res = await fetch("/api/trade/licenses/parse", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          extraction?: BafaBescheidExtraction;
          meta?: { latencyMs?: number };
          error?: string;
          warnings?: string[];
        };

        if (!res.ok || !data.ok || !data.extraction) {
          setState({
            kind: "error",
            fileName: file.name,
            error: data.error ?? `Parser-Fehler (HTTP ${res.status}).`,
            warnings: data.warnings,
          });
          errorToast(
            "Parse fehlgeschlagen",
            data.error ?? "Bitte manuell eintragen.",
          );
          return;
        }

        setState({
          kind: "ready",
          fileName: file.name,
          extraction: data.extraction,
          latencyMs: data.meta?.latencyMs ?? 0,
        });
        success(
          "Bescheid eingelesen",
          "Bitte Felder prüfen, dann auf »Werte übernehmen« klicken.",
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Netzwerk-Fehler";
        setState({ kind: "error", fileName: file.name, error: msg });
        errorToast("Upload fehlgeschlagen", msg);
      }
    },
    [success, errorToast],
  );

  // ─── Drop-zone event handlers ──────────────────────────────────────

  const onDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onPickFile = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset so the same file can be re-selected after dismissing.
    e.target.value = "";
  };

  const reset = () => setState({ kind: "idle" });

  const apply = () => {
    if (state.kind !== "ready") return;
    onExtracted(state.extraction);
    success(
      "Werte übernommen",
      "Felder unten sind vorausgefüllt — bitte vor Speichern prüfen.",
    );
    reset();
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="mb-4 rounded-md border border-trade-border-subtle bg-trade-bg-elevated">
      {state.kind === "idle" && (
        <IdleZone
          dragOver={dragOver}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onPickFile={onPickFile}
        />
      )}
      {state.kind === "uploading" && (
        <UploadingPanel fileName={state.fileName} />
      )}
      {state.kind === "ready" && (
        <ResultPanel
          fileName={state.fileName}
          extraction={state.extraction}
          latencyMs={state.latencyMs}
          onApply={apply}
          onDismiss={reset}
        />
      )}
      {state.kind === "error" && (
        <ErrorPanel
          fileName={state.fileName}
          error={state.error}
          warnings={state.warnings}
          onRetry={reset}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={onChange}
        aria-label="BAFA-Bescheid PDF auswählen"
      />
    </div>
  );
}

// ─── Sub-panels ────────────────────────────────────────────────────────

interface IdleZoneProps {
  dragOver: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onPickFile: () => void;
}

function IdleZone({
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onPickFile,
}: IdleZoneProps) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`flex flex-col items-center justify-center px-6 py-7 text-center transition-colors ${
        dragOver ? "border-trade-accent bg-trade-accent/5" : "bg-transparent"
      }`}
    >
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-trade-accent/10 text-trade-accent">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="mb-1 text-[13px] font-semibold text-trade-text-primary">
        Bescheid hochladen → Felder automatisch ausfüllen
      </p>
      <p className="mb-3 max-w-md text-[12px] text-trade-text-secondary">
        Zieh dein BAFA-Bescheid-PDF hier hinein (oder wähle es aus). Claude
        extrahiert Lizenznummer, Typ, Gültigkeit, Wert-Cap, abgedeckte
        ECCN-Codes und Länder. Du prüfst — wir füllen.
      </p>
      <button
        type="button"
        onClick={onPickFile}
        className="inline-flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-1.5 text-[12px] font-medium text-trade-text-primary transition hover:border-trade-accent hover:text-trade-accent"
      >
        <Upload className="h-3.5 w-3.5" />
        PDF auswählen
      </button>
      <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-trade-text-muted">
        Max 5 MB · application/pdf
      </p>
    </div>
  );
}

function UploadingPanel({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Loader2 className="h-5 w-5 animate-spin text-trade-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-trade-text-primary">
          {fileName}
        </p>
        <p className="text-[12px] text-trade-text-secondary">
          Claude liest den Bescheid… typisch 8–25 Sekunden.
        </p>
      </div>
    </div>
  );
}

interface ResultPanelProps {
  fileName: string;
  extraction: BafaBescheidExtraction;
  latencyMs: number;
  onApply: () => void;
  onDismiss: () => void;
}

function ResultPanel({
  fileName,
  extraction,
  latencyMs,
  onApply,
  onDismiss,
}: ResultPanelProps) {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-trade-accent-success" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-trade-text-primary">
              {fileName}
            </p>
            <p className="text-[11px] text-trade-text-muted">
              Eingelesen in {(latencyMs / 1000).toFixed(1)}s · bitte Felder
              prüfen
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Ergebnis verwerfen"
          className="text-trade-text-muted transition hover:text-trade-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FieldRow
          label="Lizenznummer"
          value={extraction.licenseNumber}
          confidence={extraction.fieldConfidence.licenseNumber}
        />
        <FieldRow
          label="Lizenztyp"
          value={extraction.licenseType}
          confidence={extraction.fieldConfidence.licenseType}
        />
        <FieldRow
          label="Ausgestellt"
          value={extraction.issuedAt}
          confidence={extraction.fieldConfidence.issuedAt}
        />
        <FieldRow
          label="Gültig bis"
          value={extraction.validUntil}
          confidence={extraction.fieldConfidence.validUntil}
        />
        <FieldRow
          label="Wert-Cap"
          value={
            extraction.totalCapValue !== null
              ? `${extraction.totalCapValue.toLocaleString("de-DE")} ${extraction.capCurrency}`
              : null
          }
          confidence={extraction.fieldConfidence.totalCapValue}
        />
        <FieldRow
          label="Währung"
          value={extraction.capCurrency}
          confidence={extraction.fieldConfidence.capCurrency}
        />
        <FieldRow
          label="ECCN-Codes"
          value={
            extraction.coveredEccnCodes.length > 0
              ? extraction.coveredEccnCodes.join(", ")
              : null
          }
          confidence={extraction.fieldConfidence.coveredEccnCodes}
        />
        <FieldRow
          label="Länder"
          value={
            extraction.coveredCountries.length > 0
              ? extraction.coveredCountries.join(", ")
              : null
          }
          confidence={extraction.fieldConfidence.coveredCountries}
        />
      </dl>

      {extraction.additionalConditions.length > 0 && (
        <details className="mt-4 rounded-md border border-trade-border-subtle bg-trade-bg-panel p-3">
          <summary className="cursor-pointer text-[12px] font-medium text-trade-text-primary">
            Auflagen / Nebenbestimmungen (
            {extraction.additionalConditions.length})
          </summary>
          <ul className="mt-2 space-y-1 text-[12px] text-trade-text-secondary">
            {extraction.additionalConditions.map((c, i) => (
              <li key={i} className="border-l-2 border-trade-border pl-2">
                {c}
              </li>
            ))}
          </ul>
        </details>
      )}

      {extraction.warnings.length > 0 && (
        <div className="mt-3 rounded-md p-3 trade-chip-warn">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-current" />
            <div className="space-y-1 text-[12px] text-current">
              {extraction.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-trade-border bg-trade-bg-panel px-3 py-1.5 text-[12px] font-medium text-trade-text-secondary transition hover:text-trade-text-primary"
        >
          Verwerfen
        </button>
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Werte übernehmen
        </button>
      </div>
    </div>
  );
}

interface ErrorPanelProps {
  fileName: string | null;
  error: string;
  warnings?: string[];
  onRetry: () => void;
}

function ErrorPanel({ fileName, error, warnings, onRetry }: ErrorPanelProps) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full trade-chip-danger">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {fileName && (
            <p className="mb-1 flex items-center gap-1.5 text-[12px] text-trade-text-muted">
              <FileText className="h-3 w-3" />
              <span className="truncate">{fileName}</span>
            </p>
          )}
          <p className="text-[13px] font-semibold text-trade-accent-danger">
            {error}
          </p>
          {warnings && warnings.length > 0 && (
            <ul className="mt-2 space-y-1 text-[12px] text-trade-accent-warn">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-1 text-[12px] font-medium text-trade-text-primary transition hover:border-trade-accent hover:text-trade-accent"
          >
            Anderes PDF auswählen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field-row with confidence badge ───────────────────────────────────

interface FieldRowProps {
  label: string;
  value: string | null;
  confidence: FieldConfidence;
}

function FieldRow({ label, value, confidence }: FieldRowProps) {
  const isEmpty = value === null || value === "";
  return (
    <div className="rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-2">
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
          {label}
        </dt>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <dd
        className={`text-[13px] ${isEmpty ? "text-trade-text-muted italic" : "text-trade-text-primary"}`}
      >
        {isEmpty ? "— nicht erkannt" : value}
      </dd>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: FieldConfidence }) {
  const meta = CONFIDENCE_META[confidence];
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${meta.className}`}
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}

const CONFIDENCE_META: Record<
  FieldConfidence,
  { label: string; className: string; title: string }
> = {
  high: {
    label: "Hoch",
    className: "trade-chip-success",
    title: "Hohe Konfidenz — Claude ist sich sicher",
  },
  medium: {
    label: "Mittel",
    className: "trade-chip-info",
    title: "Mittlere Konfidenz — bitte kurz prüfen",
  },
  low: {
    label: "Niedrig",
    className: "trade-chip-warn",
    title: "Niedrige Konfidenz — bitte manuell prüfen / korrigieren",
  },
  missing: {
    label: "Fehlt",
    className: "trade-chip-neutral",
    title: "Im Bescheid nicht gefunden — manuell ergänzen",
  },
};
