"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Polls the Atlas notifications endpoint for the user's unread count.
 *
 * Rationale for polling over WebSocket/SSE:
 *   - We're at very low concurrency (tens to low-hundreds of
 *     simultaneous Atlas users). A 60s poll per active tab costs
 *     ~1 Vercel function invocation per minute per user, which is
 *     well inside free-tier budgets.
 *   - No persistent-connection infrastructure to maintain.
 *   - Trivially cancellable on route change / tab unload.
 *
 * If concurrency grows past a few thousand, swap for SSE on
 * /api/atlas/alerts/stream — same hook signature, internal
 * implementation change only.
 *
 * Behaviour:
 *   - Fires an immediate fetch on mount.
 *   - Re-fetches every POLL_MS while the tab is visible.
 *   - Pauses (no fetches) while the tab is hidden — no point
 *     burning function invocations when the user isn't looking.
 *   - Re-fetches on route changes away from /atlas/alerts
 *     (so the badge updates after the user marks things read and
 *     navigates away).
 *   - Silently fails on errors (sets count to 0 and waits for the
 *     next interval). A dropped network shouldn't produce a
 *     visible error in the sidebar.
 */

const POLL_MS = 60_000;

export function useAtlasUnreadCount(): number {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/atlas/alerts/notifications?limit=1", {
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) setCount(0);
          return;
        }
        const data = (await res.json()) as { unreadCount?: number };
        if (!cancelled) setCount(data.unreadCount ?? 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    };

    // Initial fetch — don't wait for the first interval tick.
    fetchCount();

    // Polling interval, but pause while the tab isn't visible.
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(fetchCount, POLL_MS);
    };
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (document.visibilityState === "visible") startPolling();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Just became visible — fetch immediately AND resume polling,
        // so a tab-focus after an absence shows fresh state without
        // waiting up to 60s.
        fetchCount();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // Re-run on pathname change so leaving /atlas/alerts (where the
    // user likely just clicked some Mark-Read buttons) kicks off a
    // fresh fetch rather than waiting for the next 60s tick.
  }, [pathname]);

  return count;
}
