"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useKeyboardShortcuts,
  type KeyboardShortcut,
  type ShortcutCategory,
} from "@/hooks/useKeyboardShortcuts";
import KeyboardShortcutsHelp from "@/components/ui/KeyboardShortcutsHelp";

interface KeyboardShortcutsContextValue {
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  shortcuts: KeyboardShortcut[];
  categories: ShortcutCategory[];
}

const KeyboardShortcutsContext =
  createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider",
    );
  }
  return context;
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
  customShortcuts?: KeyboardShortcut[];
  enabled?: boolean;
}

export function KeyboardShortcutsProvider({
  children,
  customShortcuts = [],
  enabled = true,
}: KeyboardShortcutsProviderProps) {
  const { isHelpOpen, setIsHelpOpen, shortcuts, categories } =
    useKeyboardShortcuts({
      shortcuts: customShortcuts,
      enabled,
    });

  const value: KeyboardShortcutsContextValue = {
    isHelpOpen,
    openHelp: () => setIsHelpOpen(true),
    closeHelp: () => setIsHelpOpen(false),
    shortcuts,
    categories,
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        categories={categories}
      />
    </KeyboardShortcutsContext.Provider>
  );
}
