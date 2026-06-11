"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the shared client data-fetching hook (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Every /admin page reads exactly one JSON endpoint per view, so all pages
 * consume this ONE hook instead of re-implementing fetch + loading + error +
 * abort each time. Keeping the fetch policy in one place means a change to
 * (e.g.) the cache rule or the error-surfacing rule lands everywhere at once.
 *
 * STALE-WHILE-REVALIDATE (the "no annoying loading screen" rule):
 *   Responses are kept in a MODULE-LEVEL Map keyed by URL. On (re)mount or a
 *   URL change, a cached response is shown IMMEDIATELY (loading:false) — so
 *   returning to a page, or toggling back to a range you already viewed, never
 *   flashes a skeleton again. If the cached entry is older than ~60s it is
 *   silently revalidated in the background (`refreshing:true`, data stays on
 *   screen); within the TTL no network request is made at all. Only a URL that
 *   has NEVER been fetched this session starts in `loading:true`.
 *
 *   The cache lives for the browser session (module scope), holds only what the
 *   super-admin already fetched, and is bounded by the small URL space of the
 *   admin surface (pages × ranges/scopes). `reload()` always bypasses the TTL.
 *
 * Contract:
 *   - `url === null` → the hook is INERT (loading:false, data:null). Pages use
 *     this to defer a fetch until a query param (range/scope/product) is ready,
 *     so a page can call the hook unconditionally and still skip the request —
 *     never call hooks conditionally.
 *   - `data` ALWAYS belongs to the CURRENT url. The url and its data live in
 *     ONE state value, and a url change is reconciled DURING RENDER (the
 *     React-sanctioned derived-state pattern), so not even a single frame of a
 *     previous range/scope's numbers can paint under the new label.
 *   - changing `url` re-fetches on a cache miss and aborts the previous
 *     in-flight request, so a fast range-tab toggle can't land a stale older
 *     response after a newer one — last-write-wins on the URL.
 *   - `reload()` forces a re-fetch of the current url (used by refresh buttons).
 *     While data is already on screen the re-fetch is SILENT (`refreshing`
 *     flips, `loading` stays false) so the page never blanks.
 *   - a failed background revalidate keeps the last good data on screen; pages
 *     surface `error` only when they have nothing to show (`!data`).
 *
 * It is deliberately tiny and dependency-free (plain fetch + useState/useEffect)
 * — no SWR/React-Query — to match the rest of the admin surface and avoid a new
 * dependency for read-only screens.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface UseAdminData<T> {
  /** The response for the CURRENT url — instantly served from cache when known. */
  data: T | null;
  /** True only while fetching a url with NO cached response (first visit). */
  loading: boolean;
  /** True while a silent background revalidation / reload is in flight. */
  refreshing: boolean;
  error: string | null;
  /** Re-fetch the current url, bypassing the TTL (no-op when url is null). */
  reload: () => void;
}

interface CacheEntry {
  data: unknown;
  /** Epoch ms the entry was stored — drives the stale check. */
  ts: number;
}

/** Module-level response cache: URL → last good JSON (session-scoped). */
const responseCache = new Map<string, CacheEntry>();

/** Entries older than this are shown immediately but silently revalidated. */
const STALE_AFTER_MS = 60_000;

/** url + its view state in ONE value, so data can never outlive its url. */
interface View<T> {
  url: string | null;
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

/** Build the view a (possibly cached) url starts from. */
function initialView<T>(url: string | null): View<T> {
  const cached = url === null ? undefined : responseCache.get(url);
  return {
    url,
    data: cached ? (cached.data as T) : null,
    // Loading only when we must hit the network with nothing to show.
    loading: url !== null && !cached,
    refreshing: false,
    error: null,
  };
}

export function useAdminData<T>(url: string | null): UseAdminData<T> {
  const [view, setView] = useState<View<T>>(() => initialView<T>(url));

  // Render-time url reconciliation (the sanctioned "derived state from props"
  // pattern): when the url changes, swap in the cached data (or the skeleton
  // state) for the NEW url before anything paints. React re-runs the render
  // with the updated state immediately; the old url's numbers never show under
  // the new label.
  if (view.url !== url) {
    setView(initialView<T>(url));
  }

  // Bumping this token forces the effect to re-run for the SAME url (reload()).
  const [nonce, setNonce] = useState(0);
  // reload() must bypass the TTL — flagged via a ref read by the effect run.
  const forceRef = useRef(false);

  const reload = useCallback(() => {
    // Guard: reloading an inert (null-url) hook would only thrash state.
    if (url !== null) {
      forceRef.current = true;
      setNonce((n) => n + 1);
    }
  }, [url]);

  useEffect(() => {
    // Inert mode — nothing to fetch (the view is already blank from init /
    // render reconciliation).
    if (url === null) return;

    const force = forceRef.current;
    forceRef.current = false;

    const cached = responseCache.get(url);
    if (cached) {
      const fresh = Date.now() - cached.ts < STALE_AFTER_MS;
      if (fresh && !force) {
        // Within the TTL: no network at all — instant and free.
        return;
      }
      // Stale (or forced): keep showing the data, revalidate silently.
      setView((v) => (v.url === url ? { ...v, refreshing: true } : v));
    }
    // Cache miss: the view already shows loading (init / reconciliation).

    // AbortController ties the request lifetime to this effect run; when `url`
    // (or nonce) changes, the cleanup aborts the previous request so its late
    // resolution can't clobber the newer view's data.
    const controller = new AbortController();
    let active = true;

    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          // The admin API answers 403 as { error } and never leaks which
          // emails are privileged; surface a terse, non-probing message.
          throw new Error(
            res.status === 403
              ? "Keine Berechtigung"
              : `Anfrage fehlgeschlagen (${res.status})`,
          );
        }
        return (await res.json()) as T;
      })
      .then((json) => {
        responseCache.set(url, { data: json, ts: Date.now() });
        if (active) {
          setView((v) =>
            v.url === url
              ? {
                  url,
                  data: json,
                  loading: false,
                  refreshing: false,
                  error: null,
                }
              : v,
          );
        }
      })
      .catch((err: unknown) => {
        // An abort is an expected control-flow signal (url changed), not a UI
        // error — swallow it and let the newer run own the state.
        if (controller.signal.aborted) return;
        if (active) {
          const message =
            err instanceof Error ? err.message : "Unbekannter Fehler";
          // A failed SILENT revalidate keeps the stale data on screen — pages
          // only surface `error` when they have nothing to show.
          setView((v) =>
            v.url === url
              ? { ...v, loading: false, refreshing: false, error: message }
              : v,
          );
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, nonce]);

  return {
    data: view.data,
    loading: view.loading,
    refreshing: view.refreshing,
    error: view.error,
    reload,
  };
}
