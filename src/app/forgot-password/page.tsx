"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import Logo from "@/components/ui/Logo";

/**
 * /forgot-password — Caelex-branded password-reset request.
 *
 * Mirrors the /login two-pane layout (gradient hero left, form right)
 * and POSTs to /api/auth/forgot-password with `intent: "caelex"` so
 * the email link points at /reset-password instead of the Atlas one.
 *
 * Always shows the success panel after submit — the API responds 200
 * regardless of whether the account exists, and the UI must mirror
 * that to avoid account-enumeration leaks.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: "caelex" }),
      });
      // Server always returns 200 on logical paths to prevent
      // account enumeration. Non-200 = transport/rate-limit issue.
      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error ||
            "We couldn't send the reset link. Please try again in a moment.",
        );
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F7F8FA] dark:bg-[#0A0A0F] flex"
      style={{ colorScheme: "light dark" }}
    >
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E5E7EB]/50 dark:bg-white/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F7F8FA] dark:from-[#0A0A0F] to-transparent" />

        <div className="relative z-10 max-w-md px-12">
          <div className="mb-8">
            <Logo size={28} className="text-[#111827] dark:text-white" />
          </div>
          <h2 className="text-3xl font-medium text-[#111827] dark:text-white mb-4 leading-tight">
            Forgot your
            <br />
            <span className="text-[#111827] dark:text-white">password?</span>
          </h2>
          <p className="text-[#4B5563] dark:text-[#9CA3AF] text-subtitle leading-relaxed">
            Enter the email associated with your Caelex account and we&apos;ll
            send you a single-use link to set a new one.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-[#E5E7EB] dark:bg-white/[0.08]" />

        <div className="max-w-[400px] w-full">
          <div className="lg:hidden mb-10">
            <Logo size={24} className="text-[#111827] dark:text-white" />
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-small text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>

          {!submitted ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-[#111827] dark:text-white mb-2">
                  Reset password
                </h1>
                <p className="text-[#4B5563] dark:text-[#9CA3AF] text-body-lg">
                  We&apos;ll email you a link valid for 60 minutes.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-small font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-white dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-white/[0.10] text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] rounded-lg px-4 py-3 text-subtitle focus:border-[#111827] dark:focus:border-white/[0.25] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 dark:focus:ring-white/10 transition-all"
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <p className="text-red-400 text-body">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#111827] dark:bg-white hover:bg-[#374151] dark:hover:bg-white/90 text-white dark:text-[#111827] font-semibold py-3 rounded-lg text-subtitle transition-all duration-200 disabled:opacity-50 disabled:hover:bg-[#111827] dark:disabled:hover:bg-white flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 dark:border-[#111827]/30 border-t-white dark:border-t-[#111827] rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div>
              <div className="mb-6 inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Mail className="w-5 h-5 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-medium text-[#111827] dark:text-white mb-2">
                Check your inbox
              </h1>
              <p className="text-[#4B5563] dark:text-[#9CA3AF] text-body-lg leading-relaxed">
                If an account exists for{" "}
                <span className="text-[#111827] dark:text-white font-medium">
                  {email}
                </span>
                , a single-use reset link is on its way. The link is valid for
                60 minutes.
              </p>
              <p className="text-[#4B5563] dark:text-[#9CA3AF] text-small mt-6 leading-relaxed">
                Didn&apos;t get an email? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setError("");
                  }}
                  className="text-[#111827] dark:text-white underline hover:text-[#374151] dark:hover:text-white/80"
                >
                  try a different email
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
