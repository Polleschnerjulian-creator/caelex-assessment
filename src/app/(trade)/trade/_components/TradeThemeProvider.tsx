"use client";

/**
 * Caelex Trade — Theme Provider (Sprint T2).
 *
 * Mirrors the AtlasThemeProvider pattern (light-by-default + localStorage
 * persistence + system-preference fallback) but scopes everything to the
 * Trade product. Two signals are kept in sync on <html>:
 *
 *   1. `data-trade-theme="light|dark"` — drives the .trade-themed[data-…]
 *      attribute selector in globals.css that switches the --trade-* token
 *      palette
 *   2. `data-trade-preload="light|dark"` — read by the pre-hydration script
 *      in (trade)/trade/layout.tsx so the dark-mode tokens are already in
 *      effect when React mounts the shell (no light-to-dark flash)
 *
 * Trade does NOT toggle the global `.dark` class — that one belongs to
 * Comply's V2 sidebar. Mixing them caused contrast regressions in Atlas
 * (see AtlasThemeProvider doc), so Trade follows the same isolation
 * pattern: own attribute, own token block, no cross-product side-effects.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type TradeTheme = "light" | "dark" | "system";
export type ResolvedTradeTheme = "light" | "dark";

interface TradeThemeContextValue {
  theme: TradeTheme;
  resolvedTheme: ResolvedTradeTheme;
  setTheme: (t: TradeTheme) => void;
  toggle: () => void;
}

const TradeThemeContext = createContext<TradeThemeContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "trade-theme";

function readInitial(): TradeTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "light";
}

function resolve(theme: TradeTheme): ResolvedTradeTheme {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyToDocument(resolved: ResolvedTradeTheme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-trade-theme", resolved);
  html.setAttribute("data-trade-preload", resolved);
}

export function TradeThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<TradeTheme>("light");
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTradeTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
      const r: ResolvedTradeTheme = mq.matches ? "dark" : "light";
      setResolvedTheme(r);
      applyToDocument(r);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, mounted]);

  const setTheme = useCallback((t: TradeTheme) => {
    setThemeState(t);
    const r = resolve(t);
    setResolvedTheme(r);
    applyToDocument(r);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, t);
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <TradeThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggle }}
    >
      {children}
    </TradeThemeContext.Provider>
  );
}

export function useTradeTheme(): TradeThemeContextValue {
  const ctx = useContext(TradeThemeContext);
  if (!ctx) {
    throw new Error("useTradeTheme must be used within TradeThemeProvider");
  }
  return ctx;
}
