"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  KeyRound,
  Loader2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  Lock,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

type AuthError = {
  type: "invalid" | "expired" | "revoked" | "network";
  message: string;
};

export default function StakeholderLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <StakeholderLandingContent />
    </Suspense>
  );
}

function StakeholderLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [autoValidating, setAutoValidating] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaEngagementId, setMfaEngagementId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSending, setMfaSending] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaResendCooldown, setMfaResendCooldown] = useState(0);

  // Auto-detect token from URL query parameter on mount
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      setAutoValidating(true);
      // Clear the token from the URL immediately to prevent leakage via
      // Referer header, browser history, or shoulder surfing
      window.history.replaceState({}, "", window.location.pathname);
      validateToken(urlToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const validateToken = async (tokenValue: string) => {
    if (!tokenValue.trim()) {
      setError({ type: "invalid", message: "Please enter an access token." });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stakeholder/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenValue.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        // If MFA is required and not yet verified this session, trigger OTP flow
        if (
          data.engagement?.mfaRequired &&
          !sessionStorage.getItem("mfa_verified")
        ) {
          sessionStorage.setItem("stakeholder_token", tokenValue.trim());
          setMfaEngagementId(data.engagement.id);
          setMfaRequired(true);
          // Automatically send OTP
          sendMfaCode(data.engagement.id);
          return;
        }

        sessionStorage.setItem("stakeholder_token", tokenValue.trim());
        router.push("/stakeholder/portal");
      } else if (data.expired) {
        setError({
          type: "expired",
          message:
            "This access token has expired. Please contact your organization administrator for a new token.",
        });
      } else if (data.revoked) {
        setError({
          type: "revoked",
          message:
            "This access token has been revoked. Please contact your organization administrator.",
        });
      } else {
        setError({
          type: "invalid",
          message:
            data.error ||
            "Invalid access token. Please check the token and try again.",
        });
      }
    } catch {
      setError({
        type: "network",
        message:
          "Unable to connect to the server. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
      setAutoValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateToken(token);
  };

  // ─── MFA Helpers ───

  const sendMfaCode = async (engagementId: string) => {
    setMfaSending(true);
    setMfaError(null);
    try {
      const res = await fetch("/api/stakeholder/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMfaError(data.error || "Failed to send verification code.");
      } else {
        // Start 60-second resend cooldown
        setMfaResendCooldown(60);
        const interval = setInterval(() => {
          setMfaResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setMfaError("Unable to send verification code. Please try again.");
    } finally {
      setMfaSending(false);
    }
  };

  const verifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaEngagementId || mfaCode.length !== 6) return;

    setMfaVerifying(true);
    setMfaError(null);
    try {
      const res = await fetch("/api/stakeholder/mfa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId: mfaEngagementId, otp: mfaCode }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        sessionStorage.setItem("mfa_verified", "true");
        router.push("/stakeholder/portal");
      } else {
        setMfaError(data.error || "Invalid code. Please try again.");
        setMfaCode("");
      }
    } catch {
      setMfaError("Verification failed. Please try again.");
    } finally {
      setMfaVerifying(false);
    }
  };

  const errorIcon = {
    expired: <Clock className="w-5 h-5 text-amber-400" />,
    revoked: <AlertTriangle className="w-5 h-5 text-red-400" />,
    invalid: <AlertTriangle className="w-5 h-5 text-red-400" />,
    network: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  };

  const errorColor = {
    expired: "border-amber-500/20 bg-amber-500/5",
    revoked: "border-red-500/20 bg-red-500/5",
    invalid: "border-red-500/20 bg-red-500/5",
    network: "border-amber-500/20 bg-amber-500/5",
  };

  // Show a full-screen loader if auto-validating from URL param
  if (autoValidating) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] flex items-center justify-center">
        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-body text-slate-500 dark:text-white/70">
            Validating your access token...
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── MFA Verification Screen ───
  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] flex flex-col">
        <header className="border-b border-slate-200 dark:border-[--glass-border-subtle] bg-white dark:bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-title font-semibold text-slate-800 dark:text-white">
                  Caelex
                </h1>
                <p className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/45">
                  Stakeholder Portal
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-display-sm font-semibold text-slate-800 dark:text-white mb-2">
                  Verification Required
                </h2>
                <p className="text-body-lg text-slate-500 dark:text-white/50 max-w-sm mx-auto">
                  A 6-digit security code has been sent to your email address.
                  Please enter it below to continue.
                </p>
              </div>

              <GlassCard hover={false} className="p-6">
                <form onSubmit={verifyMfaCode}>
                  <label
                    htmlFor="mfa-code"
                    className="block text-small font-medium text-slate-700 dark:text-white/70 mb-2"
                  >
                    Security Code
                  </label>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setMfaCode(val);
                      if (mfaError) setMfaError(null);
                    }}
                    placeholder="000000"
                    className="w-full text-center text-display-sm font-semibold tracking-[0.3em] py-4 rounded-lg border border-slate-200 dark:border-[--glass-border-subtle] bg-slate-50 dark:bg-[--glass-bg-surface] text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                    autoComplete="one-time-code"
                    autoFocus
                  />

                  <AnimatePresence>
                    {mfaError && (
                      <motion.div
                        initial={false}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <div className="flex items-start gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-small text-slate-600 dark:text-white/70">
                            {mfaError}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={mfaVerifying || mfaCode.length !== 6}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white font-medium text-subtitle rounded-lg px-6 py-3 transition-colors"
                  >
                    {mfaVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify Code</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button
                    onClick={() =>
                      mfaEngagementId && sendMfaCode(mfaEngagementId)
                    }
                    disabled={mfaSending || mfaResendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-small font-medium text-emerald-500 hover:text-emerald-400 disabled:text-slate-400 dark:disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {mfaResendCooldown > 0
                      ? `Resend in ${mfaResendCooldown}s`
                      : mfaSending
                        ? "Sending..."
                        : "Resend Code"}
                  </button>
                </div>
              </GlassCard>

              <div className="mt-8 p-4 rounded-lg bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 mt-0.5" />
                  <p className="text-caption text-slate-400 dark:text-white/30">
                    Multi-factor authentication is required for this engagement.
                    The code was sent to the email address registered with your
                    stakeholder profile.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        <footer className="border-t border-slate-200 dark:border-[--glass-border-subtle] py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <p className="text-caption text-slate-400 dark:text-white/30">
              Powered by Caelex Compliance Platform
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/legal/privacy"
                className="text-caption text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
              >
                Privacy
              </a>
              <a
                href="/legal/terms"
                className="text-caption text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-[--glass-border-subtle] bg-white dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-title font-semibold text-slate-800 dark:text-white">
                Caelex
              </h1>
              <p className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/45">
                Stakeholder Portal
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <KeyRound className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-display-sm font-semibold text-slate-800 dark:text-white mb-2">
                Stakeholder Access
              </h2>
              <p className="text-body-lg text-slate-500 dark:text-white/50 max-w-sm mx-auto">
                Enter your access token to view data rooms, attestations, and
                compliance documents shared with you.
              </p>
            </div>

            {/* Token Input Card */}
            <GlassCard hover={false} className="p-6">
              <form onSubmit={handleSubmit}>
                <label
                  htmlFor="token-input"
                  className="block text-small font-medium text-slate-700 dark:text-white/70 mb-2"
                >
                  Access Token
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
                  <input
                    id="token-input"
                    type="text"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Paste your access token here"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-[--glass-border-subtle] bg-slate-50 dark:bg-[--glass-bg-surface] text-body text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={false}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <div
                        className={`flex items-start gap-3 p-3 rounded-lg border ${errorColor[error.type]}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {errorIcon[error.type]}
                        </div>
                        <p className="text-small text-slate-600 dark:text-white/70">
                          {error.message}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading || !token.trim()}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white font-medium text-subtitle rounded-lg px-6 py-3 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </GlassCard>

            {/* Request Access Link */}
            <div className="mt-6 text-center">
              <p className="text-small text-slate-400 dark:text-white/40 mb-2">
                Don&apos;t have an access token?
              </p>
              <a
                href="mailto:support@caelex.com?subject=Stakeholder%20Portal%20Access%20Request"
                className="inline-flex items-center gap-1.5 text-small font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                <span>Request Access</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <p className="text-caption text-slate-400 dark:text-white/30 mt-2 max-w-xs mx-auto">
                Contact your organization administrator or reach out to our
                support team to receive a stakeholder access token.
              </p>
            </div>

            {/* Security Notice */}
            <div className="mt-8 p-4 rounded-lg bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 mt-0.5" />
                <p className="text-caption text-slate-400 dark:text-white/30">
                  This portal uses encrypted token-based authentication. All
                  data access is logged and auditable. Documents may be
                  watermarked for security.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-[--glass-border-subtle] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-caption text-slate-400 dark:text-white/30">
            Powered by Caelex Compliance Platform
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/legal/privacy"
              className="text-caption text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
            >
              Privacy
            </a>
            <a
              href="/legal/terms"
              className="text-caption text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
