"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Keyboard-help overlay.
 *
 * Modal that lists the current Atlas hotkeys. Opens via `?` (anywhere
 * outside text inputs), closes via Esc or backdrop tap. The keys
 * shown adapt to the user's platform (⌘ vs Ctrl).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Binding {
  keys: string[];
  description: string;
}

export function KeyboardHelpOverlay({ open, onClose }: Props) {
  const [isMac, setIsMac] = useState(true);

  /* Detect platform post-hydration. SSR is OS-agnostic. */
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMac(
      /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent),
    );
  }, []);

  if (!open) return null;

  const mod = isMac ? "⌘" : "Ctrl";

  const bindings: Binding[] = [
    { keys: [mod, "K"], description: "Eingabefeld fokussieren" },
    { keys: [mod, "⇧", "O"], description: "Neuen Chat starten" },
    { keys: [mod, "\\"], description: "Sidebar ein-/ausblenden" },
    { keys: ["?"], description: "Diese Hilfe öffnen / schließen" },
    { keys: ["Esc"], description: "Overlay / Popover schließen" },
    { keys: ["Enter"], description: "Nachricht senden (im Eingabefeld)" },
    { keys: ["⇧", "Enter"], description: "Zeilenumbruch (im Eingabefeld)" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tastatur-Kürzel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm dark:bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            Tastatur-Kürzel
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="space-y-2">
          {bindings.map((b, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 py-1"
            >
              <span className="text-[13px] text-slate-700 dark:text-slate-300">
                {b.description}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {b.keys.map((k, ki) => (
                  <kbd
                    key={ki}
                    className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
