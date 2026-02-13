"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  ArrowRight,
  CheckCircle,
  Loader2,
  Sparkles,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import { RedactedUnifiedResult } from "@/lib/unified-assessment-types";
import { csrfHeaders } from "@/lib/csrf-client";

interface AssessmentResultsGateProps {
  result: RedactedUnifiedResult;
  onAuthenticated: () => void;
}

type AuthMode = "signup" | "login";

export default function AssessmentResultsGate({
  result,
  onAuthenticated,
}: AssessmentResultsGateProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingToDashboard, setSavingToDashboard] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState(
    result.companySummary.name || "",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Store result in localStorage for persistence
  useEffect(() => {
    try {
      localStorage.setItem(
        "caelex-pending-unified-assessment",
        JSON.stringify(result),
      );
    } catch {
      // localStorage unavailable
    }
  }, [result]);

  // When user is authenticated, save to dashboard and proceed
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      handleSaveToDashboard();
    }
  }, [status, session]);

  const handleSaveToDashboard = async () => {
    setSavingToDashboard(true);
    setError("");

    try {
      const response = await fetch("/api/unified/save-to-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ result }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save assessment");
      }

      // Clear localStorage
      try {
        localStorage.removeItem("caelex-pending-unified-assessment");
      } catch {
        // ignore
      }

      // Notify parent to show full results
      onAuthenticated();
    } catch (err) {
      console.error("Error saving to dashboard:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save. Please try again.",
      );
      setSavingToDashboard(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Password validation
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain a lowercase letter");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain an uppercase letter");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain a number");
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError("Password must contain a special character");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, organization }),
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

      // Auto sign in
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but sign in failed. Please try logging in.");
        setLoading(false);
      }
      // useEffect will handle the rest when session updates
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
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
      }
      // useEffect will handle the rest when session updates
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Store that we need to save assessment after OAuth
    try {
      localStorage.setItem("caelex-save-assessment-after-auth", "true");
    } catch {
      // ignore
    }
    signIn("google", { callbackUrl: "/assessment/unified?complete=true" });
  };

  // Loading state while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Saving to dashboard state
  if (savingToDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-[15px] text-white/70 mb-2">
            Setting up your dashboard...
          </p>
          <p className="text-[13px] text-white/40">
            Saving your compliance profile with Free tier access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-[13px] text-emerald-400 font-medium">
              Assessment Complete
            </span>
          </div>
          <h1 className="text-[clamp(1.5rem,4vw,2.25rem)] font-medium tracking-[-0.02em] text-white mb-4">
            Your compliance profile is ready
          </h1>
          <p className="text-[15px] text-white/50 max-w-xl mx-auto">
            Create a free account to view your full results and access your
            compliance dashboard
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Preview Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div
              className="relative rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] p-6 overflow-hidden"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* Blur overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10 flex items-end justify-center pb-8">
                <div className="text-center">
                  <Lock className="w-8 h-8 text-white/40 mx-auto mb-3" />
                  <p className="text-[14px] text-white/60 mb-1">
                    Sign in to unlock full results
                  </p>
                  <p className="text-[12px] text-white/40">
                    Free tier includes dashboard access
                  </p>
                </div>
              </div>

              {/* Blurred preview content */}
              <div className="blur-sm pointer-events-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-medium text-white">
                      {result.companySummary.name || "Your Organization"}
                    </h3>
                    <p className="text-[13px] text-white/50">
                      {result.companySummary.establishment}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[24px] font-medium text-white">
                      {result.overallSummary.totalRequirements}
                    </div>
                    <div className="text-[11px] text-white/40 uppercase">
                      Requirements
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[24px] font-medium text-amber-400 capitalize">
                      {result.overallSummary.overallRisk}
                    </div>
                    <div className="text-[11px] text-white/40 uppercase">
                      Risk Level
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.overallSummary.immediateActions
                    .slice(0, 3)
                    .map((action, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-[10px] text-emerald-400">
                            {i + 1}
                          </span>
                        </div>
                        <span className="text-[13px] text-white/60">
                          {action}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* What's included */}
            <div className="mt-6 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[13px] font-medium text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Free Tier Includes
              </h4>
              <div className="space-y-3">
                {[
                  "Full compliance profile & results",
                  "Dashboard access",
                  "Article-level tracking",
                  "Export to PDF",
                  "Email notifications",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2.5 text-[13px] text-white/50"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500/70" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Auth Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] p-8"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* Mode toggle */}
              <div className="flex gap-2 p-1 bg-white/[0.04] rounded-lg mb-8">
                <button
                  onClick={() => setAuthMode("signup")}
                  className={`flex-1 py-2.5 rounded-md text-[13px] font-medium transition-all ${
                    authMode === "signup"
                      ? "bg-emerald-500 text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
                <button
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 py-2.5 rounded-md text-[13px] font-medium transition-all ${
                    authMode === "login"
                      ? "bg-emerald-500 text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={authMode === "signup" ? handleSignup : handleLogin}
                className="space-y-5"
              >
                {authMode === "signup" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-[14px] text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none transition-colors"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
                        Organization
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="text"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-[14px] text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none transition-colors"
                          placeholder="Company name (optional)"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-[14px] text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none transition-colors"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-[14px] text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none transition-colors"
                      placeholder={
                        authMode === "signup"
                          ? "Min. 12 characters"
                          : "••••••••"
                      }
                      required
                    />
                  </div>
                  {authMode === "signup" && (
                    <p className="text-[11px] text-white/30 mt-1.5">
                      Uppercase, lowercase, number, special character
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-red-400 text-[13px] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-3.5 rounded-xl text-[14px] font-medium hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {authMode === "signup"
                        ? "Creating account..."
                        : "Signing in..."}
                    </>
                  ) : (
                    <>
                      {authMode === "signup" ? (
                        <>
                          Create Free Account
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Sign In & View Results
                          <Eye className="w-4 h-4" />
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-white/[0.08] flex-1" />
                <span className="text-white/30 text-[11px] uppercase tracking-wider">
                  or
                </span>
                <div className="h-px bg-white/[0.08] flex-1" />
              </div>

              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 border border-white/[0.08] text-white py-3.5 rounded-xl text-[14px] hover:bg-white/[0.04] transition-all"
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

              {/* Security note */}
              <p className="text-center text-[11px] text-white/30 mt-6 flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3" />
                Your data is encrypted and secure
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
