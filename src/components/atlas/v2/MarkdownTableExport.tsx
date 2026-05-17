"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Markdown table wrapper with PDF download button.
 *
 * Plug into react-markdown's `components.table` override so that EVERY
 * markdown table in chat / agent artifacts shows a small "PDF" button
 * on hover. Extracts the table's headers + rows from the rendered
 * children and ships them through jsPDF + jspdf-autotable.
 *
 * Standalone — uses jsPDF directly (no dependency on artifact-pdf.ts
 * since we don't have artifact metadata at the table-level).
 *
 * NOTE: Atlas v2's MarkdownContent.tsx uses a custom parser (NOT
 * react-markdown). To use this component with the custom renderer,
 * wrap the table output in renderBlock by passing header/rows directly
 * via the `header` and `rows` props instead of the `children` prop.
 * See "Integration" section below.
 *
 * ── Integration with MarkdownContent.tsx ─────────────────────────────
 *
 * Option A — react-markdown (if ever adopted):
 *   import { MarkdownTableExport } from "./MarkdownTableExport";
 *   <ReactMarkdown components={{ table: MarkdownTableExport }}>
 *     {text}
 *   </ReactMarkdown>
 *
 * Option B — custom MarkdownContent.tsx (current renderer):
 *   Replace the table <div> wrapper in renderBlock with:
 *     <MarkdownTableExport key={key} header={b.header} rows={b.rows}>
 *       ... existing thead / tbody JSX ...
 *     </MarkdownTableExport>
 *   This passes structured data directly so no JSX-tree walking is needed.
 *
 * Both modes are supported by this component's dual-prop API.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  Children,
  isValidElement,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Download } from "lucide-react";

type ReactChildren = ReactNode | ReactNode[];

/* ── JSX-tree extraction (used when `children` prop is provided) ────── */

/* Extract text from a react-markdown subtree. We walk the children
   recursively gathering all text nodes. Used to read table cell
   contents back into strings for autoTable. */
function extractText(node: ReactChildren): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

/* Pull headers + body rows out of a react-markdown rendered <table>.
   Structure: table > thead > tr > th, table > tbody > tr > td. */
function parseRenderedTable(children: ReactChildren): {
  headers: string[];
  rows: string[][];
} {
  let headers: string[] = [];
  const rows: string[][] = [];

  const visit = (node: ReactChildren) => {
    if (!isValidElement(node)) {
      if (Array.isArray(node)) node.forEach(visit);
      return;
    }
    const el = node as React.ReactElement<{
      children?: ReactNode;
    }> & { type: string | React.ComponentType };
    const tag = typeof el.type === "string" ? el.type.toLowerCase() : "";

    if (tag === "thead") {
      const tr = Children.toArray(el.props.children).find(
        (c) =>
          isValidElement(c) &&
          typeof (c as React.ReactElement).type === "string" &&
          ((c as React.ReactElement).type as string).toLowerCase() === "tr",
      );
      if (tr && isValidElement(tr)) {
        const trEl = tr as React.ReactElement<{ children?: ReactNode }>;
        headers = Children.toArray(trEl.props.children)
          .filter(
            (c) =>
              isValidElement(c) &&
              typeof (c as React.ReactElement).type === "string" &&
              ((c as React.ReactElement).type as string).toLowerCase() === "th",
          )
          .map((th) => {
            const thEl = th as React.ReactElement<{ children?: ReactNode }>;
            return extractText(thEl.props.children).trim();
          });
      }
    } else if (tag === "tbody") {
      const trs = Children.toArray(el.props.children).filter(
        (c) =>
          isValidElement(c) &&
          typeof (c as React.ReactElement).type === "string" &&
          ((c as React.ReactElement).type as string).toLowerCase() === "tr",
      );
      for (const tr of trs) {
        const trEl = tr as React.ReactElement<{ children?: ReactNode }>;
        const cells = Children.toArray(trEl.props.children)
          .filter(
            (c) =>
              isValidElement(c) &&
              typeof (c as React.ReactElement).type === "string" &&
              ((c as React.ReactElement).type as string).toLowerCase() === "td",
          )
          .map((td) => {
            const tdEl = td as React.ReactElement<{ children?: ReactNode }>;
            return extractText(tdEl.props.children).trim();
          });
        if (cells.length > 0) rows.push(cells);
      }
    } else if (el.props && el.props.children !== undefined) {
      Children.forEach(el.props.children, visit);
    }
  };

  visit(children);
  return { headers, rows };
}

/* ── PDF export ──────────────────────────────────────────────────────── */

async function exportTablePdf(headers: string[], rows: string[][]) {
  /* Dynamic import keeps jsPDF + jspdf-autotable out of the main
     chat bundle; only loaded when user actually clicks the button. */
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Tabelle", 22, 24);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(new Date().toLocaleDateString("de-DE"), 22, 30);

  autoTable(doc, {
    head: headers.length > 0 ? [headers] : undefined,
    body: rows,
    startY: 36,
    margin: { left: 22, right: 22 },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
  });

  doc.save("atlas-tabelle.pdf");
}

/* ── Component ───────────────────────────────────────────────────────── */

interface MarkdownTableExportProps {
  children?: ReactNode;
  /**
   * Structured header cells — pass when integrating with
   * MarkdownContent.tsx's custom renderer (Option B). When provided,
   * the JSX-tree walker is skipped entirely (faster + more accurate).
   */
  header?: string[];
  /**
   * Structured body rows — companion to `header`. Each inner array is
   * one row of cell strings in column order.
   */
  rows?: string[][];
}

export function MarkdownTableExport({
  children,
  header,
  rows,
}: MarkdownTableExportProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let resolvedHeaders: string[];
      let resolvedRows: string[][];

      if (header !== undefined && rows !== undefined) {
        /* Option B — structured data passed directly from renderBlock. */
        resolvedHeaders = header;
        resolvedRows = rows;
      } else {
        /* Option A — extract from react-markdown JSX tree. */
        const parsed = parseRenderedTable(children);
        resolvedHeaders = parsed.headers;
        resolvedRows = parsed.rows;
      }

      if (resolvedRows.length === 0 && resolvedHeaders.length === 0) return;
      await exportTablePdf(resolvedHeaders, resolvedRows);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapRef} className="group relative my-3 overflow-x-auto">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="absolute right-2 top-2 z-10 hidden items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[10.5px] text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 group-hover:inline-flex dark:border-white/[0.10] dark:bg-black/60 dark:text-slate-300 dark:hover:bg-white/[0.05]"
        title="Tabelle als PDF herunterladen"
      >
        <Download size={10} />
        {busy ? "…" : "PDF"}
      </button>
      <table className="w-full border-collapse text-[12.5px]">{children}</table>
    </div>
  );
}
