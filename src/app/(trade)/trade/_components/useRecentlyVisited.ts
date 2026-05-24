"use client";

/**
 * useRecentlyVisited — localStorage-backed "last N visited routes" hook.
 *
 * Tracks the current pathname on every change and prepends it to the
 * stored list. De-dupes (visiting the same path twice does NOT bump
 * the older entry; it simply moves it to position 0 again so the most
 * recently visited is first). Truncates to MAX_ENTRIES.
 *
 * Storage key is namespaced `caelex-trade:recently-visited` so it
 * doesn't collide with Comply / Atlas / Pharos history.
 *
 * Returns the current list synchronously after the first render so the
 * sidebar can render the section without a flash of empty state on
 * subsequent loads. On the very first SSR render the list is empty
 * (localStorage isn't available); the next client effect populates it.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "caelex-trade:recently-visited";
const MAX_ENTRIES = 5;

/** Paths that are deliberately excluded from the recently-visited list
 *  because they're meta-routes (the welcome page itself, auth dance,
 *  Astra panel which has its own state). */
const EXCLUDED_PREFIXES: ReadonlyArray<string> = ["/trade", "/trade/astra"];

function isExcluded(pathname: string): boolean {
  // Exact "/trade" is excluded (the home itself). Sub-paths under
  // /trade/astra are also excluded because Astra has its own internal
  // navigation state.
  if (pathname === "/trade") return true;
  if (pathname.startsWith("/trade/astra")) return true;
  // Anything outside /trade isn't ours anyway.
  if (!pathname.startsWith("/trade/")) return true;
  return EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix && pathname.length === prefix.length,
  );
}

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is string => typeof p === "string")
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeStored(entries: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded / private browsing — degrade gracefully.
  }
}

/**
 * Hook returns the list of recently visited paths, most-recent first.
 * Also subscribes to pathname changes and updates storage transparently.
 */
export function useRecentlyVisited(): string[] {
  const pathname = usePathname();
  const [entries, setEntries] = React.useState<string[]>([]);

  // Initial read on mount — separate from the path-change effect so we
  // pick up history persisted across sessions before the user navigates.
  React.useEffect(() => {
    setEntries(readStored());
  }, []);

  // On every pathname change, prepend (with de-dupe + truncate).
  React.useEffect(() => {
    if (!pathname || isExcluded(pathname)) return;
    setEntries((prev) => {
      const filtered = prev.filter((p) => p !== pathname);
      const next = [pathname, ...filtered].slice(0, MAX_ENTRIES);
      writeStored(next);
      return next;
    });
  }, [pathname]);

  return entries;
}
