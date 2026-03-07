import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        light: {
          bg: "#f8fafc",
          card: "#ffffff",
          border: "#e2e8f0",
          muted: "#64748b",
        },
        // Landing light-mode palette (Palantir x Apple)
        landing: {
          bg: "#F7F8FA",
          card: "#FFFFFF",
          subtle: "#F1F3F5",
          inset: "#E9ECEF",
          text: "#111827",
          "text-secondary": "#4B5563",
          "text-tertiary": "#9CA3AF",
          border: "#E5E7EB",
          "border-strong": "#D1D5DB",
        },
        // Dark mode colors — single source of truth
        dark: {
          bg: "#0A0A0B",
          surface: "#131316",
          card: "#1a1a1e",
          border: "#1e293b",
          muted: "#94a3b8",
        },
        // Navy palette — design system
        navy: {
          950: "#0A0F1E",
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        // V2 Design System tokens (CSS custom properties)
        v2: {
          surface: {
            base: "var(--surface-base)",
            raised: "var(--surface-raised)",
            sunken: "var(--surface-sunken)",
            overlay: "var(--surface-overlay)",
          },
          text: {
            primary: "var(--text-primary)",
            secondary: "var(--text-secondary)",
            tertiary: "var(--text-tertiary)",
            inverse: "var(--text-inverse)",
          },
          border: {
            DEFAULT: "var(--border-default)",
            subtle: "var(--border-subtle)",
            focus: "var(--border-focus)",
          },
          accent: {
            primary: "var(--accent-primary)",
            "primary-hover": "var(--accent-primary-hover)",
            "primary-soft": "var(--accent-primary-soft)",
            success: "var(--accent-success)",
            "success-soft": "var(--accent-success-soft)",
            warning: "var(--accent-warning)",
            "warning-soft": "var(--accent-warning-soft)",
            danger: "var(--accent-danger)",
            "danger-soft": "var(--accent-danger-soft)",
            info: "var(--accent-info)",
            "info-soft": "var(--accent-info-soft)",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        instrument: [
          "var(--font-instrument)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
        jetbrains: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      // Glass design system tokens
      backdropBlur: {
        glass: "var(--glass-blur-surface)",
        "glass-lg": "var(--glass-blur-elevated)",
        "glass-xl": "var(--glass-blur-floating)",
      },
      boxShadow: {
        glass: "0 4px 16px rgba(0, 0, 0, 0.15)",
        "glass-elevated": "0 8px 32px rgba(0, 0, 0, 0.2)",
        "glass-floating": "0 16px 48px rgba(0, 0, 0, 0.3)",
        "v2-sm": "var(--v2-shadow-sm)",
        "v2-md": "var(--v2-shadow-md)",
        "v2-lg": "var(--v2-shadow-lg)",
        "v2-soft": "var(--v2-shadow-soft)",
      },
      transitionTimingFunction: {
        glass: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      borderRadius: {
        "v2-sm": "var(--v2-radius-sm)",
        "v2-md": "var(--v2-radius-md)",
        "v2-lg": "var(--v2-radius-lg)",
        "v2-xl": "var(--v2-radius-xl)",
      },
      // Type scale — single source of truth (reduces 24 arbitrary sizes → 11 tokens)
      fontSize: {
        micro: ["10px", { lineHeight: "1.4", letterSpacing: "0.05em" }],
        caption: ["11px", { lineHeight: "1.5" }],
        small: ["12px", { lineHeight: "1.5" }],
        body: ["13px", { lineHeight: "1.6" }],
        "body-lg": ["14px", { lineHeight: "1.6" }],
        subtitle: ["15px", { lineHeight: "1.5" }],
        title: ["16px", { lineHeight: "1.4" }],
        heading: ["18px", { lineHeight: "1.3" }],
        "heading-lg": ["20px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "display-sm": ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        display: ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        // V2 type scale
        "v2-xs": ["12px", { lineHeight: "1.5" }],
        "v2-sm": ["13px", { lineHeight: "1.5" }],
        "v2-base": ["14px", { lineHeight: "1.6" }],
        "v2-lg": ["16px", { lineHeight: "1.5" }],
        "v2-xl": ["20px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "v2-2xl": ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "v2-3xl": ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
      },
    },
  },
  plugins: [],
};
export default config;
