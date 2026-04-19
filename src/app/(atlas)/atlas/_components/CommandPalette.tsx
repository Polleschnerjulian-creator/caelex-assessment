"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/**
 * Lightweight wrapper for the Atlas command palette (C5).
 *
 * The heavy modal (which imports all 21 legal-source country files, all
 * authorities and the national-space-law map) is loaded via `dynamic()`
 * with `ssr: false` only when the user actually presses Cmd/Ctrl+K.
 * Until then, the bundle cost is a few lines of key-listener code.
 *
 * This closes the "CommandPalette bundle explodes" finding — previously
 * every Atlas page paid the full data-file cost on first load regardless
 * of whether the palette was ever opened.
 */

// Dynamic client-only import. Next/webpack code-splits this into its own
// chunk; the chunk is downloaded on the first open, then cached for the
// rest of the session.
const CommandPaletteModal = dynamic(() => import("./CommandPaletteModal"), {
  ssr: false,
  loading: () => null,
});

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  return <CommandPaletteModal onClose={() => setOpen(false)} />;
}
