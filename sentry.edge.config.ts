// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is configured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Never send PII to Sentry
    sendDefaultPii: false,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Filter edge errors and scrub sensitive data (matching server config)
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === "development") {
        return null;
      }

      const error = hint.originalException;
      if (error instanceof Error) {
        if (error.message.includes("NEXT_NOT_FOUND")) return null;
        if (error.message.includes("NEXT_REDIRECT")) return null;
      }

      // Scrub request bodies and headers for PII
      if (event.request) {
        delete event.request.data;
        if (event.request.headers) {
          const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
          for (const header of sensitiveHeaders) {
            if (event.request.headers[header]) {
              event.request.headers[header] = "[REDACTED]";
            }
          }
        }
        if (event.request.query_string) {
          const qs = event.request.query_string;
          if (
            typeof qs === "string" &&
            /email|token|password|secret/i.test(qs)
          ) {
            event.request.query_string = "[REDACTED]";
          }
        }
      }

      // Scrub user context
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }

      return event;
    },

    // Filter breadcrumbs containing PII
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "http" && breadcrumb.data) {
        const url = breadcrumb.data.url || "";
        if (/email|token|password|secret/i.test(url)) {
          breadcrumb.data.url = "[REDACTED]";
        }
      }
      return breadcrumb;
    },
  });
}
