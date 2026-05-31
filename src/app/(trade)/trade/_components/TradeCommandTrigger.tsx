"use client";

import { Search } from "lucide-react";
import { TRADE_COMMAND_EVENT } from "./TradeCommandPalette";

/**
 * A lightweight, visible ⌘K trigger pill for page headers (e.g. Home).
 *
 * It does NOT mount its own palette — it dispatches `TRADE_COMMAND_EVENT`,
 * which the single shell-level `<TradeCommandPalette showPill={false} />`
 * listens for. This avoids double-mounting the palette (two listeners / two
 * modals) while still giving a page a visible search-or-act affordance.
 */
export function TradeCommandTrigger() {
  return (
    <button
      data-testid="cmdk-trigger"
      onClick={() => window.dispatchEvent(new Event(TRADE_COMMAND_EVENT))}
      className="inline-flex items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-elevated px-3 py-1.5 text-xs text-trade-text-muted transition hover:bg-trade-hover"
    >
      <Search className="h-3.5 w-3.5" />
      <span>⌘K&nbsp;&nbsp;Suchen oder Aktion…</span>
    </button>
  );
}
