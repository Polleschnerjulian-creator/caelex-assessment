// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Check cookie consent before initializing Sentry (granular preferences)
function hasErrorTrackingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("caelex-cookie-consent");
    if (!raw) return false;
    // Legacy support
    if (raw === "all") return true;
    if (raw === "necessary") return false;
    const prefs = JSON.parse(raw);
    return prefs?.errorTracking === true;
  } catch {
    return false;
  }
}

// Skip initialization if DSN is not configured or user hasn't consented
if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !hasErrorTrackingConsent()) {
  // Sentry SDK is a no-op without init, which is fine
} else {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

    integrations: [
      Sentry.replayIntegration({
        // Mask all text content and block media
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out non-critical errors
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
        return null;
      }

      // Filter out network errors that are not actionable
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore aborted requests
        if (error.name === "AbortError") {
          return null;
        }
        // Ignore network errors (user offline, etc.)
        if (error.message.includes("Failed to fetch")) {
          return null;
        }
      }

      return event;
    },
  });
} // end if NEXT_PUBLIC_SENTRY_DSN
