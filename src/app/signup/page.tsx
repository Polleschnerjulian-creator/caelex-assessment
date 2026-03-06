"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Check, X } from "lucide-react";
import Logo from "@/components/ui/Logo";

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
        router.push("/onboarding");
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/onboarding" });
  };

  const handleAppleSignIn = () => {
    signIn("apple", { callbackUrl: "/onboarding" });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E5E7EB]/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F7F8FA] to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-md px-12">
          <div className="mb-8">
            <Logo size={28} className="text-[#111827]" />
          </div>

          <h2 className="text-3xl font-medium text-[#111827] mb-4 leading-tight">
            Start Your
            <br />
            <span className="text-[#111827]">Compliance Journey.</span>
          </h2>

          <p className="text-[#4B5563] text-subtitle leading-relaxed mb-10">
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
                <div className="text-2xl font-semibold text-[#111827] mb-1">
                  {stat.value}
                </div>
                <div className="text-[#4B5563] text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Subtle border */}
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-[#E5E7EB]" />

        <div className="max-w-[400px] w-full">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size={24} className="text-[#111827]" />
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-[#111827] mb-2">
              Create your account
            </h1>
            <p className="text-[#4B5563] text-body-lg">
              Get started with space compliance in minutes
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              className="flex-1 border border-[#E5E7EB] hover:border-[#D1D5DB] bg-white hover:bg-[#F1F3F5] text-[#111827] py-3 rounded-lg text-body-lg transition-all duration-200 flex items-center justify-center gap-2.5"
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
              className="flex-1 border border-[#E5E7EB] hover:border-[#D1D5DB] bg-white hover:bg-[#F1F3F5] text-[#111827] py-3 rounded-lg text-body-lg transition-all duration-200 flex items-center justify-center gap-2.5"
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
            <div className="h-px bg-[#E5E7EB] flex-1" />
            <span className="text-[#9CA3AF] text-small uppercase tracking-wider">
              or
            </span>
            <div className="h-px bg-[#E5E7EB] flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Organization row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-small font-medium text-[#4B5563] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-lg px-4 py-3 text-subtitle focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-small font-medium text-[#4B5563] mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-lg px-4 py-3 text-subtitle focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-small font-medium text-[#4B5563] mb-2">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-lg px-4 py-3 text-subtitle focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-small font-medium text-[#4B5563] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-lg px-4 py-3 pr-11 text-subtitle focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]/10 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
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
                      className={`inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full border transition-all ${
                        check.met
                          ? "bg-[#F1F3F5] border-[#D1D5DB] text-[#111827]"
                          : "bg-[#F7F8FA] border-[#E5E7EB] text-[#9CA3AF]"
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
                  <div className="w-4 h-4 rounded border border-[#D1D5DB] bg-white peer-checked:bg-[#111827] peer-checked:border-[#111827] transition-all flex items-center justify-center">
                    {acceptTerms && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-body text-[#4B5563] group-hover:text-[#111827] transition-colors">
                  Ich akzeptiere die{" "}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    className="text-[#111827] hover:text-[#374151] underline"
                  >
                    AGB
                  </a>{" "}
                  und die{" "}
                  <a
                    href="/legal/privacy"
                    target="_blank"
                    className="text-[#111827] hover:text-[#374151] underline"
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
                  <div className="w-4 h-4 rounded border border-[#D1D5DB] bg-white peer-checked:bg-[#111827] peer-checked:border-[#111827] transition-all flex items-center justify-center">
                    {acceptAnalytics && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
                <span className="text-body text-[#4B5563] group-hover:text-[#111827] transition-colors">
                  Ich stimme der anonymisierten Nutzungsanalyse zu (optional)
                </span>
              </label>
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
              className="w-full bg-[#111827] hover:bg-[#374151] text-white font-semibold py-3 rounded-lg text-subtitle transition-all duration-200 disabled:opacity-50 disabled:hover:bg-[#111827] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <p className="text-center mt-8 text-body text-[#4B5563]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#111827] hover:text-[#374151] underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
