"use client";

import { useState, useEffect } from "react";

// ─── Color Palettes ──────────────────────────────────────────────────────────

const DARK = {
  bg: "#0d1117",
  elevated: "#161b22",
  sunken: "#0a0e16",
  border: "#21262d",
  borderActive: "#30363d",
  textPrimary: "#e6edf3",
  textSecondary: "#c9d1d9",
  textTertiary: "#8b949e",
  textMuted: "#484f58",
  nominal: "#3fb950",
  watch: "#d29922",
  warning: "#f0883e",
  critical: "#f85149",
  accent: "#58a6ff",
  brand: "#a78bfa",
};

const LIGHT = {
  bg: "#ffffff",
  elevated: "#f8fafc",
  sunken: "#f1f5f9",
  border: "#e2e8f0",
  borderActive: "#cbd5e1",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textTertiary: "#64748b",
  textMuted: "#94a3b8",
  nominal: "#16a34a",
  watch: "#ca8a04",
  warning: "#ea580c",
  critical: "#dc2626",
  accent: "#2563eb",
  brand: "#7c3aed",
};

export type EphemerisColors = typeof DARK;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEphemerisTheme(): EphemerisColors {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDark ? DARK : LIGHT;
}

// ─── Forge Theme (always light) ─────────────────────────────────────────────

export const FORGE = {
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

export type ForgeColors = typeof FORGE;

export function useForgeTheme(): ForgeColors {
  return FORGE;
}

// ─── Glassmorphism Design Tokens ────────────────────────────────────────────

export const GLASS = {
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

export type GlassTokens = typeof GLASS;
