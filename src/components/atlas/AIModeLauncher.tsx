"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Lazy-load the AI Mode overlay — it pulls in three.js, the legal corpus,
// and ~3 MB of assets that are never needed until the user first opens it.
// The dynamic import resolves the named export `AIMode` from the module.
const AIMode = dynamic(() => import("./ai-mode/AIMode").then((m) => m.AIMode), {
  ssr: false,
});

/**
 * "AI Mode" host. Mounts the AI Mode overlay and the global
 * `atlas-ai-mode-open` event listener.
 *
 * (The floating Sparkles "AI Mode" pill that used to sit in the
 * top-right corner of every Atlas page was removed on request,
 * 2026-06-02. There is no longer a direct click affordance here.)
 *
 * Opening AI Mode — pages dispatch a `CustomEvent("atlas-ai-mode-open")`
 * with `{ detail: { prompt } }` (via the `openAIMode()` helper below) to
 * open the overlay, optionally pre-filled. The listener is global so any
 * page can trigger it without prop-drilling; entry points live on the
 * pages that call `openAIMode()` (e.g. /atlas/drafting).
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
  // Tracks whether the overlay has ever been opened in this session.
  // The heavy AIMode chunk (three.js + legal corpus) is not rendered at all
  // until the first open — after that it stays mounted (hidden via open=false)
  // so subsequent opens are instant. This is the key bundle-deferral gate.
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AIModeOpenDetail>).detail ?? {};
      setPrefill(detail.prompt);
      setOpen(true);
      setHasOpened(true);
    };
    window.addEventListener(AI_MODE_OPEN_EVENT, handler);
    return () => window.removeEventListener(AI_MODE_OPEN_EVENT, handler);
  }, []);

  // The floating top-right "AI Mode" Sparkles button was removed on
  // request (2026-06-02). AI Mode is still reachable programmatically via
  // openAIMode() / the `atlas-ai-mode-open` event (drafting pages, etc.) —
  // this component now hosts only the overlay + the global listener.
  //
  // We only render <AIMode> once it has been opened at least once — this
  // keeps the ~3 MB chunk (three.js + legal corpus) out of the initial
  // bundle entirely. After first open the component stays mounted so
  // subsequent opens are instant (no re-download, no remount flash).
  if (!hasOpened) return null;

  return (
    <AIMode
      open={open}
      onClose={() => {
        setOpen(false);
        // Clear the prefill on close so the next programmatic open
        // doesn't carry over the previous prompt.
        setPrefill(undefined);
      }}
      initialPrompt={prefill}
    />
  );
}
