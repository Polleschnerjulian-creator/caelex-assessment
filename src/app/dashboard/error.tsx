"use client";

/**
 * Sprint UF11 — Dashboard error boundary.
 *
 * Audit finding P1-16: zero error.tsx files in the entire /dashboard
 * tree. A JavaScript exception in any page (a Recharts hydration
 * error, a malformed prop from a server component, a thrown promise
 * during streaming) drops the user on the generic Next.js default
 * error screen — a stark white "Something went wrong" with no
 * navigation, no context, no recovery.
 *
 * This component is the App-Router error boundary for /dashboard/*.
 * It catches client-side errors from any nested page and renders an
 * in-shell error card that:
 *
 *   - explains in plain language what happened
 *   - shows the error digest for support correlation (production)
 *     and the full stack (development)
 *   - offers two recovery actions: "try again" (calls reset()) and
 *     "back to dashboard home"
 *
 * # Why a single dashboard-level boundary
 *
 * Per-page boundaries (e.g. /dashboard/posture/error.tsx) would let
 * us tailor copy per surface, but most of our pages are similar
 * server components hitting Prisma — a generic fallback is the right
 * starting point. We can always add per-page boundaries later if a
 * specific page needs persona-aware error messaging.
 *
 * # What about the topbar/sidebar
 *
 * Next.js error boundaries replace ONLY the page content; the parent
 * layout (sidebar + topbar from V2Shell) keeps rendering. The user
 * stays oriented. This is exactly the App Router model we want.
 */

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log to the browser console so DevTools shows the trace —
  // production console output is also captured by Sentry / LogSnag
  // in real deployments via the global error handler.
  React.useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(244, 63, 94, 0.04)",
          boxShadow: "inset 0 0 0 0.5px rgba(244, 63, 94, 0.18)",
        }}
      >
        <div className="flex items-start gap-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-inset ring-rose-500/20"
            aria-hidden
          >
            <AlertTriangle
              className="h-5 w-5 text-rose-300"
              strokeWidth={1.75}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h1
              className="text-[20px] font-semibold text-white"
              style={{ letterSpacing: "-0.018em" }}
            >
              Something went wrong on this page
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
              An unexpected error stopped this page from rendering. Your data is
              safe — only this view failed. You can try again, go back to the
              dashboard, or reach support if it persists.
            </p>

            {error.digest ? (
              <p className="mt-3 font-mono text-[11px] text-slate-500">
                Error reference:{" "}
                <span className="text-slate-300">{error.digest}</span>
              </p>
            ) : null}

            {isDev && error.message ? (
              <pre
                className="mt-3 max-h-48 overflow-auto rounded-md p-3 font-mono text-[11px] leading-relaxed text-rose-200"
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.04)",
                }}
              >
                {error.stack ?? error.message}
              </pre>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.92] px-3.5 py-2 text-[13px] font-semibold text-[rgb(20,20,22)] transition hover:bg-white"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2} />
                Try again
              </button>
              <Link
                href="/dashboard/today"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3.5 py-2 text-[13px] font-medium text-slate-200 transition hover:bg-white/[0.1]"
              >
                <Home className="h-3.5 w-3.5" strokeWidth={2.2} />
                Back to Today
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
