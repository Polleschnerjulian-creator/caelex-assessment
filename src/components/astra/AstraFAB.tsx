"use client";

import { useAstra } from "./AstraProvider";
import { Sparkles } from "lucide-react";

/**
 * Floating Action Button for ASTRA
 *
 * Fixed button in bottom-right corner that opens the ASTRA chat panel.
 * Only visible when the chat panel is closed.
 */
export default function AstraFAB() {
  const { isOpen, openGeneral } = useAstra();

  // Don't show FAB when chat is already open
  if (isOpen) return null;

  return (
    <button
      onClick={openGeneral}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3
                 bg-emerald-500 hover:bg-emerald-600
                 text-white font-medium rounded-full
                 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40
                 transition-all duration-200 hover:scale-105
                 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                 focus:ring-offset-[#0A0A0B]"
      aria-label="Open ASTRA AI Assistant"
    >
      <Sparkles className="w-5 h-5" />
      <span className="hidden sm:inline">Ask ASTRA</span>
    </button>
  );
}
