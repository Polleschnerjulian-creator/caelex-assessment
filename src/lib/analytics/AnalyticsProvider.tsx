"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — the ONE shared cross-product client tracker.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * THE BUG THIS FIXES (spec §2.2.1 / §4): the legacy `useAnalyticsTracking` hook
 * is mounted in exactly ONE place — the legacy V1 `DashboardShell`. The V2 shell
 * does NOT mount it, so Comply tracking goes dark on V2, and Atlas / Pharos /
 * Trade / Scholar emit ZERO behavioural events. Mounting this provider ONCE as a
 * client sibling in `src/app/layout.tsx` instruments ALL FIVE products from a
 * single, UNGUARDED file — no per-surface edits, no `ALLOW_CROSS_SURFACE` bypass.
 *
 * WHAT IT CAPTURES (all consent-gated, all PII-impossible by the ./events.ts
 * taxonomy):
 *   - `page_viewed`     on every pathname change (the V2 regression fix);
 *   - `screen_dwelled`  FOREGROUND-only engaged time + max scroll depth, flushed
 *                       on the next route change AND on pagehide / hidden;
 *   - `element_clicked` for elements annotated with a `data-track="<slug>"` token
 *                       (delegated listener — only annotated elements, so inner
 *                       text can never leak);
 *   - `user_identified` once per session after login (stitches anon → user).
 *
 * HOW IT STAYS SAFE:
 *   - product is DERIVED from the pathname (productFromPath) — no per-page wiring;
 *   - the path is PATHNAME-ONLY (query stripped) before it leaves the browser;
 *   - everything is gated by the single client consent reader (versioned, stale-
 *     safe `getPreferences()`); nothing identifying fires pre-consent, and the
 *     essential signup/login allow-list seam is honoured (those are emitted
 *     elsewhere, not here);
 *   - events are micro-batched (emitEvent → BatchEmitter) and flushed as an ARRAY
 *     via sendBeacon, so dwell/scroll/click volume collapses into few requests.
 *
 * WHY IT WRAPS SessionProvider: this provider renders as a SIBLING of <Providers>
 * in the root layout (next to the existing <ConditionalAnalytics/> / <Cookie
 * Consent/>), i.e. OUTSIDE the app's SessionProvider. A nested SessionProvider
 * here shares the same `/api/auth/session` endpoint/SWR cache, so `useSession()`
 * resolves for identity stitching without a meaningful extra fetch.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import { getPreferences } from "@/components/CookieConsent";
import {
  analytics,
  emitEvent,
  flushAllAnalytics,
  type EmitEventOptions,
} from "@/lib/analytics";
import {
  EVENT_TYPES,
  SLUG_REGEX,
  isEssentialEventType,
  productFromPath,
  type EventType,
} from "@/lib/analytics/events";
import { deriveEnvelopeHead, segmentToSlug } from "@/lib/analytics/surface";
import { DwellAccumulator, ScrollDepthTracker } from "@/lib/analytics/dwell";

/** Periodic scroll sampling throttle (ms). */
const SCROLL_THROTTLE_MS = 250;
/** Minimum engaged time before a `screen_dwelled` is worth emitting (ms). */
const MIN_DWELL_MS = 1000;

/**
 * The single client consent gate. Reuses the versioned, stale-safe
 * `getPreferences()` from CookieConsent (returns null when the stored decision
 * is for an older CONSENT_VERSION or has expired → re-prompt → no analytics).
 * Mirrors the conservative default of every existing reader: no record ⇒ false.
 */
function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const prefs = getPreferences();
    return prefs?.analytics === true;
  } catch {
    return false;
  }
}

/**
 * Decide whether an event may fire given the current consent state. Non-essential
 * events require analytics consent; the essential signup/login allow-list always
 * passes (the typed seam from ./events.ts), matching the ingestion route's gate.
 */
function mayEmit(eventType: EventType): boolean {
  if (isEssentialEventType(eventType)) return true;
  return hasAnalyticsConsent();
}

/**
 * The shared tracking hook — the cross-product generalisation of the legacy
 * `useAnalyticsTracking`. Stateless w.r.t. React render output; all browser
 * wiring lives in effects so it is inert under SSR.
 */
