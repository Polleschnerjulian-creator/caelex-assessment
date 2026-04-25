"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * MorningBrief — Phase 1 Welcome-Back Briefing.
 *
 * When the lawyer opens Atlas idle, this component fetches a one-line
 * proactive briefing from the server (upcoming tasks / counterparty
 * activity / recent matters) and renders it as a soft chip above
 * the suggestion row. Click on the CTA → deep-link into the matter
 * the briefing references. Dismiss → silenced for the rest of the day.
 *
 * UX choices
 *   - Delayed mount (~700ms) so the orb is fully on-screen before the
 *     chip enters. Avoids overstuffing the first second of the page.
 *   - sessionStorage dismissal keyed on YYYY-MM-DD — every new day
 *     gets a fresh briefing. The lawyer can always re-load the page
 *     to see it again within the same day.
 *   - Hidden once the user starts typing or a conversation begins —
 *     the briefing is for the empty/idle state, not active use.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUpRight, X } from "lucide-react";
import styles from "./ai-mode.module.css";

interface BriefPayload {
  greeting: string;
  brief: string;
  cta?: { label: string; href: string };
}

interface MorningBriefProps {
  /** Hide when the lawyer is mid-conversation or has typed input.
   *  The briefing is exclusively for the cold-open idle state. */
  hidden: boolean;
  /** Sound + click telemetry. Optional — gracefully no-ops. */
  onClick?: () => void;
  /** Closes the AI overlay before the deep-link nav so the
   *  destination page mounts cleanly without the orb still
   *  occluding the layout. */
  onCtaClose?: () => void;
}

function todayKey(): string {
  const d = new Date();
  // Format: YYYY-MM-DD in local time. Resets at midnight per locale.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DISMISS_STORAGE_KEY = "atlas-morning-brief-dismissed";

function isDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISS_STORAGE_KEY) === todayKey();
  } catch {
    return false;
  }
}

function markDismissedToday(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISMISS_STORAGE_KEY, todayKey());
  } catch {
    // sessionStorage might be disabled (private mode, quotas).
    // Silent no-op — the brief just shows again on next mount.
  }
}

export function MorningBrief({
  hidden,
  onClick,
  onCtaClose,
}: MorningBriefProps) {
  const router = useRouter();
  const [data, setData] = useState<BriefPayload | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Delayed mount so the orb's entrance animation finishes first.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Fetch once. If already dismissed today (sessionStorage), skip.
  useEffect(() => {
    if (isDismissedToday()) {
      setDismissed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/atlas/morning-brief", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as BriefPayload;
        if (cancelled) return;
        // Server soft-fail returns brief: "" — treat as no-data.
        if (!json.brief) return;
        setData(json);
      } catch {
        // Best-effort. Silent on failure so the idle screen stays clean.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = useCallback(() => {
    markDismissedToday();
    setDismissed(true);
  }, []);

  const handleCta = useCallback(() => {
    if (!data?.cta) return;
    onClick?.();
    onCtaClose?.();
    router.push(data.cta.href);
  }, [data, router, onClick, onCtaClose]);

  // Render gates — order matters: dismissal trumps everything else.
  if (dismissed) return null;
  if (!data) return null;

  return (
    <div
      className={`${styles.morningBrief} ${
        mounted && !hidden ? styles.morningBriefVisible : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <Sparkles
        size={11}
        strokeWidth={1.7}
        className={styles.morningBriefIcon}
        aria-hidden="true"
      />
      <span className={styles.morningBriefGreeting}>{data.greeting}.</span>
      <span className={styles.morningBriefText}>{data.brief}</span>
      {data.cta && (
        <button
          type="button"
          className={styles.morningBriefCta}
          onClick={handleCta}
        >
          {data.cta.label}
          <ArrowUpRight size={10} strokeWidth={1.8} />
        </button>
      )}
      <button
        type="button"
        className={styles.morningBriefDismiss}
        onClick={handleDismiss}
        aria-label="Briefing für heute ausblenden"
      >
        <X size={10} strokeWidth={1.8} />
      </button>
    </div>
  );
}
