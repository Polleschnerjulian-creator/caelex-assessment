/**
 * Caelex Analytics Tracking Utility
 *
 * Privacy-first, self-hosted analytics for space/defense customers.
 * All data stays on our infrastructure - no external tracking services.
 *
 * Usage:
 *   import { analytics } from "@/lib/analytics";
 *   analytics.track("feature_use", { feature: "eu_space_act", action: "opened" });
 *   analytics.page("/dashboard");
 *
 * ── BATCHED EMITTER (cross-product spine, added 2026-06-08) ──────────────────
 * The legacy `analytics.*` API above sends ONE POST per call. The cross-product
 * `<AnalyticsProvider/>` instead routes high-frequency events (page_viewed,
 * screen_dwelled, element_clicked, scroll) through {@link emitEvent}, which
 * buffers them in an in-memory {@link BatchEmitter} and flushes an ARRAY via
 * `sendBeacon` on size/interval/pagehide — cutting ingestion writes ~5–20×
 * (spec §5.1.2). The taxonomy + PII boundary live in `./analytics/events.ts`.
 * The legacy single-event API is UNCHANGED (reuse, not rebuild); the route
 * accepts both a single body and a `{ events, _consent }` array body.
 */

import {
  type WireEvent,
  type EventType,
  type Product,
  buildEventData,
  isEssentialEventType,
} from "./analytics/events";
import { BatchEmitter, type BatchSink } from "./analytics/batch-emitter";

type EventCategory =
  | "navigation"
  | "engagement"
  | "conversion"
  | "error"
  | "general";

interface TrackOptions {
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  category?: EventCategory;
  path?: string;
  referrer?: string;
  durationMs?: number;
}

interface AnalyticsClient {
  track: (
    eventType: string,
    eventData?: Record<string, unknown>,
    options?: TrackOptions,
  ) => void;
  page: (pageName: string, options?: TrackOptions) => void;
  feature: (
    featureName: string,
    action: string,
    options?: TrackOptions,
  ) => void;
  conversion: (
    conversionType: string,
    value?: number,
    options?: TrackOptions,
  ) => void;
  error: (
    errorType: string,
    errorMessage: string,
    options?: TrackOptions,
  ) => void;
  timing: (
    eventType: string,
    durationMs: number,
    eventData?: Record<string, unknown>,
    options?: TrackOptions,
  ) => void;
  identify: (userId: string, organizationId?: string) => void;
}

// Session ID management (client-side only)
let currentSessionId: string | null = null;
let currentUserId: string | null = null;
let currentOrgId: string | null = null;

function getSessionId(): string {
  if (typeof window === "undefined") return "server";

  if (!currentSessionId) {
    // Try to get from sessionStorage
    currentSessionId = sessionStorage.getItem("caelex_session_id");

    if (!currentSessionId) {
      // Session id shape is `sess_<timestamp>_<random>` (timestamp FIRST) — a
      // stable, sortable contract relied on across the analytics pipeline and
      // the unit suite (`/^sess_\d+_/`). The RANDOM suffix prefers a
      // CSPRNG-grade source (crypto.randomUUID on modern browsers + Node 19+),
      // falling back to Math.random only when the API is unavailable (very old
      // browsers). Audit L-1: keep CSPRNG entropy WITHOUT dropping the leading
      // millisecond timestamp that the id format guarantees.
      const random =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().replace(/-/g, "")
          : Math.random().toString(36).substring(2, 15);
      currentSessionId = `sess_${Date.now()}_${random}`;
      sessionStorage.setItem("caelex_session_id", currentSessionId);
    }
  }

  return currentSessionId;
}

/**
 * Read the browser-stored cookie-consent decision and coarsen it to the wire
 * consent string the ingestion route understands ("analytics" | "necessary" |
 * "none"). Centralised here (single client reader) so the legacy `sendEvent`
 * path AND the new batched emitter agree on the exact same parse — matching the
 * conservative "no record → none" default of every existing reader.
 *
 * NOTE: this reads the RAW `caelex-cookie-consent` shape (incl. the legacy
 * "all"/"necessary" strings and the current versioned record) so it never
 * accidentally diverges from `CookieConsent.getPreferences()`. It is only the
 * transport hint; the server re-checks consent via the ConsentRecord resolver.
 */
