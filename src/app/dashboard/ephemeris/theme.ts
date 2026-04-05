"use client";

import { createContext, useContext, useState, useEffect } from "react";

// ─── Ephemeris Premium Dark Theme ───────────────────────────────────────────

export const EPH = {
  // Backgrounds
  pageBg: "#000000",
  cardBg: "rgba(255, 255, 255, 0.03)",
  cardBgHover: "rgba(255, 255, 255, 0.05)",
  cardBorder: "rgba(255, 255, 255, 0.06)",
  cardBorderHover: "rgba(255, 255, 255, 0.1)",
  cardRadius: 16,

  // Text hierarchy
  textPrimary: "rgba(255, 255, 255, 0.9)",
  textSecondary: "rgba(255, 255, 255, 0.5)",
  textTertiary: "rgba(255, 255, 255, 0.3)",
  textMicro: "rgba(255, 255, 255, 0.25)",

  // Interactive
  activeBg: "rgba(255, 255, 255, 0.06)",
  hoverBg: "rgba(255, 255, 255, 0.04)",
  rowAlt: "rgba(255, 255, 255, 0.02)",
  rowHover: "rgba(255, 255, 255, 0.04)",
  badgeBg: "rgba(255, 255, 255, 0.15)",

  // Status (only color exceptions)
  nominal: "#3fb950",
  watch: "#d29922",
  warning: "#f0883e",
  critical: "#f85149",

  // Typography
  mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export type EphemerisColors = typeof EPH;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEphemerisTheme(): EphemerisColors {
  return EPH;
}

// ─── Forge Theme ─────────────────────────────────────────────────────────────

const FORGE_LIGHT = {
  canvasBg: "#FAFAF9",
  gridDot: "#D4D4D0",
  nodeBg: "#FFFFFF",
  nodeBorder: "#E2E8F0",
  nodeBorderHover: "#CBD5E1",
  nodeShadow: "0 1px 3px rgba(0,0,0,0.06)",
  nodeShadowHover: "0 4px 12px rgba(0,0,0,0.1)",
  toolbarBg: "rgba(255,255,255,0.88)",
  toolbarBorder: "#E2E8F0",
  toolbarShadow: "0 1px 3px rgba(0,0,0,0.06)",
  textPrimary: "#0F172A",
  textSecondary: "#334155",
  textTertiary: "#64748B",
  textMuted: "#94A3B8",
  originBorder: "#10B981",
  originGlow: "0 0 0 3px rgba(16,185,129,0.15)",
  edgeNominal: "#10B981",
  edgeWarning: "#F59E0B",
  edgeCritical: "#EF4444",
  edgeComputing: "#94A3B8",
  edgeIdle: "#CBD5E1",
  nominal: "#16A34A",
  warning: "#EA580C",
  critical: "#DC2626",
  watch: "#CA8A04",
  accent: "#2563EB",
} as const;

const FORGE_DARK = {
  canvasBg: "#0A0A0F",
  gridDot: "rgba(255,255,255,0.08)",
  nodeBg: "rgba(255,255,255,0.03)",
  nodeBorder: "rgba(255,255,255,0.06)",
  nodeBorderHover: "rgba(255,255,255,0.08)",
  nodeShadow:
    "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  nodeShadowHover:
    "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
  toolbarBg: "rgba(10,10,15,0.6)",
  toolbarBorder: "rgba(255,255,255,0.04)",
  toolbarShadow: "0 2px 12px rgba(0,0,0,0.5)",
  textPrimary: "rgba(255,255,255,0.85)",
  textSecondary: "rgba(255,255,255,0.7)",
  textTertiary: "rgba(255,255,255,0.3)",
  textMuted: "rgba(255,255,255,0.2)",
  originBorder: "rgba(0,212,170,0.4)",
  originGlow: "0 0 0 1px rgba(0,212,170,0.1)",
  edgeNominal: "#00D4AA",
  edgeWarning: "#FF8C42",
  edgeCritical: "#FF4757",
  edgeComputing: "rgba(255,255,255,0.3)",
  edgeIdle: "rgba(255,255,255,0.1)",
  nominal: "#00D4AA",
  warning: "#FF8C42",
  critical: "#FF4757",
  watch: "#FF8C42",
  accent: "#7B8CFF",
} as const;

// ─── Liquid Glass Tokens ─────────────────────────────────────────────────────

const GLASS_LIGHT = {
  bg: "rgba(255,255,255,0.72)",
  bgHover: "rgba(255,255,255,0.78)",
  bgSidebar: "rgba(255,255,255,0.72)",
  bgToolbar: "rgba(255,255,255,0.72)",
  border: "rgba(255,255,255,0.75)",
  borderHover: "rgba(255,255,255,0.9)",
  borderSidebar: "rgba(255,255,255,0.75)",
  shadow: "0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.1)",
  shadowToolbar: "0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
  insetGlow: "inset 0 1px 0 rgba(255,255,255,0.5)",
  blur: 20,
  nodeRadius: 16,
  panelRadius: 12,
} as const;

const GLASS_DARK = {
  bg: "rgba(255,255,255,0.03)",
  bgHover: "rgba(255,255,255,0.04)",
  bgSidebar: "rgba(255,255,255,0.01)",
  bgToolbar: "rgba(10,10,15,0.6)",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.08)",
  borderSidebar: "rgba(255,255,255,0.04)",
  shadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  shadowHover:
    "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
  shadowToolbar:
    "0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
  insetGlow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  blur: 40,
  nodeRadius: 16,
  panelRadius: 12,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ForgeColors = {
  [K in keyof typeof FORGE_LIGHT]: string;
};
export type GlassTokens = {
  [K in keyof typeof GLASS_LIGHT]: (typeof GLASS_LIGHT)[K] extends number
    ? number
    : string;
};

export interface ForgeThemeValue {
  forge: ForgeColors;
  glass: GlassTokens;
  isDark: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ForgeThemeContext = createContext<ForgeThemeValue>({
  forge: FORGE_LIGHT,
  glass: GLASS_LIGHT,
  isDark: false,
});

export { ForgeThemeContext };

// ─── Hook — dynamic, respects system dark mode ──────────────────────────────

export function useForgeTheme(): ForgeThemeValue {
  return useContext(ForgeThemeContext);
}

// ─── Backwards-compat static exports (for any non-component consumers) ──────

export const FORGE = FORGE_LIGHT;
export const GLASS = GLASS_LIGHT;

// ─── System dark mode detection ─────────────────────────────────────────────

export function useSystemDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => document.documentElement.classList.contains("dark");
    setIsDark(check());

    // Watch HTML class changes (app-level dark mode toggle)
    const observer = new MutationObserver(() => setIsDark(check()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// ─── Mono font stack ──────────────────────────────────────────────────────────

export const MONO_FONT =
  "var(--font-jetbrains), 'JetBrains Mono', ui-monospace, 'SF Mono', monospace";

// ─── Resolved tokens for provider ───────────────────────────────────────────

export function resolveForgeTheme(isDark: boolean): ForgeThemeValue {
  return {
    forge: isDark ? FORGE_DARK : FORGE_LIGHT,
    glass: isDark ? GLASS_DARK : GLASS_LIGHT,
    isDark,
  };
}
