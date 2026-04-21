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
            disabled: "var(--text-disabled)",
            accent: "var(--text-accent)",
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
        // Dark Neumorphic — Background surfaces
        dn: {
          base: "var(--bg-base)",
          "surface-1": "var(--bg-surface-1)",
          "surface-2": "var(--bg-surface-2)",
          "surface-3": "var(--bg-surface-3)",
          "surface-4": "var(--bg-surface-4)",
        },
        // Caelex Accent scale (Deep Space Blue)
        accent: {
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          200: "var(--accent-200)",
          300: "var(--accent-300)",
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          800: "var(--accent-800)",
          900: "var(--accent-900)",
        },
        // Status colors
        status: {
          success: "var(--status-success)",
          "success-bg": "var(--status-success-bg)",
          "success-border": "var(--status-success-border)",
          warning: "var(--status-warning)",
          "warning-bg": "var(--status-warning-bg)",
          "warning-border": "var(--status-warning-border)",
          danger: "var(--status-danger)",
          "danger-bg": "var(--status-danger-bg)",
          "danger-border": "var(--status-danger-border)",
          info: "var(--status-info)",
          "info-bg": "var(--status-info-bg)",
          "info-border": "var(--status-info-border)",
        },
        // Module-specific colors
        module: {
          "eu-space-act": "var(--module-eu-space-act)",
          cybersecurity: "var(--module-cybersecurity)",
          nis2: "var(--module-nis2)",
          debris: "var(--module-debris)",
          insurance: "var(--module-insurance)",
          environmental: "var(--module-environmental)",
        },
        // Glass surfaces
        glass: {
          bg: "var(--glass-bg)",
          "bg-hover": "var(--glass-bg-hover)",
          "bg-active": "var(--glass-bg-active)",
          border: "var(--glass-border)",
          "border-hover": "var(--glass-border-hover)",
          "border-active": "var(--glass-border-active)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-ibm-plex)", "sans-serif"],
        instrument: [
          "var(--font-instrument)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
        jetbrains: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        mono: [
          "var(--font-jetbrains)",
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
        // Dark Neumorphic shadow system
        "dn-xs": "var(--shadow-xs)",
        "dn-sm": "var(--shadow-sm)",
        "dn-md": "var(--shadow-md)",
        "dn-lg": "var(--shadow-lg)",
        "dn-xl": "var(--shadow-xl)",
        "dn-inset": "var(--shadow-inset)",
        "dn-glow-accent": "var(--shadow-glow-accent)",
        "dn-glow-success": "var(--shadow-glow-success)",
        // Backward-compatible V2 shadows (now mapped to dark values)
        "v2-sm": "var(--v2-shadow-sm)",
        "v2-md": "var(--v2-shadow-md)",
        "v2-lg": "var(--v2-shadow-lg)",
        "v2-soft": "var(--v2-shadow-soft)",
      },
      transitionTimingFunction: {
        glass: "cubic-bezier(0.4, 0, 0.2, 1)",
        "dn-out": "var(--ease-out)",
        "dn-in-out": "var(--ease-in-out)",
        "dn-spring": "var(--ease-spring)",
        "dn-smooth": "var(--ease-smooth)",
        // Transparency-Panel motion curves (Linear / Apple)
        "tp-out": "cubic-bezier(0.22, 1, 0.36, 1)",
        "tp-emphasized": "cubic-bezier(0.32, 0.72, 0, 1)",
        "tp-apple": "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "tp-in": "cubic-bezier(0.4, 0, 1, 1)",
        "tp-hover": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        "dn-fast": "var(--duration-fast)",
        "dn-normal": "var(--duration-normal)",
        "dn-medium": "var(--duration-medium)",
        "dn-slow": "var(--duration-slow)",
        "dn-glacial": "var(--duration-glacial)",
        // Transparency-Panel durations (sub-200ms guideline)
        "tp-instant": "50ms",
        "tp-fast": "120ms",
        "tp-quick": "160ms",
        "tp-base": "200ms",
        "tp-medium": "280ms",
        "tp-slow": "400ms",
      },
      borderWidth: {
        "tp-hairline": "0.5px",
      },
      boxShadow: {
        "tp-popover":
          "0 0 0 0.5px rgba(0,0,0,0.12), 0 10px 30px rgba(0,0,0,0.12), 0 20px 60px rgba(0,0,0,0.18)",
      },
      borderRadius: {
        "dn-xs": "var(--radius-xs)",
        "dn-sm": "var(--radius-sm)",
        "dn-md": "var(--radius-md)",
        "dn-lg": "var(--radius-lg)",
        "dn-xl": "var(--radius-xl)",
        "dn-2xl": "var(--radius-2xl)",
        "dn-full": "var(--radius-full)",
        // Backward-compatible
        "v2-sm": "var(--v2-radius-sm)",
        "v2-md": "var(--v2-radius-md)",
        "v2-lg": "var(--v2-radius-lg)",
        "v2-xl": "var(--v2-radius-xl)",
      },
      spacing: {
        "dn-1": "var(--space-1)",
        "dn-2": "var(--space-2)",
        "dn-3": "var(--space-3)",
        "dn-4": "var(--space-4)",
        "dn-5": "var(--space-5)",
        "dn-6": "var(--space-6)",
        "dn-8": "var(--space-8)",
        "dn-10": "var(--space-10)",
        "dn-12": "var(--space-12)",
        "dn-16": "var(--space-16)",
        "dn-20": "var(--space-20)",
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
        // Dark Neumorphic Display (for hero metrics)
        "dn-display-xl": [
          "48px",
          { lineHeight: "1.0", letterSpacing: "-0.03em", fontWeight: "600" },
        ],
        "dn-display-lg": [
          "36px",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "600" },
        ],
        "dn-display-md": [
          "28px",
          { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        // DN Headings
        "dn-heading-lg": [
          "22px",
          { lineHeight: "1.3", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "dn-heading-md": [
          "18px",
          { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "dn-heading-sm": [
          "15px",
          { lineHeight: "1.4", letterSpacing: "-0.005em", fontWeight: "600" },
        ],
        // DN Labels
        "dn-label-lg": [
          "13px",
          { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "500" },
        ],
        "dn-label-md": [
          "12px",
          { lineHeight: "1.4", letterSpacing: "0.03em", fontWeight: "500" },
        ],
        "dn-label-sm": [
          "11px",
          { lineHeight: "1.4", letterSpacing: "0.04em", fontWeight: "500" },
        ],
        // DN Mono
        "dn-mono": [
          "13px",
          { lineHeight: "1.5", letterSpacing: "-0.02em", fontWeight: "500" },
        ],
      },
      keyframes: {
        fadeSlideUp: {
          from: {
            opacity: "0",
            transform: "translateY(var(--slide-distance, 12px))",
          },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        progressFill: {
          from: { width: "0%" },
        },
        glowPulse: {
          "0%": { opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.6" },
        },
      },
      animation: {
        "dn-fade-in":
          "fadeSlideUp 500ms var(--ease-smooth, cubic-bezier(0.22, 0.61, 0.36, 1)) both",
        "dn-shimmer": "shimmer 1.5s ease-in-out infinite",
        "dn-progress":
          "progressFill 1.2s var(--ease-smooth, cubic-bezier(0.22, 0.61, 0.36, 1)) 0.3s both",
        "dn-glow": "glowPulse 2s ease-in-out both",
      },
    },
  },
  plugins: [],
};
export default config;