function useTracking(): void {
  const pathname = usePathname();
  const { data: session } = useSession();

  const identifiedRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  const dwellRef = useRef<DwellAccumulator | null>(null);
  const scrollRef = useRef<ScrollDepthTracker | null>(null);
  // The envelope head (product/surface/feature) of the CURRENTLY-open screen,
  // captured at page_view time so the dwell flush attributes to the right screen
  // even if the pathname ref has already advanced.
  const currentHeadRef = useRef<ReturnType<typeof deriveEnvelopeHead> | null>(
    null,
  );
  const currentPathRef = useRef<string | null>(null);

  // Lazily create the dwell + scroll trackers once (client only).
  if (typeof window !== "undefined" && dwellRef.current === null) {
    dwellRef.current = new DwellAccumulator();
    scrollRef.current = new ScrollDepthTracker();
  }

  // ── Identity stitching: identify once per session, consent-gated ──
  useEffect(() => {
    if (session?.user && !identifiedRef.current && hasAnalyticsConsent()) {
      const user = session.user as { id?: string; organizationId?: string };
      if (user.id) {
        // analytics.identify sets the buffered userId/orgId + emits
        // `user_identified` (a non-essential, consent-gated signal).
        analytics.identify(user.id, user.organizationId);
        identifiedRef.current = true;
      }
    }
  }, [session]);

  // ── Page views + dwell flush on route change ──
  useEffect(() => {
    if (!pathname || pathname === lastPathRef.current) return;

    // 1. Flush the dwell of the OUTGOING screen (if any) before switching.
    flushDwell("route_change");

    // 2. Advance the path + start fresh dwell/scroll windows for the NEW screen.
    lastPathRef.current = pathname;
    currentPathRef.current = pathname;
    currentHeadRef.current = deriveEnvelopeHead(pathname);
    dwellRef.current?.reset(
      typeof document === "undefined" || document.visibilityState !== "hidden",
    );
    scrollRef.current?.reset();

    // 3. Emit the page_viewed for the new screen.
    const head = currentHeadRef.current;
    if (head && mayEmit(EVENT_TYPES.PAGE_VIEWED)) {
      emitEvent(EVENT_TYPES.PAGE_VIEWED, {}, headToOptions(head, pathname));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Visibility, unload, delegated clicks, scroll — wired once ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      if (hidden) {
        // Pause the dwell timer, flush the partial dwell, and drain the buffer
        // before the tab is potentially discarded.
        dwellRef.current?.markHidden();
        flushDwell("visibility_hidden");
        flushAllAnalytics();
      } else {
        dwellRef.current?.markVisible();
      }
    };

    const onPageHide = () => {
      dwellRef.current?.markHidden();
      flushDwell("pagehide");
      flushAllAnalytics();
    };

    const onClick = (ev: Event) => {
      if (!hasAnalyticsConsent()) return;
      const target = ev.target;
      if (!(target instanceof Element)) return;
      // Walk up to the nearest [data-track] ancestor (delegated capture).
      const el = target.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const rawToken = el.getAttribute("data-track");
      if (!rawToken) return;
      // Normalise to a slug so element inner text can never become the value.
      const token = SLUG_REGEX.test(rawToken)
        ? rawToken
        : segmentToSlug(rawToken);
      const head = currentHeadRef.current ?? deriveEnvelopeHead(pathnameNow());
      emitEvent(
        EVENT_TYPES.ELEMENT_CLICKED,
        { token },
        headToOptions(head, currentPathRef.current ?? pathnameNow()),
      );
    };

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (scrollTimer !== null) return; // throttle
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        const tracker = scrollRef.current;
        if (!tracker) return;
        const doc = document.documentElement;
        tracker.record(
          window.scrollY || doc.scrollTop || 0,
          window.innerHeight || doc.clientHeight || 0,
          doc.scrollHeight || 0,
        );
      }, SCROLL_THROTTLE_MS);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    // Capture phase so we still see the click even if a child stops propagation.
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      if (scrollTimer !== null) clearTimeout(scrollTimer);
      // Flush any unsent dwell when the provider unmounts (rare — root-level).
      dwellRef.current?.markHidden();
      flushDwell("unmount");
      flushAllAnalytics();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Emit a `screen_dwelled` for the currently-tracked screen, if it accrued at
   * least {@link MIN_DWELL_MS} of FOREGROUND time. After emitting it RE-BASES the
   * dwell window (banking nothing new) so a subsequent flush — e.g. on `pagehide`
   * after the user returned and read more — only reports the ADDITIONAL engaged
   * time, never the milliseconds already sent. This makes repeated flushes on the
   * same screen (visibility-hidden → route-change → pagehide) additive, not
   * double-counted. The route-change handler separately resets for the NEXT
   * screen. No-op without consent or below the threshold.
   */
  function flushDwell(_reason: string): void {
    const head = currentHeadRef.current;
    const dwell = dwellRef.current;
    if (!head || !dwell) return;
    const durationMs = dwell.elapsedMs;
    if (durationMs < MIN_DWELL_MS) return;
    if (!mayEmit(EVENT_TYPES.SCREEN_DWELLED)) return;
    const maxScrollPct = scrollRef.current?.maxScrollPct ?? 0;
    emitEvent(
      EVENT_TYPES.SCREEN_DWELLED,
      { durationMs, maxScrollPct },
      headToOptions(head, currentPathRef.current ?? null, durationMs),
    );
    // Re-base the dwell so a later flush (e.g. on pagehide after returning) does
    // not re-send the already-reported milliseconds.
    dwell.reset(dwell.isVisible);
    scrollRef.current?.reset();
  }
}

/** Read the live pathname directly (used only inside DOM event handlers). */
function pathnameNow(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

/**
 * Map a derived envelope head + path into the {@link EmitEventOptions} the
 * batched emitter expects. The path is the PATHNAME ONLY (the provider never
 * carries a query string), satisfying the wire `pathSchema`.
 */
function headToOptions(
  head: ReturnType<typeof deriveEnvelopeHead>,
  path: string | null,
  durationMs?: number,
): EmitEventOptions {
  return {
    product: head.product,
    surface: head.surface,
    feature: head.feature,
    path: path ?? undefined,
    ...(durationMs !== undefined ? { durationMs } : {}),
    // Coarse legacy category mirror for the existing column.
    category: "engagement",
  };
}

/** Inner component that actually runs the hook (must sit under SessionProvider). */
function TrackingRunner(): null {
  useTracking();
  return null;
}

/**
 * The mountable provider. Renders no UI; it only wires the cross-product tracker.
 * Mount ONCE in the root layout as a sibling of <ConditionalAnalytics/> /
 * <CookieConsent/>.
 */
export default function AnalyticsProvider(): React.ReactElement {
  return (
    <SessionProvider>
      <TrackingRunner />
    </SessionProvider>
  );
}

// Re-export the product deriver for callers that want the same mapping the
// provider uses (keeps one import surface for the spine).
export { productFromPath };
