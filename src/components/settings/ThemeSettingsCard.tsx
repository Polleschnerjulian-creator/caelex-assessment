"use client";

import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Always use light mode",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use dark mode",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device settings",
    icon: Monitor,
  },
];

export function ThemeSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/10 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Appearance
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/50 mt-1">
          Customize how Caelex looks on your device
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
              }`}
            >
              {/* Selected Checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  isSelected
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/60"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Label */}
              <span
                className={`font-medium ${
                  isSelected
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {option.label}
              </span>

              {/* Description */}
              <span className="text-xs text-slate-600 dark:text-white/40 mt-1 text-center">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Current Theme Info */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
        <p className="text-sm text-slate-600 dark:text-white/50">
          Currently using:{" "}
          <span className="font-medium text-slate-900 dark:text-white/80">
            {resolvedTheme === "dark" ? "Dark" : "Light"} mode
          </span>
          {theme === "system" && " (based on system preference)"}
        </p>
      </div>
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
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-5 h-5 text-amber-500" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}
