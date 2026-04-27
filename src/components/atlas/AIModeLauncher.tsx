"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { AIMode } from "./ai-mode/AIMode";

/**
 * Floating "AI Mode" entry-point. Renders the Sparkles pill in the
 * top-right corner of every Atlas page, plus the overlay itself when
 * opened. Mounted globally from AtlasShell so users can summon the
 * AI Mode command palette (compare / cite / explain / draft) from any
 * page — previously the launcher lived only on the homepage and was
 * unreachable from sources, cases, jurisdictions, etc.
 *
 * Programmatic opens — other pages (e.g. /atlas/drafting) can dispatch
 * a `CustomEvent("atlas-ai-mode-open")` with `{ detail: { prompt } }`
 * to open the overlay with a pre-filled message. The launcher listens
 * globally so any page can trigger it without prop-drilling.
 *
 * Keyboard shortcut: ⌘K is already bound to the search palette;
 * AI Mode opens via Sparkles click only. Adding a competing shortcut
 * would race the palette and confuse the muscle memory.
 */

/** Event name for "open AI Mode (optionally with a prompt)". */
export const AI_MODE_OPEN_EVENT = "atlas-ai-mode-open";

export interface AIModeOpenDetail {
  prompt?: string;
}

/** Helper: dispatch the open-event from any client component. */
export function openAIMode(detail: AIModeOpenDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AIModeOpenDetail>(AI_MODE_OPEN_EVENT, { detail }),
  );
}

export function AIModeLauncher() {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AIModeOpenDetail>).detail ?? {};
      setPrefill(detail.prompt);
      setOpen(true);
    };
    window.addEventListener(AI_MODE_OPEN_EVENT, handler);
    return () => window.removeEventListener(AI_MODE_OPEN_EVENT, handler);
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setPrefill(undefined);
          setOpen(true);
        }}
        aria-label="Enter AI Mode"
        className="fixed top-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full
          bg-[#0f0f12] text-white/90
          text-[11px] font-medium tracking-[0.08em] uppercase
          hover:bg-[#1a1a1f] hover:text-white
          transition-colors duration-200
          border border-white/[0.06]
          shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(255,255,255,0.04)_inset]"
      >
        <Sparkles size={13} strokeWidth={1.8} className="opacity-80" />
        <span>AI Mode</span>
      </button>
      <AIMode
        open={open}
        onClose={() => {
          setOpen(false);
          // Clear the prefill on close so the next manual open
          // doesn't carry over the previous prompt.
          setPrefill(undefined);
        }}
        initialPrompt={prefill}
      />
    </>
  );
}
