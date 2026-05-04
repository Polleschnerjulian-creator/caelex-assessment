"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";

/**
 * "Try V2" banner — Sprint 10G
 *
 * Renders at the top of the V1 DashboardShell to make the
 * V1→V2 toggle a single click. Hits /ui/v2 (Sprint 10G route
 * handler) which writes the user preference + cookie and
 * redirects into /dashboard/posture.
 *
 * # Visibility
 *
 * - Only renders inside V1 chrome (V2 users never see this — V2
 *   sidebar is rendered by V2Shell which doesn't include this).
 * - Dismissible via localStorage with 24h TTL (same pattern as
 *   the Sprint 6C AI-disclosure banner). Resets every day so an
 *   operator who clicked X yesterday gets a fresh nudge today.
 *
 * # Why localStorage not cookie
 *
 * The dismissal state is purely client-side UX — no server-side
 * decision depends on it. localStorage avoids cookie-banner clutter
 * and stays per-device.
 */

const STORAGE_KEY = "caelex-try-v2-dismissed";
const TTL_MS = 24 * 60 * 60 * 1000;

export function TryV2Banner() {
  // Hidden until we've checked storage; flicker-free first paint.
  const [hidden, setHidden] = React.useState(true);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setHidden(false);
        return;
      }
      const dismissedAt = Date.parse(stored);
      if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < TTL_MS) {
        setHidden(true);
        return;
      }
      setHidden(false);
    } catch {
      // localStorage unavailable (private browsing) — show by default.
      setHidden(false);
    }
  }, []);

  const dismiss = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // Best-effort persistence — banner still hides for this mount.
    }
    setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <div
      data-testid="try-v2-banner"
      role="status"
      className="flex items-start gap-3 border-b border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-emerald-500/[0.05] px-4 py-2.5 text-emerald-100"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <div className="min-w-0 flex-1 text-[12px] leading-relaxed">
        <strong className="font-medium">Comply v2 is here.</strong>{" "}
        Mission-first dashboard, live ops console, EU AI Act-compliant Astra,
        Bitcoin-anchored audit chain. Switch back any time from{" "}
        <span className="font-mono text-[11px]">Settings → UI Version</span>.
      </div>
      <Link
        href="/ui/v2"
        prefetch={false}
        data-testid="try-v2-button"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 ring-1 ring-inset ring-emerald-400 transition hover:bg-emerald-400"
      >
        Try v2
        <ArrowRight className="h-3 w-3" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for 24 hours"
        data-testid="try-v2-dismiss"
        className="shrink-0 rounded p-1 text-emerald-300/60 transition hover:bg-emerald-500/10 hover:text-emerald-200"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
