"use client";

/**
 * ThemeToggle — segmented control for the Passage light / dark / system
 * preference. Hooks into `useTradeTheme` so changes persist (localStorage)
 * + apply the `data-trade-theme` attribute globally (which flips the
 * `--trade-*` token palette in globals.css).
 *
 * Placement: Settings → Darstellung (Appearance), above DensityToggle.
 * Mirrors the DensityToggle markup so the two controls read as a pair.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { useTradeTheme, type TradeTheme } from "./TradeThemeProvider";

const OPTIONS: ReadonlyArray<{
  value: TradeTheme;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "system",
    label: "System",
    hint: "Folgt der Betriebssystem-Einstellung (hell/dunkel).",
    Icon: Monitor,
  },
  {
    value: "light",
    label: "Hell",
    hint: "Immer helles Layout.",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dunkel",
    hint: "Immer dunkles Layout.",
    Icon: Moon,
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTradeTheme();
  return (
    <fieldset className="space-y-2 border-0 p-0">
      <legend className="mb-1 block text-[12px] font-medium text-trade-text-secondary">
        Erscheinungsbild
      </legend>
      <div
        role="radiogroup"
        aria-label="Erscheinungsbild"
        className="inline-flex rounded-md border border-trade-border-subtle bg-trade-bg-panel p-0.5"
      >
        {OPTIONS.map((opt) => {
          const isActive = theme === opt.value;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-medium transition ${
                isActive
                  ? "bg-trade-accent text-white"
                  : "text-trade-text-secondary hover:text-trade-text-primary"
              }`}
              title={opt.hint}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-trade-text-muted">
        {OPTIONS.find((o) => o.value === theme)?.hint}
      </p>
    </fieldset>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
