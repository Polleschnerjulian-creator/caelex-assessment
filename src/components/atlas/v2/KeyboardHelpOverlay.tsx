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

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Binding {
  keys: string[];
  description: string;
}

/* AUDIT-FIX H27: focus-trap selector — keep in sync with the same
   constant in MandateAttachModal + OnboardingTour. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function KeyboardHelpOverlay({ open, onClose }: Props) {
  const [isMac, setIsMac] = useState(true);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  /* Detect platform post-hydration. SSR is OS-agnostic.
     AUDIT-FIX L14 (2026-05-15): use the modern `userAgentData.platform`
     when available — it returns a stable string ("macOS", "iOS",
     "Windows", etc.) and is unaffected by the long-running deprecation
     of `navigator.platform`. The fallback chain handles older browsers
     (Safari, Firefox, anything pre-Chromium-90) by reading the legacy
     `platform` property; only when both are missing do we sniff the
     UA string. The cast keeps TS happy without pulling in the
     experimental type defs for `NavigatorUAData`. */
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const navWithUaData = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platformSignal =
      navWithUaData.userAgentData?.platform ??
      navigator.platform ??
      navigator.userAgent ??
      "";
    setIsMac(/Mac|iPhone|iPad|iOS/i.test(platformSignal));
  }, []);

  /* AUDIT-FIX H27: focus-trap. Snapshot opener on open, move focus
     into modal, restore on close. Tab/Shift+Tab wrap inside the modal
     to keep keyboard users from escaping into background controls
     (sidebar, composer) while the help overlay is up. */
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    /* Defer one tick so the modal DOM is mounted before we focus. */
    const t = window.setTimeout(() => {
      const root = modalRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      focusables[0]?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  /* Tab-key trap — wraps focus within the modal. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      /* If focus has somehow escaped the modal, pull it back. */
      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  const mod = isMac ? "⌘" : "Ctrl";

  /* 2026-06-11 — Liste an die realen Bindings angeglichen: ⌘K öffnet
     seit Sprint 5b die Command-Palette (nicht mehr das Eingabefeld;
     das macht ⌘L, siehe useAtlasKeyboardShortcuts). Der ⌘\-Eintrag
     ist raus — der Sidebar-Toggle existiert seit dem Redesign
     (always-open Sidebar) nicht mehr. */
  const bindings: Binding[] = [
    { keys: [mod, "K"], description: "Command-Palette öffnen" },
    { keys: [mod, "L"], description: "Eingabefeld fokussieren" },
    { keys: [mod, "⇧", "O"], description: "Neuen Chat starten" },
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
        ref={modalRef}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.14)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_16px_40px_rgba(0,0,0,0.50)]"
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