export function readClientConsentString(): "analytics" | "necessary" | "none" {
  if (typeof window === "undefined") return "none";
  try {
    const raw = localStorage.getItem("caelex-cookie-consent");
    if (!raw) return "none";
    // Legacy plain values.
    if (raw === "all") return "analytics";
    if (raw === "necessary") return "necessary";
    const parsed = JSON.parse(raw);
    // Versioned record shape ({ preferences: { analytics } }) OR legacy plain
    // prefs ({ analytics }). Either way, analytics === true ⇒ "analytics".
    const analyticsOn =
      parsed?.preferences?.analytics === true || parsed?.analytics === true;
    return analyticsOn ? "analytics" : "necessary";
  } catch {
    return "none";
  }
}

/**
 * Expose the current browser session id so the shared `<AnalyticsProvider/>`
 * stamps the SAME `sess_…` id the legacy emitter uses (consistent funnels +
 * path reconstruction). Returns "server" under SSR.
 */
export function getAnalyticsSessionId(): string {
  return getSessionId();
}

function sendEvent(
  eventType: string,
  eventData: Record<string, unknown> | undefined,
  category: EventCategory,
  options: TrackOptions = {},
): void {
  // Fire-and-forget: non-blocking async
  const payload = {
    eventType,
    eventData: eventData || {},
    category: options.category || category,
    sessionId: options.sessionId || getSessionId(),
    userId: options.userId || currentUserId,
    organizationId: options.organizationId || currentOrgId,
    path:
      options.path ||
      (typeof window !== "undefined" ? window.location.pathname : undefined),
    referrer:
      options.referrer ||
      (typeof window !== "undefined" ? document.referrer : undefined),
    durationMs: options.durationMs,
    timestamp: new Date().toISOString(),
  };

  // Read cookie consent status to pass to server for GDPR validation
  const consentStatus = readClientConsentString();

  // Use sendBeacon for reliability (survives page unload)
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    // sendBeacon doesn't support custom headers, so embed consent in payload
    const beaconPayload = { ...payload, _consent: consentStatus };
    navigator.sendBeacon("/api/analytics/track", JSON.stringify(beaconPayload));
  } else if (typeof fetch !== "undefined") {
    // Fallback to fetch for SSR or older browsers
    fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cookie-consent": consentStatus,
      },
      body: JSON.stringify(payload),
      keepalive: true, // Survives page navigation
    }).catch(() => {
      // Silently fail - analytics should never break the app
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batched cross-product emitter (used by <AnalyticsProvider/> / useTracking)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Browser transport for a batch of wire events. Sends ONE array body
 * `{ events, _consent }` to `/api/analytics/track` via `sendBeacon` (which
 * survives page unload), with a `fetch(..., { keepalive })` fallback. The
 * out-of-band `_consent` rides as a sibling field (NOT inside any event) so it
 * can never pollute the typed taxonomy. Returns true if the transport accepted
 * the payload so the {@link BatchEmitter} can clear it.
 */
const browserBatchSink: BatchSink = (events) => {
  if (events.length === 0) return true;
  if (typeof window === "undefined") return false;

  const consent = readClientConsentString();
  const body = JSON.stringify({ events, _consent: consent });

  // Prefer sendBeacon — reliable on unload, no custom headers (consent embedded).
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      // sendBeacon returns false if the UA refused to queue the payload
      // (e.g. it exceeded the per-origin beacon byte budget) — surface that so
      // the emitter re-buffers and retries via fetch on the next flush.
      return navigator.sendBeacon("/api/analytics/track", body);
    } catch {
      // fall through to fetch
    }
  }

  if (typeof fetch !== "undefined") {
    try {
      void fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cookie-consent": consent,
        },
        body,
        keepalive: true,
      }).catch(() => {
        // Silently fail — analytics must never break the app.
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

/** Lazily-constructed singleton batch emitter (one per browser tab). */
let batchEmitter: BatchEmitter | null = null;
function getBatchEmitter(): BatchEmitter {
  if (!batchEmitter) {
    batchEmitter = new BatchEmitter({ sink: browserBatchSink });
  }
  return batchEmitter;
}

/** Options accepted by {@link emitEvent}. */
export interface EmitEventOptions {
  /** Cross-product dimension (derived from the path by the provider). */
  product: Product;
  /** Route-group / named feature area (slug). */
  surface: string;
  /** Named action area (slug). */
  feature: string;
  /** Optional normalised topic id/hash (slug) — NEVER raw query text. */
  topic?: string;
  /** Pathname ONLY (no query string) — the provider strips it. */
  path?: string | null;
  /** Optional foreground duration for timed events (screen_dwelled etc.). */
  durationMs?: number | null;
  /** Coarse legacy category mirror for the existing column default. */
  category?: EventCategory;
  /** Override the buffered userId/orgId (defaults to the identified user). */
  userId?: string | null;
  organizationId?: string | null;
}

/**
 * Build + buffer one TYPED cross-product event. This is the single entry point
 * the shared `<AnalyticsProvider/>` uses. It:
 *   1. stamps the envelope (schemaVersion + product + surface/feature/topic) and
 *      validates the typed payload via {@link buildEventData} (throws in dev on a
 *      taxonomy violation; swallowed here so analytics never breaks the app);
 *   2. wraps it in a {@link WireEvent} (path is pathname-only, query rejected);
 *   3. enqueues it on the micro-batch emitter (flushes on size/interval/unload).
 *
 * Consent is the PROVIDER's responsibility (it gates before calling this, and
 * the essential signup/login allow-list is honoured there + re-checked at the
 * route). The {@link isEssentialEventType} seam is re-exported for the provider.
 */
export function emitEvent(
  eventType: EventType,
  payload: Record<string, unknown> | undefined,
  options: EmitEventOptions,
): void {
  if (typeof window === "undefined") return;

  let eventData: Record<string, unknown>;
  try {
    eventData = buildEventData(
      eventType,
      {
        product: options.product,
        surface: options.surface,
        feature: options.feature,
        ...(options.topic !== undefined ? { topic: options.topic } : {}),
      },
      payload,
    );
  } catch {
    // Taxonomy violation — drop rather than write junk or crash the UI. In dev,
    // buildEventData's throw still surfaces at the (separate) test boundary.
    return;
  }

  const wireEvent: WireEvent = {
    eventType,
    eventData,
    category: options.category ?? "general",
    sessionId: getSessionId(),
    userId: options.userId !== undefined ? options.userId : currentUserId,
    organizationId:
      options.organizationId !== undefined
        ? options.organizationId
        : currentOrgId,
    path:
      options.path ??
      (typeof window !== "undefined" ? window.location.pathname : undefined),
    durationMs: options.durationMs ?? undefined,
    timestamp: new Date().toISOString(),
  };

  getBatchEmitter().enqueue(wireEvent);
}

/** Flush one batch now (size-bounded). Used by the interval/idle path. */
export function flushAnalytics(): void {
  if (typeof window === "undefined") return;
  getBatchEmitter().flush();
}

/**
 * Drain the WHOLE buffer immediately — for `pagehide` / visibility-hidden so no
 * buffered event is lost on unload. Safe to call repeatedly.
 */
export function flushAllAnalytics(): void {
  if (typeof window === "undefined") return;
  getBatchEmitter().flushAll();
}

/** Re-export the consent-gate seam so the provider imports one analytics module. */
export { isEssentialEventType };

export const analytics: AnalyticsClient = {
  /**
   * Track a custom event
   * @example analytics.track("report_generated", { reportType: "compliance", format: "pdf" })
   */
  track: (
    eventType: string,
    eventData?: Record<string, unknown>,
    options?: TrackOptions,
  ) => {
    sendEvent(eventType, eventData, options?.category || "general", options);
  },

  /**
   * Track a page view
   * @example analytics.page("/dashboard/cybersecurity")
   */
  page: (pageName: string, options?: TrackOptions) => {
    sendEvent("page_view", { page: pageName }, "navigation", {
      ...options,
      path: pageName,
    });
  },

  /**
   * Track feature usage
   * @example analytics.feature("eu_space_act", "assessment_started")
   */
  feature: (featureName: string, action: string, options?: TrackOptions) => {
    sendEvent(
      "feature_use",
      { feature: featureName, action },
      "engagement",
      options,
    );
  },

  /**
   * Track conversion events (signup, upgrade, etc.)
   * @example analytics.conversion("signup", undefined, { organizationId: "org_123" })
   */
  conversion: (
    conversionType: string,
    value?: number,
    options?: TrackOptions,
  ) => {
    sendEvent("conversion", { conversionType, value }, "conversion", options);
  },

  /**
   * Track errors (client-side)
   * @example analytics.error("api_error", "Failed to load dashboard")
   */
  error: (errorType: string, errorMessage: string, options?: TrackOptions) => {
    sendEvent("error", { errorType, errorMessage }, "error", options);
  },

  /**
   * Track timing events (page load, feature duration)
   * @example analytics.timing("page_load", 1234, { page: "/dashboard" })
   */
  timing: (
    eventType: string,
    durationMs: number,
    eventData?: Record<string, unknown>,
    options?: TrackOptions,
  ) => {
    sendEvent(eventType, { ...eventData, durationMs }, "engagement", {
      ...options,
      durationMs,
    });
  },

  /**
   * Identify the current user (call after login)
   * @example analytics.identify(user.id, user.organizationId)
   */
  identify: (userId: string, organizationId?: string) => {
    currentUserId = userId;
    currentOrgId = organizationId || null;

    // Track identification event
    sendEvent("user_identified", { userId, organizationId }, "general");
  },
};

// Server-side analytics (for API routes, server components)
export const serverAnalytics = {
  /**
   * Track API call from server side
   */
  trackApiCall: async (
    path: string,
    method: string,
    statusCode: number,
    durationMs: number,
    userId?: string,
    organizationId?: string,
  ): Promise<void> => {
    // Import prisma dynamically to avoid client-side bundle issues
    const { prisma } = await import("@/lib/prisma");

    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: "api_call",
          eventCategory: statusCode >= 400 ? "error" : "engagement",
          sessionId: "server",
          userId,
          organizationId,
          path,
          eventData: {
            method,
            statusCode,
            durationMs,
          },
          durationMs,
        },
      });
    } catch {
      // Silently fail - analytics should never break the app
      console.error("[Analytics] Failed to track API call");
    }
  },

  /**
   * Track a server-emitted event in the SAME canonical shape the cross-product
   * spine expects (so server emits roll up identically to client emits).
   *
   * Two things make a row "canonical" (verified against `AnalyticsEvent` in
   * `prisma/schema.prisma`, the `EVENT_TYPES`/envelope in `./analytics/events.ts`,
   * and the readers in `./analytics/rollups.ts`):
   *
   *   1. The dimensional ENVELOPE (`product`/`surface`/`feature`/`topic?`) lives
   *      at the TOP of `eventData`, and the event-specific data is NESTED under a
   *      `payload` key — exactly the persisted shape {@link buildEventData}
   *      produces for client emits. The nightly rollups read event-specific
   *      fields from `eventData.payload`, so a flat `eventData` (the previous
   *      behaviour) silently misses them.
   *   2. The `product` is ALSO stamped on the top-level `AnalyticsEvent.product`
   *      COLUMN (nullable, index-driven). The per-product rollup passes scan by
   *      this column (`@@index([product, eventType, timestamp])`) rather than
   *      JSON-scanning, so an unstamped column drops the row from every
   *      per-product metric.
   *
   * `product`/`surface`/`feature`/`topic` are OPTIONAL on `options`: a caller
   * that does not yet supply them keeps working (the column stays `null` — the
   * backfill-safe default the schema documents — and only `payload` is written).
   * Callers in the typed taxonomy SHOULD pass them so the event lands in the
   * canonical, roll-up-able shape. No value is ever invented here.
   */
  track: async (
    eventType: string,
    eventData: Record<string, unknown>,
    options: {
      userId?: string;
      organizationId?: string;
      category?: EventCategory;
      /** Cross-product dimension — stamped on the column AND the envelope. */
      product?: Product;
      /** Optional route-group / named feature area (slug). */
      surface?: string;
      /** Optional named action area (slug). */
      feature?: string;
      /** Optional normalised topic id/hash (slug) — NEVER raw query text. */
      topic?: string;
      /** Optional pathname (no query string) for path/funnel reconstruction. */
      path?: string;
    } = {},
  ): Promise<void> => {
    const { prisma } = await import("@/lib/prisma");

    // Persisted `eventData` = dimensional envelope flattened on top + the
    // event-specific data nested under `payload`. Mirrors `buildEventData`'s
    // persisted shape so server emits roll up identically to client emits.
    const persistedEventData: Record<string, unknown> = {
      ...(options.product !== undefined ? { product: options.product } : {}),
      ...(options.surface !== undefined ? { surface: options.surface } : {}),
      ...(options.feature !== undefined ? { feature: options.feature } : {}),
      ...(options.topic !== undefined ? { topic: options.topic } : {}),
      payload: eventData ?? {},
    };

    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType,
          eventCategory: options.category || "general",
          sessionId: "server",
          userId: options.userId,
          organizationId: options.organizationId,
          // Top-level product column (index-driven per-product rollups).
          ...(options.product !== undefined
            ? { product: options.product }
            : {}),
          ...(options.path !== undefined ? { path: options.path } : {}),
          eventData: persistedEventData as Record<
            string,
            string | number | boolean | null
          >,
        },
      });
    } catch {
      console.error("[Analytics] Failed to track server event");
    }
  },
};

export default analytics;
