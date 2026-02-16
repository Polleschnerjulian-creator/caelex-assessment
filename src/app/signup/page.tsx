"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowRight, Eye, EyeOff, Check, X } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAnalytics, setAcceptAnalytics] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordChecks = [
    { label: "12+ characters", met: password.length >= 12 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const allChecksMet = passwordChecks.every((c) => c.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allChecksMet) {
      setError("Password does not meet all requirements");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          organization,
          acceptTerms,
          acceptAnalytics,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          setError(data.details.join(". "));
        } else {
          setError(data.error || "Something went wrong");
        }
        setLoading(false);
        return;
      }

      // Auto sign in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but could not sign in");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0B] to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-md px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">
              Caelex
            </span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Start Your
            <br />
            <span className="text-green-400">Compliance Journey.</span>
          </h2>

          <p className="text-white/50 text-[15px] leading-relaxed mb-10">
            Join space operators across Europe who use Caelex to navigate EU
            Space Act, NIS2, and national space law compliance.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: "119", label: "Articles tracked" },
              { value: "10", label: "Jurisdictions" },
              { value: "51", label: "NIS2 requirements" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-white/40 text-xs">{stat.label}</div>
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
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-white text-lg font-semibold">Caelex</span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Create your account
            </h1>
            <p className="text-white/40 text-[14px]">
              Get started with space compliance in minutes
            </p>
          </div>

          {/* Google OAuth — top position */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.05] text-white py-3 rounded-lg text-[14px] transition-all duration-200 flex items-center justify-center gap-3 mb-6"
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
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-white/[0.06] flex-1" />
            <span className="text-white/30 text-[12px] font-mono uppercase tracking-wider">
              or
            </span>
            <div className="h-px bg-white/[0.06] flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Organization row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-white/50 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-[15px] focus:border-green-500/40 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-white/50 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-[15px] focus:border-green-500/40 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-white/50 mb-2">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-[15px] focus:border-green-500/40 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-white/50 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 pr-11 text-[15px] focus:border-green-500/40 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password strength indicators */}
              {password.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {passwordChecks.map((check) => (
                    <span
                      key={check.label}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                        check.met
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : "bg-white/[0.02] border-white/[0.06] text-white/30"
                      }`}
                    >
                      {check.met ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {check.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Consent checkboxes */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="sr-only peer"
                    required
                  />
                  <div className="w-4 h-4 rounded border border-white/[0.15] bg-white/[0.03] peer-checked:bg-green-500 peer-checked:border-green-500 transition-all flex items-center justify-center">
                    {acceptTerms && <Check className="w-3 h-3 text-black" />}
                  </div>
                </div>
                <span className="text-[13px] text-white/50 group-hover:text-white/60 transition-colors">
                  Ich akzeptiere die{" "}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    className="text-green-400/70 hover:text-green-400 underline decoration-green-400/20"
                  >
                    AGB
                  </a>{" "}
                  und die{" "}
                  <a
                    href="/legal/privacy"
                    target="_blank"
                    className="text-green-400/70 hover:text-green-400 underline decoration-green-400/20"
                  >
                    Datenschutzerkl&auml;rung
                  </a>{" "}
                  *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptAnalytics}
                    onChange={(e) => setAcceptAnalytics(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 rounded border border-white/[0.15] bg-white/[0.03] peer-checked:bg-green-500 peer-checked:border-green-500 transition-all flex items-center justify-center">
                    {acceptAnalytics && (
                      <Check className="w-3 h-3 text-black" />
                    )}
                  </div>
                </div>
                <span className="text-[13px] text-white/50 group-hover:text-white/60 transition-colors">
                  Ich stimme der anonymisierten Nutzungsanalyse zu (optional)
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-400 text-[13px]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 rounded-lg text-[15px] transition-all duration-200 disabled:opacity-50 disabled:hover:bg-green-500 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center mt-8 text-[13px] text-white/40">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-green-400/80 hover:text-green-400 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
