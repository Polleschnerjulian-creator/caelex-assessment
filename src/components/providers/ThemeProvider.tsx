"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isAuthEnabled = Boolean(process.env.NEXT_PUBLIC_AUTH_ENABLED);

/**
 * ThemeProvider that works with or without SessionProvider.
 * When auth is not configured, uses a standalone version without useSession.
 */
function ThemeProviderWithSession({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Load theme from user session or localStorage on mount
  useEffect(() => {
    setMounted(true);
    const userTheme = (session?.user as any)?.theme;
    const savedTheme =
      userTheme || localStorage.getItem("caelex-theme") || "system";
    setThemeState(savedTheme as Theme);
  }, [(session?.user as any)?.theme]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
      setResolvedTheme(isDark ? "dark" : "light");
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme, mounted]);

  // Save theme to database and localStorage
  const setTheme = useCallback(
    async (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem("caelex-theme", newTheme);

      // Save to database if logged in
      if (session?.user) {
        try {
          await fetch("/api/user/theme", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: newTheme }),
          });
          // Update session to reflect new theme
          await updateSession({ theme: newTheme });
        } catch (error) {
          console.error("Failed to save theme preference:", error);
        }
      }
    },
    [session?.user, updateSession],
  );

  // Always provide context to children - the script in layout.tsx handles
  // the initial theme to prevent flash of wrong theme
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Standalone ThemeProvider that works without SessionProvider.
 * Uses only localStorage for theme persistence (no session sync).
 */
function ThemeProviderStandalone({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("caelex-theme") || "system";
    setThemeState(savedTheme as Theme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
      setResolvedTheme(isDark ? "dark" : "light");
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("caelex-theme", newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Public ThemeProvider that delegates to the appropriate implementation
 * based on whether auth/session is available.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  if (isAuthEnabled) {
    return <ThemeProviderWithSession>{children}</ThemeProviderWithSession>;
  }
  return <ThemeProviderStandalone>{children}</ThemeProviderStandalone>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

// Hook for components that just need to check dark mode
export function useDarkMode() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark";
}
