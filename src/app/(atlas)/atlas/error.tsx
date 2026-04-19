"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

/**
 * Atlas-scoped error boundary (C8).
 *
 * Catches render / data-fetch errors in the (atlas) route group so that
 * a failing `getLinkStatusMap()` or a transient Neon outage renders a
 * graceful fallback instead of the generic Next.js white screen.
 */
export default function AtlasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the server-side logger via console so Sentry/Vercel capture it.
    // The digest is the stable error id Next.js produces in production builds.
    // eslint-disable-next-line no-console
    console.error("Atlas render error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-6">
      <div className="max-w-[520px] w-full rounded-2xl bg-white border border-[#E5E7EB] p-8 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 border border-amber-100 mb-4">
          <AlertTriangle size={22} className="text-amber-600" />
        </div>

        <h1 className="text-heading font-semibold text-[#111827] mb-2">
          Atlas konnte diese Seite nicht laden
        </h1>
        <p className="text-body text-[#4B5563] leading-relaxed mb-6">
          Ein Fehler ist aufgetreten. Das kann an einer kurzen Unterbrechung
          unserer Datenbank oder an einer fehlerhaften Abfrage liegen. Du kannst
          es sofort erneut versuchen.
        </p>

        {error.digest && (
          <div className="text-[10px] font-mono text-[#9CA3AF] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 mb-6 break-all">
            Fehler-ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111827] text-white px-4 py-2 text-small font-medium hover:bg-[#1F2937] transition"
          >
            <RefreshCw size={14} />
            Erneut versuchen
          </button>
          <Link
            href="/atlas"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-[#E5E7EB] text-[#111827] px-4 py-2 text-small font-medium hover:bg-[#F9FAFB] transition"
          >
            <ArrowLeft size={14} />
            Zur Atlas-Startseite
          </Link>
        </div>

        <p className="mt-6 text-caption text-[#9CA3AF]">
          Bleibt das Problem bestehen?{" "}
          <a
            href="mailto:support@caelex.eu?subject=Atlas%20error%20report"
            className="underline hover:text-[#111827]"
          >
            support@caelex.eu
          </a>
        </p>
      </div>
    </div>
  );
}
