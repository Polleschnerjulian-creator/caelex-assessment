"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas — Theme provider.
 *
 * Light-by-default (changed 2026-05-12). The previous implementation
 * defaulted to `"system"` which surprised users on dark-OS machines:
 * they'd open Atlas on macOS in the evening and get a black canvas
 * even if they had no preference. The new default is "light"; users
 * who actively want dark toggle once and the choice sticks via
 * localStorage.
 *
 * Two signals are kept in sync on `<html>`:
 *   1. `class="dark"` — Tailwind's class-based dark mode (drives all
 *      `dark:` variants in V2 components)
 *   2. `data-atlas-preload="dark|light"` — legacy V1 selector + read by
 *      AtlasEntityMini.tsx for non-Tailwind theming. Kept for
 *      backward compatibility while V1 components still mount.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type AtlasTheme = "light" | "dark" | "system";
export type ResolvedAtlasTheme = "light" | "dark";

interface AtlasThemeContextValue {
  theme: AtlasTheme;
  resolvedTheme: ResolvedAtlasTheme;
  setTheme: (t: AtlasTheme) => void;
  toggle: () => void;
}

const AtlasThemeContext = createContext<AtlasThemeContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "atlas-theme";

function readInitial(): AtlasTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "light";
}

function resolve(theme: AtlasTheme): ResolvedAtlasTheme {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

/**
 * Applies the resolved theme to <html> as both a Tailwind class and a
 * data-attribute. Idempotent — safe to call from multiple effects.
 *
 * SAFETY: never reads from any untrusted source. Only takes the
 * resolved theme value (a string union) we control.
 */
function applyToDocument(resolved: ResolvedAtlasTheme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (resolved === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
  html.setAttribute("data-atlas-preload", resolved);
}

export function AtlasThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<AtlasTheme>("light");
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedAtlasTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    /* L-5: Only seed `theme` here. The second effect (below) is keyed
       off [theme, mounted] and resolves resolvedTheme on its own —
       setting it twice in the same commit caused the briefly-mounted
       shell to flicker between the prior render and the resolved
       value. Letting the second effect run after `mounted` flips
       produces a single resolvedTheme update. */
    setThemeState(readInitial());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (theme !== "system") {
      setResolvedTheme(theme);
      applyToDocument(theme);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const r: ResolvedAtlasTheme = mq.matches ? "dark" : "light";
      setResolvedTheme(r);
      applyToDocument(r);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, mounted]);

  const setTheme = useCallback((t: AtlasTheme) => {
    setThemeState(t);
    const r = resolve(t);
    setResolvedTheme(r);
    applyToDocument(r);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, t);
    }
  }, []);

  /* Convenience: flip between light and dark. "system" gets normalised
     into whichever side is currently resolved, then toggled. */
  const toggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <AtlasThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggle }}
    >
      {children}
    </AtlasThemeContext.Provider>
  );
}

export function useAtlasTheme(): AtlasThemeContextValue {
  const ctx = useContext(AtlasThemeContext);
  if (!ctx) {
    throw new Error("useAtlasTheme must be used within AtlasThemeProvider");
  }
  return ctx;
}
