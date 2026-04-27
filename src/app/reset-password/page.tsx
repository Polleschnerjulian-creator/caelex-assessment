"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/ui/Logo";

/**
 * /reset-password — Caelex-branded password-reset completion page.
 *
 * Token comes in via the email link's `?token=` param (issued by
 * /api/auth/forgot-password). Posts {token, password} to
 * /api/auth/reset-password; on success the user is auto-routed to
 * /login with a one-shot success banner.
 *
 * Mirrors the /atlas-reset-password password-strength UX so users
 * coming from either surface land on a consistent flow.
 */

const PASSWORD_RULES = [
  {
    id: "length",
    label: "12+ characters",
    test: (s: string) => s.length >= 12,
  },
  {
    id: "lower",
    label: "Lowercase letter",
    test: (s: string) => /[a-z]/.test(s),
  },
  {
    id: "upper",
    label: "Uppercase letter",
    test: (s: string) => /[A-Z]/.test(s),
  },
  { id: "digit", label: "Number", test: (s: string) => /[0-9]/.test(s) },
  {
    id: "special",
    label: "Special character",
    test: (s: string) => /[^a-zA-Z0-9]/.test(s),
  },
];

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const checks = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) })),
    [password],
  );
  const allChecksPass = checks.every((c) => c.ok);
  const matches = password.length > 0 && password === confirm;

  // Surface a clear "missing token" state instead of silently failing.
  const tokenMissing = !token || token.length < 8;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push("/login"), 1800);
    return () => clearTimeout(t);
  }, [done, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!allChecksPass) {
      setError("Password does not meet all requirements.");
      return;
    }
    if (!matches) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error ??
            "Reset link is invalid or expired. Request a new one and try again.",
        );
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("We couldn't reach the server. Try again in a moment.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F7F8FA] dark:bg-[#0A0A0F] flex"
      style={{ colorScheme: "light dark" }}
    >
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E5E7EB]/50 dark:bg-white/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F7F8FA] dark:from-[#0A0A0F] to-transparent" />
        <div className="relative z-10 max-w-md px-12">
          <div className="mb-8">
            <Logo size={28} className="text-[#111827] dark:text-white" />
          </div>
          <h2 className="text-3xl font-medium text-[#111827] dark:text-white mb-4 leading-tight">
            Choose a new
            <br />
            <span className="text-[#111827] dark:text-white">password.</span>
          </h2>
          <p className="text-[#4B5563] dark:text-[#9CA3AF] text-subtitle leading-relaxed">
            12 characters, mixed case, a number, and a special character.
            Single-use link — valid for 60 minutes from when it was sent.
          </p>
        </div>
      </div>

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

          {tokenMissing ? (
            <div>
              <h1 className="text-2xl font-medium text-[#111827] dark:text-white mb-2">
                Reset link missing
              </h1>
              <p className="text-[#4B5563] dark:text-[#9CA3AF] text-body-lg">
                This URL doesn&apos;t carry a valid reset token. Open the link
                from your email, or{" "}
                <Link
                  href="/forgot-password"
                  className="text-[#111827] dark:text-white underline"
                >
                  request a new one
                </Link>
                .
              </p>
            </div>
          ) : done ? (
            <div>
              <div className="mb-6 inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-medium text-[#111827] dark:text-white mb-2">
                Password updated
              </h1>
              <p className="text-[#4B5563] dark:text-[#9CA3AF] text-body-lg">
                Redirecting you to sign in&hellip;
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-[#111827] dark:text-white mb-2">
                  Set a new password
                </h1>
                <p className="text-[#4B5563] dark:text-[#9CA3AF] text-body-lg">
                  You&apos;ll be signed in afterwards.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-small font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-white/[0.10] text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] rounded-lg px-4 py-3 pr-11 text-subtitle focus:border-[#111827] dark:focus:border-white/[0.25] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 dark:focus:ring-white/10 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] dark:hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-2">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-white/[0.10] text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] rounded-lg px-4 py-3 text-subtitle focus:border-[#111827] dark:focus:border-white/[0.25] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 dark:focus:ring-white/10 transition-all"
                    required
                  />
                </div>

                <ul className="text-small space-y-1 pt-1">
                  {checks.map((c) => (
                    <li
                      key={c.id}
                      className={`flex items-center gap-2 ${c.ok ? "text-emerald-500" : "text-[#9CA3AF]"}`}
                    >
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${c.ok ? "bg-emerald-500" : "bg-[#9CA3AF]/40"}`}
                      />
                      {c.label}
                    </li>
                  ))}
                </ul>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <p className="text-red-400 text-body">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !allChecksPass || !matches}
                  className="w-full bg-[#111827] dark:bg-white hover:bg-[#374151] dark:hover:bg-white/90 text-white dark:text-[#111827] font-semibold py-3 rounded-lg text-subtitle transition-all duration-200 disabled:opacity-50 disabled:hover:bg-[#111827] dark:disabled:hover:bg-white flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 dark:border-[#111827]/30 border-t-white dark:border-t-[#111827] rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Set new password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0A0A0F]" />}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
