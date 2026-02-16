/**
 * Widget Theme Definitions
 * CSS variable maps matching Caelex design system.
 */

export const THEMES = {
  dark: {
    "--caelex-bg": "#0A0F1E",
    "--caelex-card-bg": "#1E293B",
    "--caelex-card-border": "#334155",
    "--caelex-text-primary": "#E2E8F0",
    "--caelex-text-secondary": "#94A3B8",
    "--caelex-text-heading": "#F8FAFC",
    "--caelex-accent": "#3B82F6",
    "--caelex-accent-hover": "#2563EB",
    "--caelex-green": "#22C55E",
    "--caelex-amber": "#F59E0B",
    "--caelex-red": "#EF4444",
    "--caelex-input-bg": "#0F172A",
    "--caelex-input-border": "#334155",
    "--caelex-input-text": "#E2E8F0",
  },
  light: {
    "--caelex-bg": "#FFFFFF",
    "--caelex-card-bg": "#F8FAFC",
    "--caelex-card-border": "#E2E8F0",
    "--caelex-text-primary": "#1E293B",
    "--caelex-text-secondary": "#64748B",
    "--caelex-text-heading": "#0F172A",
    "--caelex-accent": "#3B82F6",
    "--caelex-accent-hover": "#2563EB",
    "--caelex-green": "#16A34A",
    "--caelex-amber": "#D97706",
    "--caelex-red": "#DC2626",
    "--caelex-input-bg": "#FFFFFF",
    "--caelex-input-border": "#CBD5E1",
    "--caelex-input-text": "#1E293B",
  },
} as const;

export type ThemeVariables = typeof THEMES.dark;
