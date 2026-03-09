import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-white min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.05] rounded-full blur-[128px]" />

      <div className="relative text-center max-w-lg px-6">
        {/* Large 404 watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] font-black text-slate-900/[0.02] dark:text-white/[0.02] select-none pointer-events-none leading-none">
          404
        </div>

        <div className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/[0.05] rounded-full px-4 py-1.5 mb-6">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium uppercase tracking-wider">
            Signal Lost
          </span>
        </div>

        <h1 className="text-6xl font-medium mb-4 text-slate-900 dark:text-white tracking-tight">
          Page Not Found
        </h1>

        <p className="text-slate-500 dark:text-white/45 text-lg mb-10 leading-relaxed">
          The page you are looking for does not exist or has been moved.
          Navigate back to a known frequency.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg px-6 py-3 transition-colors duration-200 w-full sm:w-auto"
          >
            Go Home
          </Link>
          <Link
            href="/assessment"
            className="border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 text-slate-600 dark:text-white/70 rounded-lg px-6 py-3 font-medium transition-colors duration-200 w-full sm:w-auto"
          >
            Start Assessment
          </Link>
          <Link
            href="/resources"
            className="border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 text-slate-600 dark:text-white/70 rounded-lg px-6 py-3 font-medium transition-colors duration-200 w-full sm:w-auto"
          >
            Resources
          </Link>
        </div>
      </div>
    </div>
  );
}
