"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the dependency-free export control (P2 interactivity).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A single button that downloads the dataset a page already has in memory as a
 * CSV — entirely client-side (a Blob + a synthetic <a download> click), with NO
 * backend round-trip and NO new dependency. The CSV serialisation +
 * formula-injection defang live in the PURE, unit-tested {@link toCsv} /
 * {@link csvFilename} helpers; this component only turns that string into a file.
 *
 * PNG export — deliberately NOT shipped as a live button. A robust, dependency-
 * free DOM→PNG path does not exist: the SVG `foreignObject` trick taints the
 * canvas (so `toDataURL` throws a SecurityError in most browsers) and faithfully
 * rasterising arbitrary CSS needs a heavy library (html2canvas et al.), which
 * this surface forbids. Rather than ship a button that silently produces a blank
 * or broken image, we render a clearly-labelled, disabled "PNG · soon"
 * affordance when `pngTargetRef` is provided, so the intent is visible without a
 * trap. (Flip `enablePng` on once a sanctioned rasteriser is adopted.)
 *
 * The component is controlled only by its props — it holds a tiny "downloading"
 * latch purely to debounce a double-click, never any business state.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useRef, useState, type RefObject } from "react";
import { Download } from "lucide-react";
import { toCsv, csvFilename, type CsvRow } from "./export-utils";

export interface ExportButtonProps {
  /** The in-memory dataset to export. Each row is a flat key→value record. */
  rows: readonly CsvRow[];
  /** Filename stem (no extension); sanitised + ".csv" appended. */
  filename: string;
  /**
   * Optional explicit column spec — order + headers. A bare string is a key used
   * as its own header; `{ key, header }` relabels. Omit to derive columns from
   * the union of row keys in first-seen order.
   */
  columns?: ReadonlyArray<string | { key: string; header: string }>;
  /** Button label (default "CSV exportieren"). */
  label?: string;
  /**
   * A ref to the DOM node a future PNG export would capture. When provided, a
   * disabled "PNG · soon" affordance is rendered next to the CSV button. Wiring
   * the ref now (in the pages) means PNG lights up with zero page changes later.
   */
  pngTargetRef?: RefObject<HTMLElement | null>;
  /** Escape hatch to enable the PNG button once a rasteriser is sanctioned. */
  enablePng?: boolean;
  className?: string;
}

/** Shared pill styling for both the active CSV button and the disabled PNG one. */
const PILL_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 disabled:cursor-not-allowed";

export default function ExportButton({
  rows,
  filename,
  columns,
  label = "CSV exportieren",
  pngTargetRef,
  enablePng = false,
  className = "",
}: ExportButtonProps) {
  // Debounce latch only — prevents a second Blob/click while one is in flight.
  const [busy, setBusy] = useState(false);
  // Track the object URL so we can revoke it after the click (no memory leak).
  const lastUrlRef = useRef<string | null>(null);

  const hasRows = rows.length > 0 || (columns?.length ?? 0) > 0;

  const handleCsv = useCallback(() => {
    if (busy || !hasRows) return;
    // SSR / non-DOM guard — the button is client-only but stay defensive.
    if (typeof document === "undefined" || typeof URL === "undefined") return;

    setBusy(true);
    try {
      const csv = toCsv(rows, columns);
      // Prepend a UTF-8 BOM (U+FEFF) so Excel reads non-ASCII (é, €) correctly.
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      lastUrlRef.current = url;

      const a = document.createElement("a");
      a.href = url;
      a.download = csvFilename(filename);
      // Some browsers require the element to be in the document to honour the
      // programmatic click; append, click, then remove immediately.
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      // Revoke on the next tick so the navigation/download has grabbed the URL.
      const url = lastUrlRef.current;
      if (url) {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          if (lastUrlRef.current === url) lastUrlRef.current = null;
        }, 0);
      }
      setBusy(false);
    }
  }, [busy, hasRows, rows, columns, filename]);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleCsv}
        disabled={busy || !hasRows}
        aria-label={
          hasRows
            ? `${label} (lädt eine CSV-Datei herunter)`
            : "Nichts zu exportieren"
        }
        title={hasRows ? undefined : "Noch keine Daten zum Exportieren"}
        className={PILL_CLASS}
        style={{
          background: "var(--glass-bg-surface, transparent)",
          border: "1px solid var(--border-default)",
          color: hasRows ? "var(--text-primary)" : "var(--text-tertiary)",
          opacity: hasRows ? 1 : 0.6,
        }}
        onMouseEnter={(e) => {
          if (hasRows && !busy)
            e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-default)";
        }}
      >
        <Download size={13} aria-hidden="true" />
        {label}
      </button>

      {/* PNG affordance: only when a capture target is wired. Disabled until a
          sanctioned rasteriser exists — never a button that silently no-ops. */}
      {pngTargetRef && (
        <button
          type="button"
          disabled={!enablePng}
          aria-disabled={!enablePng}
          title={
            enablePng
              ? "Das Panel als PNG-Bild exportieren"
              : "PNG-Export kommt bald"
          }
          className={PILL_CLASS}
          style={{
            background: "transparent",
            border: "1px dashed var(--border-default)",
            color: "var(--text-tertiary)",
          }}
        >
          PNG
          {!enablePng && (
            <span
              className="rounded px-1 text-[9px] font-semibold uppercase tracking-[0.06em]"
              style={{
                background: "var(--separator-strong)",
                color: "var(--text-tertiary)",
              }}
            >
              bald
            </span>
          )}
        </button>
      )}
    </div>
  );
}
