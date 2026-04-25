"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * CitationChip — Phase 3 inline citation highlighter.
 *
 * Renders a clickable pill inside an Atlas message wherever the
 * citation parser detected a legal reference (BWRG §3, NIS2 Art. 21,
 * Art. VI OST, etc.). Click toggles a small popover that shows:
 *
 *   - The full citation label
 *   - A one-line hint (jurisdictional context)
 *   - A "Bei Atlas nachfragen" action that injects an explain-prompt
 *     into the active conversation, so the lawyer can drill from
 *     "what is this citation" to a fully-streamed answer in one click
 *
 * Self-contained: each chip manages its own open state. The parent
 * tree only provides the `onAskAtlas` handler. Click-outside closes
 * via window-level mousedown listener.
 *
 * Anti-blackbox by design: every § in an Atlas answer is now an
 * inspectable artifact, not a string.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Citation } from "@/lib/atlas/citations";
import styles from "./ai-mode.module.css";

interface CitationChipProps {
  citation: Citation;
  /** Original raw text (e.g. "BWRG §3" exactly as Claude wrote it).
   *  Kept for visual continuity — the chip displays this raw form
   *  instead of the canonicalised label so streaming doesn't flicker
   *  characters mid-render. */
  rawText: string;
  /** Called when the lawyer clicks "Bei Atlas nachfragen" inside the
   *  popover. Parent (AIMode) wires this to inject + submit an
   *  explain-prompt through the existing chat pipeline. */
  onAskAtlas: (citation: Citation) => void;
}

export function CitationChip({
  citation,
  rawText,
  onAskAtlas,
}: CitationChipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Click-outside closes the popover. Listening via mousedown on the
  // window catches everything except clicks on the chip itself (which
  // we intercept and stopPropagation to keep the popover open during
  // re-clicks for toggle behaviour).
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  // ESC closes (works even if focus has moved to the popover button)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [open]);

  return (
    <span ref={wrapperRef} className={styles.citationWrapper}>
      <button
        type="button"
        className={`${styles.citationChip} ${
          open ? styles.citationChipOpen : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={`Citation ${citation.label}: Details öffnen`}
      >
        {rawText}
      </button>
      {open && (
        <span className={styles.citationPopover} role="dialog">
          <span className={styles.citationPopoverLabel}>{citation.label}</span>
          {citation.hint && (
            <span className={styles.citationPopoverHint}>{citation.hint}</span>
          )}
          <button
            type="button"
            className={styles.citationPopoverAction}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onAskAtlas(citation);
            }}
          >
            Bei Atlas nachfragen
            <ArrowUpRight size={11} strokeWidth={1.7} />
          </button>
        </span>
      )}
    </span>
  );
}
