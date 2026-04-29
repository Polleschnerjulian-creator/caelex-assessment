"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PharosThemeProvider — light/dark/system mit Default light.
 *
 * Atlas-Pattern wiederverwendet, aber Default ist hier "light" (nicht
 * "system") weil Behörden-User in der Regel Office-Setups mit hellen
 * Büros haben und der dunkle Look wie ein Surveillance-Tool wirkt.
 * Light = Glass-Box-Branding visuell unterstützt.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type PharosTheme = "light" | "dark" | "system";
export type ResolvedPharosTheme = "light" | "dark";

interface PharosThemeContextValue {
  theme: PharosTheme;
  resolvedTheme: ResolvedPharosTheme;
  setTheme: (t: PharosTheme) => void;
}

const PharosThemeContext = createContext<PharosThemeContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "pharos-theme";
const DEFAULT_THEME: PharosTheme = "light";

function readInitial(): PharosTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return DEFAULT_THEME;
}

function resolve(theme: PharosTheme): ResolvedPharosTheme {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

/** Apply or remove the `dark` class on <html> so Tailwind's class-based
 *  dark-mode picks it up. We scope this to Pharos-routes only by
 *  marking the html with a data attribute that we clean up on unmount. */
function applyToHtml(resolved: ResolvedPharosTheme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (resolved === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
  html.dataset.pharosTheme = resolved;
}

export function PharosThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<PharosTheme>(DEFAULT_THEME);
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedPharosTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readInitial();
    const r = resolve(initial);
    setThemeState(initial);
    setResolvedTheme(r);
    applyToHtml(r);
    setMounted(true);

    return () => {
      // When leaving Pharos, drop the data attribute. We don't touch
      // the `dark` class because the rest of the app may have its own
      // theme system that was managing it.
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset.pharosTheme;
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (theme !== "system") {
      setResolvedTheme(theme);
      applyToHtml(theme);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const r: ResolvedPharosTheme = mq.matches ? "dark" : "light";
      setResolvedTheme(r);
      applyToHtml(r);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, mounted]);

  const setTheme = useCallback((t: PharosTheme) => {
    setThemeState(t);
    const r = resolve(t);
    setResolvedTheme(r);
    applyToHtml(r);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, t);
    }
  }, []);

  return (
    <PharosThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </PharosThemeContext.Provider>
  );
}

export function usePharosTheme(): PharosThemeContextValue {
  const ctx = useContext(PharosThemeContext);
  if (!ctx) {
    throw new Error("usePharosTheme must be used within PharosThemeProvider");
  }
  return ctx;
}
