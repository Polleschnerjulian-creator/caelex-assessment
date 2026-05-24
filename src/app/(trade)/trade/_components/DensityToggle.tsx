"use client";

/**
 * DensityToggle — segmented control for the comfortable / compact
 * preference. Hooks into `useTradeDensity` so changes persist + apply
 * the `data-trade-density` attribute globally.
 *
 * Designed as a drop-in for the Settings page. Placement:
 *   Settings → Appearance section → DensityToggle
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { useTradeDensity, type TradeDensity } from "./useTradeDensity";

const OPTIONS: ReadonlyArray<{
  value: TradeDensity;
  label: string;
  hint: string;
}> = [
  {
    value: "comfortable",
    label: "Comfortable",
    hint: "Default. Generous row padding — easier to scan on large displays.",
  },
  {
    value: "compact",
    label: "Compact",
    hint: "~15% more rows on screen. Preferred on laptop displays + by power users.",
  },
];

export function DensityToggle() {
  const { density, setDensity } = useTradeDensity();
  return (
    <fieldset className="space-y-2 border-0 p-0">
      <legend className="mb-1 block text-[12px] font-medium text-trade-text-secondary">
        Row density
      </legend>
      <div
        role="radiogroup"
        aria-label="Row density"
        className="inline-flex rounded-md border border-trade-border-subtle bg-trade-bg-panel p-0.5"
      >
        {OPTIONS.map((opt) => {
          const isActive = density === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setDensity(opt.value)}
              className={`rounded px-3 py-1.5 text-[12px] font-medium transition ${
                isActive
                  ? "bg-trade-accent text-white"
                  : "text-trade-text-secondary hover:text-trade-text-primary"
              }`}
              title={opt.hint}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-trade-text-muted">
        {OPTIONS.find((o) => o.value === density)?.hint}
      </p>
    </fieldset>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
