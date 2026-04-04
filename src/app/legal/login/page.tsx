"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Scale, AlertCircle } from "lucide-react";
import { CaelexIcon } from "@/components/ui/Logo";

export default function LegalLoginPage() {
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
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      // Verify the user is a LegalAttorney
      const res = await fetch("/api/legal/engagements");
      if (res.status === 401) {
        setError("Dieser Account hat keinen Zugang zum Legal Portal.");
        setLoading(false);
        return;
      }

      // Check MFA
      const session = await getSession();
      if (session?.user?.mfaRequired && !session?.user?.mfaVerified) {
        router.push(
          `/auth/mfa-challenge?callbackUrl=${encodeURIComponent("/legal/dashboard")}`,
        );
      } else {
        router.push("/legal/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center bg-white border-r border-[#e5e7eb]">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Content */}
        <div className="relative z-10 max-w-md px-12">
          <div className="mb-8">
            <CaelexIcon size={32} className="text-[#111827]" />
            <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-[#111827]">
              caelex
            </h1>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Scale size={16} className="text-[#9ca3af]" />
            <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#9ca3af]">
              Legal Portal
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-[#6b7280]">
            Secure, scoped access to client compliance data. Review regulatory
            posture, identify gaps, and prepare legal assessments — all in one
            place.
          </p>

          <div className="mt-10 pt-8 border-t border-[#e5e7eb]">
            <div className="space-y-3">
              {[
                "End-to-end encrypted data access",
                "Scoped to engagement permissions",
                "Full audit trail on every action",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-[#111827]" />
                  <span className="text-[13px] text-[#6b7280]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-2.5">
              <CaelexIcon size={24} className="text-[#111827]" />
              <span className="text-[18px] font-medium tracking-[-0.02em] text-[#111827]">
                caelex
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Scale size={13} className="text-[#9ca3af]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                Legal Portal
              </span>
            </div>
          </div>

          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[#111827]">
            Sign in
          </h2>
          <p className="mt-2 text-[13px] text-[#9ca3af]">
            Access your client compliance briefings
          </p>

          {error && (
            <div className="mt-6 flex items-start gap-3 p-3.5 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
              <AlertCircle
                size={16}
                className="text-[#ef4444] mt-0.5 shrink-0"
              />
              <p className="text-[13px] text-[#991b1b]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-[12px] font-medium uppercase tracking-[0.04em] text-[#6b7280] mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@lawfirm.com"
                className="w-full h-11 px-3.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[14px] text-[#111827] placeholder:text-[#c4c8ce] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-medium uppercase tracking-[0.04em] text-[#6b7280] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full h-11 px-3.5 pr-11 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[14px] text-[#111827] placeholder:text-[#c4c8ce] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-11 bg-[#111827] text-white text-[14px] font-medium rounded-lg hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[12px] text-[#c4c8ce]">
            Access is restricted to authorized legal professionals.
          </p>
        </div>
      </div>
    </div>
  );
}
