"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export interface KeyboardShortcut {
  key: string;
  modifiers?: ("ctrl" | "meta" | "shift" | "alt")[];
  description: string;
  category: string;
  action: () => void;
  enabled?: boolean;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: Omit<KeyboardShortcut, "action" | "category">[];
}

// Default shortcuts configuration
export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, "action">[] = [
  // Navigation
  {
    key: "g",
    modifiers: ["ctrl"],
    description: "Go to Dashboard",
    category: "Navigation",
  },
  {
    key: "h",
    modifiers: ["ctrl"],
    description: "Go to Home",
    category: "Navigation",
  },
  {
    key: "s",
    modifiers: ["ctrl", "shift"],
    description: "Go to Settings",
    category: "Navigation",
  },
  {
    key: "a",
    modifiers: ["ctrl", "shift"],
    description: "Go to Assessment",
    category: "Navigation",
  },

  // Actions
  {
    key: "n",
    modifiers: ["ctrl"],
    description: "New Item",
    category: "Actions",
  },
  { key: "s", modifiers: ["ctrl"], description: "Save", category: "Actions" },
  { key: "f", modifiers: ["ctrl"], description: "Search", category: "Actions" },
  { key: "Escape", description: "Close Modal / Cancel", category: "Actions" },

  // Help
  {
    key: "?",
    modifiers: ["shift"],
    description: "Show Keyboard Shortcuts",
    category: "Help",
  },
  { key: "/", description: "Focus Search", category: "Help" },
];

// Format key combination for display
export function formatShortcut(
  shortcut: Omit<KeyboardShortcut, "action" | "category">,
): string {
  const parts: string[] = [];

  if (shortcut.modifiers) {
    if (shortcut.modifiers.includes("ctrl")) {
      parts.push(navigator?.platform?.includes("Mac") ? "⌘" : "Ctrl");
    }
    if (shortcut.modifiers.includes("meta")) {
      parts.push("⌘");
    }
    if (shortcut.modifiers.includes("shift")) {
      parts.push("⇧");
    }
    if (shortcut.modifiers.includes("alt")) {
      parts.push(navigator?.platform?.includes("Mac") ? "⌥" : "Alt");
    }
  }

  // Format the key
  let keyDisplay = shortcut.key;
  if (shortcut.key === "Escape") keyDisplay = "Esc";
  else if (shortcut.key === "ArrowUp") keyDisplay = "↑";
  else if (shortcut.key === "ArrowDown") keyDisplay = "↓";
  else if (shortcut.key === "ArrowLeft") keyDisplay = "←";
  else if (shortcut.key === "ArrowRight") keyDisplay = "→";
  else if (shortcut.key === "Enter") keyDisplay = "↵";
  else if (shortcut.key === " ") keyDisplay = "Space";
  else keyDisplay = shortcut.key.toUpperCase();

  parts.push(keyDisplay);

  return parts.join(" + ");
}

// Group shortcuts by category
export function groupShortcutsByCategory(
  shortcuts: Omit<KeyboardShortcut, "action">[],
): ShortcutCategory[] {
  const categories = new Map<
    string,
    Omit<KeyboardShortcut, "action" | "category">[]
  >();

  for (const shortcut of shortcuts) {
    const existing = categories.get(shortcut.category) || [];
    existing.push({
      key: shortcut.key,
      modifiers: shortcut.modifiers,
      description: shortcut.description,
      enabled: shortcut.enabled,
    });
    categories.set(shortcut.category, existing);
  }

  return Array.from(categories.entries()).map(([name, shortcuts]) => ({
    name,
    shortcuts,
  }));
}

// Check if event matches shortcut
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut,
): boolean {
  // Check key
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // Check modifiers
  const modifiers = shortcut.modifiers || [];
  const ctrlRequired = modifiers.includes("ctrl") || modifiers.includes("meta");
  const shiftRequired = modifiers.includes("shift");
  const altRequired = modifiers.includes("alt");

  // On Mac, use metaKey for Ctrl shortcuts
  const ctrlPressed = event.ctrlKey || event.metaKey;

  if (ctrlRequired !== ctrlPressed) return false;
  if (shiftRequired !== event.shiftKey) return false;
  if (altRequired !== event.altKey) return false;

  return true;
}

// Check if we should ignore the event (e.g., in input fields)
function shouldIgnoreEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target || !target.tagName) return false;

  const tagName = target.tagName.toLowerCase();

  // Ignore if typing in input, textarea, or contenteditable
  if (
    tagName === "input" ||
    tagName === "textarea" ||
    target.isContentEditable
  ) {
    // Allow Escape and some shortcuts in inputs
    if (event.key === "Escape") return false;
    if ((event.ctrlKey || event.metaKey) && event.key === "s") return false;
    return true;
  }

  return false;
}

interface UseKeyboardShortcutsOptions {
  shortcuts?: KeyboardShortcut[];
  enabled?: boolean;
  onShortcutTriggered?: (shortcut: KeyboardShortcut) => void;
}

export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {},
) {
  const { shortcuts = [], enabled = true, onShortcutTriggered } = options;
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const router = useRouter();

  // Create default navigation shortcuts
  const defaultNavigationActions: KeyboardShortcut[] = [
    {
      key: "g",
      modifiers: ["ctrl"],
      description: "Go to Dashboard",
      category: "Navigation",
      action: () => router.push("/dashboard"),
    },
    {
      key: "h",
      modifiers: ["ctrl"],
      description: "Go to Home",
      category: "Navigation",
      action: () => router.push("/"),
    },
    {
      key: "s",
      modifiers: ["ctrl", "shift"],
      description: "Go to Settings",
      category: "Navigation",
      action: () => router.push("/settings"),
    },
    {
      key: "a",
      modifiers: ["ctrl", "shift"],
      description: "Go to Assessment",
      category: "Navigation",
      action: () => router.push("/assessment"),
    },
    {
      key: "?",
      modifiers: ["shift"],
      description: "Show Keyboard Shortcuts",
      category: "Help",
      action: () => setIsHelpOpen(true),
    },
    {
      key: "Escape",
      description: "Close Modal / Cancel",
      category: "Actions",
      action: () => setIsHelpOpen(false),
    },
    {
      key: "/",
      description: "Focus Search",
      category: "Help",
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-search-input], input[type="search"], input[placeholder*="Search"]',
        );
        if (searchInput) {
          searchInput.focus();
        }
      },
    },
  ];

  // Merge default and custom shortcuts
  const allShortcuts = [...defaultNavigationActions, ...shortcuts];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      if (shouldIgnoreEvent(event)) return;

      for (const shortcut of allShortcuts) {
        if (shortcut.enabled === false) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          shortcut.action();
          onShortcutTriggered?.(shortcut);
          break;
        }
      }
    },
    [allShortcuts, enabled, onShortcutTriggered],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);

  return {
    isHelpOpen,
    setIsHelpOpen,
    shortcuts: allShortcuts,
    categories: groupShortcutsByCategory(
      allShortcuts.map((s) => ({
        key: s.key,
        modifiers: s.modifiers,
        description: s.description,
        category: s.category,
        enabled: s.enabled,
      })),
    ),
  };
}

// Simpler hook for registering a single shortcut
export function useShortcut(
  key: string,
  callback: () => void,
  options: {
    modifiers?: ("ctrl" | "meta" | "shift" | "alt")[];
    enabled?: boolean;
  } = {},
) {
  const { modifiers = [], enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (shouldIgnoreEvent(event)) return;

      const shortcut: KeyboardShortcut = {
        key,
        modifiers,
        description: "",
        category: "",
        action: callback,
      };

      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, modifiers, callback, enabled]);
}
