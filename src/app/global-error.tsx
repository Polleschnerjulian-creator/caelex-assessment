"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="dark-section min-h-screen bg-[#0A0F1E] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-white/70 text-sm mb-6">
            A critical error occurred. Please refresh the page.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
