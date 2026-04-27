"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { safeInternalUrl } from "@/lib/safe-redirect";

/**
 * /login — the canonical Caelex compliance-platform sign-in.
 *
 * This is the "normal" Caelex app login (dashboard, assessments,
 * Assure, etc.). The ATLAS sub-product has its own dark-stage login
 * at /atlas-login and is NOT redirected here — the two flows are
 * intentionally separate brand experiences.
 *
 * Restored from the pre-ATLAS design after the ATLAS-branded dark
 * stage was mistakenly shipped at /login. safeInternalUrl was added
 * as part of audit C-2 to block open-redirect attacks via
 * `?callbackUrl=https://evil.com`.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Whitelist: only same-origin relative paths. Otherwise `router.push`
  // with an absolute URL would do a full-document navigation that
  // middleware can't intercept. Audit C-2.
  const callbackUrl = safeInternalUrl(
    searchParams.get("callbackUrl"),
    "/dashboard",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error || result.ok === false) {
        const raw = result?.error ?? "Sign-in failed";
        // Surface the actual reason from authorize() (deactivated, locked,
        // rate-limited, etc.) instead of a flat "Invalid email or password".
        // CredentialsSignin is the generic "wrong creds" code — translate
        // that one but pass everything else through so debugging is sane.
        setError(
          raw === "CredentialsSignin"
            ? "Invalid email or password"
            : raw === "Configuration"
              ? "Authentication is misconfigured. Contact support."
              : raw,
        );
        setLoading(false);
        return;
      }

      analytics.track(
        "login",
        { provider: "credentials" },
        { category: "conversion" },
      );

      const session = await getSession();
      if (!session) {
        // signIn said ok but no session was minted — almost always a JWT
        // callback rejection (e.g. account became inactive between
        // authorize() and JWT). Hard-reload so the next request hits the
        // server with fresh cookies and middleware can decide.
        window.location.assign(callbackUrl);
        return;
      }

      if (session.user?.mfaRequired && !session.user?.mfaVerified) {
        router.push(
          `/auth/mfa-challenge?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        );
      } else {
        // Hard navigation guarantees the new session cookie is sent on the
        // next request — router.push keeps client state and occasionally
        // races the cookie write on slow connections, leaving the user
        // stuck on /login with a valid session they can't see.
        window.location.assign(callbackUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
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
            Space Compliance,
            <br />
            <span className="text-[#111827] dark:text-white">Simplified.</span>
          </h2>

          <p className="text-[#4B5563] dark:text-[#9CA3AF] text-subtitle leading-relaxed mb-10">
            The regulatory compliance platform trusted by satellite operators,
            launch providers, and space service companies across Europe.
          </p>

          <div className="space-y-4">
            {[
              "EU Space Act & NIS2 compliance",
              "10 national jurisdiction assessments",
              "AI-powered document generation",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#111827] dark:bg-white" />
                <span className="text-[#4B5563] dark:text-[#9CA3AF] text-sm">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-[#E5E7EB] dark:bg-white/[0.08]" />

        <div className="max-w-[400px] w-full">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Logo size={24} className="text-[#111827] dark:text-white" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-medium text-[#111827] dark:text-white mb-2">
              Welcome back
            </h1>
            <p className="text-[#4B5563] dark:text-[#9CA3AF] text-body-lg">
              Sign in to access your compliance dashboard
            </p>
          </div>

          {/* OAuth */}
          <div className="mb-6">
            <button
              onClick={handleGoogleSignIn}
              className="w-full border border-[#E5E7EB] dark:border-white/[0.10] hover:border-[#D1D5DB] dark:hover:border-white/[0.18] bg-white dark:bg-white/[0.06] hover:bg-[#F1F3F5] dark:hover:bg-white/[0.09] text-[#111827] dark:text-white py-3 rounded-lg text-body-lg transition-all duration-200 flex items-center justify-center gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-[#E5E7EB] dark:bg-white/[0.08] flex-1" />
            <span className="text-[#9CA3AF] dark:text-[#6B7280] text-small uppercase tracking-wider">
              or
            </span>
            <div className="h-px bg-[#E5E7EB] dark:bg-white/[0.08] flex-1" />
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-small font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-small text-[#111827] dark:text-white hover:text-[#374151] dark:hover:text-white/80 underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-white/[0.10] text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] rounded-lg px-4 py-3 pr-11 text-subtitle focus:border-[#111827] dark:focus:border-white/[0.25] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 dark:focus:ring-white/10 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-400 text-body">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#111827] dark:bg-white hover:bg-[#374151] dark:hover:bg-white/90 text-white dark:text-[#111827] font-semibold py-3 rounded-lg text-subtitle transition-all duration-200 disabled:opacity-50 disabled:hover:bg-[#111827] dark:disabled:hover:bg-white flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 dark:border-[#111827]/30 border-t-white dark:border-t-[#111827] rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-8 text-body text-[#4B5563] dark:text-[#9CA3AF]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[#111827] dark:text-white hover:text-[#374151] dark:hover:text-white/80 underline transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0A0A0F]" />}
    >
      <LoginForm />
    </Suspense>
  );
}
