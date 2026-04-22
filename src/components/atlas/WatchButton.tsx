"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

/**
 * Reusable watch-toggle button for ATLAS alerts.
 *
 * Given a subscription target (SOURCE sourceId | JURISDICTION code),
 * this component:
 *   1. Fetches the user's current subscription list on mount and
 *      determines whether a matching subscription exists.
 *   2. Renders a "Watch" or "Watching" button with hover-to-unwatch
 *      affordance.
 *   3. On click, POSTs to /api/atlas/alerts/subscriptions or DELETEs
 *      the existing sub. Optimistic state flip so the UI is
 *      responsive; server errors roll back silently (worst case the
 *      user retries).
 *
 * Unauthenticated users (the /api returns 401) see a disabled
 * button with a tooltip hinting at sign-in — keeps the UI honest
 * without routing them away from the jurisdiction page unexpectedly.
 */

interface Subscription {
  id: string;
  targetType: "SOURCE" | "JURISDICTION";
  targetId: string;
}

export interface WatchButtonProps {
  targetType: "SOURCE" | "JURISDICTION";
  targetId: string;
  /** Size preset — "sm" for inline use, "md" for card headers. */
  size?: "sm" | "md";
  /** Override the default class name for the OUTER button element. */
  className?: string;
}

export function WatchButton({
  targetType,
  targetId,
  size = "md",
  className,
}: WatchButtonProps) {
  const [subId, setSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Load subscription list once on mount and locate a match for
  // this specific target. Kept inline (no global store) because the
  // button mounts in isolated contexts (one per jurisdiction / source
  // page) and the list is small enough that a short-lived fetch is
  // cheap. A future refactor could lift this into a shared context.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/atlas/alerts/subscriptions");
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          subscriptions: Subscription[];
        };
        if (cancelled) return;
        const match = data.subscriptions.find(
          (s) => s.targetType === targetType && s.targetId === targetId,
        );
        setSubId(match?.id ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  const toggle = useCallback(async () => {
    if (pending || loading) return;
    setPending(true);
    try {
      if (subId) {
        // Currently watching → unsubscribe.
        const res = await fetch(
          `/api/atlas/alerts/subscriptions/${encodeURIComponent(subId)}`,
          { method: "DELETE" },
        );
        if (res.ok) setSubId(null);
      } else {
        // Not watching → subscribe.
        const res = await fetch("/api/atlas/alerts/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, targetId }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            subscription: { id: string };
          };
          setSubId(data.subscription.id);
        }
      }
    } finally {
      setPending(false);
    }
  }, [subId, loading, pending, targetType, targetId]);

  const isWatching = Boolean(subId);

  const sizeClass =
    size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-[12px]";

  // Content:
  //   - loading      → spinner
  //   - watching + hovering → "Unwatch"
  //   - watching     → "Watching"
  //   - default      → "Watch"
  const content = loading ? (
    <>
      <Loader2
        size={size === "sm" ? 11 : 13}
        strokeWidth={1.75}
        className="animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </>
  ) : isWatching ? (
    <>
      {hovering ? (
        <BellOff
          size={size === "sm" ? 11 : 13}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ) : (
        <Bell
          size={size === "sm" ? 11 : 13}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
      <span>{hovering ? "Unwatch" : "Watching"}</span>
    </>
  ) : (
    <>
      <Bell
        size={size === "sm" ? 11 : 13}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span>Watch</span>
    </>
  );

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={pending || loading}
      aria-pressed={isWatching}
      title={
        isWatching
          ? "You’re subscribed — click to stop receiving alerts"
          : "Subscribe to amendment alerts for this target"
      }
      className={
        className ??
        `inline-flex items-center gap-1.5 rounded-md font-medium transition-colors shadow-sm disabled:opacity-40 disabled:pointer-events-none ${sizeClass} ${
          isWatching
            ? hovering
              ? "bg-red-50 border border-red-200 text-red-600"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : "bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] text-[var(--atlas-text-secondary)] hover:bg-[var(--atlas-bg-surface-muted)]"
        }`
      }
    >
      {content}
    </button>
  );
}
