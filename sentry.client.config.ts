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

    // Never send PII to Sentry
    sendDefaultPii: false,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Session Replay
    replaysOnErrorSampleRate: 0.1,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

    integrations: [
      Sentry.replayIntegration({
        // Mask all text content and block media
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out non-critical errors and scrub PII.
    //
    // L-3 fix: prior version only scrubbed `event.user`. Sensitive data
    // (tokens, emails, session IDs) can also ride along in breadcrumbs,
    // request bodies, query strings, and cookies. We now walk the full
    // event and deep-redact any field whose key looks sensitive.
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
        return null;
      }

      // Filter out network errors that are not actionable
      const error = hint.originalException;
      if (error instanceof Error) {
        if (error.name === "AbortError") return null;
        if (error.message.includes("Failed to fetch")) return null;
      }

      // Scrub user PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }

      // Sensitive-key allowlist applied to anything we forward — matches
      // keys case-insensitively. Kept in sync with src/lib/audit.ts
      // PII_FIELDS so the front and back doors scrub the same fields.
      const SENSITIVE_KEY =
        /(password|token|secret|authorization|apikey|api_key|session|cookie|invite|reset|refresh|bearer|private|signing|ssn|iban|creditcard|card|cvv|vat|taxid)/i;
      const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const redact = (value: unknown, depth = 0): unknown => {
        if (depth > 6) return "[TRUNCATED]";
        if (value == null) return value;
        if (typeof value === "string") {
          return value.length > 1000
            ? `${value.slice(0, 1000)}…[truncated]`
            : value.replace(EMAIL_RE, "[REDACTED_EMAIL]");
        }
        if (Array.isArray(value)) {
          return value.map((v) => redact(v, depth + 1));
        }
        if (typeof value === "object") {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(
            value as Record<string, unknown>,
          )) {
            out[k] = SENSITIVE_KEY.test(k)
              ? "[REDACTED]"
              : redact(v, depth + 1);
          }
          return out;
        }
        return value;
      };

      if (event.request) {
        // Cookies carry session tokens — drop the whole map rather
        // than leave individual entries visible.
        if (event.request.cookies) delete event.request.cookies;
        if (event.request.headers) {
          event.request.headers = redact(
            event.request.headers,
          ) as typeof event.request.headers;
        }
        if (event.request.data !== undefined) {
          event.request.data = redact(event.request.data);
        }
        if (typeof event.request.query_string === "string") {
          event.request.query_string = event.request.query_string.replace(
            /([?&](?:token|invite|reset|password|api[_-]?key)[^=]*=)[^&]+/gi,
            "$1[REDACTED]",
          );
        }
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          data: b.data ? (redact(b.data) as typeof b.data) : b.data,
          message:
            typeof b.message === "string"
              ? b.message.replace(EMAIL_RE, "[REDACTED_EMAIL]")
              : b.message,
        }));
      }
      if (event.contexts) {
        event.contexts = redact(event.contexts) as typeof event.contexts;
      }
      if (event.extra) {
        event.extra = redact(event.extra) as typeof event.extra;
      }
      if (event.tags) {
        // Tag values are short strings — just scrub if the tag key is sensitive
        for (const k of Object.keys(event.tags)) {
          if (SENSITIVE_KEY.test(k)) event.tags[k] = "[REDACTED]";
        }
      }

      return event;
    },
  });
} // end if NEXT_PUBLIC_SENTRY_DSN
