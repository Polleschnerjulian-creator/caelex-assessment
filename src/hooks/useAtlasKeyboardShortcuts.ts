"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * useAtlasKeyboardShortcuts — global hotkeys for Atlas V2.
 *
 * Bindings (mac uses ⌘, others Ctrl):
 *   ⌘\           Toggle sidebar (dispatches `atlas-v2-sidebar-toggle`)
 *   ⌘K           Focus the chat composer (dispatches
 *                `atlas-v2-focus-composer`); if not on a chat-input
 *                surface, navigates to /atlas first.
 *   ⌘⇧O          New chat (navigate to /atlas). ChatGPT-aligned.
 *   ?            Open the keyboard-help overlay
 *   Esc          Close any open overlay (best-effort — dispatches
 *                `atlas-v2-escape` so consumers can respond)
 *
 * Why custom events: state lives in the components that own it
 * (AtlasSidebar owns `collapsed`, ChatInput owns the textarea ref).
 * Cross-component coordination without a global store stays cheap
 * via the DOM event bus.
 *
 * Inputs are excluded — typing in a text field doesn't trigger
 * shortcuts. The only exception is Esc, which always fires.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export type AtlasShortcut =
  | "toggle-sidebar"
  | "focus-composer"
  | "new-chat"
  | "show-help"
  | "escape";

export interface UseAtlasKeyboardShortcuts {
  /** True while the help-overlay is visible. Controlled internally. */
  helpOpen: boolean;
  /** Close the help-overlay programmatically. */
  closeHelp: () => void;
}

export function useAtlasKeyboardShortcuts(): UseAtlasKeyboardShortcuts {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function isInsideInput(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handler(e: KeyboardEvent) {
      /* Esc always fires (even in inputs) — used to close overlays. */
      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
        window.dispatchEvent(new Event("atlas-v2-escape"));
        return;
      }

      /* Inside a text input? Ignore everything else. */
      if (isInsideInput(e.target)) return;

      /* ? — show keyboard help (no modifier required). */
      if (
        e.key === "?" ||
        (e.key === "/" && e.shiftKey && !e.metaKey && !e.ctrlKey)
      ) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      /* ⌘ (mac) or Ctrl (everyone else) chord. */
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      /* ⌘\ — toggle sidebar. */
      if (e.key === "\\") {
        e.preventDefault();
        window.dispatchEvent(new Event("atlas-v2-sidebar-toggle"));
        return;
      }

      /* ⌘K — focus composer (or jump to /atlas if not on a chat). */
      if (e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        if (
          pathname &&
          (pathname === "/atlas" || pathname.startsWith("/atlas/chat"))
        ) {
          window.dispatchEvent(new Event("atlas-v2-focus-composer"));
        } else {
          router.push("/atlas");
        }
        return;
      }

      /* ⌘⇧O — new chat (ChatGPT convention). */
      if (e.key.toLowerCase() === "o" && e.shiftKey) {
        e.preventDefault();
        router.push("/atlas");
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, pathname, helpOpen]);

  return {
    helpOpen,
    closeHelp: () => setHelpOpen(false),
  };
}
