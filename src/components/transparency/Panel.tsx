"use client";

/**
 * TransparencyPanel — the three-region shell per the implementation
 * brief (Part 3.2).
 *
 *   ┌─ Header (56px, pinned) ───────────────────┐
 *   │  [AI] Title  · [status]   · ⋮  ⤢  ✕      │
 *   ├─ TitleBar (sticky under header) ──────────┤
 *   │  H1 question  · [Edit interpretation]    │
 *   ├─ Body (scrolls) ───────────────────────────┤
 *   │  <slot> — Sections 1–7 render here        │
 *   ├─ Footer (48px, pinned) ────────────────────┤
 *   │  Model · Regs synced · [Flag] [Export ↓]  │
 *   └────────────────────────────────────────────┘
 *
 * The panel is designed to live INSIDE a two-pane shell — it's the
 * right pane of WorkflowShell. Width is resize-persisted via
 * usePanelWidth. The root has the `.caelex-transparency` wrapper class
 * inherited from the workflow layout.
 */

import * as React from "react";
import Link from "next/link";
import { X, MoreHorizontal, Flag, Download, Maximize2 } from "lucide-react";
import { cn } from "@/lib/transparency/cn";
import { AIBadge } from "./AIBadge";
import { StatusFlag, type StatusKind } from "./StatusFlag";

export interface PanelHeaderMeta {
  /** Short one-line title shown in the sticky header — truncated with ellipsis. */
  compactTitle: string;
  /** Optional article reference or source identifier, shown next to the title. */
  subtitle?: string;
  /** Regulation status flag (KeyCite-style). Optional. */
  status?: StatusKind;
  /** AI model identifier for the violet badge. */
  aiModel?: string;
  /** AI training cutoff. */
  aiCutoff?: string;
}

export interface PanelFooterMeta {
  /** Model version string — "gpt-4o · 2026-04" or similar. */
  model?: string;
  /** ISO date of regulation catalogue last sync. */
  regsSynced?: string;
  /** Optional "Last answered" timestamp ISO. */
  answeredAt?: string;
  /** Callback for Flag-for-review button. */
  onFlag?: () => void;
  /** Export callback — supply as an href (download) or click handler. */
  onExport?: () => void;
}

interface TransparencyPanelProps {
  /** Large H1 question/article title shown in the title bar below the header. */
  title: string;
  /** Optional human-readable "I understood your question as: …" line shown
   *  under the title. Editing opens an inline form via onEditInterpretation. */
  interpretation?: string;
  onEditInterpretation?: () => void;
  /** Header metadata — compact title (for the top strip), status flag, AI badge. */
  header: PanelHeaderMeta;
  /** Footer metadata — model/sync/export/flag. */
  footer?: PanelFooterMeta;
  /** When set, the panel renders a close button in the header that calls this. */
  onClose?: () => void;
  /** When set, the panel renders a resize handle on the left edge; caller
   *  passes a starter from usePanelWidth.startDrag. */
  onResizeStart?: (e: React.MouseEvent) => void;
  /** Click on the `⤢` reset button — restores default width. */
  onResizeReset?: () => void;
  /** Children render inside the scrollable body — Sections 1–7. */
  children: React.ReactNode;
  /** Extra Tailwind classes for the outer <aside>. */
  className?: string;
  /** Pixel width — set from usePanelWidth. Defaults to 420. */
  width?: number;
}

