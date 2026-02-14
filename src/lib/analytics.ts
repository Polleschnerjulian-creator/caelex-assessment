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
 */

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
      // Generate new session ID
      currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem("caelex_session_id", currentSessionId);
    }
  }

  return currentSessionId;
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

  // Use sendBeacon for reliability (survives page unload)
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/track", JSON.stringify(payload));
  } else if (typeof fetch !== "undefined") {
    // Fallback to fetch for SSR or older browsers
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // Survives page navigation
    }).catch(() => {
      // Silently fail - analytics should never break the app
    });
  }
}

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
   * Track server-side event
   */
  track: async (
    eventType: string,
    eventData: Record<string, unknown>,
    options: {
      userId?: string;
      organizationId?: string;
      category?: EventCategory;
    } = {},
  ): Promise<void> => {
    const { prisma } = await import("@/lib/prisma");

    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType,
          eventCategory: options.category || "general",
          sessionId: "server",
          userId: options.userId,
          organizationId: options.organizationId,
          eventData: eventData as Record<
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
