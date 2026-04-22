"use client";

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
}

const AtlasThemeContext = createContext<AtlasThemeContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "atlas-theme";

function readInitial(): AtlasTheme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
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

export function AtlasThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<AtlasTheme>("system");
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedAtlasTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readInitial();
    setThemeState(initial);
    setResolvedTheme(resolve(initial));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setResolvedTheme(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, mounted]);

  const setTheme = useCallback((t: AtlasTheme) => {
    setThemeState(t);
    setResolvedTheme(resolve(t));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, t);
    }
  }, []);

  return (
    <AtlasThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
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