export function TransparencyPanel({
  title,
  interpretation,
  onEditInterpretation,
  header,
  footer,
  onClose,
  onResizeStart,
  onResizeReset,
  children,
  className,
  width = 420,
}: TransparencyPanelProps) {
  return (
    <aside
      role="complementary"
      aria-label={`Transparency inspector for ${header.compactTitle}`}
      style={{ width: `${width}px` }}
      className={cn(
        "relative flex flex-col h-full max-h-screen",
        "bg-[--n-2] text-[--n-12]",
        // single left-edge hairline, no drop shadow (in-plane)
        "border-l border-[--n-6]",
        className,
      )}
    >
      {/* Left-edge resize handle — 4px hit area, cursor + visual hint on hover */}
      {onResizeStart && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          onMouseDown={onResizeStart}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 -translate-x-1/2 cursor-ew-resize",
            "hover:bg-[--trust-8]/40 transition-colors duration-[--tp-dur-fast] ease-[--tp-ease-hover]",
            "group",
          )}
        >
          <span className="sr-only">Drag to resize</span>
        </div>
      )}

      {/* ── Header (56px, pinned) ─────────────────────────────────────── */}
      <header className="flex-shrink-0 h-14 px-5 flex items-center gap-2 border-b border-[--n-6]">
        {header.aiModel && (
          <AIBadge model={header.aiModel} cutoff={header.aiCutoff} />
        )}
        <span className="flex-1 min-w-0 truncate tp-text-sm text-[--n-11]">
          {header.compactTitle}
          {header.subtitle && (
            <span className="ml-2 text-[--n-9]">{header.subtitle}</span>
          )}
        </span>
        {header.status && <StatusFlag status={header.status} />}
        <div className="flex items-center gap-1 text-[--n-9]">
          <IconButton aria-label="Panel options">
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>
          {onResizeReset && (
            <IconButton aria-label="Reset panel width" onClick={onResizeReset}>
              <Maximize2 className="w-3.5 h-3.5" />
            </IconButton>
          )}
          {onClose && (
            <IconButton aria-label="Close panel" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          )}
        </div>
      </header>

      {/* ── Title bar (sticky under header) ───────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-[--n-6]">
        <h1 className="tp-text-2xl text-[--n-12] leading-tight">{title}</h1>
        {interpretation && (
          <p className="mt-1.5 tp-text-sm text-[--n-11]">
            <span className="text-[--n-9]">
              I understood your question as:{" "}
            </span>
            {interpretation}
            {onEditInterpretation && (
              <button
                type="button"
                onClick={onEditInterpretation}
                className="ml-2 text-[--trust-9] hover:underline tp-text-xs"
              >
                Edit interpretation
              </button>
            )}
          </p>
        )}
      </div>

      {/* ── Body (scrolls) ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 py-4">{children}</div>
      </div>

      {/* ── Footer (48px, pinned) ─────────────────────────────────────── */}
      {footer && (
        <footer className="flex-shrink-0 h-12 px-5 border-t border-[--n-6] flex items-center justify-between gap-3">
          <p className="tp-mono-xs text-[--n-9] truncate">
            {footer.model && <span>{footer.model}</span>}
            {footer.model && footer.regsSynced && (
              <span className="mx-2 opacity-60">·</span>
            )}
            {footer.regsSynced && <span>Regs {footer.regsSynced}</span>}
          </p>
          <div className="flex items-center gap-1">
            {footer.onFlag && (
              <button
                type="button"
                onClick={footer.onFlag}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-[--tp-radius-sm]",
                  "tp-text-xs text-[--n-11]",
                  "hover:bg-[--n-3] hover:text-[--n-12]",
                  "transition-colors duration-[--tp-dur-fast] ease-[--tp-ease-hover]",
                )}
              >
                <Flag className="w-3 h-3" />
                Flag
              </button>
            )}
            {footer.onExport && (
              <button
                type="button"
                onClick={footer.onExport}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-[--tp-radius-sm]",
                  "tp-text-xs text-[--n-11]",
                  "hover:bg-[--n-3] hover:text-[--n-12]",
                  "transition-colors duration-[--tp-dur-fast] ease-[--tp-ease-hover]",
                )}
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            )}
          </div>
        </footer>
      )}
    </aside>
  );
}

// ─── Local primitives ─────────────────────────────────────────────────

const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex items-center justify-center w-7 h-7 rounded-[--tp-radius-sm]",
      "text-[--n-9] hover:text-[--n-12] hover:bg-[--n-3]",
      "transition-colors duration-[--tp-dur-fast] ease-[--tp-ease-hover]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--trust-8] focus-visible:ring-offset-1 focus-visible:ring-offset-[--n-2]",
      className,
    )}
    {...props}
  />
));
IconButton.displayName = "IconButton";

// ─── Section — a named region inside the body ─────────────────────────

interface PanelSectionProps {
  /** Section number (1–7 per the brief). Renders as a grey numeric prefix. */
  number: number;
  /** Section label — "Why this question", "Regulatory chain", etc. */
  label: string;
  /** Optional collapsible behaviour — collapsed by default if true. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PanelSection({
  number,
  label,
  collapsible,
  defaultOpen = true,
  children,
  className,
}: PanelSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section
      className={cn("border-t border-[--n-6] first:border-t-0 py-5", className)}
    >
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        disabled={!collapsible}
        aria-expanded={collapsible ? open : undefined}
        className={cn(
          "w-full flex items-center gap-2 mb-3",
          "text-left tp-text-xs tracking-[0.12em] uppercase text-[--n-9]",
          collapsible && "hover:text-[--n-11] cursor-pointer",
          !collapsible && "cursor-default",
        )}
      >
        <span className="text-[--n-10] tp-mono-xs">
          {String(number).padStart(2, "0")}
        </span>
        <span>{label}</span>
      </button>
      {(!collapsible || open) && children}
    </section>
  );
}

// Re-export used pieces so consumers only import from one place.
export { Link };
