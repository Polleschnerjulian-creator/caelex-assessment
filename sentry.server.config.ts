// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is configured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Filter server-side errors
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
        return null;
      }

      const error = hint.originalException;
      if (error instanceof Error) {
        // Filter out expected errors
        if (error.message.includes("NEXT_NOT_FOUND")) {
          return null;
        }
        if (error.message.includes("NEXT_REDIRECT")) {
          return null;
        }
      }

      return event;
    },
  });
}
