import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#0A0F1E",
        },
        // Light mode colors
        light: {
          bg: "#f8fafc",
          card: "#ffffff",
          border: "#e2e8f0",
          muted: "#64748b",
        },
        // Dark mode colors — single source of truth
        dark: {
          bg: "#0A0A0B",
          surface: "#131316",
          card: "#1a1a1e",
          border: "#1e293b",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
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
        "display-sm": ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        display: ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
      },
    },
  },
  plugins: [],
};
export default config;
