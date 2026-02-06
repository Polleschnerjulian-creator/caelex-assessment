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
        // Dark mode colors (existing palette)
        dark: {
          bg: "#0A0B10",
          card: "#0F1629",
          border: "#1e293b",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
