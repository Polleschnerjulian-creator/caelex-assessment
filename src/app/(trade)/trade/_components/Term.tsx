"use client";

/**
 * Term — inline jargon tooltip for compliance acronyms (U-HIGH-7).
 *
 * Wraps a compliance term ("ECCN", "FDPR", "BAFA", …) with a dotted
 * underline + hover/focus tooltip that shows the one-sentence glossary
 * definition. Looks up entries in `src/lib/trade/glossary.ts` — same
 * source-of-truth as the full Help Center side-panel.
 *
 * Usage:
 *   <Term>ECCN</Term>                  // term = children, looked up
 *   <Term term="ECCN">code</Term>      // explicit term, custom label
 *   <Term term="madeUpAcronym">…</Term> // falls back to plain text
 *
 * Accessibility:
 *   - The trigger is a `<span tabindex=0 role=button aria-describedby=…>`
 *     so keyboard users can focus + read the tooltip via screen reader.
 *   - The tooltip itself has `role="tooltip"`.
 *   - Focus AND hover both open. Touch users can tap (focus simulates).
 *   - Esc closes when focused.
 *   - When the term isn't in the glossary, renders as plain inline
 *     text (no styling, no tooltip overhead, no a11y burden).
 *
 * Performance:
 *   - Tooltip DOM is only mounted when open (no always-on portal).
 *   - No external libraries — pure React + Tailwind. The trade-off vs
 *     Radix Tooltip is "no auto-positioning above-vs-below"; we hard-
 *     code a sensible above-trigger position with viewport-safe styling.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { lookupTerm } from "@/lib/trade/glossary";

interface Props {
  /** Glossary key — defaults to `children` if both are strings. */
  term?: string;
  /** Visible content. Defaults to `term` if omitted. */
  children?: React.ReactNode;
  /** Override the visible label without changing the lookup key. */
  className?: string;
}

export function Term({ term, children, className = "" }: Props) {
  // Resolve the lookup key. If `term` was passed explicitly, use it.
  // Otherwise, if `children` is a plain string, treat that as the key.
  // If both are missing, render nothing — no point.
  const lookupKey =
    term ?? (typeof children === "string" ? children : undefined);
  const entry = lookupKey ? lookupTerm(lookupKey) : undefined;
  const visible = children ?? lookupKey;

  // No visible content + no lookup → render nothing. Defensive.
  if (!visible) return null;

  // Lookup miss → render plain inline text. We deliberately do NOT
  // surface a tooltip with a "not found" message; that would create
  // noise on every typo or new acronym not yet glossarised.
  if (!entry) {
    return <span className={className}>{visible}</span>;
  }

  return (
    <TermWithTooltip entry={entry} className={className}>
      {visible}
    </TermWithTooltip>
  );
}

// ─── Internal — the actual interactive variant ─────────────────────────

function TermWithTooltip({
  entry,
  children,
  className,
}: {
  entry: { term: string; definition: string; category?: string };
  children: React.ReactNode;
  className: string;
}) {
  const [open, setOpen] = React.useState(false);
  const idRef = React.useRef(
    `trade-term-${Math.random().toString(36).slice(2, 9)}`,
  );

  // Esc closes when focused — small UX touch so the keyboard user can
  // dismiss the tooltip without leaving the focused element.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <span className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        aria-describedby={open ? idRef.current : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={`cursor-help underline decoration-dotted underline-offset-2 transition hover:text-trade-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trade-accent/40 ${className}`}
        style={{
          textDecorationColor: "var(--trade-text-muted, rgba(0,0,0,0.35))",
        }}
      >
        {children}
      </span>
      {open ? (
        <span
          id={idRef.current}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-[260px] -translate-x-1/2 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-2 text-left text-[12px] leading-relaxed text-trade-text-primary shadow-lg"
        >
          <span className="block font-semibold">{entry.term}</span>
          {entry.category ? (
            <span className="block text-[10px] uppercase tracking-wider text-trade-text-muted">
              {entry.category}
            </span>
          ) : null}
          <span className="mt-1 block text-trade-text-secondary">
            {entry.definition}
          </span>
        </span>
      ) : null}
    </span>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
