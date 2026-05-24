"use client";

/**
 * useTradeDensity — localStorage-backed UI density preference.
 *
 * Two density modes:
 *   - "comfortable" (default) — generous row padding, easier scanning
 *     on large displays.
 *   - "compact" — denser rows, ~15% more data on screen at a time.
 *     Preferred by power users on laptop displays.
 *
 * The chosen value is also written to a `data-trade-density` attribute
 * on the trade shell so global CSS rules can adapt row tokens. The
 * write happens via a small effect so the SSR markup never has a
 * client-only attribute (avoiding hydration mismatch).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";

export type TradeDensity = "comfortable" | "compact";

const STORAGE_KEY = "caelex-trade:density";
const ATTR = "data-trade-density";

function readStored(): TradeDensity {
  if (typeof window === "undefined") return "comfortable";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "compact" || raw === "comfortable") return raw;
  } catch {
    // ignore
  }
  return "comfortable";
}

function writeStored(value: TradeDensity): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // quota / private browsing — silently degrade
  }
}

function applyAttribute(value: TradeDensity): void {
  if (typeof document === "undefined") return;
  // We attach to documentElement so global CSS selectors like
  // `[data-trade-density="compact"] .trade-row { padding: … }`
  // pick up regardless of which sub-tree they live in.
  document.documentElement.setAttribute(ATTR, value);
}

export function useTradeDensity(): {
  density: TradeDensity;
  setDensity: (v: TradeDensity) => void;
} {
  const [density, setDensityState] =
    React.useState<TradeDensity>("comfortable");

  // Read stored value on mount + reflect to DOM attribute.
  React.useEffect(() => {
    const v = readStored();
    setDensityState(v);
    applyAttribute(v);
  }, []);

  const setDensity = React.useCallback((v: TradeDensity) => {
    setDensityState(v);
    writeStored(v);
    applyAttribute(v);
  }, []);

  return { density, setDensity };
}
