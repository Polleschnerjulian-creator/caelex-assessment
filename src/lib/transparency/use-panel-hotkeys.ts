"use client";

/**
 * usePanelHotkeys — global keyboard shortcuts for the Transparency
 * Panel. Skips firing when focus is inside an input/textarea/contentEditable
 * so the user can type safely.
 *
 * Handlers:
 *   ⌘I (Ctrl+I on Windows)  — toggle panel open/closed
 *   Escape                   — close panel (if currently open)
 *   ?                         — toggle shortcut help overlay (wired by caller)
 *   ⌘+Enter                   — "flag for review" (wired by caller)
 */

import { useEffect } from "react";

export interface PanelHotkeyHandlers {
  onToggle?: () => void;
  onClose?: () => void;
  onToggleHelp?: () => void;
  onFlagForReview?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function usePanelHotkeys(handlers: PanelHotkeyHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘I / Ctrl+I → toggle panel
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        e.key.toLowerCase() === "i"
      ) {
        e.preventDefault();
        handlers.onToggle?.();
        return;
      }

      // ⌘+Enter → flag for review
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handlers.onFlagForReview?.();
        return;
      }

      // Escape → close
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey) {
        handlers.onClose?.();
        return;
      }

      // ? → toggle help (skip when typing)
      if (e.key === "?" && !isEditableTarget(e.target)) {
        e.preventDefault();
        handlers.onToggleHelp?.();
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
