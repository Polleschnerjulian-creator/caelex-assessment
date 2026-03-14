"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];

export function ThemeSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Segmented Control */}
      <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] p-5">
        <div
          className="flex p-[3px] bg-black/[0.06] dark:bg-white/[0.1] rounded-xl"
          role="radiogroup"
          aria-label="Theme selection"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                role="radio"
                aria-checked={isSelected}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Theme Info */}
      <p className="text-[13px] text-slate-500 dark:text-white/40 px-1">
        Currently using{" "}
        <span className="text-slate-700 dark:text-white/60 font-medium">
          {resolvedTheme === "dark" ? "Dark" : "Light"} mode
        </span>
        {theme === "system" && " based on your system preference"}.
      </p>
    </div>
  );
}

// Compact theme toggle for header/sidebar
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-5 h-5 text-amber-500" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" aria-hidden="true" />
      )}
    </button>
  );
}
