"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the shared client data-fetching hook (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Every /admin page reads exactly one JSON endpoint per view, so the four pages
 * (Cockpit, Retention, Funnels, Paths) all consume this ONE hook instead of
 * re-implementing fetch + loading + error + abort each time. Keeping the
 * fetch policy in one place means a change to (e.g.) the cache header or the
 * error-surfacing rule lands everywhere at once.
 *
 * Contract:
 *   - `url === null` → the hook is INERT (loading:false, data:null). Pages use
 *     this to defer a fetch until a query param (range/scope/product) is ready,
 *     so a page can call the hook unconditionally and still skip the request —
 *     never call hooks conditionally.
 *   - changing `url` re-fetches and aborts the previous in-flight request (so a
 *     fast range-tab toggle can't land a stale older response after a newer one
 *     — last-write-wins on the URL, not on whichever network call returns last).
 *   - `reload()` forces a re-fetch of the current url (used by a refresh button).
 *
 * It is deliberately tiny and dependency-free (plain fetch + useState/useEffect)
 * — no SWR/React-Query — to match the rest of the admin surface and avoid a new
 * dependency for four read-only screens.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useEffect, useCallback } from "react";

export interface UseAdminData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch the current url (no-op when url is null). */
  reload: () => void;
}

export function useAdminData<T>(url: string | null): UseAdminData<T> {
  const [data, setData] = useState<T | null>(null);
  // Start in the loading state only when we actually have a url to fetch, so a
  // deferred (null-url) hook renders its empty state immediately rather than a
  // spinner that never resolves.
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [error, setError] = useState<string | null>(null);
  // Bumping this token forces the effect to re-run for the SAME url (reload()).
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    // Guard: reloading an inert (null-url) hook would only thrash state.
    if (url !== null) setNonce((n) => n + 1);
  }, [url]);

  useEffect(() => {
    // Inert mode — clear any prior result and do not hit the network.
    if (url === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // AbortController ties the request lifetime to this effect run; when `url`
    // (or nonce) changes, the cleanup aborts the previous request so its late
    // resolution can't clobber the newer view's data.
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          // The admin API answers 403 as { error } and never leaks which
          // emails are privileged; surface a terse, non-probing message.
          throw new Error(
            res.status === 403
              ? "Not authorized"
              : `Request failed (${res.status})`,
          );
        }
        return (await res.json()) as T;
      })
      .then((json) => {
        if (active) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        // An abort is an expected control-flow signal (url changed), not a UI
        // error — swallow it and let the newer run own the state.
        if (controller.signal.aborted) return;
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, nonce]);

  return { data, loading, error, reload };
}
