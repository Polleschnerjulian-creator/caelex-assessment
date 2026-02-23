"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
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

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        analytics.track(
          "login",
          { provider: "credentials" },
          { category: "conversion" },
        );

        // Check if MFA is required before granting full access
        const session = await getSession();
        if (session?.user?.mfaRequired && !session?.user?.mfaVerified) {
          router.push(
            `/auth/mfa-challenge?callbackUrl=${encodeURIComponent("/dashboard")}`,
          );
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleAppleSignIn = () => {
    signIn("apple", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/[0.08] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-bg to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-md px-12">
          <div className="mb-8">
            <Logo size={28} className="text-white" />
          </div>

          <h2 className="text-3xl font-medium text-white mb-4 leading-tight">
            Space Compliance,
            <br />
            <span className="text-emerald-400">Simplified.</span>
          </h2>

          <p className="text-white/45 text-subtitle leading-relaxed mb-10">
            The regulatory compliance platform trusted by satellite operators,
            launch providers, and space service companies across Europe.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              "EU Space Act & NIS2 compliance",
              "10 national jurisdiction assessments",
              "AI-powered document generation",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-white/45 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Subtle border */}
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-white/[0.06]" />

        <div className="max-w-[400px] w-full">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Logo size={24} className="text-white" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-white mb-2">
              Welcome back
            </h1>
            <p className="text-white/45 text-body-lg">
              Sign in to access your compliance dashboard
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              className="flex-1 border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.05] text-white py-3 rounded-lg text-body-lg transition-all duration-200 flex items-center justify-center gap-2.5"
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
            <button
              onClick={handleAppleSignIn}
              className="flex-1 border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.05] text-white py-3 rounded-lg text-body-lg transition-all duration-200 flex items-center justify-center gap-2.5"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-white/[0.06] flex-1" />
            <span className="text-white/30 text-small uppercase tracking-wider">
              or
            </span>
            <div className="h-px bg-white/[0.06] flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-small font-medium text-white/45 mb-2">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-subtitle focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-small font-medium text-white/45">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-small text-emerald-400/70 hover:text-emerald-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 pr-11 text-subtitle focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
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
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-lg text-subtitle transition-all duration-200 disabled:opacity-50 disabled:hover:bg-emerald-500 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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

          {/* Sign up link */}
          <p className="text-center mt-8 text-body text-white/45">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-emerald-400/80 hover:text-emerald-400 transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
